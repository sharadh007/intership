const pool = require('../config/database');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs'); // Assuming bcryptjs is installed or will be

// Helper to generate JWT
const generateToken = (id, email, role) => {
    return jwt.sign({ id, email, role }, process.env.JWT_SECRET || 'secret_key_change_me', {
        expiresIn: '30d',
    });
};

// @desc    Auth user & get token
// @route   POST /api/admin/login
// @access  Public
const loginAdmin = async (req, res) => {
    const { email, password } = req.body;

    try {
        const result = await pool.query('SELECT * FROM admins WHERE email = $1', [email]);
        const admin = result.rows[0];

        if (admin && (await bcrypt.compare(password, admin.password_hash))) {
            res.json({
                success: true,
                id: admin.id,
                name: admin.name,
                email: admin.email,
                role: admin.role,
                token: generateToken(admin.id, admin.email, admin.role),
            });
        } else {
            res.status(401).json({ success: false, error: 'Invalid email or password' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Register a new admin (Protected or Seed only usually, but public for demo if needed)
// @route   POST /api/admin/register
// @access  Public (for initial setup)
const registerAdmin = async (req, res) => {
    const { name, email, password, role } = req.body;

    try {
        const existing = await pool.query('SELECT * FROM admins WHERE email = $1', [email]);

        if (existing.rows.length > 0) {
            return res.status(400).json({ success: false, error: 'Admin already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const result = await pool.query(
            'INSERT INTO admins (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
            [name, email, hashedPassword, role || 'admin'] // Default to 'admin'
        );

        const newAdmin = result.rows[0];

        res.status(201).json({
            success: true,
            id: newAdmin.id,
            name: newAdmin.name,
            email: newAdmin.email,
            role: newAdmin.role,
            token: generateToken(newAdmin.id, newAdmin.email, newAdmin.role),
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Get current admin profile
// @route   GET /api/admin/me
// @access  Private
const getMe = async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, email, role, created_at FROM admins WHERE id = $1', [req.user.id]);
        const admin = result.rows[0];

        if (!admin) {
            return res.status(404).json({ success: false, error: 'Admin not found' });
        }

        res.json({ success: true, data: admin });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

module.exports = {
    loginAdmin,
    registerAdmin,
    getMe,

    // Trust Layer - Verification & Auditing
    getUnverifiedInternships: async (req, res) => {
        try {
            const result = await pool.query("SELECT * FROM internships WHERE verification_status = 'unverified' ORDER BY last_fetched_at DESC");
            res.json({ success: true, count: result.rows.length, data: result.rows });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, error: 'Fetch Failed' });
        }
    },

    verifyInternship: async (req, res) => {
        const client = await pool.connect();
        try {
            const { id } = req.params;
            const { status } = req.body; // 'verified' or 'rejected'
            const adminId = req.user.id;

            await client.query('BEGIN');

            // 1. Update Internship
            const updateRes = await client.query(
                "UPDATE internships SET verification_status = $1 WHERE id = $2 RETURNING *",
                [status, id]
            );

            if (updateRes.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ success: false, error: 'Internship not found' });
            }

            // 2. Add Audit Log
            await client.query(
                "INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)",
                [adminId, status === 'verified' ? 'VERIFY' : 'REJECT', 'INTERNSHIP', id, JSON.stringify({ previous_status: 'unverified' })]
            );

            await client.query('COMMIT');
            res.json({ success: true, data: updateRes.rows[0] });

        } catch (error) {
            await client.query('ROLLBACK');
            console.error(error);
            res.status(500).json({ success: false, error: 'Verification Failed' });
        } finally {
            client.release();
        }
    },

    bulkVerify: async (req, res) => {
        const client = await pool.connect();
        try {
            const { ids, status } = req.body; // ids: [1, 2, 3], status: 'verified'
            const adminId = req.user.id;

            await client.query('BEGIN');

            // 1. Bulk Update
            await client.query(
                "UPDATE internships SET verification_status = $1 WHERE id = ANY($2)",
                [status, ids]
            );

            // 2. Bulk Audit Log (One entry per batch or loop? Loop for detailed logs is safer)
            for (const id of ids) {
                await client.query(
                    "INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)",
                    [adminId, 'BULK_' + (status === 'verified' ? 'VERIFY' : 'REJECT'), 'INTERNSHIP', id, JSON.stringify({ batch_size: ids.length })]
                );
            }

            await client.query('COMMIT');
            res.json({ success: true, message: `Successfully processed ${ids.length} internships.` });

        } catch (error) {
            await client.query('ROLLBACK');
            console.error(error);
            res.status(500).json({ success: false, error: 'Bulk Action Failed' });
        } finally {
            client.release();
        }
    },

    getAuditLogs: async (req, res) => {
        try {
            const result = await pool.query(`
                SELECT a.*, admin.name as admin_name 
                FROM audit_logs a 
                LEFT JOIN admins admin ON a.admin_id = admin.id 
                ORDER BY a.created_at DESC LIMIT 100
            `);
            res.json({ success: true, data: result.rows });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, error: 'Fetch Failed' });
        }
    },

    getSyncStats: async (req, res) => {
        try {
            // Get last fetched time
            const timeRes = await pool.query("SELECT MAX(last_fetched_at) as last_sync FROM internships WHERE source_type = 'api'");
            const lastSync = timeRes.rows[0].last_sync;

            // Get deletion counts
            const delRes = await pool.query("SELECT COUNT(*) as deleted_count FROM internships WHERE deleted_at IS NOT NULL");
            const deletedCount = delRes.rows[0].deleted_count;

            // Get verified count
            const verRes = await pool.query("SELECT COUNT(*) as verified_count FROM internships WHERE verification_status = 'verified' AND source_type = 'api'");

            res.json({
                success: true,
                data: {
                    lastSync: lastSync || null,
                    deletedCount: parseInt(deletedCount),
                    verifiedCount: parseInt(verRes.rows[0].verified_count),
                    status: 'Active'
                }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, error: 'Fetch Stats Failed' });
        }
    }
};
