/**
 * Matching Service
 * Uses centralized Matching Algorithm
 */

const { checkEligibility } = require('./eligibilityService');
const matchingAlgorithm = require('../utils/matchingAlgorithm');

const getDeterministicMatches = async (student, allInternships) => {
    // 1. Filter
    const eligible = allInternships.filter(i =>
        i.verification_status !== 'expired' &&
        checkEligibility(student, i)
    );

    console.log(`Matching Service: ${eligible.length} eligible out of ${allInternships.length}`);

    // 2. Use hierarchical ranked algorithm (location-priority + skill-based)
    const ranked = matchingAlgorithm.getRankedRecommendations(student, eligible, 10);

    // 3. Map to include all match fields used by frontend
    const results = ranked.map(i => ({
        ...i,
        matchScore: i.finalScore,
        matchPercentage: i.finalScore + '%',
        matchLabel: i.matchLabel,
        scoreBreakdown: {
            resumeSkillScore: i.resumeSkillScore,
            profileSkillScore: i.profileSkillScore,
            educationScore: i.educationScore,
            locationScore: i.locationScore,
            locationTier: i.locationTier
        },
        missingSkills: i.missingSkills || [],
        improvementTips: i.improvementTips || []
    }));

    if (results.length > 0) {
        console.log(`Top Match: ${results[0].finalScore}% - ${results[0].locationLabel}`);
    }

    return results;
};

module.exports = { getDeterministicMatches };
