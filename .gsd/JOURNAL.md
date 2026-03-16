# JOURNAL.md

## 2026-03-16 09:05 - Executed Phase 1 and 2
- Upgraded the scoring logic inside `matcher.py:process_matching` to use a `is_strong_semantic` heuristic.
- Removed the strict `final_score *= 0.4` penalty for instances where semantic similarity is > 0.15 or match ratio is >= 0.3. This ensures non-tech roles, which frequently use varied terminologies, get high placement.
- Added variable minimum visibility floors (up to 85%) scaling dynamically on exact match ratio + semantic score.
- Overhauled `_build_fallback_explanation` to natively detect Finance, Marketing, HR, and Design domains to avoid outputting generic tech tasks ("high load optimization") for non-tech skills.
- The outcome: non-tech internship profiles will directly reap the rewards of semantic matching instead of facing arbitrary "Technology only" biases.

## 2026-03-16 10:10 - Updated Project Ideas Generation
- Altered the `/generate-project-ideas` endpoint in `main.py` which was originally hardcoded with Computer Science terminology ("Prototypes", "Micro-Frontends", "Backend Edge Solutions").
- Added smart heuristic detection for domains checking against arrays of keywords (`Finance`, `HR`, `Auto/Mech`, `Marketing`). 
- Completely rewrote the static prompt fallbacks to suggest domain-correct projects (Financial Health Models, Brand Sentiment Audits, Stress Analysis, 90-day playbooks).
- Updated the AI prompt constraints strictly forbidding "prototypes" and explicitly prompting realistic projects for finance, HR, civil, and marketing so the generated LLM responses also behave properly.
