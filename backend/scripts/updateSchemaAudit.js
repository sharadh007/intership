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
        console.log('⏳ Creating Audit Log Schema...');

        // Create audit_logs table
        await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER, -- Can be null if system action or deleted admin
        action VARCHAR(50) NOT NULL, -- VERIFY, REJECT, EDIT, SYNC
        entity_type VARCHAR(50) DEFAULT 'INTERNSHIP',
        entity_id INTEGER,
        details JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
        console.log('✅ Created audit_logs table');

        // Index for faster lookups
        await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_id);
    `);
        await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON audit_logs(admin_id);
    `);
        console.log('✅ Added indexes');

        console.log('🎉 Audit Schema update complete!');
    } catch (err) {
        console.error('❌ Schema update failed:', err);
    } finally {
        pool.end();
    }
}

updateSchema();
