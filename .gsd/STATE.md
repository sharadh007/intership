# STATE.md
> **Scope**: Session memory, blockers, uncommitted context.

## Current Focus
GSD project initialized to solve recommendation inaccuracy for non-tech sectors.

## Latest Action
Created `.gsd` structure with `SPEC.md` and `ROADMAP.md`.

## Open Blockers
None.

## Active Assertions
- The current penalty for non-tech is `1.0 if is_tech else 0.1` because of a previous strict tech-focused logic. This needs to be changed to check if the user *is* non-tech matching for a *non-tech* role.
- Fallback templates in Gemini are mostly tech-related. They need broad expansion (Finance, Accounts, General Management, HR, Design/Architecture).
