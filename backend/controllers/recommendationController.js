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
    // Note: If table columns differ from JSON, we map them below.
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
      console.log(`   Score: ${rec.finalScore} | LocScore: ${rec.locationScore} | StateMismatch: ${rec.isStateMismatch}`);
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
        matchScore: rec.finalScore,
        matchPercentage: rec.matchScore + '%',
        matchLabel: rec.matchLabel
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
