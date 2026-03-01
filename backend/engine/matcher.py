"""
===================================================================
  FULL RAG SEMANTIC MATCHING ENGINE
  Pipeline:
    1. User Resume → Resume Parser (structured extraction)
    2. Skill Embeddings (Sentence Transformers)
    3. Job Embeddings (Sentence Transformers)
    4. Similarity Engine (Cosine Similarity)
    5. Re-ranking using LLM (Gemini, with timeout fallback)
    6. Explainability Layer (Gemini-generated "why" text)
    7. Gap Analysis (missing skills per recommendation)
    8. Final Ranked Recommendations
===================================================================
"""
import sys
import json
import os
import re
import numpy as np
from dotenv import load_dotenv

# Load Environment early
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# ─── Lazy Model Loading ────────────────────────────────────────────────────────
_transformer_model = None
_gemini_model = None
_gemini_initialized = False

def get_transformer_model():
    """Lazy load the SentenceTransformer model to save memory."""
    global _transformer_model
    if _transformer_model is None:
        print("📥 Loading Sentence Transformer (MiniLM)...")
        from sentence_transformers import SentenceTransformer
        _transformer_model = SentenceTransformer('all-MiniLM-L6-v2')
    return _transformer_model

def get_gemini_model():
    """Lazy load Gemini model."""
    global _gemini_model, _gemini_initialized
    if not _gemini_initialized:
        api_key = os.getenv('GEMINI_API_KEY')
        if api_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=api_key)
                _gemini_model = genai.GenerativeModel('gemini-1.5-flash')
                _gemini_initialized = True
                print("✅ Gemini initialized.")
            except Exception as e:
                print(f"❌ Gemini failed: {e}")
                _gemini_initialized = True # Mark as tried
        else:
            print("⚠️ No GEMINI_API_KEY.")
            _gemini_initialized = True
    return _gemini_model

def is_gemini_available():
    return get_gemini_model() is not None


# ─── STEP 1: RESUME PARSER ────────────────────────────────────────────────────
# Known tech keywords for skill extraction from raw resume text
KNOWN_SKILLS = [
    "python","java","javascript","typescript","c++","c#","c","r","go","rust","swift","kotlin",
    "react","reactjs","angular","vue","vuejs","nextjs","nodejs","node.js","express","django",
    "flask","fastapi","spring","springboot","laravel","rails","ruby on rails",
    "html","css","sass","bootstrap","tailwind","jquery",
    "sql","mysql","postgresql","mongodb","redis","sqlite","oracle","firebase","supabase",
    "machine learning","deep learning","nlp","artificial intelligence","ai","ml","data science",
    "tensorflow","pytorch","keras","scikit-learn","pandas","numpy","matplotlib","seaborn",
    "docker","kubernetes","aws","azure","gcp","google cloud","linux","git","github","gitlab",
    "rest api","graphql","microservices","devops","ci/cd","jenkins","terraform","ansible",
    "android","ios","flutter","react native","kotlin","swift","mobile development",
    "excel","powerbi","tableau","power bi","data analysis","data visualization",
    "photoshop","illustrator","figma","ui/ux","design","video editing",
    "digital marketing","seo","social media","content writing","copywriting",
    "autocad","solidworks","matlab","embedded systems","iot","arduino","raspberry pi",
    "blockchain","solidity","web3","cybersecurity","networking","ethical hacking"
]

def parse_resume(resume_text: str, existing_skills: list) -> dict:
    """
    STEP 1 - Resume Parser:
    Extracts structured information from raw resume text.
    Returns: { skills, education, experience_years, summary }
    """
    if not resume_text or not resume_text.strip():
        return {
            "skills": existing_skills,
            "education": "",
            "experience_years": 0,
            "summary": ""
        }

    text_lower = resume_text.lower()

    # 1a. Extract skills by scanning for known keywords
    found_skills = set(s.lower() for s in existing_skills)
    for skill in KNOWN_SKILLS:
        if re.search(r'\b' + re.escape(skill) + r'\b', text_lower):
            found_skills.add(skill)

    # 1b. Estimate experience from years mentioned
    year_matches = re.findall(r'(\d+)\+?\s*year', text_lower)
    experience_years = max((int(y) for y in year_matches), default=0)

    # 1c. Extract education hints
    edu_keywords = ["bachelor", "master", "b.tech", "m.tech", "b.e", "m.e",
                    "bca", "mca", "bsc", "msc", "phd", "diploma", "12th", "10th"]
    education = next((kw for kw in edu_keywords if kw in text_lower), "")

    # 1d. Build a clean summary (first 300 chars of resume as context)
    summary = resume_text.strip()[:300]

    return {
        "skills": list(found_skills),
        "education": education,
        "experience_years": experience_years,
        "summary": summary
    }


def analyze_resume_deep(resume_text: str) -> dict:
    """
    Advanced Resume Analysis using Gemini (AI Brain).
    Returns the full structured data expected by the frontend.
    """
    # Regex fallback for key fields
    email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', resume_text)
    phone_match = re.search(r'(\+?\d{1,3}[- ]?)?\d{10}', resume_text)
    
    fallback_data = {
        "fullName": "Candidate Name",
        "email": email_match.group(0) if email_match else "",
        "phone": phone_match.group(0) if phone_match else "",
        "location": "",
        "extractedSkills": [],
        "experienceLevel": "Entry",
        "experienceYears": 0,
        "educationLevel": "",
        "education": "",
        "college": "",
        "graduationYear": "",
        "resumeStrengthScore": 50
    }

    if not is_gemini_available():
        parsed = parse_resume(resume_text, [])
        fallback_data["extractedSkills"] = parsed["skills"]
        fallback_data["education"] = parsed["education"]
        return fallback_data

    try:
        g_model = get_gemini_model()
        if not g_model:
            return fallback_data
        
        prompt = f"""
        Extract the following structured information from this resume text as a clean JSON object.
        NO CONVERSATIONAL TEXT. ONLY JSON.

        OUTPUT SCHEMA:
        {{
          "fullName": "Name detected",
          "email": "Email detected",
          "phone": "Phone detected",
          "location": "City, State",
          "extractedSkills": ["skill1", "skill2"],
          "experienceLevel": "Entry/Intermediate/Senior",
          "experienceYears": 0,
          "educationLevel": "Bachelor/Master/Diploma/etc.",
          "education": "Degree Name",
          "college": "College Name",
          "graduationYear": "YYYY",
          "resumeStrengthScore": 0 (0-100)
        }}

        RESUME TEXT:
        {resume_text}
        """

        response = g_model.generate_content(prompt)
        text = response.text.strip()
        
        # Clean JSON if any markdown artifacts
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
        
        # Handle cases where Gemini might return starting with { but not ending correctly
        if not text.startswith("{"):
            start = text.find("{")
            end = text.rfind("}")
            if start != -1 and end != -1:
                text = text[start:end+1]
            
        data = json.loads(text)
        
        # Merge with fallback to ensure all keys present
        for k, v in fallback_data.items():
            if k not in data:
                data[k] = v
        return data
    except Exception as e:
        print(f"⚠️ ERROR in analyze_resume_deep: {e}")
        parsed = parse_resume(resume_text, [])
        fallback_data["extractedSkills"] = parsed["skills"]
        return fallback_data


# ─── STEP 2 & 3: EMBEDDINGS ───────────────────────────────────────────────────
def build_student_text(student: dict, parsed_resume: dict) -> str:
    """Build a rich semantic text for the student profile."""
    skills = list(set(parsed_resume["skills"] + student.get("skills", [])))
    parts = [
        " ".join(skills),
        student.get("qualification", ""),
        student.get("career_goal", ""),
        student.get("preferredSector", ""),
        parsed_resume.get("education", ""),
        parsed_resume.get("summary", ""),
        student.get("strengths", ""),
    ]
    return " ".join(p for p in parts if p).strip()


def build_job_text(job: dict) -> str:
    """Build a rich semantic text for a job listing."""
    # Clean location for semantic context
    loc = str(job.get("location", ""))
    if loc.startswith("('") or loc.startswith('("'):
        loc = re.sub(r'^[\(\'"]+|[\)\'"]+$', '', loc)

    parts = [
        job.get("role", ""),
        job.get("company", ""),
        job.get("sector", ""),
        loc,
        job.get("skills_required") or job.get("skills") or "",
        job.get("description", "")[:500],
        job.get("requirements", "")[:500],
    ]
    return " ".join(p for p in parts if p).strip()


# ─── STEP 4: SIMILARITY ENGINE ───────────────────────────────────────────────
def compute_similarities(student_text: str, job_texts: list) -> list:
    """Batch-encode all texts and compute cosine similarities at once (fast)."""
    from sklearn.metrics.pairwise import cosine_similarity
    all_texts = [student_text] + job_texts
    model = get_transformer_model()
    embeddings = model.encode(all_texts, show_progress_bar=False, batch_size=64)
    student_vec = embeddings[0:1]
    job_vecs = embeddings[1:]
    scores = cosine_similarity(student_vec, job_vecs)[0]
    return scores.tolist()


# ─── STEP 7: GAP ANALYSIS ────────────────────────────────────────────────────
def compute_gap_analysis(student_skills: list, job: dict) -> dict:
    """
    STEP 7 - Compares student skills vs job requirements.
    Returns: { matched, missing, match_count, gap_count }
    """
    job_skills_raw = job.get("skills_required") or job.get("skills") or ""
    
    # Parse job skills - handle comma/ slash / semicolon separation
    job_skills = [s.strip().lower() for s in re.split(r'[,;/|]', job_skills_raw) if s.strip()]
    student_lower = [s.lower() for s in student_skills]

    matched = []
    missing = []
    for js in job_skills:
        # Improved match check: Use word boundaries for short skills (like OS, C, Java)
        # to avoid matching "OS" inside "Photoshop"
        if len(js) <= 3:
            pattern = r'\b' + re.escape(js) + r'\b'
            is_match = any(re.search(pattern, sl, re.IGNORECASE) for sl in student_lower)
        else:
            is_match = any(js in sl or sl in js for sl in student_lower)
        
        if is_match:
            matched.append(js)
        else:
            missing.append(js)

    return {
        "matched_skills": matched,
        "missing_skills": missing[:5],  # Top 5 missing skills
        "match_count": len(matched),
        "gap_count": len(missing),
        "skill_coverage": round(len(matched) / max(len(job_skills), 1) * 100)
    }


# ─── STEP 5 & 6: LLM RE-RANKING + EXPLAINABILITY ─────────────────────────────
def gemini_rerank_and_explain(student: dict, top_jobs: list, parsed_resume: dict) -> list:
    """
    STEP 5 & 6 - Uses Gemini to:
      a) Re-rank the top results based on holistic understanding
      b) Generate a personalized "Why this matches you" explanation
    Falls back to rule-based if Gemini is unavailable/slow.
    """
    if not is_gemini_available():
        return _fallback_explain(student, top_jobs)

    try:
        import threading
        results = [None]
        
        def call_gemini():
            try:
                g_model = get_gemini_model()
                if not g_model:
                    results[0] = None
                    return
                
                # Pre-calculate verified matches for each job to guide the LLM
                def get_verified_matches(job_skills_str, student_skills):
                    verified = []
                    job_skills_low = job_skills_str.lower()
                    for s in student_skills:
                        s_low = s.lower()
                        # Use word boundaries for strict matching
                        pattern = rf'\b{re.escape(s_low)}\b'
                        if re.search(pattern, job_skills_low):
                            verified.append(s)
                    return verified

                student_skills = student.get('skills', [])
                
                # Build a detailed job list for the prompt with verified matches
                jobs_to_analyze = []
                for i, j in enumerate(top_jobs[:5]):
                    j_skills = j.get('skills_required') or j.get('skills') or 'N/A'
                    verified = get_verified_matches(j_skills, student_skills)
                    verified_str = ", ".join(verified) if verified else "NONE"
                    loc_type = j.get('locationLabel', 'Nationwide match')
                    
                    jobs_to_analyze.append(
                        f"JOB #{i} (Index {i}):\n"
                        f"- Role: {j['role']}\n"
                        f"- Company: {j['company']}\n"
                        f"- Location: {j.get('location')} ({loc_type})\n"
                        f"- Requirements: {j_skills[:150]}\n"
                        f"- Verified Matches: {verified_str}"
                    )
                
                jobs_summary = "\n\n".join(jobs_to_analyze)
                
                prompt = f"""You are a senior career mentor.
For the student and internships below, create a personalized "Road to 100%" 2-Day Fast-Track.

STUDENT PROFILE:
- Name: {student.get('name')}
- Current Skills: {', '.join(student_skills[:12])}

INTERNSHIPS:
{jobs_summary}

For each internship with a skill gap:
1. explanation: ONE "Match Highlight" (technical matches only).
2. roadmap: 
   - Day 1: Learn the basics of the most critical missing skill (YouTube search link).
   - Day 2: Suggest ONE unique, industry-specific project idea that uses that skill to solve a problem for {student.get('name')}.

Format your response as a strict JSON array:
[
  {{
    "index": <Index>,
    "explanation": "Brief highlight.",
    "roadmap": {{
      "summary": "1-sentence bridge to 100%.",
      "days": [
        {{ "day": 1, "topic": "Master Basics", "action": "Watch curated tutorials.", "link": "https://youtube.com/results?search_query=..." }},
        {{ "day": 2, "topic": "Build Proof", "action": "Project Idea: [Unique Idea Name] - [2-sentence creative description]", "link": "" }}
      ]
    }}
  }}
]
Only output the JSON array."""

                response = g_model.generate_content(
                    prompt,
                    generation_config={"temperature": 0.8, "max_output_tokens": 1024} # higher temperature for variety
                )
                results[0] = response.text.strip()



            except Exception as e:
                results[0] = None

        thread = threading.Thread(target=call_gemini, daemon=True)
        thread.start()
        thread.join(timeout=4)  # Max 4 seconds for Gemini (Faster loading)

        if results[0]:
            # Parse Gemini output
            json_start = results[0].find('[')
            json_end = results[0].rfind(']') + 1
            if json_start != -1 and json_end > json_start:
                rerank_data = json.loads(results[0][json_start:json_end])
                
                # Apply re-ranking and explanations
                reranked = []
                used_indices = set()
                
                for item in rerank_data:
                    idx = item.get('index', 0)
                    if 0 <= idx < len(top_jobs) and idx not in used_indices:
                        job = dict(top_jobs[idx])
                        explanation = item.get('explanation', '')
                        # If the model returned an object for explanation, attempt to flatten it
                        if isinstance(explanation, dict):
                            explanation = explanation.get('text', explanation.get('reasoning', str(explanation)))
                        
                        job['aiExplanation'] = str(explanation)
                        job['roadmap'] = item.get('roadmap')
                        job['llm_reranked'] = True
                        reranked.append(job)

                        used_indices.add(idx)
                
                # Add remaining jobs not re-ranked (beyond top 5)
                for i, job in enumerate(top_jobs):
                    if i not in used_indices:
                        job_copy = dict(job)
                        fallback = _build_fallback_explanation(student, job)
                        job_copy['aiExplanation'] = fallback.get("explanation", "")
                        job_copy['roadmap'] = fallback.get("roadmap")
                        job_copy['llm_reranked'] = False
                        reranked.append(job_copy)

                
                return reranked

    except Exception:
        pass

    # Fallback
    return _fallback_explain(student, top_jobs)


def _build_fallback_explanation(student: dict, job: dict) -> dict:
    """Fast rule-based explanation and role-specific roadmap when Gemini is unavailable."""
    import re
    skill_list = [s.lower() for s in student.get('skills', [])]
    job_skills_raw = (job.get('skills_required') or job.get('skills') or '')
    role = job.get('role', 'Internship')
    company = job.get('company', 'this organization')
    
    all_job_skills = [s.strip().lower() for s in re.split(r'[,;/|]', job_skills_raw) if s.strip()]
    matched = []
    missing = []
    
    for s in all_job_skills:
        # Fuzzy match for synonyms
        if any(s in sk or sk in s for sk in skill_list):
            matched.append(s)
        else:
            missing.append(s)
            
    # -- HEAVY GENEROSITY SCORING --
    # Base 35% if location matches + 10% per matched skill
    loc_bonus = 40 if job.get('match_type') == 'local' else 15
    skill_bonus = min(50, len(matched) * 15)
    
    final_acc = int(min(98, max(25, 10 + loc_bonus + skill_bonus)))
    job['match_score'] = final_acc
    job['finalScore'] = final_acc

    # -- ROLE-SPECIFIC FALLBACK ROADMAPS --
    role_low = role.lower()
    if "stack" in role_low or "web" in role_low or "developer" in role_low:
        d1, a1 = "System Architecture", f"Design the frontend-backend connection patterns for this {role} project."
        d2, a2 = "Feature Deployment", "Code a working CRUD prototype demonstrating your full-stack capability."
    elif "ai" in role_low or "chatbot" in role_low or "vision" in role_low or "python" in role_low:
        d1, a1 = "Model Integration", f"Select and test a pre-trained model for this {role} at {company}."
        d2, a2 = "Pipeline Optimization", "Fine-tune your data processing scripts to ensure low-latency AI responses."
    elif "marketing" in role_low or "sales" in role_low or "business" in role_low:
        d1, a1 = "Target Demographics", "Analyze the user base of this company and draft a conversion strategy."
        d2, a2 = "Campaign Prototype", "Create a mock ad cluster or landing page copy optimized for search intent."
    else:
        d1, a1 = "Deep Tech Standards", f"Master the specific library or stack used most in {role} roles."
        d2, a2 = "Industry Showcase", "Write a technical case study of a project you built that matches this role."

    explanation = (f"Smart Match: Your skills in {', '.join(matched[:2]) if matched else 'Technology'} provide a solid foundation. "
                  f"Calculated {final_acc}% accuracy based on your {role} alignment and location proximity.")
    
    roadmap = {
        "summary": f"Bridge the {role} gap in 48 hours.",
        "days": [
            { "day": 1, "topic": d1, "action": a1, "link": f"https://www.youtube.com/results?search_query={role.replace(' ', '+')}+tutorial" },
            { "day": 2, "topic": d2, "action": a2, "link": "" }
        ]
    }
    
    return {"explanation": explanation, "roadmap": roadmap, "missing": missing}




def _fallback_explain(student: dict, jobs: list) -> list:
    """Apply fallback explanations and roadmaps to all jobs."""
    result = []
    for job in jobs:
        job_copy = dict(job)
        fallback = _build_fallback_explanation(student, job)
        job_copy['aiExplanation'] = fallback["explanation"]
        job_copy['roadmap'] = fallback["roadmap"]
        job_copy['missing_skills'] = fallback.get('missing', [])
        job_copy['llm_reranked'] = False
        result.append(job_copy)
    return result




# ─── MAIN MATCHING PIPELINE ───────────────────────────────────────────────────
def process_matching(data: dict) -> list:
    student = data['student']
    internships = data['internships']
    work_preference = data.get('workPreference', 'office')
    resume_text = student.get('resume_text', '') or ''

    # ── STEP 1: Resume Parse ──────────────────────────────────────────────────
    parsed_resume = parse_resume(resume_text, student.get('skills', []))
    
    # Merge parsed skills back into student profile
    all_student_skills = list(set(
        [s.lower() for s in student.get('skills', [])] +
        [s.lower() for s in parsed_resume['skills']]
    ))
    student['skills'] = all_student_skills

    # ── Data Cleaning & Sector Lock ──────────────────────────────────────────
    cleaned_internships = []
    for job in internships:
        job_copy = dict(job)
        for key in ['location', 'role', 'company', 'sector']:
            val = str(job_copy.get(key, ""))
            if val.startswith("('") or val.startswith('("'):
                job_copy[key] = re.sub(r'^[\(\'"]+|[\)\'"]+$', '', val)
        cleaned_internships.append(job_copy)

    pref_sector = (student.get('preferredSector') or 'Technology').lower().strip()
    pref_loc_raw = (student.get('preferred_state') or '').lower().strip()
    pref_locs = [l.strip() for l in pref_loc_raw.split(',') if l.strip()]
    
    # India-wide Tech Hub Map for automatic regional expansion
    INDIA_TECH_HUBS = {
        "tamil nadu": ["namakkal", "salem", "erode", "trichy", "tiruchirappalli", "coimbatore", "chennai", "madurai", "vellore", "thoothukudi", "tirunelveli", "thanjavur", "dindigul", "karur", "tiruppur", "hosur"],
        "karnataka": ["bangalore", "bengaluru", "mysore", "mysuru", "mangalore", "mangaluru", "hubli", "dharwad", "belgaum"],
        "maharashtra": ["mumbai", "pune", "nagpur", "nashik", "aurangabad", "thane", "navi mumbai", "vashi"],
        "telangana": ["hyderabad", "warangal", "secunderabad", "nizamabad"],
        "andhra pradesh": ["visakhapatnam", "vizag", "vijayawada", "guntur", "nellore", "tirupati"],
        "delhi ncr": ["delhi", "new delhi", "gurgaon", "gurugram", "noida", "greater noida", "ghaziabad", "faridabad"],
        "kerala": ["kochi", "trivandrum", "thiruvananthapuram", "kozhikode", "thrissur"],
        "gujarat": ["ahmedabad", "surat", "vadodara", "baroda", "rajkot", "gandhinagar"],
        "west bengal": ["kolkata", "howrah", "durgapur", "siliguri"],
        "rajasthan": ["jaipur", "jodhpur", "udaipur", "kota", "ajmer"]
    }

    # ── TIERED LOCATION EXPANSION (All India Support) ──────────────────────
    bucket_tech_local = []
    bucket_tech_regional = [] # Same state, different city
    bucket_tech_anywhere = []
    bucket_others = []

    # Better location parsing
    state_hints = []
    city_hints = []
    active_states = set()

    for loc_item in pref_locs:
        parts = [p.strip() for p in loc_item.split(',') if p.strip()]
        if len(parts) >= 2:
            city_hints.append(parts[0])
            state_low = parts[1].lower()
            state_hints.append(state_low)
            active_states.add(state_low)
        else:
            city = parts[0]
            city_hints.append(city)
            # Find which state this city belongs to
            for state, hubs in INDIA_TECH_HUBS.items():
                if city in hubs:
                    active_states.add(state)
                    state_hints.append(state)

    # 1. Tech Detection Expansion - STRICT
    def is_tech_role(j):
        role_raw = str(j.get('role', '')).lower()
        sector_raw = str(j.get('sector', '')).lower()
        skills_raw = str(j.get('skills_required') or j.get('skills') or '').lower()
        r = (role_raw + ' ' + sector_raw + ' ' + skills_raw)

        tech_kws = [
            'software', 'developer', 'web', 'app', 'it ', 'technical', 'data', 'coder', 
            'engineer', 'ai', 'ml', 'frontend', 'backend', 'fullstack', 'python', 
            'java', 'react', 'node', 'sql', 'database', 'cloud', 'devops', 'cyber', 
            'security', 'mobile', 'android', 'ios', 'php', 'c++', 'c#'
        ]
        
        # Hard non-tech keywords
        non_tech_kws = ['marketing', 'sales', 'seo', 'content writer', 'social media', 'hr ', 'recruitment', 'telecall', 'accounting', 'business development']
        
        is_hard_nontech = any(kw in role_raw or kw in sector_raw for kw in non_tech_kws)
        matches_tech = any(kw in r for kw in tech_kws)
        
        if pref_sector in ['technology', 'technical', 'it']:
            if is_hard_nontech: return False
            return matches_tech
        return (pref_sector in r) or matches_tech

    # 2. Skill Synonym Map
    SKILL_SYNONYMS = {
        'sql': ['mysql', 'postgresql', 'sql server', 'oracle', 'sqlite', 'database'],
        'javascript': ['js', 'react', 'vue', 'node', 'express', 'frontend'],
        'react': ['reactjs', 'react.js', 'frontend'],
        'python': ['flask', 'django', 'pandas', 'numpy', 'scipy', 'backend'],
        'html': ['html5', 'web', 'frontend'],
        'css': ['css3', 'tailwind', 'bootstrap', 'sass', 'frontend'],
        'excel': ['spreadsheet', 'data analysis', 'advanced excel', 'ms-excel', 'ms excel'],
        'ml': ['machine learning', 'ai', 'data science', 'deep learning']
    }

    # -- TIERED LOCATION BUCKETS --
    for job in cleaned_internships:
        loc_val = str(job.get('location', ""))
        loc_val = re.sub(r"[\(\)\[\]\'\"]", "", loc_val)
        loc_parts = list(set([p.strip() for p in loc_val.split(',') if p.strip()]))
        job['location'] = ", ".join(loc_parts)
        
        is_tech = is_tech_role(job)
        job_loc_low = job['location'].lower()
        
        is_job_remote = any(kw in job_loc_low for kw in ['remote', 'work from home', 'wfh'])
        wants_remote = any(kw in [l.lower() for l in pref_locs] for kw in ['remote', 'work from home', 'wfh'])
        wants_remote = wants_remote or student.get('work_mode', '').lower() in ['remote', 'any']

        match_type = 'anywhere'
        if city_hints and any(city in job_loc_low for city in city_hints):
            match_type = 'local'
        elif is_job_remote and wants_remote:
            match_type = 'remote_match'
        elif not pref_locs or 'any' in pref_locs:
            match_type = 'local'
        elif any(state in job_loc_low for state in state_hints):
            match_type = 'regional'
        else:
            for active_st in active_states:
                if active_st in INDIA_TECH_HUBS:
                    if any(dist in job_loc_low for dist in INDIA_TECH_HUBS[active_st]):
                        match_type = 'regional'
                        break

        job['work_mode'] = 'Remote' if is_job_remote else 'On-site'
        job['match_type'] = match_type
        
        if is_tech:
            if match_type == 'local':
                job['locationLabel'] = 'Direct Match'
                bucket_tech_local.append(job)
            elif match_type == 'remote_match':
                job['locationLabel'] = 'Remote Match'
                bucket_tech_remote.append(job)
            elif match_type == 'regional':
                job['locationLabel'] = 'Regional Match'
                bucket_tech_regional.append(job)
            else:
                job['locationLabel'] = ''
                bucket_tech_anywhere.append(job)
        else:
            job['locationLabel'] = ''
            bucket_others.append(job)

    # 3. POOL CONSTRUCTION
    filtered = bucket_tech_local[:25] + bucket_tech_remote[:20] + bucket_tech_regional[:15]
    if len(filtered) < 50:
        filtered += bucket_tech_anywhere[:(50 - len(filtered))]
    if not filtered:
        filtered = bucket_others[:20]

    # 4. FINAL ACCURACY SCORING
    student_text = build_student_text(student, parsed_resume)
    job_texts = [build_job_text(j) for j in filtered]
    scores = compute_similarities(student_text, job_texts)

    scored = []
    for i, job in enumerate(filtered):
        semantic_score = scores[i]
        job_skills_str = str(job.get('skills_required') or job.get('skills') or '').lower()
        match_details = []
        
        required_list = [s.strip().lower() for s in re.split(r'[,;/|]', job_skills_str) if s.strip()]
        total_reqs = max(len(required_list), 1)

        for s in all_student_skills:
            s_low = s.lower()
            found = False
            if s_low in job_skills_str:
                found = True
            else:
                for main_skill, syns in SKILL_SYNONYMS.items():
                    if s_low == main_skill or s_low in syns:
                        if any(syn in job_skills_str for syn in [main_skill] + syns):
                            found = True
                            break
            if found:
                match_details.append(s)
        
        # Skill Ratio (0.0 - 0.45)
        skill_coverage_ratio = len(match_details) / total_reqs
        skill_boost = skill_coverage_ratio * 0.45
        
        # Location Bonus (0.0 - 0.35)
        m_type = job.get('match_type', 'anywhere')
        loc_bonus = 0.35 if m_type == 'local' else (0.25 if m_type == 'remote_match' else 0.15)
        
        # Profile Multiplier - HEAVY PENALTY FOR WRONG INDUSTRY
        is_tech = is_tech_role(job)
        sector_multiplier = 1.0 if is_tech else 0.1
        
        # Base calculation
        base_score = (semantic_score * 0.2) + skill_boost + loc_bonus
        final_score = base_score * sector_multiplier
        score_int = int(min(0.99, max(0.1, final_score)) * 100)

        # Skip high-quality tech candidates matching random marketing roles with low overlap
        if is_tech == False and len(match_details) < 2:
            continue

        scored.append({
            **job,
            'match_score': score_int,
            'finalScore': score_int,
            'match_percentage': f"{score_int}%",
            'skill_coverage': round(skill_coverage_ratio * 100),
            'matched_skills_list': list(set(match_details))
        })

    # ── Ranking ───────────────────────────────────────────────────────────────
    scored.sort(key=lambda x: x['match_score'], reverse=True)
    top_results_pool = scored[:12]

    # Gap Analysis
    for res in top_results_pool:
        res['gap_analysis'] = compute_gap_analysis(all_student_skills, res)

    # ── STEP 5: LLM Re-ranking + Explanations ────────────────────────
    final_results = gemini_rerank_and_explain(student, top_results_pool[:10], parsed_resume)

    return final_results


# ─── Entry Point ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import io
    sys.stdin  = io.TextIOWrapper(sys.stdin.buffer,  encoding='utf-8')
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

    try:
        input_data = sys.stdin.read()
        if not input_data or not input_data.strip():
            print(json.dumps({"success": False, "error": "No input data provided"}))
            sys.exit(1)

        data = json.loads(input_data)
        recommendations = process_matching(data)
        print(json.dumps({"success": True, "data": recommendations}, ensure_ascii=False))

    except Exception as e:
        import traceback
        print(json.dumps({
            "success": False,
            "error": str(e),
            "trace": traceback.format_exc()
        }))
        sys.exit(1)
