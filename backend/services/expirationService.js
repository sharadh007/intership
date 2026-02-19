const pool = require('../config/database');

/**
 * Checks for internships that have passed their deadline and marks them as 'expired'.
 * Only updates internships that are not already 'expired'.
 */
const checkAndExpireInternships = async () => {
    try {
        console.log('⏳ Checking for expired internships...');
        const result = await pool.query(
            `UPDATE internships 
             SET verification_status = 'expired' 
             WHERE deadline < NOW() 
             AND verification_status != 'expired'
             RETURNING id, company, role`
        );

        if (result.rows.length > 0) {
            console.log(`✅ Expired ${result.rows.length} internships.`);
            result.rows.forEach(row => {
                console.log(`   - [Expired] ${row.company} (${row.role})`);
            });
        } else {
            console.log('✅ No new expired internships found.');
        }
    } catch (error) {
        console.error('❌ Error in expiration check:', error);
    }
};

module.exports = { checkAndExpireInternships };
