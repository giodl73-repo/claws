# FINDINGS-APPLIED: spec-constraint-validation Series

**Date**: 2026-04-11
**Scope**: S01-S15, major/warning findings only
**Scenarios**: 15 | **Findings applied**: 124 (72 major, 52 warning) | **Notes skipped**: 15
**Pitfalls added**: P-120 through P-131 (12 new)

## Targets Updated

| Target | Changes |
|--------|---------|
| CL-01 | 6 constraints; FailModeConfig + PerformanceConfig types; OQ#6 resolved |
| CL-02 | 25 constraints (fail-mode precedence, OBO immunity, reclassification, trust ceiling, elicitation normalization) |
| CL-03 | 22 constraint paragraphs (persistent failure, error taxonomy, escalation, timeout ceiling, hook ordering) |
| CL-04 | 30+ constraint paragraphs (atomic emit, cross-artifact consistency, PRESS safety, BOM, post-emit verification) |
| claws-emit.md | 35 SCV findings + 12 test additions |
| claws-parse.md | BOM enriched (multi-encoding); 12 SCV findings + 2 fixtures |
| claws-governance-ir.md | 16 SCV findings (IR type impacts) |
| PITFALLS.md | P-120..P-131; category 18; summaries updated |
| compiler.md guide | BOM multi-encoding + per-file detection |
| fail-mode.md guide | Precedence, global ceiling, migration, strict equality |
| tool-classification.md guide | Reclassification + trust ceiling sections |
| elicitation-gate.md guide | Normalization cross-ref, resolution strength, OBO immunity |

## Per-Scenario Map

### S01: Atomic Emission (9 findings)
F01 major CL-04+emit+P-120: same-filesystem staging | F02 major CL-04+emit+P-121: crash recovery | F03 major CL-04+emit: variable artifact count | F04 warning CL-04: rollback diagnostics | F05 major CL-04+emit: last-known-good | F06 warning CL-04: hash vs atomicity | F07 major CL-04+emit: mixed create/overwrite | F08 warning CL-04+emit: permission check | F10 major CL-04+emit: git visibility

### S02: Cross-Artifact Consistency (8 findings)
F01 major CL-04+emit+P-122: directive-to-risk mapping | F02 major CL-04+emit: field name mapping | F03 major CL-04+emit: classification manifest | F04 warning CL-04+emit: intentional omission | F05 major CL-04+emit: built-in scope | F06 warning CL-04+emit: name normalization | F07 major CL-04+emit: consistency triggers rollback | F08 warning CL-04+emit: override propagation

### S03: OBO-WITHOUT-ELICIT Error (7 findings)
F01 major CL-04+parse+ir+P-123+elicit-guide: breaking change | F02 major CL-02+parse+elicit-guide: three-source check | F03 major CL-02+parse: fleet resolution | F04 warning CL-04+parse+ir: per-tool granularity | F05 warning parse+elicit-guide: actionable remediation | F06 major CL-02+elicit-guide: immune to advisory | F07 warning CL-02+elicit-guide: resolution strength

### S04: R3-R4 Default Fail-Closed (8 findings)
F01 major CL-02+P-124+fail-mode-guide: change documentation | F02 major CL-03: config precedence | F03 major CL-02: strict equality | F04 warning CL-03+P-124: recovery path | F05 major CL-01: schema field | F06 warning CL-02: precedence order | F07 warning CL-03: block reason | F08 warning CL-02: reclassification warning

### S05: Hook Ordering Guarantee (8 findings)
F01 major CL-04+emit+P-125: ordering advisory | F02 major CL-03: hook independence | F03 major CL-04: short-circuit defense | F04 warning CL-04+emit: post-init instruction | F05 major CL-03: hot-reload ordering | F06 warning CL-03: pinch check | F07 warning CL-03: plugin vs internal | F08 major CL-04: fleet enforcement

### S06: Persistent Handler Failure (8 findings)
F01 major CL-03+P-126: per-tool tracking | F02 major CL-03: recovery distinction | F03 major CL-03: health status | F04 warning CL-03: error type in alerts | F05 major CL-03+P-126: detection without sidecar | F06 warning CL-03: failedTools endpoint | F07 major CL-03: correlated failures | F08 warning CL-03: counter reset

### S07: Error Type Escalation (7 findings)
F01 major CL-03+P-127: classification taxonomy | F02 major CL-03: channel routing | F03 major CL-03+P-127: RangeError immunity | F04 warning CL-03: timeout frequency | F05 major CL-03: performance context | F06 warning CL-03: deduplication | F07 warning CL-03: cause chain

### S08: PRESS Safety Keywords (7 findings)
F01 major CL-04+emit+P-128: frozen keywords | F02 major CL-04+emit+P-128: directive-level | F03 major CL-04+emit: keyword count | F04 warning CL-04+emit: case preservation | F05 warning CL-04+emit: across levels | F06 major CL-04: scope boundary | F07 warning CL-04+emit: no metadata

### S09: UTF-8 BOM FORMA Parse (7 findings)
F01 major CL-04+parse: universal stripping | F02 major CL-04+parse+P-129: multi-encoding | F03 major CL-04+parse: false low-confidence | F04 warning CL-04+parse+compiler-guide: positions | F05 warning CL-04+ir: BOM-agnostic hash | F06 warning CL-04+parse: git independence | F07 major CL-04+parse: per-file detection

### S10: Misspelled Tool Elicitation (7 findings)
F01 major CL-02+parse+P-130+elicit-guide: normalization | F02 major CL-02+elicit-guide: fuzzy match | F03 major CL-02+P-130: orphaned R5 escalation | F04 warning CL-02: built-in cross-ref | F05 warning CL-02+elicit-guide: cascading diagnostic | F06 major CL-02: versioned names | F07 warning CL-04: code range W020-W029

### S11: Trust-to-Risk Mapping (7 findings)
F01 major (validated existing): cross-spec consistency | F02 major CL-01+ir+P-131+class-guide: per-target tier | F03 major CL-02+class-guide: built-in exception | F04 warning CL-02+class-guide: override precedence | F05 major CL-01+P-131+class-guide: default message | F06 warning CL-02+ir+class-guide: bidirectional resolution | F07 warning ir: fleet tier

### S12: Global Fail-Mode Override (7 findings)
F01 major CL-02+ir+fail-mode-guide: precedence | F02 major CL-02+fail-mode-guide: availability warning | F03 major CL-03: dynamic audit | F04 warning CL-03: implementation | F05 warning CL-02+fail-mode-guide: R5 ceiling | F06 major CL-02+fail-mode-guide: security warning | F07 warning (CL-05 scope): not applied

### S13: R5 Reclassification (7 findings)
F01 major CL-02+class-guide: cascading effects | F02 major CL-02+class-guide: mandatory reason | F03 major CL-02+class-guide: bidirectional | F04 warning CL-02: pinch report | F05 warning (CL-05 scope): not applied | F06 major CL-02+ir+class-guide: compliance trail | F07 warning CL-02+ir+class-guide: counts

### S14: Post-Emit Static Verification (8 findings)
F01 major CL-04+emit: AST-based | F02 major CL-04+emit: multi-handler | F03 major CL-04+emit: conditional check | F04 major CL-04: TS source scanning | F05 warning CL-04+emit: complexity metrics | F06 warning CL-04+emit: result reporting | F07 major CL-04+emit: rule testing | F08 warning CL-04: dynamic strings

### S15: Configurable Timeout Ceiling (8 findings)
F01 major CL-01+CL-03: ceiling clamping | F02 major CL-04: AbortSignal propagation | F03 major CL-03: per-workflow budget | F04 warning CL-03: performance context | F05 major CL-03: side effect cleanup | F06 warning CL-03: timeout vs crash | F07 warning CL-04+emit: Node fallback | F08 major CL-03: AbortError vs TypeError

## Not Applied (Out of Scope)

S05-F06 (CL-05 pinch check), S05-F08 (CL-05 fleet ordering), S12-F07 (CL-05 fleet fail-mode), S13-F05 (CL-05 fleet reclassification): CL-05 spec not in target list. All note-severity findings: traceability records only.
