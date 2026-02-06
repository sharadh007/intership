
const { generateCoverLetter } = require('../services/writerService');
require('dotenv').config({ path: '../.env' }); // Adjust path if running from scripts/

async function test() {
    console.log("Testing generateCoverLetter...");
    try {
        const result = await generateCoverLetter(
            "John Doe",
            ["JavaScript", "React", "Node.js"],
            "Frontend Developer",
            "Tech Corp"
        );
        console.log("Success:", result);
    } catch (error) {
        console.error("Test Failed:", error);
    }
}

test();
