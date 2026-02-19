const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const generateCoverLetter = async (usersName, usersSkills, internshipTitle, companyName) => {
    // List of models to try in order - Updated to match interviewService
    const modelNames = ["gemini-2.0-flash", "gemini-2.5-flash"];

    let lastError = null;

    for (const modelName of modelNames) {
        try {
            // console.log(`Attempting Cover Letter Gen with model: ${modelName}`);
            const model = genAI.getGenerativeModel({ model: modelName });

            // Validate Inputs
            if (!usersSkills || !Array.isArray(usersSkills)) {
                usersSkills = typeof usersSkills === 'string' ? [usersSkills] : [];
            }

            const prompt = `
            Write a professional, short, and persuasive cover letter.
            
            Candidate: ${usersName || 'Candidate'}
            Skills: ${usersSkills.length > 0 ? usersSkills.join(', ') : 'General Skills'}
            
            Applying for: ${internshipTitle}
            Company: ${companyName}
            
            Requirements:
            - Strict JSON output: { "subject": "Encouraging subject line", "body": "The cover letter text" }
            - Tone: Enthusiastic and Professional.
            - Length: Under 200 words.
            - Highlight matches between skills and the role.
            - IMPORTANT: Output ONLY valid JSON. No Markdown. No enclosing backticks.
            `;

            const result = await model.generateContent(prompt);
            const text = result.response.text();

            // Clean markdown if present (Gemini often adds ```json ... ```)
            const jsonStr = text.replace(/```json|```/g, '').trim();

            // Validate JSON parsing
            try {
                const parsed = JSON.parse(jsonStr);
                return parsed; // Success, return immediately
            } catch (parseError) {
                console.warn(`Model ${modelName} generated invalid JSON. Retrying...`);
                lastError = new Error(`Model ${modelName} generated invalid JSON`);
                // Continue to next model
                continue;
            }

        } catch (error) {
            console.warn(`Model ${modelName} failed: ${error.message}`);
            lastError = error;
            // Continue to next model
        }
    }

    // If all fail
    // If all fail
    console.error("All AI models failed for Cover Letter.");

    if (lastError) {
        if (lastError.status === 429 || (lastError.response && lastError.response.status === 429) || lastError.message.includes('429')) {
            const limitError = new Error("AI Usage Limit Exceeded. Please try again in a minute.");
            limitError.statusCode = 429;
            throw limitError;
        }
    }

    throw new Error(lastError ? lastError.message : "Failed to generate cover letter. Please try again later.");
};

module.exports = { generateCoverLetter };
