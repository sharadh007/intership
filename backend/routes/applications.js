const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');
const { validateApplicationSubmission } = require('../middleware/validation');

router.post('/submit', validateApplicationSubmission, applicationController.submitApplication);
router.get('/stats', applicationController.getApplicationStats);
router.get('/student/:studentId', applicationController.getStudentApplications);
router.get('/internship/:internshipId', applicationController.getInternshipApplications);
router.get('/:id', applicationController.getApplicationById);
router.put('/:id/status', applicationController.updateApplicationStatus);
router.delete('/:id', applicationController.deleteApplication);

module.exports = router;
