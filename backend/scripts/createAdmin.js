const pool = require('../config/database');
const bcrypt = require('bcryptjs');

const name = process.argv[2];
const email = process.argv[3];
const password = process.argv[4];

if (!name || !email || !password) {
    console.log('Usage: node createAdmin.js "<name>" "<email>" "<password>"');
    console.log('Example: node createAdmin.js "Admin User" "admin@example.com" "securepass123"');
    process.exit(1);
}

const createAdmin = async () => {
    try {
        const existing = await pool.query('SELECT * FROM admins WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            console.error('Error: Admin with this email already exists.');
            process.exit(1);
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const result = await pool.query(
            'INSERT INTO admins (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
            [name, email, hashedPassword, 'admin']
        );

        console.log('✅ Admin created successfully!');
        console.log(result.rows[0]);
        process.exit();
    } catch (err) {
        console.error('Error creating admin:', err.message);
        process.exit(1);
    }
};

createAdmin();
