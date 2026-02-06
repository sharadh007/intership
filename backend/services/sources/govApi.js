// Simulates an Official Government API Endpoint
// In production, this would use axios to fetch from https://api.internship.gov.in/v1/listings

const fetchGovInternships = async () => {
    console.log('📡 Fetching from Official Gov Portal API...');

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Realistic mock response adhering to a strict schema
    return [
        {
            job_id: "GOV_NIC_2026_001",
            job_title: "Cyber Security Intern",
            ministry_name: "National Informatics Centre (NIC)",
            sector: "IT & Cyber Security",
            location: "New Delhi",
            stipend_amount: "15000",
            closing_date: "2026-03-30",
            duration_months: 6,
            description: "Assist in vulnerability assessment and penetration testing for government portals.",
            required_skills: ["Network Security", "Ethical Hacking", "Python"],
            apply_url: "https://internship.gov.in/apply/nic-001"
        },
        {
            job_id: "GOV_NITI_2026_045",
            job_title: "Public Policy Research Intern",
            ministry_name: "NITI Aayog",
            sector: "Public Policy",
            location: "Remote",
            stipend_amount: "10000",
            closing_date: "2026-04-15",
            duration_months: 3,
            description: "Research on sustainable development goals and policy impact analysis.",
            required_skills: ["Research", "Data Analysis", "Report Writing"],
            apply_url: "https://internship.gov.in/apply/niti-045"
        },
        {
            job_id: "GOV_DRDO_2026_X99",
            job_title: "Embedded Systems Trainee",
            ministry_name: "DRDO",
            sector: "Electronics & Defence",
            location: "Bangalore",
            stipend_amount: "18000",
            closing_date: "2026-05-01",
            duration_months: 12,
            description: "Work on embedded control systems for UAVs.",
            required_skills: ["C/C++", "Microcontrollers", "RTOS"],
            apply_url: "https://drdo.gov.in/careers/interns"
        }
    ];
};

module.exports = { fetchGovInternships };
