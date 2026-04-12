# Pitfall-Final-1: Findings Applied

**Series**: pitfall-final-1 (26 scenarios, P-100 through P-135)
**Applied**: 2026-04-11
**Filter**: major + warning only (notes excluded)

## Summary

| Metric | Count |
|--------|-------|
| Scenarios | 26 |
| Total findings | ~196 |
| Major findings applied | 112 |
| Warning findings applied | 57 |
| Note findings excluded | ~27 |
| **Total applied** | **169** |

## Target Files Modified

| File | Section Added | Amendment Count |
|------|--------------|-----------------|
| `design/claws/specs/CL-04-compilation-pipeline.md` | Pitfall-Final-1 Amendments (PF1-S01 through PF1-S26) | 18 subsections, ~85 findings |
| `design/claws/specs/CL-02-security-model.md` | Pitfall-Final-1 Amendments + Amendments A128-A161 | 34 amendments |
| `design/claws/specs/CL-03-runtime-enforcement.md` | Pitfall-Final-1 Amendments (PF1-S01 through PF1-S26) | 10 subsections, ~40 findings |
| `.craft/plans/claws-parse.md` | From pitfall-final-1 scenarios | 29 deliverables + 6 test fixtures |
| `.craft/plans/claws-rules.md` | From pitfall-final-1 scenarios | 25 deliverables + 13 test additions |
| `.craft/plans/claws-emit.md` | From pitfall-final-1 scenarios | 33 deliverables + 17 test additions |
| `.craft/plans/claws-governance-ir.md` | From pitfall-final-1 scenarios | 18 deliverables + 5 test additions |

## Scenario-to-Spec Mapping

| Scenario | Pitfall | Primary Spec | Secondary Specs | Major | Warning |
|----------|---------|-------------|-----------------|-------|---------|
| S01-p100 | P-100 BOM first constraint drop | CL-04 | -- | 5 | 2 |
| S02-p101 | P-101 IR hash CRLF divergence | CL-04 | -- | 4 | 2 |
| S03-p102 | P-102 Alphabetical parse forward ref | CL-04 | -- | 4 | 2 |
| S04-p103 | P-103 Scheduled R4 perpetual denial | CL-02 | CL-04 | 4 | 2 |
| S05-p104 | P-104 OBO elicit warning vs R5 closed | CL-02 | CL-04 | 4 | 2 |
| S06-p105 | P-105 Implicit all-tools delegation | CL-02 | CL-04 | 4 | 2 |
| S07-p106 | P-106 Skill phantom tool NL detect | CL-04 | CL-02 | 4 | 3 |
| S08-p107 | P-107 Transitive data flow labels | CL-02 | CL-04 | 5 | 2 |
| S09-p108 | P-108 Fail-fast hides errors | CL-04 | -- | 4 | 3 |
| S10-p109 | P-109 Catch clause crash risk map | CL-02, CL-03 | CL-04 | 5 | 2 |
| S11-p120 | P-120 Cross-volume staging Windows | CL-04 | -- | 4 | 2 |
| S12-p121 | P-121 Orphaned staging crash recovery | CL-04 | -- | 4 | 2 |
| S13-p122 | P-122 Skill directive risk PRESS | CL-04 | -- | 4 | 3 |
| S14-p123 | P-123 OBO elicit severity migration | CL-02 | CL-04 | 4 | 2 |
| S15-p124 | P-124 R3-R4 fail-closed blocks writes | CL-02 | CL-03 | 4 | 2 |
| S16-p125 | P-125 Governance hook not first | CL-03 | CL-04 | 4 | 3 |
| S17-p126 | P-126 Persistent handler silent block | CL-03 | -- | 4 | 2 |
| S18-p127 | P-127 RangeError systemic failure | CL-03 | -- | 4 | 2 |
| S19-p128 | P-128 PRESS weakens safety directives | CL-04 | -- | 5 | 2 |
| S20-p129 | P-129 UTF-16 BOM silent parse fail | CL-04 | -- | 4 | 2 |
| S21-p130 | P-130 Misspelled tool ungoverned | CL-02 | CL-04 | 5 | 2 |
| S22-p131 | P-131 Trust tier per-target override | CL-02 | CL-01 | 3 | 2 |
| S23-p132 | P-132 riskMap registration failure | CL-02, CL-03 | -- | 4 | 2 |
| S24-p133 | P-133 Partial emit no enforcement | CL-04 | CL-03 | 4 | 2 |
| S25-p134 | P-134 Cross-artifact classification | CL-04 | CL-03 | 4 | 2 |
| S26-p135 | P-135 exec-approvals field mismatch | CL-04 | CL-03 | 4 | 3 |

## CL-02 Amendment Index (A128-A161)

| Amendment | Title | Source | Severity |
|-----------|-------|--------|----------|
| A128 | SCHEDULE-NO-APPROVAL generalized to R4+ | S04-F01, P-103 | major |
| A129 | Pre-auth suppression of SCHEDULE-NO-APPROVAL | S04-F03, P-103 | major |
| A130 | Effective elicitation requirement | S04-F05, P-103 | major |
| A131 | Audit chain rate limiting for scheduled denials | S04-F04, P-103 | warning |
| A132 | Risk-conditional OBO severity | S05-F01/F02/F05, P-104 | major |
| A133 | Strict mode OBO escalation | S05-F03, P-104 | major |
| A134 | Effective fail-mode in OBO severity | S05-F06, P-104 | warning |
| A135 | IMPLICIT-R4-DELEGATION rule | S06-F02, P-105 | major |
| A136 | Nested all delegation chain warning | S06-F05, P-105 | major |
| A137 | High-water-mark label propagation | S08-F01, P-107 | major |
| A138 | Transitive flow violation diagnostics | S08-F02, P-107 | major |
| A139 | Declassify annotation | S08-F03, P-107 | major |
| A140 | Conservative structural analysis default | S08-F04, P-107 | major |
| A141 | Cycle detection before label propagation | S08-F06, P-107 | major |
| A142 | Default ceiling from trust tier | S08-F07, P-107 | warning |
| A143 | Catch clause single point of failure | S10-F01, P-109 | major |
| A144 | Unknown tool default risk = 5 | S10-F03, P-109 | major |
| A145 | Explicit null toolName guard | S10-F05, P-109 | major |
| A146 | Non-throwing audit in catch | S10-F07, P-109 | warning |
| A147 | Per-risk-level fail-mode override | S15-F01, P-124 | major |
| A148 | Governance error vs policy block distinction | S15-F03, P-124 | major |
| A149 | Fail-closed migration path | S15-F04, P-124 | warning |
| A150 | Governance-error vs policy-deny audit classification | S15-F06, P-124 | warning |
| A151 | Misspelled tool causes ungoverned R5 | S21-F01/F02/F03, P-130 | major |
| A152 | Orphaned policy detection | S21-F04/F05, P-130 | major |
| A153 | Naming convention normalization | S21-F06/F07, P-130 | warning |
| A154 | Per-target trust tier resolution | S22-F01/F02, P-131 | major |
| A155 | Target-aware ceiling check | S22-F02, P-131 | major |
| A156 | Target override ceiling constraint | S22-F05, P-131 | major |
| A157 | Fleet trust tier ceiling | S22-F06, P-131 | warning |
| A158 | riskMap registration validation | S23-F01/F02, P-132 | major |
| A159 | Undefined riskMap is catastrophic | S23-F03, P-132 | major |
| A160 | Fatal plugin failure signaling | S23-F05, P-132 | major |
| A161 | Rules.json integrity protection | S23-F04, P-132 | warning |

## Cross-Cutting Themes

1. **Encoding normalization layer** (P-100, P-101, P-129): BOM strip + CRLF normalize + UTF-16 transcode sits between file I/O and both parser and hasher.

2. **Catch clause minimalism** (P-109, P-127, P-132): Single point of failure. Pre-computed ReadonlyMap, zero function calls, zero allocations.

3. **Atomic staging protocol** (P-120, P-121, P-133, P-134): Same-volume, crash markers, manifest checksums, all-or-nothing, cross-artifact consistency.

4. **PRESS frozen keyword defense** (P-122, P-128): Directive-level preservation, keyword count validation, case preservation, negation awareness.

5. **Tool name normalization pipeline** (P-130): Cross-file normalization, edit-distance suggestions, cascading diagnostics, orphaned policy detection.

6. **Risk-conditional severity** (P-104, P-123, P-124): Error for R5, warning for R3-R4. Migration paths for breaking changes.

7. **Persistent failure detection** (P-124, P-126, P-127): Per-tool crash counters, error classification, systemic vs per-tool, correlated failure detection.
