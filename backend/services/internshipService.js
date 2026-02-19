const pool = require('../config/database');

/**
 * Normalizes internship data from various sources into a standard format.
 * @param {Object} rawData - The raw internship object.
 * @param {string} source - The source type (e.g., 'manual_entry', 'public_api').
 * @returns {Object} Normalized data object.
 */
const normalizeInternshipData = (rawData, source = 'manual_entry') => {
    return {
        company: rawData.company || rawData.companyName || 'Unknown Company',
        role: rawData.role || rawData.position || 'Intern',
        location: rawData.location || rawData.city || 'Remote',
        sector: rawData.sector || rawData.industry || 'General',
        duration: rawData.duration || 'Flexible',
        stipend: parseInt(rawData.stipend) || 0,
        requirements: rawData.requirements || '',
        skills: Array.isArray(rawData.skills)
            ? rawData.skills.join(',')
            : (rawData.skills || ''), // Ensure CSV string for now as per schema
        description: rawData.description || '',
        deadline: rawData.deadline ? new Date(rawData.deadline) : null,
        verification_status: source === 'manual_entry' ? 'unverified' : 'unverified', // Default to unverified
        source_type: source,
        external_link: rawData.link || rawData.url || null
    };
};

/**
 * Checks if an internship already exists to prevent duplicates.
 * Logic: Same company, role, and location.
 */
const checkDuplicate = async (company, role, location) => {
    try {
        const result = await pool.query(
            `SELECT id FROM internships 
             WHERE LOWER(company) = LOWER($1) 
             AND LOWER(role) = LOWER($2) 
             AND LOWER(location) = LOWER($3)`,
            [company, role, location]
        );
        return result.rows.length > 0;
    } catch (error) {
        console.error("Error checking duplicate:", error);
        return false; // Fail safe to allow insertion if check fails, or could throw
    }
};

module.exports = {
    normalizeInternshipData,
    checkDuplicate
};
