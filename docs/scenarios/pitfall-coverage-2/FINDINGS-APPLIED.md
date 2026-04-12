# Pitfall-Coverage-2 Findings Applied

**Date**: 2026-04-11
**Status**: Complete
**Series**: pitfall-coverage-2 (S01-S15)
**Filter**: major + warning only (notes excluded)

## Summary

| Metric | Count |
|--------|-------|
| Scenarios read | 15 |
| Major findings applied | 72 |
| Warning findings applied | 53 |
| Note findings skipped | ~40 |
| New pitfalls added | 30 (P-132 through P-161) |
| New CL-02 amendments | 53 (A75 through A127) |
| CL-03 amendments | 11 (PC2 section) |
| CL-04 amendments | 30+ (PC2 section) |
| Plan items: claws-rules | 36 findings + 19 tests |
| Plan items: claws-emit | 24 findings + 13 tests |
| Guides updated | 3 |

## Files Modified

### Specs
- design/claws/specs/CL-02-security-model.md -- A75-A127, 2 new open questions
- design/claws/specs/CL-03-runtime-enforcement.md -- PC2 section, 1 new open question
- design/claws/specs/CL-04-compilation-pipeline.md -- PC2 section, 2 new open questions

### Plans
- .craft/plans/claws-rules.md -- 36 findings + 19 tests
- .craft/plans/claws-emit.md -- 24 findings + 13 tests

### Pitfalls
- design/claws/PITFALLS.md -- P-132 through P-161, Category 19, total 142

### Guides
- docs/claws/governance/fail-mode.md -- secondary audit JSON, sidecar detection, immutable cache
- docs/claws/governance/tool-classification.md -- tool name heuristic, override downgrade warning
- docs/claws/governance/elicitation-gate.md -- fuzzy match, ghost policy, platform timeout, audit signing

## Per-Scenario Applied Findings

S01: F01-F05 major, F06-F07,F09 warning -> CL-02 A75-A78, CL-03 PC2, CL-04 PC2, P-132
S02: F01-F05 major, F06-F07,F09 warning -> CL-04 PC2, P-133,P-134
S03: F01-F04,F10 major, F05-F07 warning -> CL-02 A79-A82, CL-04 PC2, P-135
S04: F01-F05 major, F06-F08 warning -> CL-02 A83-A87, CL-03 PC2, CL-04 PC2, P-136,P-137
S05: F01-F04 major, F05-F07,F09 warning -> CL-04 PC2, P-138,P-139
S06: F01-F04 major, F05-F07,F10 warning -> CL-04 PC2, P-140,P-141
S07: F01-F05 major, F06-F08 warning -> CL-02 A122-A126, CL-03 PC2, P-142,P-143
S08: F01-F04 major, F05-F07,F10 warning -> CL-04 PC2, P-144
S09: F01-F03,F05-F06 major, F04,F07-F08,F11 warning -> CL-02 A88-A92, guides, P-145,P-146,P-159
S10: F01-F05 major, F06-F08 warning -> CL-02 A93-A96,A127, P-147,P-148,P-161
S11: F01-F04 major, F05-F07,F10 warning -> CL-02 A97-A100, P-149,P-150
S12: F01-F05 major, F06-F08 warning -> CL-02 A101-A106, P-151
S13: F01-F05 major, F06-F08,F11 warning -> CL-02 A107-A111, P-152,P-153
S14: F01-F05 major, F06-F08 warning -> CL-02 A112-A116, guides, P-154,P-155
S15: F01-F06 major, F07-F09 warning -> CL-02 A117-A122, CL-04 PC2, guides, P-156-P-160
