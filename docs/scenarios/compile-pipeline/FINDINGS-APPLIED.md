# Findings Applied: compile-pipeline + cross-file-conflicts

**Date**: 2026-04-11
**Scenarios processed**: 15 (8 compile-pipeline, 7 cross-file-conflicts)
**Total findings**: 105
**Major/warning applied**: 81
**Note severity skipped**: 24

---

## Summary of Changes

### Specs Edited

#### CL-04 Compilation Pipeline
- **48 new constraints** added covering: BOM stripping, hash normalization, canonical JSON, skills/ enumeration, parse ordering, implicit data flow derivation, rule applicability tracking, per-file absence diagnostics, confidence vs syntax error, cross-platform line numbers, collect-all-errors, diagnostic codes, markdown-aware extraction, built-in tool detection, hash path exclusion, G-CLASS scaling, per-tool OBO warnings, root node synthesis, phantom-tool delegation, cycle-safe serialization, workflow step naming, parallel branches, tool name normalization, classification injection, semantic deny-tool matching, governance-first resolution, multi-constraint aggregation, halt-reason communication, elicitation as resolution, implicit "all tools" delegation, OBO-WITHOUT-ELICIT severity elevation, multi-source OBO resolution, per-tool OBO reporting, transitive data flow, per-entry data checking, general cycle detection, human review escalation, self-delegation, skill tool extraction, ghost aggregation, deterministic failure = error, transitive schedule resolution, perpetual denial detection, tool alternatives, async audit, first-step gate
- **OBO-WITHOUT-ELICIT** severity changed from Warning to Error
- **Conflict resolution principles** section added
- **3 new open questions** (Q6-Q8)

#### CL-01 CLI Surface & Schema
- **4 new constraints**: trustTier T2 default, claws.json parse errors, trust-to-risk mapping, strict mode
- **1 new open question** (Q6)

#### CL-02 Security Model
- **17 new constraints** covering R1/R2 data context, OBO context, multi-capability max-risk, sandbox status, L0 defaults, absent-file handling, key references, cross-workspace delegation, data flow direction, default ceiling, pre-authorized distinction, conditional standing approval, schedule delegation, cycle vs recursion, processing vs forwarding
- **1 new open question** (Q6)

#### CL-05 Developer Experience
- **4 new constraints**: ungoverned vs compliant, inherited elicitation, cross-workspace cycles, tool removal detection

### PITFALLS.md
- **10 new pitfalls** (P-051 through P-060)
- Summary table updated: 50 -> 60 pitfalls

### Plans Edited
- **claws-governance-ir**: 10 findings, 3 new tests
- **claws-parse**: 28 findings, 7 new test fixtures
- **claws-emit**: 8 findings, 4 new tests
- **claws-rules**: 25 findings, 8 new tests

### Guides Edited
- **docs/claws/architecture/compiler.md**: conflict table, semantic matching details, parsing requirements
- **docs/claws/governance/tool-classification.md**: R1/R2 distinction, multi-capability, context OBO
- **docs/claws/governance/obo-boundary.md**: severity elevation noted
- **docs/claws/governance/elicitation-gate.md**: scheduled task pre-approval
- **docs/claws/getting-started/claws-build.md**: conditional artifact count
- **docs/claws/getting-started/claws-json.md**: trustTier default, tier-to-risk mapping

---

## Findings NOT Applied (note severity, skipped per rules)

24 findings with severity "note" were skipped. Two note-severity findings were promoted to open questions in CL-04:
- CFC-S04-F07 (label distance scaling) -> CL-04 Open Question Q8
- CFC-S06-F02 (SKILL-TOOL-GHOST as lint) -> CL-04 Open Question Q7
