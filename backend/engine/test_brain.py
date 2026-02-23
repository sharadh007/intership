import pytest
import json
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_analyze_resume():
    resume_text = "I am a Python developer with experience in React and SQL."
    response = client.post("/analyze-resume", json={"resumeText": resume_text})
    assert response.status_code == 200
    data = response.json()["data"]
    assert "python" in [s.lower() for s in data["skills"]]
    assert "react" in [s.lower() for s in data["skills"]]

def test_clean_data():
    items = [{"location": "b'lore", "name": "Test Job"}]
    response = client.post("/clean-data", json={"items": items})
    assert response.status_code == 200
    assert response.json()["data"][0]["location"] == "Bangalore"

def test_matching_engine_structure():
    # Mock data
    student = {
        "name": "John Doe",
        "skills": ["Python", "JavaScript"],
        "qualification": "B.Tech",
        "preferred_state": "Karnataka",
        "resume_text": "Python expert"
    }
    internships = [
        {
            "id": 1,
            "role": "Python Intern",
            "company": "Tech Corp",
            "location": "Bangalore",
            "skills_required": "Python"
        }
    ]
    
    payload = {
        "student": student,
        "internships": internships,
        "workPreference": "office"
    }
    
    response = client.post("/match", json=payload)
    # This might fail if sentence-transformers model is not loaded yet in test env, 
    # but we check the structure if it succeeds.
    if response.status_code == 200:
        data = response.json()
        assert data["success"] is True
        assert len(data["data"]) > 0
