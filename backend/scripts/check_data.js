const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

const check = async () => {
    try {
        const res = await pool.query("SELECT id, company, role, duration FROM internships LIMIT 5");
        console.log("Rows:", res.rows);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

check();
