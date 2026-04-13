# R5 Typesetter: Information Architecture Review

**Reviewer**: typesetter (information-architecture subrole)
**Artifact**: `docs/presentations/why-craftworks.md`
**Date**: 2026-04-08

---

## 1. Slide Count per Section

| Section | Slides | Slide #s | Notes |
|---------|--------|----------|-------|
| **Opening** | 2 | 1-2 | Title + landscape |
| **P1 (Toolchain)** | 7 | 3-9 | Section title + 6 content |
| **P2 (Optimization)** | 5 | 10-14 | Section title + 4 content |
| **P3 (Orchestration)** | 5 | 15-20 | Section title + 4 content + 1 Fleet |
| **Closing / Synthesis** | 5 | 21-25 | Progression, landscape, CTA, business, next steps |
| **Appendix** | 3 | 26-28 | Section title + FORMA + Dreaming |
| **Total** | **28** | | |

**Balance assessment**: P1 has 7 slides vs P2's 5 and P3's 5. P1 is overweight by 1-2 slides. The closing block (5 slides) is heavy -- it has two synthesis slides (Progression + Landscape) that partly overlap.

---

## 2. Recommended 20-Minute Cut List

A 20-min delivery at ~1.5 min/slide supports 12-14 content slides. Cut 10-12 slides.

| Slide | Action | Reason |
|-------|--------|--------|
| #6 (Every Platform Speaks a Different Language) | **CUT** | Tool-name translation table is a detail; #5 (Same Skill, Five Formats) already proves cross-platform |
| #9 (How a Skill Gets Packaged) | **CUT** | Six-source convergence is implementation detail; #8 (Makefile) covers the control surfaces |
| #12 (PRESS: Line Justification) | **CUT** | Deep mechanism; #11 (Because We Have a Compiler) already has the savings headline |
| #13 (Competitive Compilation) | **CUT** | Interesting but non-essential for 20-min pitch |
| #14 (RELAX) | **CUT** | Report engine detail; move to appendix |
| #17 (A Real Workflow: Prose In) | **MERGE into #18** | The YAML and dispatch table are one story; show dispatch table only with 1-line setup |
| #19 (Fleet) | **CUT** | CLI detail; mention Fleet verbally during #20 (Guard) |
| #21 (The Progression) | **CUT** | Recap slide; the audience just saw the progression live |
| #24 (Which Business First?) | **KEEP** | This is the 20-min stop point per the facilitation note |
| #25 (Next Steps) | **CUT for 20-min** | Only needed if continuing to 40-min |

**20-min deck**: slides 1-5, 7-8, 10-11, 15-16, 18, 20, 22-24 = **15 slides** (~18 min at 1.2 min/slide with pauses).

---

## 3. Core-to-Appendix Moves

| Slide | Move | Reason |
|-------|------|--------|
| #14 (RELAX) | Core --> Appendix | Report-engine optimization is a deep-dive topic; P2 is strong without it |
| #12 (PRESS mechanism) | Core --> Appendix | The MCKP solver detail is Q&A material, not pitch-flow material |
| #6 (Tool-name translation) | Core --> Appendix | Useful reference table for technical audience but stops momentum in the narrative |

**Appendix-to-Core moves**: None. Both appendix slides (FORMA, Dreaming) are correctly placed as supplemental.

---

## 4. Structural Findings

### F1. P1 is load-bearing but overstays

P1 has 6 content slides (4-9) vs P2's 4 and P3's 4. Three of the six (#5, #6, #7) all prove "cross-platform" from different angles (format table, tool-name table, target count). Pick two. The third becomes appendix. The current weight risks the audience concluding "this is a cross-platform tool" before P2 and P3 can reframe it as a platform.

### F2. Closing has two synthesis slides that overlap

Slide #21 (The Progression) and #22 (Nobody Covers All Three Columns) both synthesize the three-problem arc. #21 is a timeline recap; #22 is a competitive landscape. For a 40-min talk both are fine. For 20-min, #21 is expendable because the audience just lived through the progression. #22 is the stronger closer because it externalizes the claim (competitors vs. CraftWorks).

### F3. The handoff to craftworks-overview is clean

Slide #24 (Which Business First?) has the facilitation note: "If 20 min, stop here. If 40+, hand off to craftworks-overview." Slide #25 (Next Steps) provides the routing table. This two-slide handoff works. One suggestion: move the facilitation note from an HTML comment to a speaker-note directive so it renders in presenter view if Marp supports it.

### F4. Section-title slides provide good breathing room

Three section-title slides (P1, P2, P3) each use `_class: title` and carry a one-line reframe. These work as cognitive resets. The P2 title ("Skills are centralized. Now -- can we make them cheaper and better?") is the best because it connects P1's resolution to P2's setup. P3's title could do the same -- currently it reads as a standalone claim rather than building on P2's resolution.

### F5. Appendix is underweight

Only 2 content slides (FORMA, Dreaming). The deck has 3-4 slides in core that are appendix-grade (#6, #12, #14). Moving them would give the appendix 5-6 slides -- a proper reference section for Q&A -- while tightening the core to ~20 slides.
