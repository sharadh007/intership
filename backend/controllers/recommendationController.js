const { spawn } = require('child_process');
const path = require('path');
const pool = require('../config/database');

const getRecommendations = async (req, res) => {
  try {
    const {
      name,
      age,
      qualification,
      skills,
      preferredSector,
      preferredState,
      college,
      cgpa,
      workPreference = 'office'
    } = req.body;

    // Validation
    if (!name || !qualification || !skills || !preferredState) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['name', 'qualification', 'skills', 'preferredState']
      });
    }

    const studentProfile = {
      name,
      age,
      qualification,
      skills: Array.isArray(skills) ? skills : (skills ? skills.split(',').map(s => s.trim()) : []),
      resumeData: req.body.resumeData || null,
      preferredSector: preferredSector || 'Technology',
      preferred_state: preferredState,
      college: college || 'Not specified',
      career_goal: req.body.career_goal || 'Not specified',
      strengths: req.body.strengths || '',
      resume_text: req.body.resumeText || ''
    };

    // 1. Fetch Internships from PostgreSQL
    const internshipQuery = `
      SELECT * FROM internships 
      WHERE verification_status = 'verified'
    `;
    const result = await pool.query(internshipQuery);
    const allInternships = result.rows;

    // ── JS-side Pre-Filter (faster: reduce before Python embedding) ────────────
    const prefLocs = (preferredState || '').toLowerCase().split(',').map(l => l.trim()).filter(l => l && l !== 'any');

    const isRemoteKeyword = (loc) => {
      const l = (loc || '').toLowerCase();
      return l.includes('remote') || l.includes('work from home') || l.includes('wfh') || l.includes('work-from-home');
    };

    const matchesLocation = (jobLoc) => {
      if (prefLocs.length === 0) return true;
      const jLoc = (jobLoc || '').toLowerCase();
      if (jLoc.includes('pan india')) return true;
      return prefLocs.some(p => jLoc.includes(p) || p.includes(jLoc));
    };

    let candidateInternships = allInternships;

    if (workPreference === 'remote') {
      // Only send remote jobs to Python
      candidateInternships = allInternships.filter(i => isRemoteKeyword(i.location));
    } else if (workPreference === 'office') {
      // Exclude all WFH/remote jobs
      const officeJobs = allInternships.filter(i => !isRemoteKeyword(i.location));

      if (prefLocs.length > 0) {
        // Try narrowing by location: match any of the preferred locations
        const locMatch = officeJobs.filter(i => matchesLocation(i.location));
        // Fallback chain: locations → all office
        candidateInternships = locMatch.length >= 5 ? locMatch : officeJobs;
      } else {
        candidateInternships = officeJobs;
      }
    } else { // 'both'
      // Include remote + location-matching office jobs
      candidateInternships = allInternships.filter(i => {
        if (isRemoteKeyword(i.location)) return true;
        return matchesLocation(i.location);
      });
    }

    // ── LIGHTWEIGHT PRE-RANKING (Cheap filter to reduce Python burden) ──────────
    // This maintains accuracy by keeping the best candidates but speeds up AI analysis
    if (candidateInternships.length > 100) {
      const userSkillSet = studentProfile.skills.map(s => s.toLowerCase());

      const scoredCandidates = candidateInternships.map(job => {
        let kScore = 0;
        const jobText = (
          (job.role || '') + ' ' +
          (job.company || '') + ' ' +
          (job.skills_required || job.skills || '')
        ).toLowerCase();

        // Count keyword hits
        userSkillSet.forEach(skill => {
          if (jobText.includes(skill)) kScore += 1;
        });

        return { ...job, kScore };
      });

      // Sort by keyword relevance and take top 100 for deep semantic analysis
      candidateInternships = scoredCandidates
        .sort((a, b) => b.kScore - a.kScore)
        .slice(0, 100);
    }

    // If still wiped or empty (unlikely), fall back to a small set of allInternships
    if (candidateInternships.length === 0) candidateInternships = allInternships.slice(0, 20);

    console.log(`🚀 ACCELERATED MATCHING: Processing ${candidateInternships.length} candidates for ${name}...`);

    const pythonClient = require('../utils/pythonClient');

    try {
      // 1. Try calling the Python FastAPI service (Higher Reliability & Speed)
      console.log('📡 Calling Python FastAPI service...');
      const result = await pythonClient.match(studentProfile, candidateInternships, workPreference);

      if (result.success) {
        console.log(`✅ Success (API): Generated ${result.data.length} semantic matches.`);

        const formattedRecommendations = result.data.map((rec, index) => ({
          ...rec,
          id: rec.id,
          rank: index + 1,
          finalScore: (rec.match_score * 100).toFixed(0),
          matchPercentage: (rec.match_score * 100).toFixed(0) + '%',
          matchLabel: rec.match_score > 0.8 ? 'Excellent Match' : (rec.match_score > 0.6 ? 'Good Match' : 'Fair Match'),
          aiExplanation: rec.aiExplanation
        }));

        return res.json({
          success: true,
          studentName: name,
          recommendationCount: formattedRecommendations.length,
          recommendations: formattedRecommendations
        });
      }
    } catch (apiError) {
      console.warn('⚠️ Python FastAPI service unavailable, falling back to spawn process...');
    }

    // 2. Fallback to Spawn Python Process (Original Method)
    const pythonScript = path.join(__dirname, '../engine/matcher.py');
    const pythonProcess = spawn('python', [pythonScript]);

    let dataString = '';
    let errorString = '';
    let processEnded = false;

    // Hard timeout: kill Python if it takes > 90 seconds
    const killTimer = setTimeout(() => {
      if (!processEnded) {
        console.error('⏱️ Python process timed out after 90s — killing.');
        pythonProcess.kill('SIGKILL');
        if (!res.headersSent) {
          res.status(504).json({ success: false, error: 'Recommendation engine timed out. Please try again.' });
        }
      }
    }, 90000);

    // Send ONLY pre-filtered candidates to Python (much faster)
    const inputData = JSON.stringify({
      student: studentProfile,
      internships: candidateInternships,
      workPreference: workPreference
    });

    pythonProcess.stdin.write(inputData);
    pythonProcess.stdin.end();

    pythonProcess.stdout.on('data', (data) => {
      dataString += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorString += data.toString();
    });

    pythonProcess.on('close', (code) => {
      processEnded = true;
      clearTimeout(killTimer);
      if (code !== 0) {
        console.error(`Python script exited with code ${code}: ${errorString}`);
        if (!res.headersSent) {
          return res.status(500).json({ success: false, error: 'AI Matching Engine Failed', details: errorString });
        }
        return;
      }

      try {
        const jsonStartIndex = dataString.indexOf('{');
        const jsonEndIndex = dataString.lastIndexOf('}');

        if (jsonStartIndex === -1 || jsonEndIndex === -1) {
          throw new Error("No JSON found in output");
        }

        const jsonString = dataString.substring(jsonStartIndex, jsonEndIndex + 1);
        const result = JSON.parse(jsonString);

        if (result.success) {
          console.log(`✅ Success (Spawn): Generated ${result.data.length} semantic matches.`);

          const formattedRecommendations = result.data.map((rec, index) => ({
            ...rec,
            id: rec.id,
            rank: index + 1,
            finalScore: (rec.match_score * 100).toFixed(0),
            matchPercentage: (rec.match_score * 100).toFixed(0) + '%',
            matchLabel: rec.match_score > 0.8 ? 'Excellent Match' : (rec.match_score > 0.6 ? 'Good Match' : 'Fair Match'),
            aiExplanation: rec.aiExplanation
          }));

          if (!res.headersSent) {
            res.json({
              success: true,
              studentName: name,
              recommendationCount: formattedRecommendations.length,
              recommendations: formattedRecommendations
            });
          }
        } else {
          if (!res.headersSent) res.status(500).json(result);
        }
      } catch (e) {
        console.error('Failed to parse Python output:', e);
        if (!res.headersSent) {
          res.status(500).json({ success: false, error: 'AI Engine Error: ' + e.message });
        }
      }
    });


  } catch (error) {
    console.error('Controller Error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Error generating recommendations',
        message: error.message
      });
    }
  }
};

module.exports = {
  getRecommendations
};
