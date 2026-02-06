
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_RESUME_API_KEY || process.env.GEMINI_API_KEY);

async function run() {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        console.log("Generating with gemini-2.0-flash...");
        const result = await model.generateContent("Say hello");
        console.log("Response:", result.response.text());
    } catch (e) {
        console.error("Gen Error:", e);
    }
}
run();
