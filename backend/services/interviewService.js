const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const generateInterviewResponse = async (history, role, company) => {
    try {
        const systemPrompt = `
        You are an expert AI Interview Coach helping students prepare for internship interviews across India.
        Your goal is to conduct a professional mock interview for the role of "${role}" at "${company}".
        
        Guidelines:
        1. Be encouraging but professional.
        2. Ask ONE question at a time.
        3. Rate the user's previous answer (if any) briefly before moving to the next question.
        4. Focus on behavioral (STAR method) and technical questions relevant to ${role}.
        5. Keep responses concise (under 100 words).
        6. Start by introducing yourself and asking the first question if history is empty.
        `;

        // Separate the latest user message from the past history
        let previousHistory = [];
        let currentMessage = "Hello, I am ready to start the interview.";

        if (history && history.length > 0) {
            const lastMsg = history[history.length - 1];
            if (lastMsg.sender === 'user') {
                currentMessage = lastMsg.text;
                previousHistory = history.slice(0, -1);
            } else {
                previousHistory = history;
                currentMessage = "Please continue.";
            }
        }

        const formattedHistory = [
            {
                role: "user",
                parts: [{ text: `System Instruction: ${systemPrompt}` }]
            },
            {
                role: "model",
                parts: [{ text: "Understood. I am ready to conduct the interview as the coach." }]
            },
            ...previousHistory.map(msg => ({
                role: msg.sender === 'user' ? 'user' : 'model',
                parts: [{ text: msg.text }]
            }))
        ];

        // Fallback logic for models
        // Updated based on available models for this specific API key (Gemini 2.x)
        const modelNames = ["gemini-2.0-flash", "gemini-2.5-flash"];

        // Try models
        for (const modelName of modelNames) {
            try {
                // console.log(`Trying model: ${modelName}`);
                const model = genAI.getGenerativeModel({ model: modelName });
                const chatSession = model.startChat({ history: formattedHistory });
                const result = await chatSession.sendMessage(currentMessage);
                const text = result.response.text();
                return text; // Success
            } catch (e) {
                console.warn(`Model ${modelName} failed:`, e.message);
                // Continue to next model
            }
        }

        throw new Error("All AI models failed to generate a response. Please check API key or quotas.");

    } catch (error) {
        console.error("Interview Coach Error:", error);

        let statusCode = 500;
        let message = "Failed to generate interview response";

        if (error.status === 429 || (error.response && error.response.status === 429) || error.message.includes('429')) {
            statusCode = 429;
            message = "AI Usage Limit Exceeded. Please try again in a minute.";
            const limitError = new Error(message);
            limitError.statusCode = 429;
            throw limitError;
        }

        throw new Error(message + ": " + error.message);
    }
};

module.exports = { generateInterviewResponse };
