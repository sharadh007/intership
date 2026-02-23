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
app.listen(PORT, async () => {
  console.log(`✅ Backend Server running on http://localhost:${PORT}`);

  // Run expiration check on startup
  await checkAndExpireInternships();

  // Optional: Run every hour
  // setInterval(checkAndExpireInternships, 60 * 60 * 1000);
});
