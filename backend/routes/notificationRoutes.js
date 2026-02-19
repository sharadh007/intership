const express = require('express');
const router = express.Router();
const { getNotifications, markAsRead, createNotification } = require('../controllers/notificationController');

router.get('/:studentId', getNotifications);
router.post('/mark-read', markAsRead);
router.post('/create', createNotification); // Protected?

module.exports = router;
