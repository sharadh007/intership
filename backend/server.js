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

// Fix for Google Sign-In Cross-Origin-Opener-Policy error and strict cache-busting
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');

  // Strict Cache Control to ensure CSS, JS, and HTML always stay fresh
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
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

// Dynamic Firebase Config for Frontend
// This allows the app to work on Render without committing the firebase-config.js file
app.get('/firebase-config.js', (req, res) => {
  const config = {
    apiKey: (process.env.FIREBASE_API_KEY || "AIzaSyCFTIqMvtSM1WhEjhe7pb7Tkix9ggDuS_s").trim(),
    authDomain: (process.env.FIREBASE_AUTH_DOMAIN || "pm-intrenship.firebaseapp.com").trim(),
    databaseURL: (process.env.FIREBASE_DATABASE_URL || "https://pm-intrenship-default-rtdb.firebaseio.com").trim(),
    projectId: (process.env.FIREBASE_PROJECT_ID || "pm-intrenship").trim(),
    storageBucket: (process.env.FIREBASE_STORAGE_BUCKET || "pm-intrenship.firebasestorage.app").trim(),
    messagingSenderId: (process.env.FIREBASE_MESSAGING_SENDER_ID || "682720260870").trim(),
    appId: (process.env.FIREBASE_APP_ID || "1:682720260870:web:84af139577b2bc51e46487").trim()
  };
  res.type('application/javascript');
  res.send(`const firebaseConfig = ${JSON.stringify(config)};`);
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

  // 1. Initialize Database Schema FIRST
  await initDB();

  // 2. Run expiration check AFTER schema is ready
  await checkAndExpireInternships();

  // Optional: Run every hour
  // setInterval(checkAndExpireInternships, 60 * 60 * 1000);
});
