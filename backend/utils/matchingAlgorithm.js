// Enhanced matching algorithm with STRICT HIERARCHICAL LOCATION PRIORITY
// Priority: Location First → Skill Relevance Second
// 1. Exact City Match (Tier 1)
// 2. Same State Match (Tier 2)
// 3. Nearby Region Match (Tier 3)
// 4. Global/Other (Tier 4)

// Weights for Match Score Calculation (Synchronized with Python Engine)
const WEIGHTS = {
  SKILLS: 0.70,   // 70% Total Skill Match
  LOCATION: 0.30  // 30% Location Match
};

// Location Score Mapping for Match Percentage
const LOCATION_TIER_SCORES = {
  1: 100, // Tier 1 - Exact City Match
  2: 85,  // Tier 2 - Same State Match
  3: 75,  // Tier 3 - Nearby District / Regional
  4: 25   // Tier 4 - Other (Anywhere)
};

// Minimum skill matches required for good ranking
const MIN_SKILL_MATCHES = 2;

// --- DATASETS ---

const CITY_STATE_MAP = {
  // Tamil Nadu
  'chennai': 'tamil nadu', 'coimbatore': 'tamil nadu', 'madurai': 'tamil nadu', 'trichy': 'tamil nadu',
  'salem': 'tamil nadu', 'tirunelveli': 'tamil nadu', 'erode': 'tamil nadu', 'vellore': 'tamil nadu',
  'thanjavur': 'tamil nadu', 'kanchipuram': 'tamil nadu', 'tiruppur': 'tamil nadu', 'hosur': 'tamil nadu',
  'tenkasi': 'tamil nadu', 'kanyakumari': 'tamil nadu', 'nagercoil': 'tamil nadu', 'theni': 'tamil nadu',
  'karur': 'tamil nadu', 'namakkal': 'tamil nadu',

  // Karnataka
  'bangalore': 'karnataka', 'bengaluru': 'karnataka', 'mysore': 'karnataka', 'mangalore': 'karnataka',
  'hubli': 'karnataka', 'belgaum': 'karnataka', 'udupi': 'karnataka', 'tumkur': 'karnataka',

  // Maharashtra
  'mumbai': 'maharashtra', 'pune': 'maharashtra', 'nagpur': 'maharashtra', 'nashik': 'maharashtra',
  'aurangabad': 'maharashtra', 'thane': 'maharashtra', 'navi mumbai': 'maharashtra',

  // Telangana & AP
  'hyderabad': 'telangana', 'warangal': 'telangana', 'secunderabad': 'telangana',
  'visakhapatnam': 'andhra pradesh', 'vizag': 'andhra pradesh', 'vijayawada': 'andhra pradesh', 'guntur': 'andhra pradesh',

  // North
  'delhi': 'delhi', 'new delhi': 'delhi',
  'noida': 'uttar pradesh', 'lucknow': 'uttar pradesh', 'kanpur': 'uttar pradesh', 'agra': 'uttar pradesh', 'ghaziabad': 'uttar pradesh',
  'gurgaon': 'haryana', 'gurugram': 'haryana', 'faridabad': 'haryana',
  'chandigarh': 'chandigarh',

  // Kerala
  'kochi': 'kerala', 'cochin': 'kerala', 'trivandrum': 'kerala', 'thiruvananthapuram': 'kerala', 'kozhikode': 'kerala',

  // West Bengal
  'kolkata': 'west bengal', 'calcutta': 'west bengal',

  // Gujarat
  'ahmedabad': 'gujarat', 'surat': 'gujarat', 'vadodara': 'gujarat', 'rajkot': 'gujarat',

  // Other Major Cities
  'jaipur': 'rajasthan', 'indore': 'madhya pradesh', 'bhopal': 'madhya pradesh',
  'bhubaneswar': 'odisha', 'patna': 'bihar'
};

const NEARBY_CITIES = {
  'chennai': ['coimbatore', 'vellore', 'kanchipuram', 'bangalore', 'tirupati', 'pondicherry'],
  'bangalore': ['mysore', 'hosur', 'tumkur', 'chennai', 'coimbatore'],
  'mumbai': ['thane', 'navi mumbai', 'pune', 'nashik'],
  'pune': ['mumbai', 'thane', 'navi mumbai'],
  'delhi': ['noida', 'gurgaon', 'gurugram', 'faridabad', 'ghaziabad'],
  'noida': ['delhi', 'gurgaon', 'gurugram', 'ghaziabad'],
  'gurgaon': ['delhi', 'noida', 'faridabad'],
  'coimbatore': ['tiruppur', 'erode', 'salem', 'ooty', 'chennai'],
  'hyderabad': ['secunderabad', 'warangal']
};

const NEARBY_STATES = {
  'tamil nadu': ['karnataka', 'kerala', 'andhra pradesh', 'telangana', 'puducherry'],
  'karnataka': ['tamil nadu', 'kerala', 'maharashtra', 'telangana', 'goa'],
  'maharashtra': ['gujarat', 'madhya pradesh', 'karnataka', 'goa', 'telangana'],
  'delhi': ['haryana', 'uttar pradesh', 'rajasthan', 'punjab'],
  'kerala': ['tamil nadu', 'karnataka'],
  'telangana': ['andhra pradesh', 'karnataka', 'maharashtra'],
  'andhra pradesh': ['telangana', 'tamil nadu', 'karnataka', 'odisha']
};

// --- CORE FUNCTIONS ---

const normalizeLocation = (input) => {
  if (!input) return { city: null, state: null, country: 'india' };

  const raw = input.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').trim();

  // 1. Check if raw string is exactly a known city
  if (CITY_STATE_MAP[raw]) {
    return { city: raw, state: CITY_STATE_MAP[raw], country: 'india' };
  }

  // 2. Tokenize and check for city names
  const tokens = raw.split(/\s+/);
  for (const t of tokens) {
    if (CITY_STATE_MAP[t]) {
      return { city: t, state: CITY_STATE_MAP[t], country: 'india' };
    }
  }

  // 3. Check for state names directly
  const knownStates = Object.values(CITY_STATE_MAP);
  if (knownStates.includes(raw)) {
    return { city: null, state: raw, country: 'india' };
  }

  // 4. Check if any token is a state
  for (const t of tokens) {
    if (knownStates.includes(t)) {
      return { city: null, state: t, country: 'india' };
    }
  }

  return { city: null, state: null, country: 'india' };
};

const calculateLocationTier = (userLocStr, internLocStr) => {
  const userLocs = (userLocStr || '').split(',').map(l => l.trim()).filter(l => l);

  if (userLocs.length === 0 || userLocs.some(l => l.toLowerCase() === 'any')) {
    // No location preference - treat all as Tier 4
    return { tier: 4, score: LOCATION_TIER_SCORES[4], label: 'Any Location' };
  }

  const intern = normalizeLocation(internLocStr);
  let bestResult = { tier: 4, score: LOCATION_TIER_SCORES[4], label: 'Other Location' };

  for (const ul of userLocs) {
    const user = normalizeLocation(ul);
    if (!user.city && !user.state) continue;

    let currentTier = 4;
    let currentLabel = 'Other Location';

    // Tier 1: Exact City Match
    if (user.city && intern.city && user.city === intern.city) {
      currentTier = 1;
      currentLabel = 'City Match';
    }
    // Tier 2: Same State Match
    else if (user.state && intern.state && user.state === intern.state) {
      currentTier = 2;
      currentLabel = 'State Match';
    }
    // Tier 3: Nearby City
    else if (user.city && intern.city && NEARBY_CITIES[user.city] && NEARBY_CITIES[user.city].includes(intern.city)) {
      currentTier = 3;
      currentLabel = 'Nearby City';
    }
    // Tier 3: Nearby State
    else if (user.state && intern.state && NEARBY_STATES[user.state] && NEARBY_STATES[user.state].includes(intern.state)) {
      currentTier = 3;
      currentLabel = 'Nearby State';
    }

    if (currentTier < bestResult.tier) {
      bestResult = { tier: currentTier, score: LOCATION_TIER_SCORES[currentTier], label: currentLabel };
    }
    if (currentTier === 1) break; // Can't get better than Tier 1
  }

  return bestResult;
};

// --- MATCH SCORING ---

const calculateMatchMetaData = (studentProfile, internship) => {
  const resumeData = studentProfile.resumeData || {};
  const profileSkills = studentProfile.skills || [];
  const resumeSkills = resumeData.extractedSkills || [];

  // 1. Skill Match Percentage (Combined Resume + Profile)
  const combinedUserSkills = [...new Set([...profileSkills, ...resumeSkills])];
  const skillResult = calculateSkillMatchDetailed(combinedUserSkills, internship.skills);

  // USER REQUEST: STRICT FILTER - If 0 matches, return null to filter out
  if (skillResult.matchCount === 0) return null;

  // 2. Location Tier & Score
  const locResult = calculateLocationTier(studentProfile.preferredState, internship.location);

  // 3. Tech Sector Logic (Aggressive rejection of non-tech for tech users)
  const targetSector = (studentProfile.preferredSector || 'Technology').toLowerCase();
  const isTechTarget = ['tech', 'it', 'computer', 'science', 'data'].some(kw => targetSector.includes(kw));

  const roleText = ((internship.role || '') + ' ' + (internship.sector || '')).toLowerCase();
  const isHardNonTech = ['marketing', 'sales', 'seo', 'recruitment', 'hr', 'acquisition', 'data entry', 'content', 'writing', 'social media', 'business development', 'customer support', 'retail', 'hollywood', 'operations'].some(kw => roleText.includes(kw));

  // If user wants tech but job is clearly marketing/hr -> Skip it
  if (isTechTarget && isHardNonTech) {
    return null; // DISCARD - User wants tech roles
  }

  // 4. Calculate weighted match score
  // Pure 70/30 split
  const rawScore = (skillResult.score * WEIGHTS.SKILLS) + (locResult.score * WEIGHTS.LOCATION);
  let finalScore = Math.round(rawScore);
  finalScore = Math.max(10, Math.min(99, finalScore));

  return {
    finalScore: finalScore,
    locationTier: locResult.tier,
    locationLabel: locResult.label,
    locationScore: locResult.score,
    profileSkillScore: skillResult.score, // Used for the green line in UI
    totalSkillMatches: skillResult.matchCount,
    hasMinimumSkills: skillResult.matchCount > 0
  };
};

// --- RANKING LOGIC ---

const getRankedRecommendations = (studentProfile, internships, limit = 50) => {
  if (!internships || !Array.isArray(internships)) return [];

  const processed = internships.map(internship => {
    const meta = calculateMatchMetaData(studentProfile, internship);
    if (!meta) return null; // Filtered out by zero-match logic

    return {
      ...internship,
      ...meta,
      matchPercentage: meta.finalScore + '%',
      matchLabel: getMatchLabel(meta.finalScore)
    };
  }).filter(p => p !== null);

  // STRICT FILTERING LOGIC
  const prefLocs = (studentProfile.preferredState || '').split(',').map(l => l.trim()).filter(l => l && l.toLowerCase() !== 'any');
  let strictFiltered = [];

  if (prefLocs.length > 0) {
    // If any location is specified, prioritize Tier 1-3 matches
    strictFiltered = processed.filter(p => p.locationTier <= 3);

    // If no results in preferred tiers, expand to all
    if (strictFiltered.length === 0) {
      strictFiltered = processed;
    }
  } else {
    // No location preference -> Show all
    strictFiltered = processed;
  }

  // HIERARCHICAL GROUPING with SKILL-BASED RANKING within each tier
  const tier1 = strictFiltered
    .filter(p => p.locationTier === 1)
    .sort((a, b) => {
      // Within Tier 1: Sort by skill matches first, then by final score
      if (b.totalSkillMatches !== a.totalSkillMatches) {
        return b.totalSkillMatches - a.totalSkillMatches;
      }
      return b.finalScore - a.finalScore;
    });

  const tier2 = strictFiltered
    .filter(p => p.locationTier === 2)
    .sort((a, b) => {
      // Within Tier 2: Prioritize those with minimum skill matches
      if (a.hasMinimumSkills !== b.hasMinimumSkills) {
        return b.hasMinimumSkills - a.hasMinimumSkills;
      }
      if (b.totalSkillMatches !== a.totalSkillMatches) {
        return b.totalSkillMatches - a.totalSkillMatches;
      }
      return b.finalScore - a.finalScore;
    });

  const tier3 = strictFiltered
    .filter(p => p.locationTier === 3)
    .sort((a, b) => {
      // Within Tier 3: Prioritize those with minimum skill matches
      if (a.hasMinimumSkills !== b.hasMinimumSkills) {
        return b.hasMinimumSkills - a.hasMinimumSkills;
      }
      if (b.totalSkillMatches !== a.totalSkillMatches) {
        return b.totalSkillMatches - a.totalSkillMatches;
      }
      return b.finalScore - a.finalScore;
    });

  const tier4 = strictFiltered
    .filter(p => p.locationTier === 4)
    .sort((a, b) => {
      // Within Tier 4: Sort by skill relevance only
      if (b.totalSkillMatches !== a.totalSkillMatches) {
        return b.totalSkillMatches - a.totalSkillMatches;
      }
      return b.finalScore - a.finalScore;
    });

  // Concatenate Tiers (Location Priority First)
  const ranked = [...tier1, ...tier2, ...tier3, ...tier4];

  return ranked.slice(0, limit);
};

// --- HELPERS ---

// Enhanced skill matching with detailed count tracking
const calculateSkillMatchDetailed = (userSkills, internshipSkillsStr) => {
  if (!internshipSkillsStr) return { score: 50, matchCount: 0 };
  if (!userSkills || userSkills.length === 0) return { score: 10, matchCount: 0 };

  const iSkills = internshipSkillsStr.replace(/[\[\]\(\)\'\"]/g, '').split(',').map(s => s.trim().toLowerCase());
  const uSkills = userSkills.map(s => s.toLowerCase());

  let matchCount = 0;

  // Check for exact matches and similar matches with normalization
  const normU = uSkills.map(s => s.replace(/[-.\s]/g, ''));

  const matchedSkills = iSkills.reduce((acc, iSkill) => {
    const normI = iSkill.replace(/[-.\s]/g, '');
    const hasMatch = uSkills.some((uSkill, idx) => {
      const nu = normU[idx];
      return nu === normI ||
        nu.includes(normI) ||
        normI.includes(nu) ||
        areSkillsSimilar(uSkill, iSkill)
    });

    if (hasMatch) {
      matchCount++;
      acc.push(iSkill);
    }
    return acc;
  }, []);

  const score = (matchCount / iSkills.length) * 100;

  return {
    score: Math.round(score),
    matchCount: matchCount,
    matchedSkills: matchedSkills
  };
};

// Legacy function for backward compatibility
const calculateSkillMatch = (userSkills, internshipSkillsStr) => {
  const result = calculateSkillMatchDetailed(userSkills, internshipSkillsStr);
  return result.score;
};

const areSkillsSimilar = (skill1, skill2) => {
  const skillMap = {
    'javascript': ['js', 'nodejs', 'react', 'typescript', 'express'],
    'python': ['py', 'django', 'flask', 'pandas', 'numpy'],
    'java': ['spring', 'j2ee', 'springboot'],
    'database': ['sql', 'mysql', 'mongodb', 'postgresql', 'postgres'],
    'design': ['figma', 'ui/ux', 'photoshop', 'illustrator', 'adobe'],
    'machine learning': ['ml', 'ai', 'deep learning', 'nlp', 'tensorflow', 'pytorch'],
    'finance': ['accounting', 'taxation', 'gst', 'tally', 'finance', 'audit', 'banking', 'equity', 'investment', 'excel', 'finance'],
    'excel': ['microsoft excel', 'ms excel', 'spreadsheets', 'vlookup', 'pivoting', 'excel']
  };

  for (const [key, values] of Object.entries(skillMap)) {
    const s1InGroup = skill1 === key || values.includes(skill1);
    const s2InGroup = skill2 === key || values.includes(skill2);
    if (s1InGroup && s2InGroup) return true;
  }
  return false;
};

const calculateEducationMatch = (profileQual, resumeQual, intReq) => {
  if (!intReq) return 100; // No requirement = 100% match

  const req = intReq.toLowerCase();
  // Prefer resume qualification if available and longer (likely more detailed), else profile
  const userQual = ((resumeQual || "").length > (profileQual || "").length ? resumeQual : profileQual || "").toLowerCase();

  // Simple string inclusion check
  if (userQual.includes(req) || req.includes(userQual)) return 100;

  // Mapping checks
  if (req.includes('bachelor') || req.includes('degree')) {
    if (userQual.includes('b.tech') || userQual.includes('b.e') || userQual.includes('bca') || userQual.includes('bsc')) return 100;
  }
  if (req.includes('master')) {
    if (userQual.includes('m.tech') || userQual.includes('m.e') || userQual.includes('mca') || userQual.includes('msc')) return 100;
  }

  return 50; // Partial match baseline
};

const generateInsights = (student, internship, scores) => {
  const internshipSkills = (internship.skills || "").split(',').map(s => s.trim());

  const userSkills = new Set([
    ...(student.skills || []),
    ...(student.resumeData?.extractedSkills || [])
  ].map(s => s.toLowerCase()));

  const missingSkills = internshipSkills.filter(iSkill => {
    const lowerISkill = iSkill.toLowerCase();
    return !Array.from(userSkills).some(uSkill =>
      uSkill.includes(lowerISkill) || lowerISkill.includes(uSkill) || areSkillsSimilar(uSkill, lowerISkill)
    );
  });

  const tips = [];
  if (missingSkills.length > 0) {
    tips.push(`Learn ${missingSkills.slice(0, 3).join(', ')} to boost your match score.`);
  }
  if (scores.locationTier > 2) {
    tips.push(`This internship is in ${internship.location} (Tier ${scores.locationTier}). Consider if you can relocate.`);
  }

  return {
    missingSkills,
    improvementTips: tips,
    matchLabel: getMatchLabel(scores.finalScore)
  };
};

const getMatchLabel = (score) => {
  if (score >= 85) return 'Excellent Match';
  if (score >= 70) return 'Good Match';
  if (score >= 55) return 'Fair Match';
  if (score >= 40) return 'Average Match';
  return 'Poor Match';
};

const getMatchScore = (studentProfile, internship) => {
  const meta = calculateMatchMetaData(studentProfile, internship);
  const insights = generateInsights(studentProfile, internship, meta);

  return {
    finalScore: meta.finalScore,
    breakdown: {
      resumeSkillScore: meta.resumeSkillScore,
      profileSkillScore: meta.profileSkillScore,
      educationScore: meta.educationScore,
      locationScore: meta.locationScore,
      locationTier: meta.locationTier
    },
    matchPercentage: meta.finalScore + '%',
    ...insights
  };
};

module.exports = {
  getRankedRecommendations,
  getMatchScore,
  normalizeLocation,
  calculateLocationTier
};
