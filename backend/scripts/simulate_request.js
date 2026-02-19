const fetch = require('node-fetch');

const payload = {
    name: "Debug User",
    age: 22,
    qualification: "Bachelor of Engineering",
    skills: ["Java", "Spring Boot", "SQL"],
    preferredSector: "Technology",
    preferredState: "Chennai", // Explicit Preference
    college: "Anna University",
    cgpa: 8.5,
    resumeData: {
        extractedSkills: ["Java", "Spring", "Hibernate"],
        domains: ["Technology"],
        educationLevel: "Bachelor",
        experienceLevel: "Entry"
    }
};

(async () => {
    try {
        console.log("Sending request to localhost:5000/api/recommendations/get-recommendations...");
        const res = await fetch('http://localhost:5000/api/recommendations/get-recommendations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        console.log("Response Status:", res.status);

        if (data.recommendations) {
            console.log("\n--- Received Recommendations ---");
            data.recommendations.slice(0, 3).forEach((r, i) => {
                console.log(`${i + 1}. ${r.company} (${r.location}) - Score: ${r.matchScore}`);
            });
        } else {
            console.log("No recommendations found or error:", data);
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
})();
