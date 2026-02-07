const matchingAlgorithm = require('../utils/matchingAlgorithm');
const pool = require('../config/database'); // Use Postgres Connection

// Get personalized recommendations for a student
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
      cgpa
    } = req.body;

    // Validation
    if (!name || !age || !qualification || !skills || !preferredState) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['name', 'age', 'qualification', 'skills', 'preferredState']
      });
    }

    const studentProfile = {
      name,
      age,
      qualification,
      skills: Array.isArray(skills) ? skills : (skills ? [skills] : []),
      resumeData: req.body.resumeData || null,
      preferredSector: preferredSector || 'Technology',
      preferredState,
      preferredDuration: req.body.preferredDuration,
      college: college || 'Not specified',
      cgpa: cgpa ? parseFloat(cgpa) : null
    };

    // 1. Fetch Internships from PostgreSQL
    const internshipQuery = `
      SELECT * FROM internships 
      WHERE verification_status = 'verified'
    `;
    const result = await pool.query(internshipQuery);
    const allInternships = result.rows;


    // 2. Use enhanced matching algorithm
    const recommendations = matchingAlgorithm.getRankedRecommendations(
      studentProfile,
      allInternships,
      10 // Increased limit to 10
    );

    // DEBUG: Log the top recommendations to see why they were picked
    console.log(`\n--- Recommendation Debug [User: ${name}, Loc: ${preferredState}] ---`);
    recommendations.slice(0, 3).forEach((rec, i) => {
      console.log(`#${i + 1} ${rec.company} (${rec.location})`);
      console.log(`   Score: ${rec.finalScore}% | LocTier: ${rec.locationTier} (${rec.locationLabel}) | Skills: ${rec.totalSkillMatches} matches`);
      console.log(`   Breakdown: Resume=${rec.resumeSkillScore}%, Profile=${rec.profileSkillScore}%, Edu=${rec.educationScore}%, Loc=${rec.locationScore}%`);
    });
    console.log("----------------------------------------------------------------\n");

    res.json({
      success: true,
      studentName: name,
      recommendationCount: recommendations.length,
      recommendations: recommendations.map((rec, index) => ({
        rank: index + 1,
        id: rec.id,
        company: rec.company,
        role: rec.role,
        location: rec.location,
        sector: rec.sector,
        stipend: rec.stipend,
        duration: rec.duration,
        description: rec.description,
        skills: rec.skills,
        perks: rec.perks,
        intern_type: rec.intern_type,
        requirements: rec.requirements,
        hiring_since: rec.hiring_since,
        opening: rec.opening,
        number_of_applications: rec.number_of_applications,
        hired_candidate: rec.hired_candidate,
        website_link: rec.website_link,
        // Matching metadata
        finalScore: rec.finalScore,
        matchPercentage: rec.finalScore,
        matchLabel: rec.matchLabel,
        locationTier: rec.locationTier,
        locationLabel: rec.locationLabel,
        locationScore: rec.locationScore,
        totalSkillMatches: rec.totalSkillMatches,
        hasMinimumSkills: rec.hasMinimumSkills,
        resumeSkillScore: rec.resumeSkillScore,
        profileSkillScore: rec.profileSkillScore,
        educationScore: rec.educationScore
      }))
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error generating recommendations',
      message: error.message
    });
  }
};

module.exports = {
  getRecommendations
};
