const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
const { generateToken } = require('../middleware/auth');

// Initialize Firebase Admin SDK (if not already done)
// This assumes you have set up Firebase Admin in config/firebase.js

// Register user with email/password
const register = async (req, res) => {
  try {
    const { email, password, name, phone, age, qualification } = req.body;

    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['email', 'password', 'name']
      });
    }

    // Create user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name
    });

    // Store additional user data in Realtime Database
    const db = admin.database();
    await db.ref(`students/${userRecord.uid}`).set({
      uid: userRecord.uid,
      email,
      name,
      phone: phone || '',
      age: age ? parseInt(age) : null,
      qualification: qualification || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Generate JWT token
    const token = generateToken(userRecord.uid, email);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        uid: userRecord.uid,
        email,
        name,
        token
      }
    });

  } catch (error) {
    console.error('Registration error:', error);

    if (error.code === 'auth/email-already-exists') {
      return res.status(409).json({
        success: false,
        error: 'Email already registered'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Registration failed',
      message: error.message
    });
  }
};

// Login user with email/password
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Verify user with Firebase (client-side should do this, but for backend validation)
    // For now, we'll accept email/password and let client handle Firebase Auth
    // This endpoint is mainly for token generation

    // In production, use Firebase REST API or Admin SDK to verify
    const token = generateToken('user-placeholder', email);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        email,
        token
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Login failed',
      message: error.message
    });
  }
};

// Get user profile
const getUserProfile = async (req, res) => {
  try {
    const uid = req.user.userId; // From JWT token

    const db = admin.database();
    const snapshot = await db.ref(`students/${uid}`).once('value');
    const userData = snapshot.val();

    if (!userData) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: userData
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error fetching profile',
      message: error.message
    });
  }
};

// Update user profile
const updateUserProfile = async (req, res) => {
  try {
    const uid = req.user.userId;
    const { name, phone, age, qualification, preferredSector, preferredState } = req.body;

    const db = admin.database();
    await db.ref(`students/${uid}`).update({
      name: name || undefined,
      phone: phone || undefined,
      age: age ? parseInt(age) : undefined,
      qualification: qualification || undefined,
      preferredSector: preferredSector || undefined,
      preferredState: preferredState || undefined,
      updatedAt: new Date().toISOString()
    });

    const snapshot = await db.ref(`students/${uid}`).once('value');
    const updatedData = snapshot.val();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedData
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error updating profile',
      message: error.message
    });
  }
};

module.exports = {
  register,
  login,
  getUserProfile,
  updateUserProfile
};
