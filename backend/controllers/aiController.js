const pool = require('../config/database');
const { getDeterministicMatches } = require('../services/matchingService');
const { generateExplanations } = require('../services/aiExplanationService');
const { analyzeResume } = require('../services/resumeService');
const { generateCoverLetter } = require('../services/writerService');
const { generateInterviewResponse } = require('../services/interviewService');
const pythonClient = require('../utils/pythonClient');
const pdf = require('pdf-parse');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy");

const handleInterviewChat = async (req, res) => {
    try {
        const { history, role, company } = req.body;
        const responseText = await generateInterviewResponse(history || [], role, company);

        // Try to save to DB if user is authenticated (sent from frontend as Bearer token)
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const admin = require('../config/firebase');
                const decodedToken = await admin.auth().verifyIdToken(token);
                const userId = decodedToken.uid;

                const chatJson = JSON.stringify([...history, { sender: 'model', text: responseText }]);
                await pool.query(
                    `INSERT INTO ai_interview_chats (user_id, role, company, chat_history)
                     VALUES ($1, $2, $3, $4)
                     ON CONFLICT (user_id, role, company)
                     DO UPDATE SET chat_history = $4, updated_at = CURRENT_TIMESTAMP`,
                    [userId, role, company, chatJson]
                );
            } catch (authErr) {
                console.warn('⚠️ Interview persistence failed (auth):', authErr.message);
            }
        }

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

        try {
            const result = await pythonClient.generateProjectIdeas(skill, company);
            if (result && result.success) return res.json(result);
        } catch (pyError) {
            console.warn("⚠️ Python failed for project ideas, falling back to Node AI...", pyError.message);
        }

        // --- NODE FALLBACK ---
        const cleanSkill = skill.replace('Development', '').replace('Internship', '').trim() || "Technical Implementation";
        const cName = company || "this company";

        try {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const prompt = `You are a creative technical mentor. 
A student needs to master '${cleanSkill}' to impress recruiters at '${cName}'.
Generate 3 UNIQUE, PROBLEM-SOLVING project ideas for 2024.
Rules:
1. Every idea MUST revolve around '${cleanSkill}'.
2. Solve a REAL-WORLD problem.
FORMAT (JSON ONLY):
{
    "ideas": [
        "Project Title: Problem it solves + 1-sentence tech implementation",
        "Project Title: Problem it solves + 1-sentence tech implementation",
        "Project Title: Problem it solves + 1-sentence tech implementation"
    ]
}`;
            const response = await model.generateContent(prompt);
            let content = response.response.text().replace(/```json|```/g, '').trim();
            const start = content.indexOf("{");
            const end = content.lastIndexOf("}");
            if (start !== -1 && end !== -1) content = content.substring(start, end + 1);

            return res.json({ success: true, data: JSON.parse(content) });
        } catch (aiErr) {
            console.error("Node AI Fallback also failed:", aiErr.message);
            // Absolute final static fallback
            return res.json({
                success: true,
                data: {
                    ideas: [
                        `2024 ${cleanSkill} Edge Solution: Low-latency implementation for ${cName}.`,
                        `Privacy-First ${cleanSkill} Interface: Secure data portal for users.`,
                        `Next-Gen ${cleanSkill} Bot: Automated problem-solver for the current market.`
                    ]
                }
            });
        }
    } catch (error) {
        console.error("Project Ideas Error:", error);
        res.status(500).json({ success: false, error: "Failed to generate ideas" });
    }
};

const handleDreamRoadmap = async (req, res) => {
    try {
        const { student, company, resume_text } = req.body;
        console.log(`🎯 [Dream Roadmap] Generating for ${company}... (Resume: ${resume_text ? 'Yes' : 'No'})`);

        if (!company) return res.status(400).json({ success: false, error: "Company name is required" });

        try {
            const result = await pythonClient.generateDreamRoadmap(student, company, resume_text);
            if (result && result.success) return res.json(result);
        } catch (pyError) {
            console.warn("⚠️ Python failed for dream roadmap, falling back to Node AI...", pyError.message);
        }

        // --- NODE FALLBACK ---
        try {
            const cName = company || "a top tech company";
            const skills = student?.skills ? student.skills.join(", ") : "general tech skills";
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const prompt = `You are a Silicon Valley Technical Career Coach. A student targeting ${cName} needs a roadmap.
Their skills: ${skills}.
TASK: Output a JSON ONLY object mapping a roadmap.
FORMAT:
{
  "company": "${cName}",
  "readiness": 45,
  "summary": "You have a solid foundation but need to align closer to ${cName}'s tech stack.",
  "required_skills": ["Data Structures", "System Design"],
  "your_skills": ["${skills.split(",")[0] || 'Basics'}"],
  "missing_skills": ["Advanced Architecture"],
  "phases": [
    {
      "title": "Phase 1: Foundations",
      "duration": "2 weeks",
      "action": "Master core concepts required at ${cName}.",
      "outcome": "Strong fundamentals."
    },
    {
      "title": "Phase 2: Execution",
      "duration": "4 weeks",
      "action": "Build a scalable project.",
      "outcome": "Portfolio piece."
    }
  ],
  "moonshot_project": "Build an Internal-Tool Replica using modern stacks.",
  "hiring_insight": "Focus heavily on scalability during interviews."
}`;
            const response = await model.generateContent(prompt);
            let content = response.response.text().replace(/```json|```/g, '').trim();
            const start = content.indexOf("{");
            const end = content.lastIndexOf("}");
            if (start !== -1 && end !== -1) content = content.substring(start, end + 1);

            return res.json({ success: true, data: JSON.parse(content) });
        } catch (aiErr) {
            console.error("Node AI Fallback for Roadmap also failed:", aiErr.message);
            // Absolute final static fallback
            return res.json({
                success: true,
                data: {
                    company: company,
                    readiness: 30,
                    summary: "This roadmap provides a generic trajectory as direct AI is currently resting.",
                    required_skills: ["System Design", "Cloud Architecture"],
                    your_skills: student?.skills || [],
                    missing_skills: ["Scale & Optimization"],
                    phases: [
                        { title: "Phase 1", duration: "2 weeks", action: "Focus on Data Structures.", outcome: "Algorithm fluency." },
                        { title: "Phase 2", duration: "3 weeks", action: "Learn Cloud Deployments.", outcome: "Production readiness." }
                    ],
                    moonshot_project: "Scalable Task Engine",
                    hiring_insight: "Always prepare for behavioral rounds alongside technical."
                }
            });
        }
    } catch (error) {
        console.error("❌ [Dream Roadmap] Error:", error.message);
        res.status(500).json({ success: false, error: "Failed to generate roadmap: " + error.message });
    }
};

module.exports = {
    getAIRecommendations,
    handleResumeAnalysis,
    handleResumeUpload,
    handleCoverLetter,
    handleInterviewChat,
    handleMatchExplanation,
    handleProjectIdeas,
    handleDreamRoadmap
};


