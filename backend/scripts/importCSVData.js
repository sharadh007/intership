const pool = require('../config/database');
const csvDataService = require('../services/csvDataService');

const importCSVToDatabase = async () => {
    try {
        console.log('📥 Importing internship data from CSV...');

        // 1. Load internships from CSV
        const internships = csvDataService.loadInternshipsFromCSV();
        console.log(`✅ Loaded ${internships.length} internships from CSV`);

        if (internships.length === 0) {
            console.error('❌ No data found in CSV file');
            process.exit(1);
        }

        // 2. Clear existing data
        await pool.query('DELETE FROM internships');
        console.log('✅ Cleared old data from database');

        // 3. Insert CSV data into database
        const insertQuery = `
      INSERT INTO internships 
      (company, role, location, sector, skills, stipend, duration, deadline, description, requirements, verification_status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
    `;

        let successCount = 0;
        let errorCount = 0;
        let lastError = null;

        for (let idx = 0; idx < internships.length; idx++) {
            const internship = internships[idx];
            try {
                // Map CSV data to database columns
                const company = (internship.company || 'Unknown Company').substring(0, 255);
                const role = (internship.role || 'Internship').substring(0, 255);
                const location = (internship.location || 'Remote').substring(0, 255);

                // Extract sector from role or default to 'Technology'
                let sector = 'Technology';
                const roleStr = role.toLowerCase();
                if (roleStr.includes('finance') || roleStr.includes('accounting')) sector = 'Finance';
                else if (roleStr.includes('marketing') || roleStr.includes('sales')) sector = 'Marketing';
                else if (roleStr.includes('hr') || roleStr.includes('human')) sector = 'HR';
                else if (roleStr.includes('design') || roleStr.includes('graphic')) sector = 'Design';
                else if (roleStr.includes('content') || roleStr.includes('writing')) sector = 'Content';

                // Convert skills array to comma-separated string
                let skills = 'General';
                if (Array.isArray(internship.skills) && internship.skills.length > 0) {
                    skills = internship.skills.join(', ');
                } else if (internship.skills) {
                    skills = String(internship.skills);
                }

                // Parse stipend to integer (remove currency symbols and commas)
                let stipendValue = 0;
                if (internship.stipend) {
                    const stipendStr = String(internship.stipend).replace(/[₹,\s]/g, '');
                    const match = stipendStr.match(/\d+/);
                    if (match) {
                        stipendValue = parseInt(match[0]);
                    }
                }

                const duration = (internship.duration || '3 Months').substring(0, 50);
                const deadline = '2026-12-31'; // Default deadline
                const description = (internship.description || `${role} position at ${company}`);

                // Create requirements from skills
                const requirements = `Required skills: ${skills}`;

                const verification_status = 'verified';

                await pool.query(insertQuery, [
                    company,
                    role,
                    location,
                    sector,
                    skills,
                    stipendValue,
                    duration,
                    deadline,
                    description,
                    requirements,
                    verification_status
                ]);

                successCount++;

                if (successCount % 500 === 0) {
                    console.log(`📊 Progress: ${successCount}/${internships.length} internships imported...`);
                }
            } catch (err) {
                errorCount++;
                lastError = { internship, error: err.message, index: idx };
                if (errorCount <= 5) {
                    console.error(`❌ Error importing internship #${idx}: ${internship.role} at ${internship.company}`);
                    console.error(`   Error: ${err.message}`);
                }
            }
        }

        console.log(`\n✅ Import complete!`);
        console.log(`   Success: ${successCount} internships`);
        console.log(`   Errors: ${errorCount} internships`);

        // Verify the data
        const result = await pool.query('SELECT COUNT(*) FROM internships');
        console.log(`\n📊 Total internships in database: ${result.rows[0].count}`);

        // Show sample data
        const sample = await pool.query('SELECT company, role, location, skills, stipend FROM internships LIMIT 5');
        console.log('\n📋 Sample data:');
        sample.rows.forEach((row, i) => {
            console.log(`   ${i + 1}. ${row.role} at ${row.company} (${row.location}) - ₹${row.stipend}`);
            console.log(`      Skills: ${row.skills}`);
        });

        process.exit(0);

    } catch (error) {
        console.error('❌ Import failed:', error);
        process.exit(1);
    }
};

importCSVToDatabase();
