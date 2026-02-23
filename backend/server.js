const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();
require('./config/firebase');
const app = express();

// Global error handling to prevent server crashes
process.on('uncaughtException', (err) => {
  console.error('🔥 FATAL: Uncaught Exception:', err);
  // Log more details if possible
  console.error(err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 FATAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

// Core middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.json());

// Fix for Google Sign-In Cross-Origin-Opener-Policy error
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  next();
});

const pool = require('./config/database');

// Initialize database tables
const initDB = async () => {
  try {
    // Create base tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        uid VARCHAR(255) UNIQUE NOT NULL,
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

      CREATE TABLE IF NOT EXISTS internships (
        id SERIAL PRIMARY KEY,
        company VARCHAR(255) NOT NULL,
        role VARCHAR(255) NOT NULL,
        location TEXT,
        sector VARCHAR(255),
        duration VARCHAR(50),
        stipend TEXT,
        requirements TEXT,
        skills TEXT,
        description TEXT,
        deadline TIMESTAMP,
        verification_status VARCHAR(50) DEFAULT 'verified',
        source_type VARCHAR(50) DEFAULT 'manual_entry',
        external_link TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ai_interview_chats (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        role TEXT,
        company TEXT,
        chat_history JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, role, company)
      );

      CREATE TABLE IF NOT EXISTS applications (
        id SERIAL PRIMARY KEY,
        student_id INT REFERENCES students(id),
        internship_id INT REFERENCES internships(id),
        status VARCHAR(50) DEFAULT 'applied',
        cover_letter TEXT,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
        type VARCHAR(50),
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Database schema initialized');
  } catch (err) {
    console.error('❌ Database initialization failed:', err);
  }
};
initDB();

pool.query('SELECT NOW()', (err, res) => {
  if (err) console.error('❌ DB Connection failed:', err);
  else console.log('✅ PostgreSQL connected:', res.rows[0]);
});
// Routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/adminRoutes');
const internshipRoutes = require('./routes/internships');
const studentRoutes = require('./routes/students');
const recommendationRoutes = require('./routes/recommendations');
const applicationRoutes = require('./routes/applications');
const notificationRoutes = require('./routes/notificationRoutes');

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'Backend Server Running',
    timestamp: new Date(),
    message: 'InternHub India Backend is Active'
  });
});

// Serve static files from frontend
const path = require('path');
app.use(express.static(path.join(__dirname, '../frontend')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/internships', internshipRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ai', require('./routes/ai'));

// Catch-all handler for frontend
app.get('*', (req, res) => {
  // Check if request is for API (already handled above, but just in case)
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, error: 'API Route not found' });
  }
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const { checkAndExpireInternships } = require('./services/expirationService');

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", async () => {
  console.log(`Server running on port ${PORT}`);

  // Run expiration check on startup
  await checkAndExpireInternships();

  // Optional: Run every hour
  // setInterval(checkAndExpireInternships, 60 * 60 * 1000);
});
