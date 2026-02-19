const pool = require('../config/database');

const registerStudent = async (req, res) => {
  try {
    const {
      uid, first_name, last_name, email, phone, skills = [], age,
      qualification, preferred_sector, preferred_state,
      branch, current_year, cgpa, experience_months, resume_url, preferred_industry, strengths, availability
    } = req.body;

    // Combine name
    const name = (first_name || last_name) ? `${first_name || ''} ${last_name || ''}`.trim() : (req.body.name || 'User');

    const query = `
      INSERT INTO students (
        uid, name, email, phone, age, qualification, skills, 
        preferred_sector, preferred_state, branch, current_year,
        cgpa, experience_months, resume_url, preferred_industry, strengths, availability
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::text[], $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      ON CONFLICT (uid) DO UPDATE SET
        name = $2, email = $3, phone = $4, age = $5, qualification = $6, skills = $7::text[], 
        preferred_sector = $8, preferred_state = $9, branch = $10, current_year = $11,
        cgpa = $12, experience_months = $13, resume_url = $14, preferred_industry = $15, strengths = $16, availability = $17,
        created_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const result = await pool.query(query, [
      uid, name, email, phone, age, qualification, skills, preferred_sector, preferred_state,
      branch, current_year, cgpa, experience_months, resume_url, preferred_industry, strengths, availability
    ]);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('🚨 ERROR:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

const getStudentProfile = async (req, res) => {
  try {
    const { uid } = req.params;
    const result = await pool.query('SELECT * FROM students WHERE uid = $1', [uid]);
    res.json({ success: true, data: result.rows[0] || null });
  } catch (error) {
    console.error('Get profile error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

const getAllStudents = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM students');
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const updateStudentProfile = async (req, res) => {
  try {
    const { uid } = req.params;
    const {
      name, email, phone, skills, age, qualification,
      branch, current_year, cgpa, experience_months, resume_url, preferred_industry, preferred_state, strengths, availability
    } = req.body;

    const query = `
      UPDATE students SET 
        name = $1, email = $2, phone = $3, skills = $4::text[], age = $5, qualification = $6,
        branch = $7, current_year = $8, cgpa = $9, experience_months = $10, resume_url = $11, 
        preferred_industry = $12, preferred_state = $13, strengths = $14, availability = $15
      WHERE uid = $16
      RETURNING *
    `;

    const result = await pool.query(query, [
      name, email, phone, skills || [], age, qualification,
      branch, current_year, cgpa, experience_months, resume_url, preferred_industry, preferred_state, strengths, availability,
      uid
    ]);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const deleteStudentProfile = async (req, res) => {
  try {
    const { uid } = req.params;
    const result = await pool.query('DELETE FROM students WHERE uid = $1 RETURNING uid', [uid]);
    res.json({ success: true, message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  registerStudent,
  getStudentProfile,
  getAllStudents,
  updateStudentProfile,
  deleteStudentProfile
};

