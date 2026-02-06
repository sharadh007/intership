const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

const fix = async () => {
    try {
        await pool.query("ALTER TABLE students ADD COLUMN IF NOT EXISTS phone VARCHAR(20);");
        await pool.query("ALTER TABLE students ADD COLUMN IF NOT EXISTS about TEXT;");
        console.log("✅ Schema updated.");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

fix();
