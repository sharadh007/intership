const pool = require('../config/database');

// Get all notifications for a student
const getNotifications = async (req, res) => {
    try {
        const { studentId } = req.params; // This is the Firebase UID

        // Resolve internal ID first
        const studentRes = await pool.query('SELECT id FROM students WHERE uid = $1', [studentId]);

        if (studentRes.rows.length === 0) {
            // Student not found yet (maybe just registered). Return empty notifications.
            return res.json({ success: true, count: 0, data: [] });
        }

        const internalId = studentRes.rows[0].id;

        const result = await pool.query(
            'SELECT * FROM notifications WHERE student_id = $1 ORDER BY created_at DESC',
            [internalId]
        );
        res.json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Mark a single notification or all as read
const markAsRead = async (req, res) => {
    try {
        const { notificationId, studentId } = req.body;

        if (notificationId) {
            await pool.query('UPDATE notifications SET is_read = TRUE WHERE id = $1', [notificationId]);
        } else if (studentId) {
            // Resolve UID to ID if looking up by student
            const studentRes = await pool.query('SELECT id FROM students WHERE uid = $1', [studentId]);
            if (studentRes.rows.length > 0) {
                const internalId = studentRes.rows[0].id;
                await pool.query('UPDATE notifications SET is_read = TRUE WHERE student_id = $1', [internalId]);
            }
        }

        res.json({ success: true, message: 'Marked as read' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Create a notification (Internal helper or Admin API)
const createNotification = async (req, res) => {
    try {
        const { studentId, message, type } = req.body;
        const result = await pool.query(
            'INSERT INTO notifications (student_id, message, type) VALUES ($1, $2, $3) RETURNING *',
            [studentId, message, type || 'info']
        );
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = {
    getNotifications,
    markAsRead,
    createNotification
};
