const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function seedAdmin() {
    const email = 'sharadhb7@gmail.com';
    const password = 'sharadh';

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        // Check if exists
        const checkRes = await pool.query('SELECT * FROM admins WHERE email = $1', [email]);

        if (checkRes.rows.length > 0) {
            console.log(`⚠️ Admin ${email} already exists. Updating password...`);
            await pool.query('UPDATE admins SET password_hash = $1 WHERE email = $2', [hashedPassword, email]);
            console.log('✅ Password updated.');
        } else {
            await pool.query(
                'INSERT INTO admins (email, password_hash, name, role) VALUES ($1, $2, $3, $4)',
                [email, hashedPassword, 'Super Admin', 'super_admin']
            );
            console.log(`✅ Admin ${email} created successfully.`);
        }

    } catch (err) {
        console.error('❌ Error seeding admin:', err);
    } finally {
        pool.end();
    }
}

seedAdmin();
