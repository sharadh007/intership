# JOURNAL.md

## 2026-03-16 09:05 - Executed Phase 1 and 2
- Upgraded the scoring logic inside `matcher.py:process_matching` to use a `is_strong_semantic` heuristic.
- Removed the strict `final_score *= 0.4` penalty for instances where semantic similarity is > 0.15 or match ratio is >= 0.3. This ensures non-tech roles, which frequently use varied terminologies, get high placement.
- Added variable minimum visibility floors (up to 85%) scaling dynamically on exact match ratio + semantic score.
- Overhauled `_build_fallback_explanation` to natively detect Finance, Marketing, HR, and Design domains to avoid outputting generic tech tasks ("high load optimization") for non-tech skills.
- The outcome: non-tech internship profiles will directly reap the rewards of semantic matching instead of facing arbitrary "Technology only" biases.
