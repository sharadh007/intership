// Enhanced matching algorithm with STRICT HIERARCHICAL LOCATION PRIORITY
// 1. Exact City Match (Tier 1)
// 2. Same State Match (Tier 2)
// 3. Nearby Region Match (Tier 3)
// 4. Global/Other (Tier 4)

// Weights - Adjusted for Location Priority and Match Accuracy
const WEIGHTS = {
  RESUME_SKILLS: 0.40,  // Increased as per requirement
  PROFILE_SKILLS: 0.20,
  EDUCATION: 0.15,
  LOCATION: 0.25,       // Explicit weight for score calculation
  // Experience and Industry are part of the base validation/checks
  EXPERIENCE: 0.0,      // Handled via eligibility checks or merged into skills/resume
  INDUSTRY: 0.0         // Handled via strict/soft filters usually, but we'll keeping it low or merged
};

// Location Score Mapping for Match Percentage
const LOCATION_TIER_SCORES = {
  1: 100, // Tier 1
  2: 75,  // Tier 2
  3: 50,  // Tier 3
  4: 0    // Tier 4
};

// --- DATASETS ---

const CITY_STATE_MAP = {
  // Tamil Nadu
  'chennai': 'tamil nadu', 'coimbatore': 'tamil nadu', 'madurai': 'tamil nadu', 'trichy': 'tamil nadu',
  'salem': 'tamil nadu', 'tirunelveli': 'tamil nadu', 'erode': 'tamil nadu', 'vellore': 'tamil nadu',
  'thanjavur': 'tamil nadu', 'kanchipuram': 'tamil nadu', 'tiruppur': 'tamil nadu', 'hosur': 'tamil nadu',

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
  const user = normalizeLocation(userLocStr);
  const intern = normalizeLocation(internLocStr);

  // If user has no preference, default to Tier 4 (or Tier 1 if we want to be generous, but strict logic implies strict matching)
  // Request says: "User location preference is strictly enforced". 
  // If user didn't provide location, we can't strict match. assuming Tier 1 only if input matches functionality.
  // Ideally if no user location, distance is irrelevant, so maybe Tier 1. 
  // But let's assume specific input.
  if (!user.city && !user.state) {
    // Treat as neutral/global
    return { tier: 4, score: 0, label: 'Global' };
  }

  // Tier 1: Exact City Match
  if (user.city && intern.city && user.city === intern.city) {
    return { tier: 1, score: 100, label: 'City Match' };
  }

  // Tier 3: Nearby City (Adjacency List) - Priority OVER State Match for strict filtering
  if (user.city && intern.city && NEARBY_CITIES[user.city] && NEARBY_CITIES[user.city].includes(intern.city)) {
    return { tier: 3, score: 50, label: 'Nearby City' };
  }

  // Tier 2: Same State Match
  if (user.state && intern.state && user.state === intern.state) {
    return { tier: 2, score: 75, label: 'State Match' };
  }

  // Tier 3: Nearby State (Adjacency List)
  if (user.state && intern.state && NEARBY_STATES[user.state] && NEARBY_STATES[user.state].includes(intern.state)) {
    return { tier: 3, score: 50, label: 'Nearby State' };
  }

  // Tier 4: Other
  return { tier: 4, score: 0, label: 'Far' };
};

// --- MATCH SCORING ---

const calculateMatchMetaData = (studentProfile, internship) => {
  const resumeData = studentProfile.resumeData || {};
  const profileSkills = studentProfile.skills || [];
  const resumeSkills = resumeData.extractedSkills || [];

  // 1. Skill Scores
  const resumeSkillScore = calculateSkillMatch(resumeSkills, internship.skills);
  const profileSkillScore = calculateSkillMatch(profileSkills, internship.skills);

  // 2. Education Score
  const educationScore = calculateEducationMatch(studentProfile.qualification, resumeData.educationLevel, internship.requirements);

  // 3. Location Tier & Score
  const locResult = calculateLocationTier(studentProfile.preferredState, internship.location);


  // 4. Final Score Component Calculation
  // Weighted Sum:
  // Resume Skills (40%) + Profile Skills (20%) + Education (15%) + Location (25%)

  const weightedScore =
    (resumeSkillScore * WEIGHTS.RESUME_SKILLS) +
    (profileSkillScore * WEIGHTS.PROFILE_SKILLS) +
    (educationScore * WEIGHTS.EDUCATION) +
    (locResult.score * WEIGHTS.LOCATION);

  let finalScore = Math.round(weightedScore);

  // OVERRIDE: If Location is Tier 1 (Exact City), FORCE 100% Match
  if (locResult.tier === 1) {
    finalScore = 100;
  }

  return {
    contentScore: finalScore, // Renaming for consistency, but this IS the final score
    finalScore: finalScore,
    locationTier: locResult.tier,
    locationLabel: locResult.label,
    locationScore: locResult.score,
    resumeSkillScore,
    profileSkillScore,
    educationScore
  };
};

// --- RANKING LOGIC ---

const getRankedRecommendations = (studentProfile, internships, limit = 50) => {
  if (!internships || !Array.isArray(internships)) return [];

  const processed = internships.map(internship => {
    const meta = calculateMatchMetaData(studentProfile, internship);
    return {
      ...internship,
      ...meta,
      matchPercentage: meta.finalScore + '%'
    };
  });

  // STRICT FILTERING LOGIC
  const userLoc = normalizeLocation(studentProfile.preferredState);
  let strictFiltered = [];

  if (userLoc.city) {
    // User specified a CITY (e.g., "Coimbatore")
    // ALLOW: Tier 1 (Exact City), Tier 3 (Nearby City)
    // BLOCK: Tier 2 (State Match - unless it's nearby), Tier 4 (Far)
    strictFiltered = processed.filter(p => p.locationTier === 1 || p.locationTier === 3);
  } else if (userLoc.state) {
    // User specified a STATE (e.g., "Tamil Nadu")
    // ALLOW: Tier 2 (State Match), Tier 3 (Nearby State)
    // NOTE: Tier 1 is naturally included in Tier 2 conceptually if we matched by state,
    // but our logic separates them. If input is State, we usually won't get Tier 1 (City Match)
    // because user didn't give a city. BUT if the internship has that state, it's a Tier 2 match.
    // BLOCK: Tier 4 (Far)
    strictFiltered = processed.filter(p => p.locationTier <= 3);
  } else {
    // No location preference or unknown -> Show all (Fallback)
    strictFiltered = processed;
  }

  // Debug log for filtered count
  // console.log(`[Matching] Input: "${studentProfile.preferredState}" -> City: ${userLoc.city}, State: ${userLoc.state}. Found: ${strictFiltered.length} / ${processed.length}`);

  // HIERARCHICAL GROUPING of the FILTERED results
  const tier1 = strictFiltered.filter(p => p.locationTier === 1).sort((a, b) => b.finalScore - a.finalScore);
  const tier2 = strictFiltered.filter(p => p.locationTier === 2).sort((a, b) => b.finalScore - a.finalScore);
  const tier3 = strictFiltered.filter(p => p.locationTier === 3).sort((a, b) => b.finalScore - a.finalScore);
  const tier4 = strictFiltered.filter(p => p.locationTier === 4).sort((a, b) => b.finalScore - a.finalScore);

  // Concatenate Tiers
  const ranked = [...tier1, ...tier2, ...tier3, ...tier4];

  return ranked.slice(0, limit);
};

// --- HELPERS ---

const calculateSkillMatch = (userSkills, internshipSkillsStr) => {
  if (!internshipSkillsStr) return 50;
  if (!userSkills || userSkills.length === 0) return 10;
  const iSkills = internshipSkillsStr.split(',').map(s => s.trim().toLowerCase());
  const uSkills = userSkills.map(s => s.toLowerCase());

  // Check for exact matches and similar matches
  const matchedCount = iSkills.reduce((acc, iSkill) => {
    const hasMatch = uSkills.some(uSkill =>
      uSkill === iSkill ||
      uSkill.includes(iSkill) ||
      iSkill.includes(uSkill) ||
      areSkillsSimilar(uSkill, iSkill)
    );
    return acc + (hasMatch ? 1 : 0);
  }, 0);

  return (matchedCount / iSkills.length) * 100;
};

const areSkillsSimilar = (skill1, skill2) => {
  const skillMap = {
    'javascript': ['js', 'nodejs', 'react', 'typescript', 'express'],
    'python': ['py', 'django', 'flask', 'pandas', 'numpy'],
    'java': ['spring', 'j2ee', 'springboot'],
    'database': ['sql', 'mysql', 'mongodb', 'postgresql', 'postgres'],
    'design': ['figma', 'ui/ux', 'photoshop', 'illustrator', 'adobe'],
    'machine learning': ['ml', 'ai', 'deep learning', 'nlp', 'tensorflow', 'pytorch']
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
