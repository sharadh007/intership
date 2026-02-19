const fs = require('fs');
const path = require('path');

/**
 * Simple CSV parser without external dependencies
 * Parses CSV with headers (expects header row)
 */
const parseCSVSimple = (csvContent) => {
  try {
    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const records = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Simple CSV parsing (doesn't handle quoted commas perfectly, but works for our use case)
      const values = [];
      let current = '';
      let inQuotes = false;

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      if (values.length === headers.length) {
        const record = {};
        headers.forEach((header, idx) => {
          record[header] = values[idx];
        });
        records.push(record);
      }
    }
    return records;
  } catch (error) {
    console.error('Error parsing CSV:', error);
    return [];
  }
};

/**
 * Load internship data from CSV file
 */
const loadInternshipsFromCSV = () => {
  try {
    const csvFilePath = path.join(__dirname, '../data/internship_data.csv');

    if (!fs.existsSync(csvFilePath)) {
      console.warn('⚠️  CSV file not found at:', csvFilePath);
      return [];
    }

    const fileContent = fs.readFileSync(csvFilePath, 'utf-8');
    const records = parseCSVSimple(fileContent);

    // Transform CSV data to match our schema
    return records.map((record, index) => {
      return {
        id: record['Internship Id'] || index,
        role: record['Role'] || '',
        company: record['Company Name'] || '',
        location: record['Location'] || '',
        duration: record['Duration'] || '',
        stipend: record['Stipend'] || '',
        internType: record['Intern Type'] || '',
        skills: parseArrayFromString(record['Skills'] || ''),
        perks: parseArrayFromString(record['Perks'] || ''),
        hiringInfo: record['Hiring Since'] || '',
        opportunities: record['Opportunity Date'] || '',
        openings: record['Opening'] || '',
        websiteLink: record['Website Link'] || '',
        description: `${record['Role']} at ${record['Company Name']}. ${record['Hiring Since'] || ''}`
      };
    });
  } catch (error) {
    console.error('❌ Error loading CSV:', error);
    return [];
  }
};

/**
 * Parse array-like string format from CSV
 * Handles formats like: ['Item1', 'Item2'] or "['Item1', 'Item2']"
 */
const parseArrayFromString = (str) => {
  if (!str || str === '') return [];

  try {
    // Try to parse as JSON array (replace single quotes with double quotes first)
    if (str.startsWith('[') && str.endsWith(']')) {
      const jsonStr = str.replace(/'/g, '"');
      return JSON.parse(jsonStr);
    }
  } catch (e) {
    // Fallback: treat as comma-separated values
  }

  return [];
};

/**
 * Parse location from CSV format
 * Input: "('City1, City2')" or similar
 * Output: ['City1', 'City2']
 */
const parseLocationFromString = (locationStr) => {
  if (!locationStr) return [];

  // Remove parentheses and quotes
  let clean = locationStr.replace(/^[\('"]|[\)'"\]]$/g, '');

  // Split by comma
  return clean.split(',').map(loc => loc.trim()).filter(loc => loc);
};

/**
 * Filter internships by location and skills
 */
const filterInternships = (allInternships, userLocation, userSkills) => {
  if (!allInternships || allInternships.length === 0) return [];

  let filtered = allInternships.filter(internship => {
    // Filter by location
    if (!userLocation || userLocation === 'All' || userLocation === '--') {
      return true;
    }

    const userLocs = userLocation.toLowerCase().split(',').map(l => l.trim()).filter(l => l);
    const jobLocs = parseLocationFromString(internship.location).map(l => l.toLowerCase());

    return jobLocs.some(jLoc =>
      userLocs.some(uLoc => jLoc.includes(uLoc) || uLoc.includes(jLoc)) ||
      jLoc.includes('pan india')
    );
  });

  // Further filter by skills (if provided)
  if (userSkills && userSkills.length > 0) {
    filtered = filtered.filter(internship => {
      const internshipSkills = internship.skills.map(s => String(s).toLowerCase());
      return userSkills.some(userSkill =>
        internshipSkills.some(iSkill => iSkill.includes(userSkill.toLowerCase()))
      );
    });
  }

  return filtered;
};

/**
 * Get unique locations from dataset
 */
const getAllLocations = (internships) => {
  const locations = new Set();
  internships.forEach(internship => {
    const locs = parseLocationFromString(internship.location);
    locs.forEach(loc => locations.add(loc));
  });
  return Array.from(locations).sort();
};

/**
 * Get unique skills from dataset
 */
const getAllSkills = (internships) => {
  const skills = new Set();
  internships.forEach(internship => {
    internship.skills.forEach(skill => {
      skills.add(String(skill).trim());
    });
  });
  return Array.from(skills).sort();
};

// Cache for CSV data
let cachedInternships = null;

const getInternships = () => {
  if (!cachedInternships) {
    cachedInternships = loadInternshipsFromCSV();
    console.log(`💾 Loaded ${cachedInternships.length} internships from CSV`);
  }
  return cachedInternships;
};

module.exports = {
  loadInternshipsFromCSV,
  filterInternships,
  getAllLocations,
  getAllSkills,
  getInternships,
  parseArrayFromString,
  parseLocationFromString,
  parseCSVSimple
};
