# Pitfall-Final-2: Findings Applied

**Series**: pitfall-final-2 (26 scenarios, S01-S26)
**Applied**: 2026-04-11
**Scope**: major + warning findings only (notes excluded)

## Summary

| Metric | Count |
|--------|-------|
| Scenarios | 26 |
| Total findings | ~222 |
| Major findings applied | 131 |
| Warning findings applied | 67 |
| Note findings skipped | ~24 |
| **Total applied** | **198** |

## Targets Updated

| File | Section Added | Amendments |
|------|---------------|------------|
| specs/CL-02-security-model.md | Pitfall-Final-2 Amendments (PF2-S01 through PF2-S26) | A162-A291 (130 amendments) |
| specs/CL-03-runtime-enforcement.md | Pitfall-Final-2 Amendments (PF2-S01 through PF2-S26) | 18 inline paragraphs |
| specs/CL-04-compilation-pipeline.md | Pitfall-Final-2 Amendments (PF2-S01 through PF2-S26) | 36 inline paragraphs |
| .craft/plans/claws-rules.md | From pitfall-final-2 scenarios | 83 checklist items + 24 test items |
| .craft/plans/claws-emit.md | From pitfall-final-2 scenarios | 35 checklist items + 18 test items |

## Per-Scenario Breakdown

| Scenario | Pitfall | Specs | Majors | Warnings | CL-02 Amendments |
|----------|---------|-------|--------|----------|-----------------|
| S01 riskMap registration | P-132 | CL-02, CL-03 | 5 | 3 | A162-A167 |
| S02 partial emit | P-133 | CL-04 | 5 | 2 | -- |
| S03 classification mismatch | P-134 | CL-02, CL-04 | 5 | 2 | A168-A172 |
| S04 field mismatch | P-135 | CL-02, CL-04 | 5 | 2 | A173 |
| S05 timeout threading | P-136 | CL-02, CL-04 | 5 | 2 | A174-A177 |
| S06 cache corruption | P-137 | CL-02, CL-03 | 5 | 2 | A178-A183 |
| S07 keyword loss | P-138 | CL-04 | 5 | 2 | -- |
| S08 plugin mutation | P-139 | CL-02, CL-03, CL-04 | 5 | 2 | A184-A189 |
| S09 version compat | P-140/141 | CL-04 | 5 | 3 | -- |
| S10 fail-open audit | P-142 | CL-02, CL-03 | 5 | 2 | A190-A196 |
| S11 unsigned approval | P-143 | CL-02 | 5 | 2 | A197-A203 |
| S12 handler mismatch | P-144 | CL-04 | 5 | 2 | -- |
| S13 behavioral signal | P-145 | CL-02 | 5 | 2 | A204-A210 |
| S14 capability bypass | P-146 | CL-02 | 5 | 2 | A211-A217 |
| S15 data label | P-147/161 | CL-02 | 5 | 3 | A218-A225 |
| S16 PII redaction | P-148 | CL-02, CL-04 | 5 | 2 | A226-A231 |
| S17 delegation cascade | P-149/150 | CL-02 | 5 | 2 | A232-A236 |
| S18 fleet identity | P-151 | CL-02, CL-03 | 5 | 2 | A237-A243 |
| S19 false positive | P-152 | CL-02, CL-03 | 5 | 2 | A244-A249 |
| S20 subrule codes | P-153 | CL-02 | 5 | 2 | A250-A255 |
| S21 bound subrule | P-154 | CL-02 | 5 | 2 | A256-A262 |
| S22 elicitation bypass | P-155 | CL-02 | 5 | 2 | A263-A268 |
| S23 approve-on-timeout | P-156 | CL-02, CL-04 | 5 | 2 | A269-A273 |
| S24 supply chain | P-157/158 | CL-02 | 5 | 2 | A274-A279 |
| S25 absent capabilities | P-159 | CL-02 | 5 | 2 | A280-A286 |
| S26 compound attack | P-160 | CL-02, CL-03 | 5 | 3 | A287-A291 |

## CL-02 Amendment Index (A162-A291)

| Range | Rule Group | Scenario |
|-------|-----------|----------|
| A162-A167 | G-FAILMODE | S01 riskMap registration |
| A168-A172 | G-CLASS | S03 cross-artifact mismatch |
| A173 | G-EXEC-APPROVALS | S04 field mismatch |
| A174-A177 | G-FAILMODE, G-LATENCY | S05 timeout threading |
| A178-A183 | G-IDEMPOTENT, G-FAILMODE, G-LATENCY | S06 cache corruption |
| A184-A189 | G-PLUGIN | S08 plugin mutation |
| A190-A196 | G-AUDIT-SECONDARY | S10 fail-open audit |
| A197-A203 | G-ELICIT-AUDIT | S11 unsigned approval |
| A204-A210 | G-CLASS | S13 behavioral signal |
| A211-A217 | G-PERM | S14 capability bypass |
| A218-A225 | G-DATA, G-A2A-FLOW | S15 data label |
| A226-A231 | G-OUTPUT | S16 PII redaction |
| A232-A236 | G-A2A-TRUST, G-A2A-* | S17 delegation cascade |
| A237-A243 | G-A2A-IDENTITY | S18 fleet identity |
| A244-A249 | G-CONTEXT | S19 false positive |
| A250-A255 | G-CONTEXT, All Rules | S20 subrule codes |
| A256-A262 | G-BOUND | S21 bound subrule |
| A263-A268 | G-ELICIT | S22 elicitation bypass |
| A269-A273 | G-ELICIT-TIMEOUT | S23 approve-on-timeout |
| A274-A279 | G-SUPPLY | S24 supply chain |
| A280-A286 | G-PERM | S25 absent capabilities |
| A287-A291 | G-SUPPLY + G-ELICIT-TIMEOUT | S26 compound attack |
