const pool = require('./backend/config/database');

async function check() {
    try {
        const res = await pool.query("SELECT role, location, sector, skills FROM internships WHERE sector ILIKE '%Finance%' AND location ILIKE '%Delhi%'");
        console.log(`Found ${res.rows.length} Finance jobs in Delhi.`);
        if (res.rows.length > 0) {
            console.log("Sample:", res.rows[0]);
        }

        const allFin = await pool.query("SELECT role, location, sector FROM internships WHERE sector ILIKE '%Finance%' LIMIT 10");
        console.log("All Finance Sample:", allFin.rows.map(r => r.sector));
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

check();
