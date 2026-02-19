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
        console.log('⏳ Updating schema for Industry-Grade Ingestion...');

        // 1. Add source_name
        await pool.query(`
      ALTER TABLE internships 
      ADD COLUMN IF NOT EXISTS source_name VARCHAR(50) DEFAULT 'manual';
    `);
        console.log('✅ Added source_name');

        // 2. Add source_id (unique ID from external system)
        await pool.query(`
      ALTER TABLE internships 
      ADD COLUMN IF NOT EXISTS source_id VARCHAR(255);
    `);
        console.log('✅ Added source_id');

        // 3. Add raw_data (JSONB for auditing)
        await pool.query(`
      ALTER TABLE internships 
      ADD COLUMN IF NOT EXISTS raw_data JSONB;
    `);
        console.log('✅ Added raw_data');

        // 4. Add last_fetched_at
        await pool.query(`
      ALTER TABLE internships 
      ADD COLUMN IF NOT EXISTS last_fetched_at TIMESTAMP;
    `);
        console.log('✅ Added last_fetched_at');

        // 5. Index source_id for faster lookups during ingestion
        await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_internships_source_id ON internships(source_id);
    `);
        console.log('✅ Added index on source_id');

        console.log('🎉 Schema update complete!');
    } catch (err) {
        console.error('❌ Schema update failed:', err);
    } finally {
        pool.end();
    }
}

updateSchema();
