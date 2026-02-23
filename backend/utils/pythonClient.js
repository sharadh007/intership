const axios = require('axios');

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

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
    }
};

module.exports = pythonClient;
