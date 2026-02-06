const express = require('express');
const router = express.Router();
const {
    loginAdmin,
    registerAdmin,
    getMe,
    getUnverifiedInternships,
    verifyInternship,
    bulkVerify,
    getAuditLogs,
    getSyncStats
} = require('../controllers/adminController');
const { protectAdmin } = require('../middleware/authMiddleware');

router.post('/login', loginAdmin);
router.post('/register', registerAdmin);
router.get('/me', protectAdmin, getMe);

// Trust Layer Routes
router.get('/unverified', protectAdmin, getUnverifiedInternships);
router.patch('/verify/:id', protectAdmin, verifyInternship);
router.post('/verify/bulk', protectAdmin, bulkVerify);
router.get('/audit-logs', protectAdmin, getAuditLogs);
router.get('/sync-stats', protectAdmin, getSyncStats);

module.exports = router;
