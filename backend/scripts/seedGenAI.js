const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Database Configlogin page issue
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// Gemini Config
const apiKey = process.env.GEMINI_RESUME_API_KEY || process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("❌ NO API KEY FOUND in process.env");
    process.exit(1);
}
console.log(`🔑 Using API Key ending in: ...${apiKey.slice(-4)}`);
const genAI = new GoogleGenerativeAI(apiKey);

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const getFallbackData = (count, sector) => {
    return Array.from({ length: count }).map((_, i) => ({
        company: `${sector.split(' ')[0]} Corp ${i + 1}`,
        role: `${sector.split(' ')[0]} Intern`,
        location: ["Bangalore, Karnataka", "Mumbai, Maharashtra", "Delhi, NCR", "Chennai, Tamil Nadu", "Hyderabad, Telangana"][i % 5],
        sector: sector,
        duration: "6 Months",
        stipend: "₹15,000/month",
        requirements: "Basic knowledge of field, Good communication",
        skills: "Communication, Teamwork, Problem Solving",
        description: `An exciting opportunity to work in the ${sector} field. Learn from industry experts and gain hands-on experience in real-world projects.`,
        deadline: "2026-05-20",
        verification_status: "verified",
        source_type: "fallback_data"
    }));
};

const generateChunk = async (count, sector) => {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" }); // Try updated model

    const prompt = `
    Generate a JSON array of ${count} realistic internship opportunities in India specifically for the "${sector}" sector.
    
    Fields required for each object:
    - company: (String) Real company names relevant to ${sector}.
    - role: (String) Job titles relevant to ${sector}.
    - location: (String) "City, State" (Focus on major Indian cities).
    - sector: (String) Must be exactly "${sector}".
    - duration: (String) e.g., "3 Months", "6 Months".
    - stipend: (String) e.g., "₹15,000/month", "₹25,000/month", "Unpaid".
    - requirements: (String) Key skills/degrees required for ${sector}.
    - skills: (String) Comma-separated tags relevant to ${sector}.
    - description: (String) A brief 2-sentence description.
    - deadline: (String) A future date in YYYY-MM-DD format (between 2026-03-01 and 2026-06-01).
    - verification_status: (String) Randomly "verified" (80%) or "unverified" (20%).
    - source_type: (String) "gen_ai".

    Ensure the output is strictly a valid JSON array. Do not include markdown formatting like \`\`\`json.
    `;

    for (let i = 0; i < 3; i++) {
        try {
            console.log(`   - Generating batch of ${count} for ${sector} (Attempt ${i + 1}/3)...`);
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(text);
        } catch (error) {
            console.error(`     ⚠️ Batch failed: ${error.message}`);
            if (error.message.includes('429') || error.message.includes('503') || error.message.includes('404')) {
                // Stop retrying if quota exceeded or model not found, use fallback immediately
                if (i === 2 || error.message.includes('429')) {
                    console.log("     ⚠️ Switching to Fallback Data for this batch due to API issues.");
                    return getFallbackData(count, sector);
                }
                await delay(5000);
            } else {
                await delay(5000);
            }
        }
    }
    console.log("     ⚠️ All attempts failed. Using Fallback Data.");
    return getFallbackData(count, sector);
};

const seedDB = async () => {
    try {
        // Define sectors to generate data for
        const sectors = [
            "IT / Software Development",
            "Finance & Banking",
            "Marketing & Sales",
            "Healthcare & Medical",
            "Core Engineering (Mechanical, Electrical, Civil)",
            "Human Resources (HR)"
        ];

        const targetPerSector = 20;

        console.log(`🚀 Starting Robust Seeding. Target: ${sectors.length} sectors x ${targetPerSector} = ${sectors.length * targetPerSector} internships.`);

        // 1. Clear Old Data
        console.log("🗑️ Clearing existing internships...");
        await pool.query('TRUNCATE TABLE internships RESTART IDENTITY CASCADE');

        let totalInserted = 0;

        // 2. Generate Data per Sector
        for (const sector of sectors) {
            console.log(`\n📂 Processing Sector: ${sector}`);
            const batchSize = 10; // Generate in batches of 10

            for (let i = 0; i < targetPerSector; i += batchSize) {
                console.log(`   📦 Batch ${(i / batchSize) + 1}: Fetching ${batchSize} items for ${sector}...`);

                const chunk = await generateChunk(batchSize, sector);

                if (chunk && chunk.length > 0) {
                    // IMMEDIATE INSERT
                    const values = [];
                    let placeholderIndex = 1;
                    let query = `
                      INSERT INTO internships 
                      (company, role, location, sector, duration, stipend, requirements, skills, description, deadline, verification_status, source_type) 
                      VALUES 
                    `;

                    chunk.forEach((item, index) => {
                        query += `($${placeholderIndex}, $${placeholderIndex + 1}, $${placeholderIndex + 2}, $${placeholderIndex + 3}, $${placeholderIndex + 4}, $${placeholderIndex + 5}, $${placeholderIndex + 6}, $${placeholderIndex + 7}, $${placeholderIndex + 8}, $${placeholderIndex + 9}, $${placeholderIndex + 10}, $${placeholderIndex + 11})${index === chunk.length - 1 ? '' : ','}`;

                        const sanitizedStipend = parseInt((item.stipend || '0').toString().replace(/[^0-9]/g, '')) || 0;
                        const sanitizedSkills = Array.isArray(item.skills) ? item.skills.join(',') : (item.skills || '');

                        values.push(
                            item.company,
                            item.role,
                            item.location,
                            item.sector || sector, // Fallback to current sector
                            item.duration,
                            sanitizedStipend,
                            item.requirements,
                            sanitizedSkills,
                            item.description,
                            item.deadline,
                            item.verification_status || 'verified',
                            'gen_ai'
                        );

                        placeholderIndex += 12;
                    });

                    query += ' RETURNING id;';
                    try {
                        const res = await pool.query(query, values);
                        console.log(`     💾 Inserted ${res.rowCount} items.`);
                        totalInserted += res.rowCount;
                    } catch (err) {
                        console.error(`     ❌ Insert failed: ${err.message}`);
                    }

                } else {
                    console.log(`     ❌ Batch failed for ${sector}.`);
                }

                // Cool down between batches
                await delay(3000);
            }
        }

        console.log(`🎉 Final Total: Successfully inserted ${totalInserted} internships!`);

    } catch (error) {
        console.error("❌ Database Error:", error);
    } finally {
        await pool.end();
    }
};

seedDB();
