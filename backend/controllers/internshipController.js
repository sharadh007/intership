const pool = require('../config/database');
const { normalizeInternshipData, checkDuplicate } = require('../services/internshipService');
const { getInternships, filterInternships, getAllLocations, getAllSkills } = require('../services/csvDataService');

// Get all internships with filtering
// Get all internships with filtering (simulated via CSV service)
const getAllInternships = async (req, res) => {
  try {
    // Redirect to the filter function which uses the CSV service and supports pagination
    // This ensures consistency and uses the CSV data as requested
    return filterByLocationAndSkills(req, res);
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

// Filter internships by location and skills with pagination
// Filter internships by location and skills with pagination (from CSV data)
const filterByLocationAndSkills = async (req, res) => {
  try {
    const { location, skills, company, page = 1, limit = 15 } = req.query;

    // Get all internships from CSV
    const allInternships = getInternships();

    // Parse skills array
    let skillsArray = [];
    if (skills && skills !== '') {
      skillsArray = Array.isArray(skills) ? skills :
        (typeof skills === 'string' ? skills.split(',').map(s => s.trim()) : []);
      skillsArray = skillsArray.filter(s => s !== '' && s !== undefined);
    }

    // Filter internships
    let filtered = filterInternships(allInternships, location, skillsArray, company);


    // Get total count
    const total = filtered.length;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, Math.min(10000, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    // Paginate results
    const paginatedData = filtered.slice(offset, offset + limitNum);
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      data: paginatedData,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: total,
        totalPages: totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      }
    });
  } catch (error) {
    console.error('Error filtering internships:', error);
    res.status(500).json({ success: false, error: 'Filtering Failed', message: error.message });
  }
};

// Get filter options from CSV data
const getFilterOptions = async (req, res) => {
  try {
    const allInternships = getInternships();

    // Get unique locations from CSV data
    const locations = getAllLocations(allInternships);

    // Get unique skills from CSV data
    const skills = getAllSkills(allInternships);

    res.json({
      success: true,
      locations: locations.slice(0, 100),
      skills: skills.slice(0, 200)
    });
  } catch (error) {
    console.error('Error getting filter options:', error);
    res.status(500).json({ success: false, error: 'Failed to get filter options', message: error.message });
  }
};

module.exports = {
  getAllInternships,
  createInternship,
  ingestFromAPI,
  uploadFromGovPortal,
  updateInternship,
  deleteInternship,
  setVerificationStatus,
  filterByLocationAndSkills,
  getFilterOptions
};
