const express = require('express');
const router = express.Router();
const recommendationController = require('../controllers/recommendationController');
const aiController = require('../controllers/aiController');
const { validateRecommendationRequest } = require('../middleware/validation');

// Route for getting recommendations
router.post('/', validateRecommendationRequest, recommendationController.getRecommendations);
router.post('/get-recommendations', validateRecommendationRequest, recommendationController.getRecommendations);

router.post('/ai-match', validateRecommendationRequest, aiController.getAIRecommendations);
router.post('/ai-recommendations', validateRecommendationRequest, aiController.getAIRecommendations);

module.exports = router;
