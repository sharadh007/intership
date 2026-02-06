const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function updateSchema() {
    try {
        console.log('⏳ Adding deleted_at column...');

        await pool.query(`
      ALTER TABLE internships 
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;
    `);

        console.log('✅ Added deleted_at to internships table');
    } catch (err) {
        console.error('❌ Schema update failed:', err);
    } finally {
        pool.end();
    }
}

updateSchema();
