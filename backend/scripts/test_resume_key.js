const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') }); // Resolve relative to script file to be safe

const apiKey = process.env.GEMINI_API_KEY;
console.log("Using API Key (last 4 chars):", apiKey ? apiKey.slice(-4) : 'None');

const genAI = new GoogleGenerativeAI(apiKey);

async function testModel(modelName) {
    console.log(`\nTesting model: ${modelName}...`);
    try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Hello?");
        console.log(`✅ ${modelName} Success! Response: ${result.response.text()}`);
    } catch (error) {
        console.error(`❌ ${modelName} Failed:`, error.message);
        if (error.status) console.error(`   Status: ${error.status} ${error.statusText}`);
    }
}

async function runTests() {
    await testModel("gemini-1.5-flash");
}

runTests();
