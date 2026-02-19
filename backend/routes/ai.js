const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

// Resume Analysis
router.post('/analyze-resume', aiController.handleResumeAnalysis);
router.post('/generate-cover-letter', aiController.handleCoverLetter);
// Interview / Chat
router.post('/interview-chat', aiController.handleInterviewChat);

// Explain Match (New)
router.post('/explain-match', aiController.handleMatchExplanation);

// Future endpoints (Cover Letter, Interview) will go here
// router.post('/generate-cover-letter', aiController.generateCoverLetter);
// router.post('/interview-chat', aiController.interviewChat);

module.exports = router;
