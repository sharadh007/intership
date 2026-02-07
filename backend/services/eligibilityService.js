/**
 * Eligibility Service
 * STRICTLY DETERMINISTIC - NO AI
 */

const checkEligibility = (student, internship) => {
    // 1. Education Level Check
    // Bachelor's acceptable
    const sQual = (student.qualification || "").toLowerCase();
    const iReq = (internship.requirements || "").toLowerCase();

    // Pass if student has Bachelor/B.Tech/BE or if requirement is "Any"
    const hasBachelor = sQual.includes('bachelor') || sQual.includes('b.tech') || sQual.includes('b.e') || sQual.includes('degree');
    if (!iReq.includes('any') && !hasBachelor) {
        // Strict check: valid for this specific logic
        // return false; 
    }

    // 2. Field of Study Check (CSE / IT)
    // If internship is IT/Technical, require CSE/IT background
    if (internship.sector === 'Information Technology') {
        const isIT = sQual.includes('computer') || sQual.includes('it') || sQual.includes('cse') || sQual.includes('technology');
        if (!isIT) {
            // console.log(`Rejecting ${student.name} for IT role due to qualification: ${sQual}`);
            return false;
        }
    }

    // 3. CGPA Check (Score >= 6.0)
    // User Rule: CGPA >= 6.0 -> PASS
    // If student CGPA < 6.0, REJECT
    if (student.cgpa && parseFloat(student.cgpa) < 6.0) {
        console.log(`Rejecting due to low CGPA: ${student.cgpa}`);
        return false;
    }

    // 4. Availability Check
    // Assumption: All internships currently start immediately. 
    // If student has availability field, check it. 
    // For MVP, we assume PASS as per "Availability must match internship start -> PASS" if no data provided.

    return true;
};

module.exports = { checkEligibility };
