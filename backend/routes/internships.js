const express = require('express');
const router = express.Router();
const {
  getAllInternships,
  createInternship,
  ingestFromAPI,
  uploadFromGovPortal,
  updateInternship,
  deleteInternship,
  setVerificationStatus,
  filterByLocationAndSkills,
  getFilterOptions
} = require('../controllers/internshipController');

const { protectAdmin } = require('../middleware/authMiddleware');

// Public Routes
router.get('/filter', filterByLocationAndSkills);      // Filter by location and skills with pagination
router.get('/options/all', getFilterOptions);           // Get available filter options
router.get('/', getAllInternships);

// Admin Routes (Protected)
router.post('/', protectAdmin, createInternship);         // Manual Entry
router.post('/ingest', protectAdmin, ingestFromAPI);      // Public API Ingestion
router.post('/gov-upload', protectAdmin, uploadFromGovPortal); // Gov Portal Upload

router.put('/:id', protectAdmin, updateInternship);
router.delete('/:id', protectAdmin, deleteInternship);
router.patch('/:id/status', protectAdmin, setVerificationStatus); // Verification Endpoint

module.exports = router;
