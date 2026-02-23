const pool = require('../config/database');
const { getDeterministicMatches } = require('../services/matchingService');
const { generateExplanations } = require('../services/aiExplanationService');
const { analyzeResume } = require('../services/resumeService');
const { generateCoverLetter } = require('../services/writerService');
const { generateInterviewResponse } = require('../services/interviewService');
const pythonClient = require('../utils/pythonClient');
const pdf = require('pdf-parse');


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

const handleResumeUpload = async (req, res) => {
    try {
        if (!req.file) {
            console.error("❌ [AI Controller] No file in request");
            return res.status(400).json({ success: false, error: "No file uploaded" });
        }

        console.log(`📥 [AI Controller] PDF Upload: ${req.file.originalname} (${req.file.size} bytes)`);

        let resumeText;
        try {
            console.log("📄 [AI Controller] Parsing PDF buffer...");
            const pdfData = await pdf(req.file.buffer);
            resumeText = pdfData.text;
            console.log(`✅ [AI Controller] PDF Parse Success (${resumeText.length} chars)`);
        } catch (pdfError) {
            console.error("❌ [AI Controller] PDF Parsing Error:", pdfError.message);
            return res.status(500).json({ success: false, error: "PDF Parsing Failed: " + pdfError.message });
        }

        if (!resumeText || resumeText.length < 50) {
            return res.status(400).json({ success: false, error: "Could not extract sufficient text from PDF" });
        }

        console.log("📡 [AI Controller] Extracting data from PDF text...");
        let result;
        try {
            const pyResult = await pythonClient.analyzeResume(resumeText);
            result = pyResult.data;
        } catch (pyError) {
            console.warn("⚠️ [AI Controller] Python service failed, falling back to basic Node.js analysis...");
            try {
                result = await analyzeResume(resumeText);
            } catch (fallbackError) {
                console.error("❌ [AI Controller] Fallback Analysis Error:", fallbackError.message);
                throw fallbackError;
            }
        }

        res.json({ success: true, data: result });

    } catch (error) {
        console.error("❌ [AI Controller] Fatal Upload Error:", error);
        res.status(500).json({ success: false, error: error.message || "Internal Server Error" });
    }
};

const handleResumeAnalysis = async (req, res) => {
    try {
        const { resumeText } = req.body;

        console.log("📥 [AI Controller] Received Analysis Request");


        if (!resumeText) {
            return res.status(400).json({ success: false, error: "No resume text provided" });
        }

        let result;
        try {
            console.log("📡 Calling Python service for advanced NLP parsing...");
            const pyResult = await pythonClient.analyzeResume(resumeText);
            result = pyResult.data;
        } catch (pyError) {
            console.warn("⚠️ Python service failed, falling back to basic Node.js analysis...");
            result = await analyzeResume(resumeText);
        }

        console.log("✅ [AI Controller] Resume Analysis Complete");
        res.json({ success: true, data: result });

    } catch (error) {
        console.error("❌ [AI Controller] Error:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
};

const getAIRecommendations = async (req, res) => {
    try {
        const {
            uid, name, skills, preferredState, qualification, cgpa,
            experience, workMode, stipend, duration, interests,
            college, gradYear, availability
        } = req.body;

        const student = {
            uid,
            name,
            skills: Array.isArray(skills) ? skills : (skills || '').split(',').map(s => s.trim()),
            preferred_state: preferredState,
            preferredState: preferredState,
            qualification,
            cgpa: cgpa || 7.5,
            experience: experience || 0,
            work_mode: workMode || 'Any',
            stipend_pref: stipend || 0,
            duration_pref: duration || 'Any',
            interests: interests || '',
            college: college || '',
            grad_year: gradYear || '',
            availability: availability || 'Full-time',
            resume_text: req.body.resumeText || ''
        };

        const result = await pool.query('SELECT * FROM internships');
        const allInternships = result.rows;

        if (allInternships.length === 0) {
            return res.json({ success: true, recommendations: [] });
        }

        try {
            console.log("📡 Calling Python service for advanced matching...");
            const pyMatch = await pythonClient.match(student, allInternships, 'both');
            if (pyMatch.success) {
                const topTen = (pyMatch.data || []).slice(0, 10);
                return res.json({
                    success: true,
                    recommendations: topTen
                });
            }
        } catch (pyError) {
            console.warn("⚠️ Python service matching failed, falling back to legacy engine...");
        }

        // Fallback - already returns top 10 via getDeterministicMatches
        const topMatches = await getDeterministicMatches(student, allInternships);
        const finalResults = await generateExplanations(student, topMatches);

        res.json({
            success: true,
            recommendations: finalResults.slice(0, 10)
        });

    } catch (error) {
        console.error("Matching Error:", error);
        res.status(500).json({ success: false, error: "Recommendation Engine Failed", message: error.message });
    }
};


const handleMatchExplanation = async (req, res) => {
    try {
        const { student, internship } = req.body;

        if (!student || !internship) {
            return res.status(400).json({ success: false, error: "Missing student or internship data" });
        }

        console.log(`🤖 [AI Controller] Explaining Match: ${internship.role} @ ${internship.company}`);

        // Reuse existing service (expects array)
        const explainedInternships = await generateExplanations(student, [internship]);

        if (explainedInternships && explainedInternships.length > 0) {
            res.json({ success: true, explanation: explainedInternships[0].aiExplanation });
        } else {
            throw new Error("Failed to generate explanation");
        }

    } catch (error) {
        console.error("❌ [AI Controller] Explanation Error:", error);
        res.status(500).json({ success: false, error: "AI Explanation Failed" });
    }
};

const handleProjectIdeas = async (req, res) => {
    try {
        const { skill, company } = req.body;
        if (!skill) return res.status(400).json({ success: false, error: "Skill is required" });

        const result = await pythonClient.generateProjectIdeas(skill, company);
        res.json(result);
    } catch (error) {
        console.error("Project Ideas Error:", error);
        res.status(500).json({ success: false, error: "Failed to generate ideas" });
    }
};

module.exports = { getAIRecommendations, handleResumeAnalysis, handleResumeUpload, handleCoverLetter, handleInterviewChat, handleMatchExplanation, handleProjectIdeas };


