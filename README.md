# 🎓 InternHub India - AI-Powered Internship Platform

A comprehensive full-stack web application connecting students with internship opportunities across India. Features AI-powered resume analysis, personalized recommendations, cover letter generation, and interview coaching to help students find their perfect internship match.

![License](https://img.shields.io/badge/license-ISC-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen.svg)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-13%2B-blue.svg)

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [AI Features](#ai-features)
- [Database Schema](#database-schema)
- [Contributing](#contributing)
- [License](#license)

## ✨ Features

### 🎯 Core Features
- **User Authentication**: Secure Firebase-based authentication with JWT tokens
- **Nationwide Coverage**: Browse 500+ internship opportunities across all states of India
- **Advanced Filtering**: Filter by location, sector, duration, stipend, and more
- **Real-time Search**: Instant search across companies, roles, and locations
- **Application Management**: Track application status and history across multiple internships

### 🤖 AI-Powered Features
- **Resume Analysis**: AI-powered resume parsing and skill extraction using Groq/Gemini
- **Smart Recommendations**: Location-based and skill-matched internship suggestions
- **Cover Letter Generator**: Personalized cover letter creation using AI
- **Interview Coach**: Interactive AI interviewer for practice sessions
- **Match Explanation**: AI-generated explanations for why internships match your profile

### 📱 User Experience
- **Responsive Design**: Mobile-first design that works on all devices
- **Dark Mode Support**: Eye-friendly dark theme
- **Real-time Notifications**: Stay updated on application status
- **Profile Management**: Save and manage your professional profile
- **Admin Dashboard**: Comprehensive admin panel for managing internships

## 🛠️ Tech Stack

### Frontend
- **HTML5/CSS3**: Modern, semantic markup with custom CSS
- **JavaScript (ES6+)**: Vanilla JavaScript for dynamic interactions
- **Firebase SDK**: Client-side authentication
- **Responsive Design**: Mobile-first approach

### Backend
- **Node.js**: Runtime environment
- **Express.js**: Web application framework
- **PostgreSQL**: Relational database
- **Firebase Admin**: Server-side authentication
- **JWT**: Token-based authorization

### AI/ML Services
- **Google Gemini AI**: Resume analysis and content generation
- **Groq API**: Fast LLM inference with LLaMA models
- **Custom Matching Algorithm**: Location and skill-based recommendation engine

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v14.0.0 or higher)
- **PostgreSQL** (v13 or higher)
- **npm** or **yarn**
- **Git**

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/sharadh007/intership.git
cd intership
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

### 3. Set Up PostgreSQL Database

```bash
# Login to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE internhub_india;

# Exit psql
\q
```

### 4. Initialize Database Schema

```bash
# Run the schema creation script
psql -U postgres -d internhub_india -f database/schema.sql
```

### 5. Seed Database with Internships

```bash
# Generate AI-powered internship data
node scripts/seedGenAI.js
```

## ⚙️ Configuration

### 1. Backend Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=internhub_india
DB_USER=postgres
DB_PASSWORD=your_postgres_password

# Firebase Configuration
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id

# JWT Secret
JWT_SECRET=your_super_secret_jwt_key

# AI API Keys
GEMINI_API_KEY=your_gemini_api_key
GEMINI_RESUME_API_KEY=your_gemini_resume_api_key
GROQ_API_KEY=your_groq_api_key

# Admin Configuration
ADMIN_EMAIL=admin@example.com
```

### 2. Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use an existing one
3. Enable Authentication (Email/Password)
4. Get your Firebase config from Project Settings
5. Update the Firebase configuration in `frontend/app.js`

### 3. AI API Keys

- **Gemini API**: Get from [Google AI Studio](https://makersuite.google.com/app/apikey)
- **Groq API**: Get from [Groq Console](https://console.groq.com/)

## 🏃 Running the Application

### Development Mode

#### 1. Start the Backend Server

```bash
cd backend
npm run dev
```

The backend will run on `http://localhost:5000`

#### 2. Start the Frontend Server

```bash
cd frontend
python -m http.server 8080
```

Or use any static file server:

```bash
# Using Node.js http-server
npx http-server -p 8080

# Using PHP
php -S localhost:8080
```

The frontend will be available at `http://localhost:8080`

### Production Mode

```bash
cd backend
npm start
```

## 📁 Project Structure

```
intership/
├── backend/
│   ├── config/
│   │   ├── db.js              # PostgreSQL connection
│   │   └── firebase.js        # Firebase Admin SDK
│   ├── controllers/
│   │   ├── aiController.js    # AI features logic
│   │   ├── authController.js  # Authentication logic
│   │   ├── internshipController.js
│   │   └── recommendationController.js
│   ├── middleware/
│   │   └── auth.js            # JWT verification
│   ├── routes/
│   │   ├── ai.js              # AI endpoints
│   │   ├── auth.js            # Auth endpoints
│   │   ├── internships.js     # Internship CRUD
│   │   ├── recommendations.js # Recommendation engine
│   │   ├── applications.js    # Application management
│   │   ├── students.js        # Student profiles
│   │   └── adminRoutes.js     # Admin operations
│   ├── scripts/
│   │   ├── seedGenAI.js       # Generate internships with AI
│   │   └── test_recommendations.js
│   ├── utils/
│   │   └── matchingAlgorithm.js # Recommendation logic
│   ├── database/
│   │   └── schema.sql         # Database schema
│   ├── .env                   # Environment variables
│   ├── server.js              # Express server
│   └── package.json
│
├── frontend/
│   ├── index.html             # Main landing page
│   ├── app.js                 # Main JavaScript logic
│   ├── style.css              # Main stylesheet
│   ├── admin.html             # Admin dashboard
│   ├── admin.js               # Admin logic
│   ├── notifications.js       # Notification system
│   ├── notifications.css      # Notification styles
│   ├── badges.css             # Badge components
│   └── favicon.ico            # Site favicon
│
└── README.md
```

## 📡 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### Internship Endpoints

#### Get All Internships
```http
GET /api/internships
```

#### Get Internship by ID
```http
GET /api/internships/:id
```

#### Create Internship (Admin)
```http
POST /api/internships
Authorization: Bearer <token>
Content-Type: application/json

{
  "company": "Tech Corp",
  "role": "Software Engineer Intern",
  "location": "Bangalore",
  "sector": "Technology",
  "duration": "3 months",
  "description": "...",
  "requirements": "..."
}
```

### AI Endpoints

#### Analyze Resume
```http
POST /api/ai/analyze-resume
Authorization: Bearer <token>
Content-Type: application/json

{
  "resumeText": "Your resume content..."
}
```

#### Generate Cover Letter
```http
POST /api/ai/generate-cover-letter
Authorization: Bearer <token>
Content-Type: application/json

{
  "studentProfile": {...},
  "internship": {...}
}
```

#### Interview Chat
```http
POST /api/ai/interview-chat
Authorization: Bearer <token>
Content-Type: application/json

{
  "history": [...],
  "role": "Software Engineer",
  "company": "Tech Corp"
}
```

#### Get Match Explanation
```http
POST /api/ai/explain-match
Authorization: Bearer <token>
Content-Type: application/json

{
  "student": {...},
  "internship": {...}
}
```

### Recommendation Endpoints

#### Get Personalized Recommendations
```http
POST /api/recommendations
Authorization: Bearer <token>
Content-Type: application/json

{
  "skills": ["JavaScript", "React"],
  "qualification": "B.Tech CSE",
  "preferred_state": "Karnataka",
  "cgpa": 8.5
}
```

### Application Endpoints

#### Apply for Internship
```http
POST /api/applications
Authorization: Bearer <token>
Content-Type: application/json

{
  "internshipId": "uuid",
  "coverLetter": "..."
}
```

#### Get User Applications
```http
GET /api/applications/user/:userId
Authorization: Bearer <token>
```

## 🤖 AI Features

### 1. Resume Analysis
- **Technology**: Groq API with LLaMA 3 model
- **Features**:
  - Skill extraction
  - Experience parsing
  - Education detection
  - Strength identification
  - Improvement suggestions

### 2. Smart Recommendations
- **Algorithm**: Custom hierarchical matching
- **Criteria**:
  - Location priority (City → State → Nearby)
  - Skill matching (minimum 2 skills)
  - Qualification alignment
  - CGPA requirements
- **Ranking**: Match accuracy score (0-100%)

### 3. Cover Letter Generation
- **Technology**: Google Gemini AI
- **Features**:
  - Personalized content
  - Role-specific customization
  - Professional formatting
  - Company research integration

### 4. Interview Coach
- **Technology**: Google Gemini AI
- **Features**:
  - Role-specific questions
  - Conversational practice
  - Real-time feedback
  - Progressive difficulty

## 🗄️ Database Schema

### Students Table
```sql
CREATE TABLE students (
  id UUID PRIMARY KEY,
  firebase_uid VARCHAR(255) UNIQUE,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20),
  qualification VARCHAR(255),
  cgpa DECIMAL(3,2),
  skills TEXT[],
  preferred_state VARCHAR(100),
  resume_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Internships Table
```sql
CREATE TABLE internships (
  id UUID PRIMARY KEY,
  company VARCHAR(255),
  role VARCHAR(255),
  location VARCHAR(255),
  sector VARCHAR(100),
  duration VARCHAR(50),
  description TEXT,
  requirements TEXT,
  skills_required TEXT[],
  stipend INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Applications Table
```sql
CREATE TABLE applications (
  id UUID PRIMARY KEY,
  student_id UUID REFERENCES students(id),
  internship_id UUID REFERENCES internships(id),
  status VARCHAR(50),
  cover_letter TEXT,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🎨 Key Features Explained

### Location-Based Matching
The system uses a hierarchical location matching algorithm:
1. **Exact City Match**: Highest priority
2. **State Match**: Second priority
3. **Nearby States**: Third priority
4. **Other Locations**: Lowest priority

### Skill Matching
- Requires minimum 2 matching skills for recommendation
- Case-insensitive matching
- Normalized skill names
- Weighted scoring based on skill count

### Real-time Updates
- Firebase Authentication for secure sessions
- JWT tokens for API authorization
- Real-time application status updates
- Instant notification system

## 🔒 Security Features

- **Password Hashing**: bcrypt with salt rounds
- **JWT Authentication**: Secure token-based auth
- **Firebase Security**: Server-side validation
- **SQL Injection Prevention**: Parameterized queries
- **CORS Protection**: Configured CORS policies
- **Environment Variables**: Sensitive data protection

## 🐛 Troubleshooting

### Common Issues

#### Database Connection Error
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Verify credentials in .env file
```

#### Firebase Authentication Error
```bash
# Verify Firebase config in frontend/app.js
# Check Firebase project settings
```

#### AI API Errors
```bash
# Verify API keys in .env
# Check API quota limits
# Review error logs in backend console
```

## 📝 Recent Fixes

### v1.0.1 (2026-02-07)
- ✅ Fixed corrupted null-byte data in app.js
- ✅ Added favicon.ico to prevent 404 errors
- ✅ Removed 282 lines of corrupted code
- ✅ Improved file integrity and syntax validation

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 👥 Authors

- **Sharadh** - [sharadh007](https://github.com/sharadh007)

## 🙏 Acknowledgments

- Google Gemini AI for powerful language models
- Groq for fast LLM inference
- Firebase for authentication services
- PostgreSQL for robust data storage
- The open-source community

## 📞 Support

For support, email sharadhb7@gmail.com or open an issue in the GitHub repository.

---

**Made with ❤️ for students seeking internship opportunities across India** 🇮🇳
