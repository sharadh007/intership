const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const run = async () => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        console.error("No API KEY found!");
        process.exit(1);
    }
    console.log("Using Key length:", key.length);

    try {
        const genAI = new GoogleGenerativeAI(key);
        // Try flash first
        console.log("Testing gemini-1.5-flash...");
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Hello, are you there?");
        console.log("Success with flash:", result.response.text());
        process.exit(0);
    } catch (e) {
        console.error("Flash failed:", e.message);

        try {
            // Fallback to gemini-pro
            console.log("Testing gemini-pro...");
            const genAI = new GoogleGenerativeAI(key);
            const model = genAI.getGenerativeModel({ model: "gemini-pro" });
            const result = await model.generateContent("Hello?");
            console.log("Success with pro:", result.response.text());
            process.exit(0);
        } catch (e2) {
            console.error("Pro failed:", e2.message);
            process.exit(1);
        }
    }
};

run();
