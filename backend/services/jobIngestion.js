const axios = require('axios');
const pool = require('../config/database');

// ADZUNA API CONFIG (Free Tier Available)
const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID || '';
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY || '';
const BASE_URL = 'https://api.adzuna.com/v1/api/jobs/in/search/1';

/**
 * Fetches real jobs from Adzuna API and saves to DB
 * @param {string} query - e.g. "Software Engineer"
 * @param {string} location - e.g. "Chennai"
 */
const fetchAndIngestJobs = async (query = 'internship', location = 'India') => {
    if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) {
        console.warn('⚠️ Adzuna Credentials missing. Skipping live fetch.');
        return;
    }

    try {
        const response = await axios.get(BASE_URL, {
            params: {
                app_id: ADZUNA_APP_ID,
                app_key: ADZUNA_APP_KEY,
                what: query,
                where: location,
                content_type: 'application/json'
            }
        });

        const jobs = response.data.results;
        console.log(`📥 Fetched ${jobs.length} jobs from Adzuna.`);

        const insertQuery = `
            INSERT INTO internships 
            (company, role, location, sector, description, external_link, created_at, verification_status, source_type)
            VALUES ($1, $2, $3, $4, $5, $6, NOW(), 'verified', 'public_api')
        `;

        for (const job of jobs) {
            // Basic mapping
            await pool.query(insertQuery, [
                job.company.display_name,
                job.title,
                job.location.display_name,
                'Technology', // Default or infer from category
                job.description,
                job.redirect_url
            ]);
        }
        console.log('✅ Ingestion Complete');

    } catch (error) {
        console.error('Error fetching jobs:', error.message);
    }
};

module.exports = { fetchAndIngestJobs };
