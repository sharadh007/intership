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

    // 2. Score using the Unified Matching Engine
    const scored = eligible.map(i => {
        const result = matchingAlgorithm.getMatchScore(student, i);
        return {
            ...i,
            matchScore: result.finalScore,
            scoreBreakdown: result.breakdown,
            matchPercentage: result.matchPercentage,
            matchLabel: result.matchLabel,
            missingSkills: result.missingSkills,
            improvementTips: result.improvementTips
        };
    });

    // 3. Sort (Rank by highest match score)
    const sorted = scored.sort((a, b) => b.matchScore - a.matchScore);

    // 4. Return Top 5
    return sorted.slice(0, 5);
};

module.exports = { getDeterministicMatches };
