const pool = require('../config/database');

// MASTER DATASETS FOR GENERATION
const COMPANIES = {
    'Technology': ['Zoho', 'Freshworks', 'TCS', 'Infosys', 'Wipro', 'Accenture', 'Swiggy', 'Zomato', 'Ola', 'Flipkart', 'Amazon India', 'Microsoft India', 'Google India', 'HCL Tech', 'Tech Mahindra', 'Mindtree', 'Oracle', 'Cisco'],
    'Finance': ['HDFC Bank', 'ICICI Bank', 'Axis Bank', 'SBI', 'Kotak Mahindra', 'JPMorgan Chase', 'Goldman Sachs', 'Bajaj Finserv'],
    'Automotive': ['Tata Motors', 'Mahindra & Mahindra', 'Maruti Suzuki', 'Ashok Leyland', 'Hyundai India', 'TVS Motor'],
    'Construction': ['L&T', 'DLF', 'Godrej Properties', 'Tata Projects', 'Shapoorji Pallonji'],
    'Healthcare': ['Apollo Hospitals', 'Fortis', 'Dr. Reddys', 'Sun Pharma', 'Cipla']
};

const ROLES = {
    'Technology': [
        { title: 'Software Developer Intern', skills: 'Java, Python, C++, SQL', stipend: '20000' },
        { title: 'Frontend Developer Intern', skills: 'React, HTML, CSS, JavaScript', stipend: '18000' },
        { title: 'Backend Developer Intern', skills: 'Node.js, Express, MongoDB, SQL', stipend: '22000' },
        { title: 'Data Analyst Intern', skills: 'Excel, SQL, Python, PowerBI', stipend: '15000' },
        { title: 'AI/ML Intern', skills: 'Python, TensorFlow, PyTorch, Pandas', stipend: '25000' },
        { title: 'Cloud Support Intern', skills: 'AWS, Azure, Linux, Networking', stipend: '18000' }
    ],
    'Finance': [
        { title: 'Finance Intern', skills: 'Accounting, Excel, Tally, GST', stipend: '12000' },
        { title: 'Business Analyst Intern', skills: 'Excel, SQL, Analysis', stipend: '15000' }
    ],
    'Automotive': [
        { title: 'Mechanical Engineering Intern', skills: 'AutoCAD, SolidWorks, Thermodynamics', stipend: '12000' },
        { title: 'Production Trainee', skills: 'Manufacturing, Quality Control', stipend: '10000' }
    ],
    'Construction': [
        { title: 'Civil Engineering Intern', skills: 'AutoCAD, Site Management, Surveying', stipend: '12000' },
        { title: 'Site Supervisor Trainee', skills: 'Site Supervision, Safety', stipend: '10000' }
    ],
    'Healthcare': [
        { title: 'Biomedical Intern', skills: 'Biomedical Instrumentation', stipend: '12000' },
        { title: 'Pharma Trainee', skills: 'Chemistry, Lab Safety', stipend: '10000' }
    ]
};

const LOCATIONS = [
    'Chennai, Tamil Nadu', 'Bangalore, Karnataka', 'Hyderabad, Telangana',
    'Mumbai, Maharashtra', 'Pune, Maharashtra', 'Delhi, NCR',
    'Noida, Uttar Pradesh', 'Gurgaon, Haryana', 'Coimbatore, Tamil Nadu',
    'Kochi, Kerala', 'Ahmedabad, Gujarat', 'Kolkata, West Bengal'
];

const generateInternships = (count = 100) => {
    const internships = [];
    const sectors = Object.keys(COMPANIES);

    for (let i = 0; i < count; i++) {
        // Randomly pick Sector
        const sector = sectors[Math.floor(Math.random() * sectors.length)];

        // Pick Company in Sector
        const companies = COMPANIES[sector];
        const company = companies[Math.floor(Math.random() * companies.length)];

        // Pick Role in Sector
        const roles = ROLES[sector];
        const roleObj = roles[Math.floor(Math.random() * roles.length)];

        // Pick Location
        const location = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];

        // Randomize Duration
        const duration = ['3 Months', '6 Months', '12 Months'][Math.floor(Math.random() * 3)];

        internships.push({
            company,
            role: roleObj.title,
            location,
            sector,
            skills: roleObj.skills,
            stipend: roleObj.stipend, // Already string, parse later or keep clean
            duration,
            deadline: '2026-06-30',
            description: `Exciting opportunity at ${company} for a ${roleObj.title}. Join our team in ${location.split(',')[0]} and kickstart your career.`,
            requirements: `Degree in ${sector === 'Technology' ? 'CS/IT' : 'Relevant Field'}. Strong basics in listed skills.`,
            status: 'Active',
            verification_status: 'verified'
        });
    }
    return internships;
};

const realInternships = generateInternships(200); // Generate 200 INTERNSHIPS

const seedDB = async () => {
    try {
        console.log('🌱 Seeding Real Internship Data...');

        // 1. Clear existing data
        await pool.query('DELETE FROM internships');
        console.log('✅ Cleared old data.');

        // 2. Insert new data
        const insertQuery = `
            INSERT INTO internships 
            (company, role, location, sector, skills, stipend, duration, deadline, description, requirements, verification_status, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        `;

        for (const i of realInternships) {
            await pool.query(insertQuery, [
                i.company, i.role, i.location, i.sector, i.skills,
                parseInt(i.stipend.replace(/,/g, '')), // Parse "15,000" -> 15000
                i.duration, i.deadline, i.description,
                i.requirements, i.verification_status
            ]);
        }

        console.log(`✅ Successfully seeded ${realInternships.length} internships.`);
        process.exit(0);

    } catch (err) {
        console.error('❌ Seeding Failed:', err);
        process.exit(1);
    }
};

seedDB();
