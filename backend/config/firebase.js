const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase Admin SDK
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json';

try {
  const serviceAccount = require(serviceAccountPath);
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });
  
  console.log('✅ Firebase Admin initialized');
} catch (error) {
  console.warn('⚠️ Firebase Admin not initialized with service account. Using default credentials.');
  // For local development, you might want to use emulator or handle this differently
}

module.exports = admin;
