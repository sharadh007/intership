const pool = require('../config/database');
const { normalizeInternshipData, checkDuplicate } = require('../services/internshipService');

// Get all internships with filtering
const getAllInternships = async (req, res) => {
  try {
    const { sector, state, company, source_type } = req.query;

    let query = 'SELECT * FROM internships WHERE 1=1';
    let params = [];
    let paramCount = 1;

    if (sector) {
      query += ` AND LOWER(sector) LIKE LOWER($${paramCount})`;
      params.push(`%${sector}%`);
      paramCount++;
    }

    if (state) {
      // Assuming location might store "City, State" or just "State"
      query += ` AND LOWER(location) LIKE LOWER($${paramCount})`;
      params.push(`%${state}%`);
      paramCount++;
    }

    if (company) {
      query += ` AND LOWER(company) LIKE LOWER($${paramCount})`;
      params.push(`%${company}%`);
      paramCount++;
    }

    if (source_type) {
      query += ` AND source_type = $${paramCount}`;
      params.push(source_type);
      paramCount++;
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// 1. Admin Manual Entry
const createInternship = async (req, res) => {
  try {
    const normalized = normalizeInternshipData(req.body, 'manual_entry');

    // Duplicate Check
    const isDuplicate = await checkDuplicate(normalized.company, normalized.role, normalized.location);
    if (isDuplicate) {
      return res.status(409).json({ success: false, error: 'Duplicate internship entry.' });
    }

    const { company, role, location, sector, duration, stipend, requirements, skills, description, deadline, verification_status, source_type, external_link } = normalized;

    const result = await pool.query(
      `INSERT INTO internships 
            (company, role, location, sector, duration, stipend, requirements, skills, description, deadline, verification_status, source_type, external_link) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) 
            RETURNING *`,
      [company, role, location, sector, duration, stipend, requirements, skills, description, deadline, verification_status, source_type, external_link]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Creation Failed' });
  }
};

// 2. Public API Ingestion (Bulk)
const ingestFromAPI = async (req, res) => {
  try {
    const { internships } = req.body; // Expecting { internships: [...] }
    if (!Array.isArray(internships)) {
      return res.status(400).json({ success: false, error: 'Invalid input format. Expected array.' });
    }

    let addedCount = 0;
    let skippedCount = 0;

    for (const item of internships) {
      const normalized = normalizeInternshipData(item, 'public_api');

      const isDuplicate = await checkDuplicate(normalized.company, normalized.role, normalized.location);
      if (isDuplicate) {
        skippedCount++;
        continue;
      }

      const { company, role, location, sector, duration, stipend, requirements, skills, description, deadline, verification_status, source_type, external_link } = normalized;

      await pool.query(
        `INSERT INTO internships 
                (company, role, location, sector, duration, stipend, requirements, skills, description, deadline, verification_status, source_type, external_link) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [company, role, location, sector, duration, stipend, requirements, skills, description, deadline, verification_status, source_type, external_link]
      );
      addedCount++;
    }

    res.json({ success: true, message: `Ingestion complete. Added: ${addedCount}, Skipped: ${skippedCount}` });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Ingestion Failed' });
  }
};

// 3. Government Portal Upload (Simulated)
const uploadFromGovPortal = async (req, res) => {
  // In a real app, this would parse a CSV/Excel file.
  // Here we assume the frontend/admin parses it and sends a JSON array
  // flagged as 'gov_portal' source.
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows)) {
      return res.status(400).json({ success: false, error: 'Invalid input. Expected rows.' });
    }

    let addedCount = 0;
    for (const item of rows) {
      const normalized = normalizeInternshipData(item, 'gov_portal');
      // Gov portals might be trusted, but still check duplicates? Yes.
      const isDuplicate = await checkDuplicate(normalized.company, normalized.role, normalized.location);
      if (!isDuplicate) {
        const { company, role, location, sector, duration, stipend, requirements, skills, description, deadline, verification_status, source_type, external_link } = normalized;
        await pool.query(
          `INSERT INTO internships 
                    (company, role, location, sector, duration, stipend, requirements, skills, description, deadline, verification_status, source_type, external_link) 
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [company, role, location, sector, duration, stipend, requirements, skills, description, deadline, verification_status, source_type, external_link]
        );
        addedCount++;
      }
    }

    res.json({ success: true, message: `Gov Portal upload processed. Added: ${addedCount}` });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Upload Failed' });
  }
};

// 4. Update Internship (Admin)
const updateInternship = async (req, res) => {
  try {
    const { id } = req.params;
    const { company, role, location, sector, duration, stipend, requirements, skills, description, deadline } = req.body;

    const check = await pool.query('SELECT * FROM internships WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Internship not found' });
    }

    if (check.rows[0].verification_status === 'expired') {
      return res.status(403).json({ success: false, error: 'Cannot edit expired internships.' });
    }

    const result = await pool.query(
      `UPDATE internships 
            SET company = $1, role = $2, location = $3, sector = $4, duration = $5, stipend = $6, requirements = $7, skills = $8, description = $9, deadline = $10
            WHERE id = $11 RETURNING *`,
      [company, role, location, sector, duration, stipend, requirements, skills, description, deadline, id]
    );

    res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Update Failed' });
  }
};

// 5. Delete Internship (Admin)
const deleteInternship = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM internships WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Internship not found' });
    }

    res.json({ success: true, message: 'Internship removed' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Delete Failed' });
  }
};

// 6. Set Verification Status (Admin)
const setVerificationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'verified', 'unverified', 'expired'

    if (!['verified', 'unverified', 'expired'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const result = await pool.query(
      'UPDATE internships SET verification_status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Internship not found' });
    }

    res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Status Update Failed' });
  }
};

module.exports = {
  getAllInternships,
  createInternship,
  ingestFromAPI,
  uploadFromGovPortal,
  updateInternship,
  deleteInternship,
  setVerificationStatus
};
