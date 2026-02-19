// Simulates a Corporate Partner API Endpoint (e.g., Tech Mahindra Foundation, IBM Skills)

const fetchPartnerInternships = async () => {
    console.log('📡 Fetching from Corporate Partner Network (IBM/TechM)...');

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 600));

    // Realistic mock response adhering to a strict schema
    return [
        {
            partner_id: "IBM_2026_AI_001",
            title: "AI & Cloud Research Intern",
            company_name: "IBM SkillsBuild",
            industry: "Technology",
            city: "Bangalore",
            stipend_inr: "25000",
            valid_until: "2026-06-30",
            duration_weeks: 24,
            description: "Work with IBM Watson team on enterprise AI solutions.",
            skills: ["Artificial Intelligence", "Cloud Computing", "Python", "TensorFlow"],
            link: "https://ibm.com/skills/internships"
        },
        {
            partner_id: "TCS_2026_DA_102",
            title: "Data Analytics Associate",
            company_name: "TCS iON",
            industry: "IT Services",
            city: "Mumbai",
            stipend_inr: "12000",
            valid_until: "2026-05-20",
            duration_weeks: 16,
            description: "Analyze large datasets for financial clients.",
            skills: ["SQL", "Tableau", "Excel", "Statistics"],
            link: "https://learning.tcsionhub.in/careers"
        }
    ];
};

module.exports = { fetchPartnerInternships };
