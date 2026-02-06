
const { generateInterviewResponse } = require('../services/interviewService');
require('dotenv').config({ path: '../.env' });

async function test() {
    console.log("Testing generateInterviewResponse...");
    try {
        const result = await generateInterviewResponse(
            [], "Software Engineer", "Google"
        );
        console.log("Success:", result);
    } catch (error) {
        console.error("Interview Test Failed:", error);
    }
}

test();
