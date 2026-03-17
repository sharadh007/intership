const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy");

// Helper to generate a fallback 'Road to 100%' roadmap when Python AI is unavailable
const attachRoadmap = (internship) => {
    let roadmap = null;
    const missing = internship.missingSkills || (internship.gap_analysis ? internship.gap_analysis.missing_skills : []) || [];
    const roleIdStr = String(internship.role || '').toLowerCase() + " " + String(internship.sector || '').toLowerCase();
    
    // Domain Check Heuristics
    const isFinance = /finance|account|banking|audit|tax|tally/i.test(roleIdStr);
    const isHR = /hr|human|recruit|talent|admin/i.test(roleIdStr);
    const isEngineering = /mech|civil|electric|electronic|engineer|site|hardware|auto|aero|cad|ansys|manufacturing/i.test(roleIdStr);
    const isMarketing = /market|sales|seo|content|brand|business dev|b2b/i.test(roleIdStr);
    const isDesign = /design|archit|ui|ux|graphic|video|interior|textile|art/i.test(roleIdStr);
    const isOperations = /operat|supply|logistic|manage|admin|event/i.test(roleIdStr);

    if (missing.length > 0) {
        const topMissing = missing[0];
        const role = internship.role || "this role";
        
        let day2Action = `Build a ${topMissing}-based solution that solves a common problem in the ${internship.sector || 'technical'} sector.`;
        if (isFinance) day2Action = `Complete a sample financial model, reconciliation or audit task relevant to ${internship.company} using ${topMissing}.`;
        else if (isHR) day2Action = `Develop a mock onboarding plan, sourcing strategy, or policy doc concerning ${topMissing}.`;
        else if (isDesign) day2Action = `Create a high-fidelity mockup, wireframe, or visual asset demonstrating ${topMissing} tailored for ${internship.company}.`;
        else if (isEngineering) day2Action = `Produce a CAD blueprint, schematic, or structural analysis report simulating real-world constraints using ${topMissing}.`;
        else if (isMarketing) day2Action = `Draft a mock campaign, competitor analysis, or social strategy using ${topMissing}.`;
        else if (isOperations) day2Action = `Draft a workflow optimization diagram or logistics plan reducing overhead using ${topMissing}.`;

        roadmap = {
            summary: `Accelerated bridge to master ${topMissing} for ${role}.`,
            days: [
                {
                    day: 1,
                    topic: `${topMissing} Foundations`,
                    action: `Master the core principles of ${topMissing} required for the ${role} requirements.`,
                    link: `https://www.youtube.com/results?search_query=learn+${encodeURIComponent(topMissing)}+for+beginners`
                },
                {
                    day: 2,
                    topic: "Practical Implementation",
                    action: day2Action,
                    link: ""
                }
            ]
        };
    } else {
        const bestSkill = (internship.skills || "the role").split(',')[0];
        
        // 100% Match Sub-cases based on domain
        let day1Topic = `Advanced ${bestSkill}`;
        let day1Action = `Explore complex production patterns and scalability best practices for ${bestSkill}.`;
        let day2Topic = "Expert Portfolio Piece";
        let day2Action = `Refine your existing projects to demonstrate high-load optimization and clean code standards.`;
        
        if (isFinance) {
            day1Topic = "Advanced Financial Analysis";
            day1Action = `Explore complex regulatory frameworks, financial modeling, and precision reporting using ${bestSkill}.`;
            day2Topic = "Expert Case Study";
            day2Action = `Formulate an industry-grade valuation, reconciliation, or compliance audit demonstrating mastery.`;
        } else if (isHR) {
            day1Topic = "Strategic Ops";
            day1Action = `Dive into advanced talent acquisition analytics, retention strategy, and organizational behavior.`;
            day2Topic = "Execution Plan";
            day2Action = `Draft an executive-level presentation on culture building or process improvement using ${bestSkill}.`;
        } else if (isDesign) {
            day1Topic = "Design Systems";
            day1Action = `Study enterprise design systems, accessibility standards, and advanced visual hierarchy in ${bestSkill}.`;
            day2Topic = "Portfolio Polish";
            day2Action = `Refine an existing project with pixel-perfect precision and user-centered research backing.`;
        } else if (isEngineering) {
            day1Topic = "Precision Engineering";
            day1Action = `Study material viability, thermal/structural stress, and advanced schematics using ${bestSkill}.`;
            day2Topic = "Professional Blueprint";
            day2Action = `Generate a robust, high-efficiency mechanical, civil, or electrical blueprint with tight industry tolerances.`;
        } else if (isMarketing) {
            day1Topic = "Growth Strategy";
            day1Action = `Analyze advanced funnel optimization, conversion metrics, and multi-channel strategies.`;
            day2Topic = "Performance Portfolio";
            day2Action = `Present an end-to-end performance marketing campaign showing high ROI data metrics.`;
        } else if (isOperations) {
            day1Topic = "Logistics & Optimization";
            day1Action = `Examine lean management principles, supply chain resilience, and overhead reduction using ${bestSkill}.`;
            day2Topic = "Operations Strategy";
            day2Action = `Present a data-backed proposal identifying current industry bottlenecks and a viable solution mapping.`;
        }

        roadmap = {
            summary: "You match all core requirements. Now, specialize for senior-level impact.",
            days: [
                {
                    day: 1,
                    topic: day1Topic,
                    action: day1Action,
                    link: `https://www.youtube.com/results?search_query=advanced+${encodeURIComponent(bestSkill)}+tutorial`
                },
                {
                    day: 2,
                    topic: day2Topic,
                    action: day2Action,
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
    
    CRITICAL: If an internship is in a neighboring district (not the preferred city but the same state/nearby), explicitly note that this role was prioritized for its high technical alignment despite the distance.

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
