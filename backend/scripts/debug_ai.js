
async function test() {
    console.log("Testing /api/ai/analyze-resume...");
    try {
        const response = await fetch('http://localhost:5000/api/ai/analyze-resume', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                resumeText: "This is a sample resume text that should be long enough to pass the validation check of 50 characters. I am a software engineer with 5 years of experience in JavaScript and Node.js."
            })
        });
        console.log("Status:", response.status);
        const text = await response.text();
        console.log("Body Length:", text.length);
        console.log("Body Start:", text.substring(0, 500));
        try {
            const json = JSON.parse(text);
            console.log("Error Message:", json.error);
        } catch (e) { }
    } catch (e) {
        console.error("Request Failed:", e.message);
    }
}
test();
