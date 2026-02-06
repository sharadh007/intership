const pool = require('../config/database');

// --- Normalization Logic ---
const normalizeInternship = (rawData, sourceName) => {
    const normalized = {
        source_name: sourceName,
        raw_data: rawData,
        last_fetched_at: new Date(),
        verification_status: 'unverified', // Admin must verify API data
        source_type: 'api'
    };

    if (sourceName === 'GOV_PORTAL') {
        // Mapping for hypothetical Government API
        normalized.source_id = rawData.job_id || `GOV_${Date.now()}`;
        normalized.company = rawData.ministry_name || rawData.department || 'Govt of India';
        normalized.role = rawData.job_title || 'Intern';
        normalized.location = rawData.location || 'New Delhi';
        normalized.sector = rawData.sector || 'Public Administration';
        normalized.stipend = rawData.stipend_amount ? parseInt(rawData.stipend_amount) : 0;
        normalized.deadline = rawData.closing_date || null;
        normalized.description = rawData.description || 'No description provided.';
        normalized.skills = rawData.required_skills ? JSON.stringify(rawData.required_skills) : JSON.stringify([]);
        normalized.duration = rawData.duration_months ? `${rawData.duration_months} Months` : 'Flexible';
        normalized.external_link = rawData.apply_url || '#';
    } else if (sourceName === 'PARTNER_API') {
        // Mapping for Partner API
        normalized.source_id = rawData.partner_id || `PARTNER_${Date.now()}`;
        normalized.company = rawData.company_name || 'Partner Company';
        normalized.role = rawData.title || 'Intern';
        normalized.location = rawData.city || 'Remote';
        normalized.sector = rawData.industry || 'Technology';
        normalized.stipend = rawData.stipend_inr ? parseInt(rawData.stipend_inr) : 0;
        normalized.deadline = rawData.valid_until || null;
        normalized.description = rawData.description || 'No description provided.';
        normalized.skills = rawData.skills ? JSON.stringify(rawData.skills) : JSON.stringify([]);
        normalized.duration = rawData.duration_weeks ? `${rawData.duration_weeks} Weeks` : 'Flexible';
        normalized.external_link = rawData.link || '#';
    }

    // Add other source mappings here (e.g., LINKEDIN_PARTNER)

    return normalized;
};

// --- Database Upsert Logic ---
const upsertInternship = async (data) => {
    const client = await pool.connect();
    try {
        // Check if exists by source_id
        const check = await client.query('SELECT id FROM internships WHERE source_id = $1', [data.source_id]);

        if (check.rows.length > 0) {
            // UPDATE existing
            const id = check.rows[0].id;
            await client.query(`
        UPDATE internships SET
          company = $1, role = $2, location = $3, sector = $4, 
          stipend = $5, deadline = $6, description = $7, skills = $8,
          duration = $9, external_link = $10, 
          last_fetched_at = $11, raw_data = $12
        WHERE id = $13
      `, [
                data.company, data.role, data.location, data.sector,
                data.stipend, data.deadline, data.description, data.skills,
                data.duration, data.external_link,
                data.last_fetched_at, data.raw_data,
                id
            ]);
            return { status: 'updated', id };
        } else {
            // INSERT new
            const res = await client.query(`
        INSERT INTO internships (
          source_name, source_id, company, role, location, sector,
          stipend, deadline, description, skills, duration, external_link,
          last_fetched_at, raw_data, verification_status, source_type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING id
      `, [
                data.source_name, data.source_id, data.company, data.role, data.location, data.sector,
                data.stipend, data.deadline, data.description, data.skills, data.duration, data.external_link,
                data.last_fetched_at, data.raw_data, data.verification_status, data.source_type
            ]);
            return { status: 'inserted', id: res.rows[0].id };
        }
    } finally {
        client.release();
    }
};

// --- Soft Delete Logic (Sync) ---
const processSoftDeletes = async (sourceName, activeSourceIds) => {
    const client = await pool.connect();
    try {
        console.log(`🔄 Syncing deletions for ${sourceName}...`);

        // Find internships that are:
        // 1. From this source
        // 2. Not in the active list
        // 3. Not already deleted/expired

        // We handle the "NOT IN" carefully for empty lists
        if (!activeSourceIds || activeSourceIds.length === 0) {
            console.log(`⚠️ No active IDs provided for ${sourceName}. Skipping safety check to avoid wiping all data.`);
            return { deleted: 0 };
        }

        const query = `
            UPDATE internships 
            SET verification_status = 'expired', deleted_at = NOW()
            WHERE source_name = $1 
            AND source_id != ALL($2)
            AND verification_status != 'expired'
            RETURNING id, source_id
        `;

        const res = await client.query(query, [sourceName, activeSourceIds]);

        if (res.rowCount > 0) {
            console.log(`🗑️ Soft-deleted ${res.rowCount} records from ${sourceName} that are no longer remote.`);
        }

        return { deleted: res.rowCount };
    } catch (e) {
        console.error(`Error processing soft deletes for ${sourceName}:`, e);
        return { deleted: 0 };
    } finally {
        client.release();
    }
};

module.exports = {
    normalizeInternship,
    upsertInternship,
    processSoftDeletes
};
