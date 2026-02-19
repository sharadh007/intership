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
    const prefLoc = (preferredState || '').toLowerCase().trim();
    const isRemoteKeyword = (loc) => {
      const l = (loc || '').toLowerCase();
      return l.includes('remote') || l.includes('work from home') || l.includes('wfh') || l.includes('work-from-home');
    };

    let candidateInternships = allInternships;

    if (workPreference === 'remote') {
      // Only send remote jobs to Python
      candidateInternships = allInternships.filter(i => isRemoteKeyword(i.location));
    } else if (workPreference === 'office') {
      // Exclude all WFH/remote jobs
      const officeJobs = allInternships.filter(i => !isRemoteKeyword(i.location));

      if (prefLoc && prefLoc !== 'any') {
        // Try narrowing by location: city match, then state, then all office
        const cityMatch = officeJobs.filter(i =>
          (i.location || '').toLowerCase().includes(prefLoc) ||
          prefLoc.includes((i.location || '').toLowerCase())
        );
        // Fallback chain: city → all office
        candidateInternships = cityMatch.length >= 5 ? cityMatch : officeJobs;
      } else {
        candidateInternships = officeJobs;
      }
    } else { // 'both'
      // Include remote + location-matching office jobs
      candidateInternships = allInternships.filter(i => {
        if (isRemoteKeyword(i.location)) return true;
        if (!prefLoc || prefLoc === 'any') return true;
        const loc = (i.location || '').toLowerCase();
        return loc.includes(prefLoc) || prefLoc.includes(loc) || loc.includes('pan india');
      });
      if (candidateInternships.length === 0) candidateInternships = allInternships;
    }

    // If JS pre-filter wiped everything, fall back to all (Python will handle it)
    if (candidateInternships.length === 0) candidateInternships = allInternships;

    console.log(`🧠 PYTHON RAG ENGINE: ${candidateInternships.length}/${allInternships.length} internships selected for ${name} (${workPreference}, loc: ${prefLoc || 'any'})...`);

    // 2. Spawn Python Process
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
          console.log(`✅ Success: Generated ${result.data.length} semantic matches.`);

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
        console.error('Raw Output was:', dataString);
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
