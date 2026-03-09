const pool = require('./backend/config/database');

async function check() {
    try {
        const res = await pool.query("SELECT role, location, sector FROM internships WHERE role ILIKE '%Law%' OR role ILIKE '%Legal%' OR role ILIKE '%Stylist%' LIMIT 10");
        console.log("Samples:", res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

check();
