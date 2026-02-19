
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_RESUME_API_KEY || process.env.GEMINI_API_KEY);

async function run() {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // dummy
        // Actually need to access model manager? 
        // The JS SDK doesn't expose listModels easily on the main client instance in some versions.
        // But let's try a simple fetch to the list endpoint if SDK fails.

        console.log("Using Key ending in:", (process.env.GEMINI_API_KEY || '').slice(-5));

        // Direct REST call to list models
        const key = process.env.GEMINI_RESUME_API_KEY || process.env.GEMINI_API_KEY;
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.error("ListModels Error:", data.error);
        } else {
            console.log("Available Models:");
            data.models.forEach(m => {
                if (m.supportedGenerationMethods.includes("generateContent")) {
                    console.log(`- ${m.name} (${m.displayName})`);
                }
            });
        }

    } catch (e) {
        console.error("Error:", e);
    }
}
run();
