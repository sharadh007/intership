import os
import json
import logging
from typing import List, Dict, Any
from fastapi import FastAPI, BackgroundTasks, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv

# Import our logic
from matcher import process_matching, KNOWN_SKILLS
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
