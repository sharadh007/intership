# SPEC.md — Project Specification

> **Status**: `FINALIZED`

## Vision
To expand the highly successful accuracy matching algorithm and custom roadmap generation from the Technology domain to all domains (Finance, Marketing, Architecture, Accounting, etc.). The goal is to ensure students from non-tech backgrounds receive highly relevant, unique roadmaps and their profile scores accurately reflect >70% for strong non-tech matches, instead of getting penalized down to ~30%.

## Goals
1. Implement a unified or multi-sector matching system where candidates in non-tech fields (like Finance) who match well with non-tech jobs are not aggressively penalized simply because the job isn't tech.
2. Provide unique, tailored fallback roadmaps (AI Mentor plans) for a wider variety of sectors (e.g., Finance, Data Entry, Design) instead of defaulting to tech concepts.
3. Ensure location bonus and skill matching weights work identically well for non-tech as they do currently for tech roles.

## Non-Goals (Out of Scope)
- Making any changes to the frontend UI functionality.
- Changing the primary Gemini generation logic.

## Users
Students from Finance, Marketing, Architecture, and other non-technical disciplines using the platform to find and prepare for internships.

## Constraints
- Time: Fast deployment required.
- Integration: Must play nicely within the existing `matcher.py` flow. 

## Success Criteria
- [ ] A non-tech (e.g., Accounts/Finance) application matching 100% location and good skills achieves >70% accuracy, instead of 30%.
- [ ] Fallback roadmaps suggest relevant tasks (e.g., Excel/Tally/Reconciliation for finance) instead of "Advanced Accounting".
