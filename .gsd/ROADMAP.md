# ROADMAP.md

> **Current Phase**: Not started
> **Milestone**: v1.0

## Must-Haves (from SPEC)
- [ ] Sector penalty logic rewritten to support non-tech when user's sector matches or is non-tech.
- [ ] New AI Mentor fallback cases designed (Finance, Accounting, Architecture, Marketing).
- [ ] Accuracy formulas verified on non-tech candidates.

## Phases

### Phase 1: Sector Bias Removal
**Status**: ⬜ Not Started
**Objective**: Fix the hard-coded 0.1x penalty which crushes non-tech roles, regardless of candidate qualification or intention. Enhance the `is_tech_role` to a sector matching mechanism, allowing Finance interns to get 1.0x multipliers for Finance roles.
**Requirements**: REQ-01

### Phase 2: Domain-Specific Fallback Roadmaps
**Status**: ⬜ Not Started
**Objective**: Update the fallback explanations and `roadmap` generation step to provide customized templates for Finance, Architecture, HR, Marketing, etc.
**Requirements**: REQ-02
