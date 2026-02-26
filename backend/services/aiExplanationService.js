const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy");

// Helper to generate a fallback 'Road to 100%' roadmap when Python AI is unavailable
const attachRoadmap = (internship) => {
    let roadmap = null;
    const missing = internship.missingSkills || [];

    if (missing.length > 0) {
        const topMissing = missing[0];
        roadmap = {
            summary: `Bridge the gap for ${topMissing}.`,
            days: [
                {
                    day: 1,
                    topic: "Skill Sync",
                    action: `Master the core principles of ${topMissing} via YouTube tutorials`,
                    link: `https://www.youtube.com/results?search_query=learn+${encodeURIComponent(topMissing)}`
                },
                {
                    day: 2,
                    topic: "Project Proof",
                    action: `Build a real-world ${topMissing} solution to showcase your expertise`,
                    link: ""
                }
            ]
        };
    }
    return roadmap;
};

// Helper for Smart Fallback (Structure matching output constraints)
const generateSmartFallback = (student, internship) => {
    // Basic logic to generate a structured backup explanation
    const matchedSkills = student.skills.filter(s => {
        const escapedSkill = s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escapedSkill}\\b`, 'i');
        return regex.test(internship.skills || "") || regex.test(internship.requirements || "");
    });

    // Default fallback structure
    const prefLoc = (student.preferred_state || student.preferredState || "").toLowerCase();
    const jobLoc = (internship.location || "").toLowerCase();

    let locationFeedback = `Located in ${internship.location}, a key tech hub.`;
    if (prefLoc && jobLoc.includes(prefLoc)) {
        locationFeedback = "The location matches your direct preference.";
    } else if (prefLoc.includes('tamil nadu') && (jobLoc.includes('chennai') || jobLoc.includes('coimbatore') || jobLoc.includes('salem'))) {
        locationFeedback = "This is a key regional opportunity within Tamil Nadu.";
    }

    return {
        summary: "This internship is a strong match for your skills and career interests.",
        reasons: [
            matchedSkills.length > 0 ? `Your skills in ${matchedSkills.join(', ')} align with the job requirements.` : "Your educational background is a good fit.",
            locationFeedback,
            "The duration fits the standard internship timeline."
        ],
        limitations: matchedSkills.length < 3 ? "Expanding your technical portfolio could improve your score." : "No significant limitations found.",
        // Keeping improvements as extra value even if not strictly in JSON example, 
        // as user text requested 'HOW to improve'.
        improvements: [
            "Complete a skill assessment for this role.",
            "Add a relevant project to your profile."
        ]
    };
};

const callGemini = async (model, student, internships) => {
    // Strictly formatted Prompt
    const prompt = `
    You are an explanation assistant inside an internship matching platform.

    Rules you must follow strictly:
    - You do NOT recommend or rank internships.
    - You do NOT change fit scores.
    - You do NOT introduce new criteria.
    - You ONLY explain recommendations produced by a deterministic backend matching engine.
    - Your explanations must be factual, simple, and traceable to provided data.
    - CRITICAL: A skill like "C" or "OS" only matches if it appears as a stand-alone word. "C" does NOT match "Canva" or "Communication". "OS" does NOT match "Photoshop".
    - If information is missing, say so clearly.

    Your role is to explain WHY an internship was recommended and HOW the student can improve their fit score.

    INPUT DATA:
    Student Profile:
    - Education: ${student.qualification}
    - Skills: ${student.skills.join(', ')}
    - Location Preference: ${student.preferred_state}
    - GPA: ${student.cgpa}

    INTERNSHIPS TO EXPLAIN:
    ${internships.map((i, idx) => `
    ID: ${idx + 1}
    Internship Details:
    - Role: ${i.role}
    - Company: ${i.company}
    - Required Skills: ${i.skills}
    - Location: ${i.location}
    - Duration: ${i.duration}

    Fit Score Breakdown:
    - Skill Match: ${i.rawSkillMatch || 0}%
    - Location Match: ${Math.round(i.scoreBreakdown?.location || 0)} pts
    - Industry Match: ${Math.round(i.scoreBreakdown?.industry || 0)} pts
    - Experience Align: ${Math.round(i.scoreBreakdown?.experience || 0)} pts
    - CGPA Bonus: ${Math.round(i.scoreBreakdown?.cgpa || 0)} pts
    - Final Fit Score: ${i.matchScore}/100 
    `).join('\n')}

    TASK:
    For EACH internship, explain WHY it was recommended and HOW the student can improve their fit score.

    Constraints:
    - Use only the provided information.
    - Do not recommend other internships.
    - Do not suggest applying or rejecting.
    - Do not invent criteria.
    - Use clear, student-friendly language.

    OUTPUT FORMAT (Strict JSON Array):
    [
      {
        "id": 1,
        "summary": "One-line summary of the fit.",
        "reasons": [
          "Bullet 1: specific skill match",
          "Bullet 2: location/other factor"
        ],
        "limitations": "One sentence on what limited the score (if applicable).",
        "improvements": [
          "Actionable tip 1 to improve score",
          "Actionable tip 2"
        ]
      }
    ]
    `;

    const result = await model.generateContent(prompt);

    // Clean code blocks
    const text = result.response.text().replace(/```json|```/g, '').trim();

    const jsonStart = text.indexOf('[');
    const jsonEnd = text.lastIndexOf(']');
    const jsonString = (jsonStart !== -1 && jsonEnd !== -1) ? text.substring(jsonStart, jsonEnd + 1) : text;

    const explanations = JSON.parse(jsonString);

    return internships.map((i, idx) => {
        // Map by index
        const aiData = explanations[idx] || generateSmartFallback(student, i);
        // Safety check
        if (!aiData.summary) aiData.summary = "Good match based on your profile.";

        return {
            ...i,
            aiExplanation: aiData,
            roadmap: typeof i.roadmap !== 'undefined' ? i.roadmap : attachRoadmap(i)
        };
    });
};

const generateExplanations = async (student, internships) => {
    if (!process.env.GEMINI_API_KEY) {
        return internships.map(i => ({
            ...i,
            aiExplanation: generateSmartFallback(student, i),
            roadmap: typeof i.roadmap !== 'undefined' ? i.roadmap : attachRoadmap(i)
        }));
    }

    try {
        // Try Flash 1.5 first
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        return await callGemini(model, student, internships);
    } catch (e) {
        console.log("Flash failed (" + e.message + "), retrying with Pro...");
        try {
            // Fallback to Pro
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-001" });
            return await callGemini(model, student, internships);
        } catch (e2) {
            console.error("All AI models failed (" + e2.message + "). Using Smart Fallback.");
            // Final Fallback
            return internships.map(i => ({
                ...i,
                aiExplanation: generateSmartFallback(student, i),
                roadmap: typeof i.roadmap !== 'undefined' ? i.roadmap : attachRoadmap(i)
            }));
        }
    }
};

module.exports = { generateExplanations };
