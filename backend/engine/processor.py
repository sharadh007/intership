import re
import spacy
import pandas as pd
from bs4 import BeautifulSoup
from typing import List, Dict, Any

# Load spaCy model for NLP tasks
try:
    nlp = spacy.load("en_core_web_sm")
except:
    # Fallback if model not loaded yet
    nlp = None

class DataProcessor:
    @staticmethod
    def clean_text(text: str) -> str:
        """Basic text cleaning."""
        if not text:
            return ""
        # Remove HTML tags if any
        text = BeautifulSoup(text, "html.parser").get_text()
        # Remove special characters and extra whitespace
        text = re.sub(r'\s+', ' ', text)
        return text.strip()

    @staticmethod
    def normalize_location(location: str) -> str:
        """Normalize common location names."""
        if not location:
            return "Remote"
        
        loc_map = {
            "b'lore": "Bangalore",
            "blr": "Bangalore",
            "bengaluru": "Bangalore",
            "mumbai": "Mumbai",
            "bom": "Mumbai",
            "delhi": "Delhi",
            "ncr": "Delhi NCR",
            "gurgaon": "Gurugram",
            "hyd": "Hyderabad",
            "pun": "Pune"
        }
        
        loc_lower = location.lower().strip()
        for key, val in loc_map.items():
            if key in loc_lower:
                return val
        return location.title()

    @staticmethod
    def extract_skills_nlp(text: str, known_skills: List[str]) -> List[str]:
        """Use NLP to extract skills from text."""
        if not text:
            return []
        
        text_lower = text.lower()
        found_skills = set()
        
        # 1. Simple keyword matching (fast)
        for skill in known_skills:
            if re.search(r'\b' + re.escape(skill.lower()) + r'\b', text_lower):
                found_skills.add(skill)
        
        # 2. NLP Entity Recognition (if spaCy is available)
        if nlp:
            doc = nlp(text)
            # This is a placeholder for more complex NER if needed
            # For now, we rely on the keyword matching which is quite robust for technical terms
            pass
            
        return list(found_skills)

    @staticmethod
    def parse_resume_advanced(resume_text: str) -> Dict[str, Any]:
        """Advanced resume parsing using NLP."""
        cleaned_text = DataProcessor.clean_text(resume_text)
        
        # Extract sections using regex
        sections = {
            "experience": re.split(r'experience|work history|employment', cleaned_text, flags=re.IGNORECASE),
            "education": re.split(r'education|academic', cleaned_text, flags=re.IGNORECASE),
            "projects": re.split(r'projects|technical projects', cleaned_text, flags=re.IGNORECASE)
        }
        
        # Simple extraction logic
        summary = cleaned_text[:300] + "..." if len(cleaned_text) > 300 else cleaned_text
        
        return {
            "summary": summary,
            "raw_sections": {k: v[-1] if len(v) > 1 else "" for k, v in sections.items()},
            "word_count": len(cleaned_text.split())
        }

    @staticmethod
    def scrape_job_details(url: str) -> Dict[str, str]:
        """Sample scraping logic using BeautifulSoup."""
        # This would require requests.get(url) in a real scenario
        # Here we just provide the structure
        return {
            "role": "Extracted Role",
            "company": "Extracted Company",
            "description": "Scraped description content..."
        }
