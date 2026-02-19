// Node 22+ has global fetch


// Payload similar to what frontend sends
const payload = {
    uid: "test_user_123",
    name: "Test Student",
    skills: ["JavaScript", "React", "Node.js"],
    preferredState: "Maharashtra",
    qualification: "B.Tech Computer Science",
    cgpa: 8.5,
    age: 21
};


const run = async () => {
    try {
        console.log("Testing Match API...");
        const res = await fetch('http://localhost:5000/api/recommendations/ai-recommendations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (data.success) {
            console.log(`✅ Success! Received ${data.recommendations.length} recommendations.`);
            data.recommendations.forEach((rec, idx) => {
                console.log(`${idx + 1}. ${rec.company} - ${rec.role}`);
                console.log(`   Score: ${rec.matchScore}`);
                console.log(`   AI Explanation: ${rec.aiExplanation}`);
                console.log('---');
            });
        } else {
            console.error("❌ API returned error:", data.error);
        }
    } catch (e) {
        console.error("❌ Request Failed:", e.message);
    }
};

run();
