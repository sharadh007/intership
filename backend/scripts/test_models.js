const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config(); // Defaults to .env in current directory


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Just to get the object, though we use the ref for listModels if available or just try standard ones.

        // The SDK doesn't expose listModels directly on the instance easily in all versions, 
        // but we can try to find documentation or just test a few common ones.
        // Actually, for newer SDKs:
        // console.log(await genAI.listModels()); 
        // Wait, checked docs, it's not always direct.

        console.log("Testing common model names...");
        const modelsToTest = ["gemini-1.5-flash", "gemini-1.5-flash-001", "gemini-1.5-pro", "gemini-pro", "gemini-1.0-pro"];

        for (const modelName of modelsToTest) {
            try {
                console.log(`Testing ${modelName}...`);
                const m = genAI.getGenerativeModel({ model: modelName });
                const result = await m.generateContent("Hello");
                console.log(`✅ ${modelName} is working.`);
                break; // Found one
            } catch (e) {
                console.log(`❌ ${modelName} failed: ${e.message.split('\n')[0]}`);
            }
        }

    } catch (error) {
        console.error("Error:", error);
    }
}

listModels();
