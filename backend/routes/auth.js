const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected routes
router.get('/profile', verifyToken, authController.getUserProfile);
router.put('/profile', verifyToken, authController.updateUserProfile);

module.exports = router;
