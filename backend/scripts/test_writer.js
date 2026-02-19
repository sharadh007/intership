const { generateCoverLetter } = require('../services/writerService');
require('dotenv').config();

async function testCoverLetter() {
    console.log("Testing generateCoverLetter...");
    try {
        const result = await generateCoverLetter(
            "Test Student",
            ["JavaScript", "Node.js"],
            "Frontend Developer",
            "Test Corp"
        );
        console.log("✅ Success! Result:", result);
    } catch (error) {
        console.error("❌ Failed:", error.message);
    }
}

testCoverLetter();
