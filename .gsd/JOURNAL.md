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

## 2026-03-16 10:35 - Fixed Node.js Bridge roadmap overrides
- Detected that the Node.js backend (`aiExplanationService.js`) fallback was aggressively overriding Python's custom roadmaps and failing to parse `missing_skills` out of the Python `gap_analysis` dictionary.
- Repaired `attachRoadmap` in the Node service to identify `internship.gap_analysis.missing_skills`, properly routing mismatched students to the "Fast Track" UI instead of incorrectly labelling them as 100% matched.
- Injected identical domain-detection heuristics into Node's `attachRoadmap` as Python, ensuring any Node-generated roadmaps use proper terminology for HR, Finance, and Marketing instead of "high-load optimization".
- Fixed the frontend `app.js` click handler to correctly pass `gap_analysis.missing_skills` to the project generator when the `💡 EXPLORE 2024-25 PROJECT IDEAS` button is clicked.

## 2026-03-17 09:15 - Mass Expansion of the Domain Heuristics for the recommendation engine
- After observing that "Electrical Engineering", "Textile Design" and other variants were slipping through the domain checks and receiving standard "Tech/Clean Code" suggestions, we expanded the system's awareness.
- Added heuristics for `is_engineering` (capturing Mechanical, Civil, Electrical, Electronics, Hardware mapping), `is_design` (Interior, Textile, UI/UX, Graphic, Fashion), and `is_operations`.
- The `generate_project_ideas` endpoint in `main.py` was updated to accurately reflect these expanded domains to produce intelligent, domain-specific projects.
- `aiExplanationService.js` and `matcher.py: _build_fallback_explanation` were heavily refactored to check `isEngineering` and `isDesign` rather than just `isMechAuto` guaranteeing proper Day 1 / Day 2 assignments and phrasing across ALL sectors available in the frontend selector.
- `matcher.py: is_preferred_sector_match` was updated with a new block exclusively matching Design keywords to accurately compute baseline domain appropriateness.
