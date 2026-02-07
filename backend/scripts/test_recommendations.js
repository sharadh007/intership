const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const matchingAlgorithm = require('../utils/matchingAlgorithm');
const { checkEligibility } = require('../services/eligibilityService');

// Mock Student Data (based on typical form input)
const student = {
    name: "Test Student",
    skills: ["Python", "Java", "Communication"],
    preferred_state: "Bangalore", // User input "Bangalore"
    qualification: "Bachelor's Degree",
    cgpa: 7.5
};

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const runTest = async () => {
    try {
        console.log("🚀 Starting Recommendation Logic Test...");
        const res = await pool.query('SELECT * FROM internships');
        const allInternships = res.rows;
        console.log(`📊 Fetched ${allInternships.length} internships from DB.`);

        if (allInternships.length > 0) {
            console.log("Example Internship:", allInternships[0]);
        }

        // 1. Filter
        const eligible = allInternships.filter(i => {
            const isEligible = i.verification_status !== 'expired' && checkEligibility(student, i);
            if (!isEligible) {
                // Optional: console.log(`Filtered out: ${i.company}`);
            }
            return isEligible;
        });

        console.log(`✅ Eligible Internships: ${eligible.length}`);

        if (eligible.length === 0) {
            console.log("❌ All internships filtered out by eligibility!");
            return;
        }

        // 2. Score
        const scored = eligible.map(i => {
            const result = matchingAlgorithm.getMatchScore(student, i);
            return {
                ...i,
                matchScore: result.finalScore,
                locationTier: result.locationTier
            };
        });

        // 3. Sort
        const sorted = scored.sort((a, b) => b.matchScore - a.matchScore);

        console.log(`🏆 Top 5 Matches:`);
        sorted.slice(0, 5).forEach((m, idx) => {
            console.log(`${idx + 1}. ${m.company} (${m.role}) - Score: ${m.matchScore}, Tier: ${m.locationTier}, Loc: ${m.location}`);
        });

    } catch (err) {
        console.error("❌ Test Failed:", err);
    } finally {
        await pool.end();
    }
};

runTest();
