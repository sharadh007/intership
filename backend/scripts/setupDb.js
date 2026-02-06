const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const createTablesQuery = `
  CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    uid VARCHAR(255) UNIQUE NOT NULL, -- Firebase UID
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    age INT,
    qualification VARCHAR(255),
    branch VARCHAR(255),
    current_year INT,
    skills TEXT[],
    preferred_sector VARCHAR(255),
    preferred_state VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin', -- 'admin', 'superadmin'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS internships (
    id SERIAL PRIMARY KEY,
    company VARCHAR(255) NOT NULL,
    role VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    sector VARCHAR(255),
    duration VARCHAR(50),
    stipend INT,
    requirements TEXT,
    skills TEXT, -- Comma-separated or update to TEXT[] later if needed, sticking to current valid usage
    description TEXT,
    deadline TIMESTAMP,
    verification_status VARCHAR(50) DEFAULT 'unverified', -- 'verified', 'unverified', 'expired'
    source_type VARCHAR(50) DEFAULT 'manual_entry', -- 'manual_entry', 'public_api', 'gov_portal', 'college_provider'
    external_link TEXT,
    created_by INT REFERENCES admins(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS match_history (
    id SERIAL PRIMARY KEY,
    student_id INT REFERENCES students(id),
    internship_id INT REFERENCES internships(id),
    fit_score INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS quiz_results (
    id SERIAL PRIMARY KEY,
    student_id INT REFERENCES students(id),
    skill_name VARCHAR(100),
    score INT,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      student_id INT REFERENCES students(id),
      message TEXT,
      type VARCHAR(50), -- 'match_alert', 'deadline', 'system'
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

const seedInternships = async () => {
  try {
    const dataPath = path.join(__dirname, '../data/internships.json');
    const rawData = fs.readFileSync(dataPath);
    const { internships } = JSON.parse(rawData);

    console.log(`Found ${internships.length} internships to seed...`);

    // Check if data already exists to avoid duplicates
    const checkRes = await pool.query('SELECT COUNT(*) FROM internships');
    if (parseInt(checkRes.rows[0].count) > 0) {
      console.log('Internships table already has data. Skipping seed.');
      return;
    }

    for (const i of internships) {
      await pool.query(
        `INSERT INTO internships (company, role, location, sector, duration, stipend, requirements, skills, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [i.company, i.role, i.location, i.sector, i.duration, i.stipend, i.requirements, i.skills, i.description]
      );
    }
    console.log('✅ Seeding completed successfully.');
  } catch (err) {
    console.error('Error seeding data:', err);
  }
};

const setup = async () => {
  try {
    console.log('Connecting to database...');
    await pool.query(createTablesQuery);
    console.log('✅ Tables created successfully.');

    await seedInternships();

    console.log('✅ Database setup complete.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Database setup failed:', err);
    process.exit(1);
  }
};

setup();
