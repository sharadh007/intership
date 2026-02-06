const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

const reset = async () => {
    try {
        console.log("Dropping tables...");
        await pool.query("DROP TABLE IF EXISTS match_history CASCADE");
        await pool.query("DROP TABLE IF EXISTS quiz_results CASCADE");
        await pool.query("DROP TABLE IF EXISTS internships CASCADE");
        await pool.query("DROP TABLE IF EXISTS students CASCADE");
        console.log("✅ Tables dropped.");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

reset();
