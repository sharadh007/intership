const { GoogleGenerativeAI } = require("@google/generative-ai");
const Groq = require("groq-sdk");
require('dotenv').config();

// Initialize Gemini
const geminiApiKey = process.env.GEMINI_RESUME_API_KEY || process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(geminiApiKey);

// Initialize Groq
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

console.log(`[Resume Service] Gemini Key: ...${geminiApiKey ? geminiApiKey.slice(-4) : 'NONE'}`);
console.log(`[Resume Service] Groq Key: ...${process.env.GROQ_API_KEY ? process.env.GROQ_API_KEY.slice(-4) : 'NONE'}`);

// Common Prompt for both AIs
const systemPrompt = `
    You are an AI Resume Analyzer.
    Extract structured intelligence from the resume and return a STRICT JSON object.

    IMPORTANT:
    - Output ONLY valid JSON.
    - Do NOT include any explanations, markdown formatting (like \`\`\`json), or conversational text.
    - If a field is not found, use null or empty string/array as appropriate.
    
    OUTPUT SCHEMA:
    {
      "fullName": "Name detected",
      "email": "Email detected",
      "phone": "Phone detected",
      "location": "City, State",
      "extractedSkills": ["skill1", "skill2"],
      "domains": ["domain1", "domain2"],
      "experienceLevel": "Entry/Intermediate/Senior",
      "experienceYears": 0,
      "educationLevel": "High School/Bachelor/Master/PhD",
      "education": "Degree Name",
      "toolsAndTechnologies": ["tool1", "tool2"],
      "softSkills": ["softSkill1", "softSkill2"],
      "resumeStrengthScore": 0 (Integer 0-100)
    }
`;

const analyzeResume = async (resumeText) => {
    console.log("📝 [Resume Service] Starting analysis...");

    // 1. Backend Validation
    if (!resumeText || resumeText.length < 50) {
        console.warn("⚠️ [Resume Service] Resume text too short:", resumeText ? resumeText.length : 0);
        const error = new Error("Resume text is too short or empty.");
        error.statusCode = 400;
        throw error;
    }

    try {
        // --- ATTEMPT 1: GEMINI ---
        console.log("🚀 [Resume Service] Attempting with Gemini...");

        // USING gemini-pro (Gemini 1.0 Pro) as it is widely supported and stable.
        // gemini-1.5-flash was reporting decommissioned/error errors in this environment.
        const model = genAI.getGenerativeModel({
            model: "gemini-pro",
            generationConfig: { responseMimeType: "application/json" }
        });

        const prompt = `${systemPrompt}\n\nRESUME CONTENT:\n${resumeText}`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        console.log("✅ [Resume Service] Gemini Success");

        const data = JSON.parse(text);
        return data;

    } catch (geminiError) {
        console.warn("⚠️ [Resume Service] Gemini Failed.");
        console.warn(`Error Details: ${geminiError.message}`);

        // --- ATTEMPT 2: GROQ (FALLBACK) ---
        console.log("🔄 [Resume Service] Falling back to Groq LLaMA 3...");

        try {
            // Using llama-3.1-8b-instant as llama3-8b-8192 is decommissioned
            const completion = await groq.chat.completions.create({
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `RESUME CONTENT:\n${resumeText}` }
                ],
                model: "llama-3.1-8b-instant",
                temperature: 0.1,
                response_format: { type: "json_object" }
            });

            const text = completion.choices[0]?.message?.content || "";
            console.log("✅ [Resume Service] Groq Success (Fallback)");

            const cleanedText = text.replace(/```json|```/g, '').trim();
            const data = JSON.parse(cleanedText);
            return data;

        } catch (groqError) {
            console.error("❌ [Resume Service] FINAL FAILURE: Both AI Services Failed.");
            console.error("--- Gemini Error ---");
            console.error(geminiError.message);
            console.error("--- Groq Error ---");
            console.error(groqError.message);
            if (groqError.error) console.error("Groq Error Details:", JSON.stringify(groqError.error, null, 2));

            // Determine if it was a rate limit
            let statusCode = 500;
            let errorMessage = "AI Service Failed - Please try again later.";

            if ((geminiError.message && geminiError.message.includes("429")) || (groqError.status === 429)) {
                statusCode = 429;
                errorMessage = "System Overload: Both AI models are busy. Please wait a minute.";
            }

            const customError = new Error(errorMessage);
            customError.statusCode = statusCode;
            throw customError;
        }
    }
};

module.exports = { analyzeResume };
