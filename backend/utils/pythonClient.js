const axios = require('axios');

let PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
if (!PYTHON_SERVICE_URL.startsWith('http')) {
    // Render external URLs need HTTPS, otherwise POST requests drop payloads during redirect
    PYTHON_SERVICE_URL = PYTHON_SERVICE_URL.includes('onrender.com')
        ? `https://${PYTHON_SERVICE_URL}`
        : `http://${PYTHON_SERVICE_URL}`;
}

const pythonClient = {
    async match(student, internships, workPreference) {
        try {
            const response = await axios.post(`${PYTHON_SERVICE_URL}/match`, {
                student,
                internships,
                workPreference
            });
            return response.data;
        } catch (error) {
            console.error('Python Service Match Error:', error.message);
            throw error;
        }
    },

    async analyzeResume(resumeText) {
        try {
            const response = await axios.post(`${PYTHON_SERVICE_URL}/analyze-resume`, {
                resumeText
            });
            return response.data;
        } catch (error) {
            console.error('Python Service Resume Analysis Error:', error.message);
            throw error;
        }
    },

    async cleanData(items) {
        try {
            const response = await axios.post(`${PYTHON_SERVICE_URL}/clean-data`, {
                items
            });
            return response.data;
        } catch (error) {
            console.error('Python Service Clean Data Error:', error.message);
            throw error;
        }
    },

    async generateProjectIdeas(skill, company) {
        try {
            const response = await axios.post(`${PYTHON_SERVICE_URL}/generate-project-ideas`, {
                skill,
                company
            });
            return response.data;
        } catch (error) {
            console.error('Python Service Project Ideas Error:', error.message);
            throw error;
        }
    },

    async generateDreamRoadmap(student, company, resume_text) {
        try {
            const response = await axios.post(`${PYTHON_SERVICE_URL}/generate-dream-roadmap`, {
                student: student || {},
                company: company || '',
                resume_text: resume_text || ''
            });
            return response.data;
        } catch (error) {
            console.error('Python Service Dream Roadmap Error:', error.message);
            throw error;
        }
    }
};



module.exports = pythonClient;
