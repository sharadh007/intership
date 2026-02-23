import os
import json
import logging
from typing import List, Dict, Any
from fastapi import FastAPI, BackgroundTasks, HTTPException, Request
from pydantic import BaseModel
from dotenv import load_dotenv

# Import our logic
from matcher import process_matching, KNOWN_SKILLS, analyze_resume_deep
from processor import DataProcessor

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("PythonBrain")

# Load Environment
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

app = FastAPI(title="Internship Platform AI Brain", version="2.0.0")

# --- Models ---
class StudentProfile(BaseModel):
    name: str
    skills: List[str]
    qualification: str
    preferred_state: str
    resume_text: str = ""
    career_goal: str = "Not specified"

class RecommendationRequest(BaseModel):
    student: Dict[str, Any]
    internships: List[Dict[str, Any]]
    workPreference: str = "office"

class ResumeAnalysisRequest(BaseModel):
    resumeText: str

class CleaningRequest(BaseModel):
    items: List[Dict[str, Any]]



# --- Background Workers Simulation ---
def background_data_cleaning(items: List[Dict[str, Any]]):
    """Simulates a background job for cleaning large datasets."""
    logger.info(f"Starting background cleaning for {len(items)} items...")
    cleaned = []
    for item in items:
        # Normalize locations
        if "location" in item:
            item["location"] = DataProcessor.normalize_location(item["location"])
        # Clean description HTML
        if "description" in item:
            item["description"] = DataProcessor.clean_text(item["description"])
        cleaned.append(item)
    
    # In a real scenario, we would save this back to the DB or notify Node.js
    logger.info("Background cleaning complete.")

# --- Endpoints ---

@app.get("/health")
async def health():
    return {"status": "healthy", "engine": "Python 3.10", "nlp": "Ready"}

@app.post("/match")
async def match_internships(request: RecommendationRequest):
    """Advanced Matching Engine Endpoint."""
    try:
        # We pass the dict directly to the existing process_matching function
        results = process_matching(request.dict())
        return {"success": True, "data": results}
    except Exception as e:
        logger.error(f"Matching Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze-resume")
async def analyze_resume(request: ResumeAnalysisRequest):
    """Resume Parsing & Extraction Endpoint."""
    try:
        # Extract full profile using the deep AI engine
        profile_data = analyze_resume_deep(request.resumeText)
        
        return {
            "success": True,
            "data": profile_data
        }
    except Exception as e:
        logger.error(f"Resume Analysis Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-project-ideas")
async def generate_project_ideas(request: Dict[str, Any]):
    """Generates 3 unique project ideas for a missing skill with real-world 2024-25 context."""
    try:
        from matcher import g_model, gemini_available
        
        skill = request.get('skill', 'Development')
        company = request.get('company', 'this industry')
        
        # Ensure we don't use 'Internship' or 'Development' as the core skill if possible
        clean_skill = skill.replace('Development', '').replace('Internship', '').strip()
        if not clean_skill: clean_skill = "Technical Implementation"

        if not gemini_available or g_model is None:
            return {
                "success": True, 
                "data": {
                    "ideas": [
                        f"Smart {clean_skill} Optimizer: Solving high-load processing issues for 2024 tech stacks.",
                        f"AI-Driven {clean_skill} Auditor: An automated compliance and efficiency tool for {company}.",
                        f"Green-{clean_skill} Platform: A sustainability-focused tracker tailored for {company}'s market."
                    ]
                }
            }

        prompt = f"""You are a creative technical mentor. 
        A student needs to master '{clean_skill}' to impress recruiters at '{company}'.
        
        TASK: Suggest exactly 3 UNIQUE, PROBLEM-SOLVING project ideas for late 2024-2025.
        
        Rules:
        1. Every idea MUST revolve around '{clean_skill}'.
        2. Solve a REAL-WORLD 2024 problem (e.g. AI-agent efficiency, energy tracking, remote security, fintech fraud).
        3. Tailor the project to '{company}''s industry.
        4. Be specific: Don't just say 'Build a bot'. Say what the bot solves.
        
        FORMAT (JSON ONLY):
        {{
          "ideas": [
            "Project Title: Problem it solves + 1-sentence tech implementation using {clean_skill}.",
            "Project Title: Problem it solves + 1-sentence tech implementation using {clean_skill}.",
            "Project Title: Problem it solves + 1-sentence tech implementation using {clean_skill}."
          ]
        }}
        
        Only output raw JSON."""
        
        response = g_model.generate_content(
            prompt,
            generation_config={"temperature": 0.98, "top_p": 1.0} 
        )
        content = response.text.strip()
        
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "{" in content and "}" in content:
            start = content.find("{")
            end = content.rfind("}") + 1
            content = content[start:end]
            
        return {"success": True, "data": json.loads(content)}
    except Exception as e:
        logger.error(f"Project Ideas Error: {str(e)}")
        return {
            "success": True,
            "data": {
                "ideas": [
                    f"2024 {clean_skill} Edge Solution: Low-latency implementation for {company}.",
                    f"Privacy-First {clean_skill} Interface: Secure data portal for {company} users.",
                    f"Next-Gen {clean_skill} Bot: Automated problem-solver for the current market."
                ]
            }
        }





class RoadmapRequest(BaseModel):
    student: Dict[str, Any] = {}
    company: str = "a top tech company"
    resume_text: str = ""

@app.post("/generate-dream-roadmap")
async def generate_dream_roadmap(request: RoadmapRequest):
    """Generates a personalized career roadmap from resume text and a dream company."""
    dream_company = request.company or "a top tech company"
    try:
        from matcher import g_model, gemini_available

        student = request.student or {}
        resume_text = request.resume_text or ""
        skills_from_profile = student.get('skills', []) if isinstance(student, dict) else []
        qualification = student.get('qualification', 'Not specified') if isinstance(student, dict) else 'Not specified'

        # Build the student context intelligently
        if resume_text and len(resume_text) > 100:
            student_context = f"RESUME TEXT:\n{resume_text[:3000]}"
        elif skills_from_profile:
            student_context = f"SKILLS: {', '.join(skills_from_profile)}\nQUALIFICATION: {qualification}"
        else:
            student_context = f"QUALIFICATION: {qualification}\n(No skills or resume provided — generate a generic roadmap)"

        # Try to use Gemini model, with fallback to resume api key if needed
        model_to_use = g_model
        if not gemini_available or model_to_use is None:
            # Try initializing locally with fallback key
            fb_key = os.getenv('GEMINI_RESUME_API_KEY') or os.getenv('GEMINI_API_KEY')
            if fb_key:
                try:
                    import google.generativeai as genai
                    genai.configure(api_key=fb_key)
                    model_to_use = genai.GenerativeModel('gemini-1.5-flash')
                except:
                    model_to_use = None
            
        if model_to_use is None:
            return {"success": True, "data": _smart_fallback(dream_company, student)}

        prompt = f"""You are a Silicon Valley Technical Career Coach. A student targeting **{dream_company}** needs a roadmap.

{student_context}

---

TASK:
1. Deep-dive into **{dream_company}'s** specific engineering culture and tech stack. 
   - (e.g., Google = Scale/SRE, Amazon = LPs/Distributed Systems, Startups = Speed/Full-stack).
2. Generate a 3-phase journey. Each phase MUST be unique to **{dream_company}**.
3. **Moonshot Project**: Create a project idea that is a 'clone' or 'enhancement' of a specific **{dream_company}** feature.
4. **Hiring Insight**: Provide a specific 'insider' tip for **{dream_company}'s** interview process.

OUTPUT JSON ONLY:
{{
  "company": "{dream_company}",
  "readiness": <0-100>,
  "summary": "<Brutally honest 3-sentence assessment relative to {dream_company}'s bar>",
  "required_skills": ["skill1", "skill2", ... max 8 specific to {dream_company}],
  "your_skills": ["found skill1", ...],
  "missing_skills": ["missing1", ...],
  "phases": [
    {{
      "title": "Phase 1: <Company-Specific Foundation>", 
      "duration": "<weeks>", 
      "gap": "<gap>", 
      "action": "<Specific action + resource name>", 
      "link": "<url>", 
      "outcome": "<outcome>"
    }},
    {{
      "title": "Phase 2: <Company-Specific Engineering>", 
      "duration": "<weeks>", 
      "gap": "<gap>", 
      "action": "<Build X to match {dream_company}>", 
      "link": "<url>", 
      "outcome": "<outcome>"
    }},
    {{
      "title": "Phase 3: <Company-Specific Interview Domination>", 
      "duration": "<weeks>", 
      "gap": "<gap>", 
      "action": "<Concrete prep for {dream_company} rounds>", 
      "link": "<url>", 
      "outcome": "<outcome>"
    }}
  ],
  "moonshot_project": "<Unique Project Title>: <Description tailored to {dream_company}>",
  "hiring_insight": "<Insider tip about {dream_company}>"
}}"""

        try:
            response = model_to_use.generate_content(
                prompt,
                generation_config={"temperature": 0.8, "top_p": 0.95, "max_output_tokens": 2048}
            )
            content = response.text.strip()
        except Exception as ai_err:
            print(f"❌ Gemini Content Generation Failed: {str(ai_err)}")
            raise ai_err

        # Clean JSON
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()
        if "{" in content:
            content = content[content.find("{"):content.rfind("}")+1]

        parsed = json.loads(content)
        # Ensure readiness is sensible
        if "readiness" in parsed and isinstance(parsed["readiness"], str):
            try: parsed["readiness"] = int(re.search(r'\d+', parsed["readiness"]).group())
            except: parsed["readiness"] = 30

        return {"success": True, "data": parsed}

    except Exception as e:
        logger.error(f"Dream Roadmap AI Error: {str(e)}")
        return {"success": True, "data": _smart_fallback(dream_company, student or {})}


def _smart_fallback(company: str, student: dict) -> dict:
    """A dynamic fallback that avoids looking identical by using industry-specific tracks."""
    skills = student.get('skills', []) if isinstance(student, dict) else []
    co_low = company.lower()
    
    # 🎯 Track Identification
    if any(x in co_low for x in ['google', 'amazon', 'meta', 'apple', 'microsoft', 'netflix', 'adobe', 'nvidia']):
        track = "Big Tech (FAANG+)"
        req = ["Data Structures", "Algorithms", "System Design", "Distributed Systems", "SQL", "Low-level Design", "Cloud Architecture (AWS/GCP)"]
        summary = f"The bar at {company} is extremely high, focusing heavily on computer science fundamentals and the ability to design for billions of users."
        p1 = ("Foundations of Scale", "LeetCode (Medium/Hard) + DSA Mastery", "https://neetcode.io")
        p2 = ("Distributed Infrastructure", "Build a high-throughput microservice mirroring their core tech", "https://github.com/donnemartin/system-design-primer")
        ms_proj = f"{company} Internal-Tool Clone: Build a distributed monitoring system or a custom storage engine using Go/C++."
    elif any(x in co_low for x in ['zomato', 'swiggy', 'flipkart', 'razorpay', 'cred', 'zepto', 'phonepe']):
        track = "High-Growth Unicorn"
        req = ["Backend Scalability", "Real-time Systems", "React/Next.js", "Redis/Kafka", "NoSQL", "DevOps/CI-CD", "API Design"]
        summary = f"{company} values 'builders' who can ship fast and handle high-concurrency traffic. They look for full-stack ownership and product sense."
        p1 = ("Rapid Product Building", "Master Next.js + Tailwind + TypeScript", "https://nextjs.org/learn")
        p2 = ("Event-Driven Architecture", "Integrate Kafka/Redis for real-time notifications or chat", "https://roadmap.sh/backend")
        ms_proj = f"Real-time {company} Engine: Build a low-latency geo-tracking or ledger system that handles 10k requests/sec."
    elif any(x in co_low for x in ['tcs', 'infosys', 'wipro', 'hcl', 'accenture', 'capgemini', 'cognizant']):
        track = "Global IT Services"
        req = ["Java/Spring Boot", "Python/Django", "Database Fundamentals", "Software Engineering Principles", "Cloud Basics (Azure)", "Aptitude"]
        summary = f"{company} prioritizes professional adaptability and strong knowledge of industry-standard frameworks like Spring or .NET."
        p1 = ("Enterprise Foundations", "Master Java or Python with a focus on enterprise patterns", "https://spring.io/guides")
        p2 = ("Cloud & SQL Mastery", "Get AWS Practitioner certified and build a secure CRUD app", "https://aws.amazon.com/training")
        ms_proj = f"Enterprise Resource Portal: Build a robust, secure management system with role-based access control and reporting."
    elif any(x in co_low for x in ['goldman', 'jp morgan', 'morgan stanley', 'hsbc', 'hdfc', 'bajaj']):
        track = "Fintech & Quant"
        req = ["Algorithms", "Multithreading", "Low-latency C++/Java", "SQL/Database Optimization", "Financial Domain Knowledge", "Security"]
        summary = f"{company} demands extreme precision and security. Their interviews focus on concurrency, complex SQL, and system reliability."
        p1 = ("Low-Latency Thinking", "Master Multithreading and Memory Management", "https://cppreference.com")
        p2 = ("Fintech System Design", "Build a high-security transaction processor with ACID compliance", "https://web.dev/security")
        ms_proj = f"Secure Trading Dashboard: Build a real-time stock/crypto tracker with advanced technical indicators and secure auth."
    else:
        track = "Standard Product Tech"
        req = ["Modern Web Stack", "Git Flow", "UI/UX Basics", "Database Schema Design", "Clean Code", "Problem Solving"]
        summary = f"To stand out at {company}, you need to demonstrate that you can build functional, user-centric products from scratch."
        p1 = ("Full-Stack Basics", "Build and deploy a complete web application", "https://freecodecamp.org")
        p2 = ("Project Portfolio", "Add unit testing and CI/CD to your existing projects", "https://jenkins.io")
        ms_proj = f"{company} Feature Expansion: Identify a missing feature in {company}'s app and build a prototype of it."

    # Identify missing skills
    your_skills = skills[:8]
    missing = [s for s in req if not any(y.lower() in s.lower() or s.lower() in y.lower() for y in your_skills)]

    return {
        "company": company,
        "track": track,
        "readiness": 35 + (len(your_skills) * 3),
        "summary": summary,
        "required_skills": req,
        "your_skills": your_skills,
        "missing_skills": missing[:6],
        "phases": [
            {
                "title": f"Phase 1: {p1[0]}",
                "duration": "4-6 weeks",
                "gap": "Missing core domain depth",
                "action": p1[1],
                "link": p1[2],
                "outcome": f"Solid understanding of the technical core required for {company}."
            },
            {
                "title": f"Phase 2: {p2[0]}",
                "duration": "6-8 weeks",
                "gap": "Lack of high-scale project experience",
                "action": p2[1],
                "link": p2[2],
                "outcome": f"Portfolio demonstrates skills tailored specifically to {company}'s tech stack."
            },
            {
                "title": f"Phase 3: {company} Interview Mastery",
                "duration": "2-4 weeks",
                "gap": f"Unfamiliar with {company}'s unique hiring rounds",
                "action": f"Practice company-specific mocks and study their engineering blog.",
                "link": f"https://www.glassdoor.co.in/Interview/{company.replace(' ', '-')}-Interview-Questions-E8056.htm",
                "outcome": f"Ready to navigate {company}'s behavioral and technical assessment rounds."
            }
        ],
        "moonshot_project": ms_proj,
        "hiring_insight": f"Interviewers at {company} love candidates who have read their engineering blog and can discuss their recent architectural shifts."
    }



@app.post("/clean-data")
async def clean_data(request: CleaningRequest, background_tasks: BackgroundTasks):
    """Automated Data Cleaning Endpoint (Supports Background Processing)."""
    # For small batches, process immediately. For large, offload.
    if len(request.items) > 50:
        background_tasks.add_task(background_data_cleaning, request.items)
        return {"success": True, "message": "Task queued for background processing"}
    
    # Synchronous processing for small lists
    cleaned = []
    for item in request.items:
        if "location" in item:
            item["location"] = DataProcessor.normalize_location(item["location"])
        cleaned.append(item)
    
    return {"success": True, "data": cleaned}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
