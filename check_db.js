const pool = require('./backend/config/database');

async function check() {
    try {
        const res = await pool.query("SELECT role, location, sector, skills FROM internships WHERE sector ILIKE '%Finance%' AND location ILIKE '%Chennai%' LIMIT 5");
        console.log(`Found ${res.rows.length} Finance jobs total.`);

        const chennai = res.rows.filter(r => r.location.toLowerCase().includes('chennai'));
        console.log(`Found ${chennai.length} Finance jobs in Chennai.`);

        if (chennai.length > 0) {
            console.log("Sample:", chennai[0]);
        }
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

check();
