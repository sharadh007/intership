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
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from dotenv import load_dotenv

# ─── Setup ────────────────────────────────────────────────────────────────────
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
gemini_available = False

try:
    import google.generativeai as genai
    if GEMINI_API_KEY:
        genai.configure(api_key=GEMINI_API_KEY)
        gemini_available = True
except Exception:
    gemini_available = False

# Load Sentence Transformer model (cached after first load)
model = SentenceTransformer('all-MiniLM-L6-v2')

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
    parts = [
        job.get("role", ""),
        job.get("company", ""),
        job.get("sector", ""),
        job.get("skills_required") or job.get("skills") or "",
        job.get("description", ""),
        job.get("requirements", ""),
    ]
    return " ".join(p for p in parts if p).strip()


# ─── STEP 4: SIMILARITY ENGINE ───────────────────────────────────────────────
def compute_similarities(student_text: str, job_texts: list) -> list:
    """Batch-encode all texts and compute cosine similarities at once (fast)."""
    all_texts = [student_text] + job_texts
    embeddings = model.encode(all_texts, show_progress_bar=False, batch_size=32)
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
        # Check for partial match (e.g. "react" matches "reactjs")
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
    if not gemini_available:
        return _fallback_explain(student, top_jobs)

    try:
        import threading
        results = [None]
        
        def call_gemini():
            try:
                g_model = genai.GenerativeModel('gemini-1.5-flash')  # fastest model
                
                # Build a compact job list for the prompt
                jobs_summary = "\n".join([
                    f"{i+1}. {j['role']} at {j['company']} | Skills: {j.get('skills_required','N/A')[:60]}"
                    for i, j in enumerate(top_jobs[:5])
                ])
                
                prompt = f"""You are an internship matching expert. Given the student profile and top internship matches, do two things:

STUDENT:
- Name: {student.get('name')}
- Skills: {', '.join(student.get('skills', [])[:10])}
- Qualification: {student.get('qualification')}
- Career Goal: {student.get('career_goal', 'Not specified')}
- Resume Summary: {parsed_resume.get('summary', '')[:150]}

TOP MATCHES (already ranked by AI similarity score):
{jobs_summary}

OUTPUT a JSON array with exactly {min(5, len(top_jobs))} items in the BEST order:
[
  {{
    "index": <original 0-based position in the list above>,
    "explanation": "<2 sentences: why this is a great match for THIS student specifically>"
  }}
]
Only output the JSON array, no other text."""

                response = g_model.generate_content(
                    prompt,
                    generation_config={"temperature": 0.2, "max_output_tokens": 512}
                )
                results[0] = response.text.strip()
            except Exception as e:
                results[0] = None

        thread = threading.Thread(target=call_gemini, daemon=True)
        thread.start()
        thread.join(timeout=8)  # Max 8 seconds for Gemini (faster fallback)

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
                        job['aiExplanation'] = item.get('explanation', '')
                        job['llm_reranked'] = True
                        reranked.append(job)
                        used_indices.add(idx)
                
                # Add remaining jobs not re-ranked (beyond top 5)
                for i, job in enumerate(top_jobs):
                    if i not in used_indices:
                        job_copy = dict(job)
                        job_copy['aiExplanation'] = _build_fallback_explanation(student, job)
                        job_copy['llm_reranked'] = False
                        reranked.append(job_copy)
                
                return reranked

    except Exception:
        pass

    # Fallback
    return _fallback_explain(student, top_jobs)


def _build_fallback_explanation(student: dict, job: dict) -> str:
    """Fast rule-based explanation when Gemini is unavailable."""
    skill_list = student.get('skills', [])
    job_skills_str = (job.get('skills_required') or job.get('skills') or '').lower()
    matched = [s for s in skill_list if s.lower() in job_skills_str]
    pct = int(job.get('match_score', 0) * 100)
    role = job.get('role', 'this role')
    company = job.get('company', 'this company')

    if matched:
        return (f"Your expertise in {', '.join(matched[:3])} directly aligns with what {company} needs. "
                f"This {role} position is a {pct}% semantic match to your overall profile and goals.")
    else:
        return (f"Based on semantic analysis of your profile, this {role} at {company} is a strong fit. "
                f"Your background matches {pct}% of the job's requirements and context.")


def _fallback_explain(student: dict, jobs: list) -> list:
    """Apply fallback explanations to all jobs."""
    result = []
    for job in jobs:
        job_copy = dict(job)
        job_copy['aiExplanation'] = _build_fallback_explanation(student, job)
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

    # ── Location / WFH Pre-Filter ─────────────────────────────────────────────
    pref_loc = (student.get('preferred_state') or '').lower().strip()
    filtered = []

    for job in internships:
        job_loc = (job.get('location') or '').lower().strip()
        is_remote = ('remote' in job_loc or 'work from home' in job_loc
                     or 'wfh' in job_loc or 'work-from-home' in job_loc)

        if work_preference == 'remote':
            # Only include remote/WFH jobs
            if not is_remote:
                continue

        elif work_preference == 'both':
            # Include remote jobs OR location-matching office jobs
            if not is_remote:
                loc_ok = (
                    not pref_loc
                    or pref_loc in job_loc
                    or job_loc in pref_loc
                    or 'pan india' in job_loc
                )
                if not loc_ok:
                    continue

        else:  # 'office' default — user wants an in-person internship
            # ALWAYS exclude remote/WFH jobs when user wants office
            if is_remote:
                continue
            # Now apply location check for office jobs
            if pref_loc and pref_loc not in ('any', ''):
                loc_ok = (
                    pref_loc in job_loc
                    or job_loc in pref_loc
                    or 'pan india' in job_loc
                )
                if not loc_ok:
                    continue

        filtered.append(job)

    if not filtered:
        # Fallback: if nothing passes strict filter, try office-only (no location restriction)
        filtered_office = [
            j for j in internships
            if not ('remote' in (j.get('location') or '').lower()
                    or 'work from home' in (j.get('location') or '').lower()
                    or 'wfh' in (j.get('location') or '').lower())
        ] if work_preference == 'office' else []

        if filtered_office:
            filtered = filtered_office
        else:
            # Last resort: all internships
            filtered = internships

    # ── STEP 2 & 3: Build Embeddings ─────────────────────────────────────────
    student_text = build_student_text(student, parsed_resume)
    job_texts = [build_job_text(j) for j in filtered]

    # ── STEP 4: Similarity Engine (batch, fast) ───────────────────────────────
    scores = compute_similarities(student_text, job_texts)

    # ── Hybrid Scoring (semantic + exact skill boost) ─────────────────────────
    scored = []
    for i, job in enumerate(filtered):
        semantic_score = scores[i]
        
        # Exact skill match boost
        job_skills_str = (job.get('skills_required') or job.get('skills') or '').lower()
        boost = sum(0.04 for s in all_student_skills if s in job_skills_str)
        boost = min(boost, 0.20)  # Cap boost at 20%
        
        final_score = min(0.99, semantic_score + boost)

        # ── STEP 7: Gap Analysis per job ─────────────────────────────────────
        gap = compute_gap_analysis(all_student_skills, job)

        scored.append({
            **job,
            'match_score': final_score,
            'match_percentage': f"{int(final_score * 100)}%",
            'semantic_score': round(semantic_score, 4),
            'skill_boost': round(boost, 4),
            'gap_analysis': gap,
        })

    # ── Ranking ───────────────────────────────────────────────────────────────
    scored.sort(key=lambda x: x['match_score'], reverse=True)
    top_results = scored[:10]

    # ── STEP 5 & 6: LLM Re-ranking + Explainability ───────────────────────────
    final_results = gemini_rerank_and_explain(student, top_results, parsed_resume)

    # ── STEP 8: Attach parsed resume metadata to response ─────────────────────
    for rec in final_results:
        rec['pipeline_metadata'] = {
            'resume_parsed': bool(resume_text),
            'skills_extracted': len(parsed_resume['skills']),
            'llm_reranked': rec.get('llm_reranked', False),
            'filter_mode': work_preference
        }

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
