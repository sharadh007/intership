const pool = require('../config/database');
const { getDeterministicMatches } = require('../services/matchingService');
const { generateExplanations } = require('../services/aiExplanationService');
const { analyzeResume } = require('../services/resumeService');
const { generateCoverLetter } = require('../services/writerService');
const { generateInterviewResponse } = require('../services/interviewService');

const handleInterviewChat = async (req, res) => {
    try {
        const { history, role, company } = req.body;
        const responseText = await generateInterviewResponse(history || [], role, company);
        res.json({ success: true, data: { reply: responseText } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

const handleCoverLetter = async (req, res) => {
    try {
        const { userName, skills, role, company } = req.body;
        const result = await generateCoverLetter(userName, skills, role, company);
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

const handleResumeAnalysis = async (req, res) => {
    try {
        const { resumeText } = req.body;

        console.log("📥 [AI Controller] Received Analysis Request");

        if (!resumeText) {
            return res.status(400).json({ success: false, error: "No resume text provided" });
        }

        const result = await analyzeResume(resumeText);

        // 📝 FUTURE: Save 'result' to User Profile in DB
        // For now, we simulate this by returning it to frontend to store in local/session state
        // if (req.user) { await updateUserProfile(req.user.id, result); }

        console.log("✅ [AI Controller] Resume Analysis Complete");

        res.json({ success: true, data: result });

    } catch (error) {
        console.error("❌ [AI Controller] Error:", error.message);
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
            success: false,
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

const getAIRecommendations = async (req, res) => {
    try {
        const { uid, name, skills, preferredState, qualification, cgpa } = req.body;

        // 1. Fetch Student Profile (if not fully provided in body, fetch from DB)
        // For now, trust the frontend body or merge. 
        // Ensure skills is array
        const student = {
            uid,
            name,
            skills: Array.isArray(skills) ? skills : (skills || '').split(','),
            preferred_state: preferredState,
            qualification,
            cgpa: cgpa || 7.5 // Default if missing
        };

        // 2. Fetch All Internships from DB
        const result = await pool.query('SELECT * FROM internships');
        const allInternships = result.rows;

        if (allInternships.length === 0) {
            return res.json({ success: true, recommendations: [] });
        }

        // 3. Run Deterministic Matching Engine
        // (Filter -> Score -> Sort -> Top 5)
        const topMatches = await getDeterministicMatches(student, allInternships);

        // 4. Generate AI Explanations for these Top 5
        const finalResults = await generateExplanations(student, topMatches);

        res.json({
            success: true,
            recommendations: finalResults
        });

    } catch (error) {
        console.error("Matching Error:", error);
        res.status(500).json({
            success: false,
            error: "Recommendation Engine Failed",
            message: error.message
        });
    }
};

module.exports = { getAIRecommendations, handleResumeAnalysis, handleCoverLetter, handleInterviewChat };
