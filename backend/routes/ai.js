const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Resume Analysis
router.post('/analyze-resume', aiController.handleResumeAnalysis);
router.post('/upload-resume', upload.single('resume'), aiController.handleResumeUpload);
router.post('/generate-cover-letter', aiController.handleCoverLetter);
// Interview / Chat
router.post('/interview-chat', aiController.handleInterviewChat);

// Explain Match (New)
router.post('/explain-match', aiController.handleMatchExplanation);

// Generate Project Ideas (New)
router.post('/generate-project-ideas', aiController.handleProjectIdeas);

// Dream Company Roadmap (New)
router.post('/generate-roadmap', aiController.handleDreamRoadmap);



// Future endpoints (Cover Letter, Interview) will go here
// router.post('/generate-cover-letter', aiController.generateCoverLetter);
// router.post('/interview-chat', aiController.interviewChat);

module.exports = router;
