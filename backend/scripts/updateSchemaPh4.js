const pool = require('../config/database');

const updateSchema = async () => {
    try {
        console.log('🔄 Updating database schema for Phase 4...');

        // Add columns if they don't exist
        await pool.query(`
      ALTER TABLE students 
      ADD COLUMN IF NOT EXISTS cgpa NUMERIC(4,2),
      ADD COLUMN IF NOT EXISTS experience_months INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS resume_url TEXT,
      ADD COLUMN IF NOT EXISTS preferred_industry VARCHAR(255),
      ADD COLUMN IF NOT EXISTS strengths TEXT,
      ADD COLUMN IF NOT EXISTS availability VARCHAR(50);
    `);

        console.log('✅ Schema updated successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Schema update failed:', err);
        process.exit(1);
    }
};

updateSchema();
