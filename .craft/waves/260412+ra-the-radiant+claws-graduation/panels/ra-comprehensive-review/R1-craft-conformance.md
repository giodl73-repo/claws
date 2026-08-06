# R1 — craft/conformance Review

**Wave**: Ra the Radiant (XCIII)
**Role**: craft/conformance (Cluster C — Spec compliance > implementation speed)
**Reviewer**: conformance
**Date**: 2026-04-16
**Scope**: Full wave — CL-10 spec, 4 plans, 71 pulses, 30 scenarios, 10 checkpoints

---

## Summary

The Ra wave is structurally well-organized: 71 pulse files exist, 10 checkpoints are correctly defined in wave.yaml, all 30 cap-integration scenarios are referenced by at least one pulse, and pitfalls P-270 through P-282 are traced into pulse objectives. Three conformance violations are blocking (plan pulse count mismatch, missing constraint C-1 implementation, PatchError count drift). The remaining findings are high-severity traceability gaps that, if unaddressed, will produce silent spec deviations during implementation.

---

## Findings

### F-01: Plan says 37 pulses, wave has 35 for claws-cap-integration [HIGH]

**Spec**: claws-cap-integration.md frontmatter: `plan: "5 phases, 37 pulses"`
**Actual**: 35 pulse files carry `plan: claws-cap-integration` in their frontmatter.
**Impact**: The plan document is the contract. A 2-pulse discrepancy means either 2 pulses were dropped without updating the plan, or 2 pulses were absorbed into others. Either way the plan frontmatter is stale and any automation reading it will miscount.
**Recommendation**: Audit which 2 of the plan's 37 described pulses are missing from the wave materialization. Update the plan frontmatter to match reality (35 pulses) or create the 2 missing pulse files.

### F-02: TUI plan says 15 pulses, wave has 16 [MEDIUM]

**Spec**: claws-tui.md: "Pulse Breakdown (15 pulses)"
**Actual**: 16 pulse files carry `plan: claws-tui` (pulses 45-59 + 62).
**Impact**: Pulse 62 (tui-sessions) was added for CP-9 sessions TUI screen but the plan document was never updated. Plan-pulse count drift.
**Recommendation**: Update claws-tui.md to say 16 pulses and add the tui-sessions pulse to the plan's scope table.

### F-03: PatchError count mismatch — plan says 8, spec defines 9, pulse says 9 [HIGH]

**Spec**: CL-10 line 887 defines `type PatchError` with exactly 9 union members: `R5_NON_NEGOTIABLE`, `FLEET_LOCK_VIOLATION`, `R5_EXCLUDED_FROM_ALLOW_ALL`, `GOVERNANCE_VIOLATION`, `INVALID_STRUCTURE`, `COMPILATION_FAILED`, `TRUST_REQUIRES_APPROVAL`, `AUTHORIZATION_REQUIRED`, `VERSION_CONFLICT`.
**Plan**: H2 says "Typed PatchError responses (8 error codes)".
**Pulse 34**: Says "all 9 PatchError types tested E2E" (correct).
**Impact**: The plan headline undercounts by one. `VERSION_CONFLICT` was added with the versioning extension (pulse 69) but H2 was never updated. If an implementer reads only the plan (not the spec), they will produce 8 error codes and miss `VERSION_CONFLICT`.
**Recommendation**: Update H2 in claws-cap-integration.md to say "9 error codes" to match the spec.

### F-04: Constraint C-1 (unattended session approval policy) has zero pulse coverage [BLOCKING]

**Spec**: CL-10 line 518: "Unattended session approval policy (C-1): Cron and agent sessions run without a human present. If a gated tool (R3+) triggers `requiresExternalApproval: true` in an unattended session, the timeout `failMode` is forced to `'deny'` regardless of configuration."
**Pulses**: Zero references to "C-1", "unattended", or "failMode" across all 71 pulse files.
**Impact**: This is a security-critical constraint that ensures R3+ tool calls in automated sessions fail closed when no human is present to approve. Without pulse coverage, it will be silently omitted during implementation. The constraint is specifically defined as extending R5 protection to R3-R4 in unattended contexts — this is a governance invariant, not a nice-to-have.
**Recommendation**: Add C-1 enforcement to pulse 65 (session-config-edit) or create a dedicated pulse. The acceptance criteria must verify that cron and agent sessions force `failMode: 'deny'` for R3+ gated tools regardless of configured failMode.

### F-05: oc:// path not used in write-path pulse error responses [HIGH]

**Spec**: CL-10 line 1361: "PatchError messages: `R5_NON_NEGOTIABLE at oc://TOOLS.md#Tools/send-email`". All errors, warnings, and audit events must use `oc://` syntax per the spec's cross-cutting requirement.
**Pulses**: The write-path pulses (29, 30, 31, 34) contain zero references to `oc://`. The validation layer (pulse 30) uses generic `field` and `path` references but never specifies that error messages must use `oc://` path syntax. The oc-path-syntax pulse (66) is in CP-5 (read path) but is not listed as a dependency for any CP-6 write-path pulse.
**Impact**: Write-path error responses will use ad-hoc field identifiers instead of the canonical `oc://` path syntax. Partners consuming PatchError responses will get inconsistent path formats between Layer 1 (which uses `oc://`) and Layer 2 (which does not mandate it).
**Recommendation**: Add pulse 66 (oc-path-syntax) as a dependency for pulses 30 (validation-layer) and 34 (patch-errors-e2e). Add acceptance criteria to pulse 30 requiring all PatchError `field` values to use `oc://` syntax.

### F-06: CP-5 gate pulse is SSE (pulse 28), not a comprehensive gate [MEDIUM]

**Spec**: wave.yaml CP-5 description: "Serve Read APIs — Chunks + Schema + Path Syntax"
**Actual**: Pulse 28 (SSE events) is the CP-5 gate (`checkpoint_gate: true`). SSE is one feature, not a comprehensive read API gate. It has only L3_accept: 1 and L0: 4, L1: 2, L2: 1. By contrast, CP-6 gate (pulse 34) and CP-8 gate (pulse 44) are true comprehensive gates with broad acceptance coverage.
**Impact**: CP-5 can pass with SSE working but chunks broken. The 8 other CP-5 pulses (workspace parser, chunk assembler, oc-path syntax, workspace schema, 4 chunk route pulses) have no gate validation that their integration works end-to-end.
**Recommendation**: Either promote pulse 28 to a proper multi-endpoint gate (add L3 acceptance tests covering all chunk GETs and Layer 1 GET), or add a separate CP-5 gate pulse analogous to pulse 44 for CP-8.

### F-07: 10 gate pulses identified but CP-3, CP-4, CP-7 gates have no L3 coverage gap [LOW]

**Gate pulse inventory**: 6 (CP-1), 12 (CP-2), 18 (CP-3), 20 (CP-4), 28 (CP-5), 34 (CP-6), 39 (CP-7), 44 (CP-8), 55 (CP-9), 59 (CP-10). All 10 checkpoints have exactly one gate pulse. All 10 gate pulses have L3 >= 1.
**Verification**: The requirement "all 10 gate pulses have L3 >= 1" is satisfied. L3 counts: CP-1 gate (1), CP-2 gate (2), CP-3 gate (1), CP-4 gate (2), CP-5 gate (1), CP-6 gate (3), CP-7 gate (2), CP-8 gate (5), CP-9 gate (1), CP-10 gate (1).
**Status**: PASS. No action needed.

### F-08: 11 pulses have L1 = 0, below the L1 >= 1 requirement [BLOCKING]

**Requirement**: "Do all 71 pulses have L0 >= 2 AND L1 >= 1?"
**Findings**: Pulse 12 (compile-pipeline-e2e) has `L1_integration: 0`. Pulse 44 (cap-e2e-gate) has `L1_integration: 0`. Both are gate pulses that focus on E2E/acceptance. However, the stated requirement is L1 >= 1 for ALL 71 pulses.
**Full inventory of L0/L1 compliance**:

- All 71 pulses have L0 >= 2. PASS.
- Pulse 12: L0=2, L1=0, L2=4, L3=2. **FAIL on L1 >= 1.**
- Pulse 44: L0=2, L1=0, L2=6, L3=5. **FAIL on L1 >= 1.**
  **Impact**: These are E2E gate pulses that test integration at a higher level (L2/L3), so the missing L1 tests may be intentional (integration is covered at L2). But the formal requirement says L1 >= 1 for all.
  **Recommendation**: Either add 1 L1 integration test to each of pulses 12 and 44, or formally amend the testing requirement to exempt gate pulses that have L2 >= 4.

### F-09: 13 pitfalls (P-270 through P-282) mostly covered, but P-270 only in 1 pulse [MEDIUM]

**Spec**: CL-10 defines P-270 through P-282 inline. These are operational pitfalls that must be addressed.
**Pitfall coverage across pulses**:

- P-270 (unclassified tools default R5): pulse 25 only
- P-271 (atomic workspace snapshot): pulses 22, 23 (3 references)
- P-272 (fleet fail-closed): pulses 30, 42, 44 (5 references)
- P-273 (compilation queue): pulse 32 (2 references)
- P-274 (startup health check): pulse 34 (3 references)
- P-275 (SSE current-state-only): pulse 28 (2 references)
- P-276 (deny rule GovernanceIR): pulse 30 (3 references)
- P-277 (deny rule provenance): pulse 30 (3 references)
- P-278 (timezone requirement): pulse 37 (2 references)
- P-279 (JWT verification): pulse 39 (1 reference)
- P-280 (work queue persistence): pulse 38 (2 references)
- P-281 (audit cursor pagination): pulses 41, 44 (2 references)
- P-282 (default deny rules immutable): pulse 33 (3 references)
  **Note**: P-270 and P-279 each appear in only 1 pulse with no cross-validation in a gate pulse. P-270 (unclassified-tools-default-R5) is a security invariant that should be validated in the CP-5 or CP-6 gate.
  **Recommendation**: Add P-270 verification to pulse 28 (CP-5 gate) or pulse 34 (CP-6 gate) acceptance criteria.

### F-10: Spec CL-11 and CL-12 coverage is limited to 2 pulses [MEDIUM]

**Spec**: The plan frontmatter declares `specs: [CL-10, CL-11, CL-12]`.
**Actual**: CL-11 (upstream governance) is referenced only in pulse 60 (session-types, 1 field update). CL-12 (approval event schema) is referenced only in pulse 63 (approval-session-context, schema amendment) and indirectly via `RiskClassification` type import in pulse 25.
**Impact**: The plan claims to cover 3 specs, but CL-11 and CL-12 coverage is limited to 2 amendments (adding session fields). If CL-11/CL-12 have other requirements beyond session context, they are unaddressed. The plan should either reduce its spec claim to CL-10 only, or enumerate which CL-11 and CL-12 requirements are in scope.
**Recommendation**: Audit CL-11 and CL-12 for requirements beyond the session-context amendments. If the plan only amends those specs (not implements them), change frontmatter to `specs: [CL-10]` with `amends: [CL-11, CL-12]`.

### F-11: Scenario naming mismatch — pulse S-codes inconsistently prefixed [LOW]

**Observation**: Some pulses use bare S-codes (`S01`, `S12`), others use qualified paths (`cap-integration/S07`, `cap-integration/S19`). Still others reference scenarios from different series (`governance/S01`, `workspace/S01`, `forma/S01`).
**Impact**: Bare `S01` in pulse 25 matches scenario `cap-integration/S01-oc-path-resolution`, but bare `S01` in pulse 59 could be ambiguous since S01 exists in multiple scenario series. Automated scenario-to-pulse traceability tools will produce false matches or misses.
**Recommendation**: Standardize all scenario_codes in cap-integration pulse frontmatters to use the `cap-integration/` prefix. Non-cap-integration pulses (1-20) correctly use their own series prefixes.

### F-12: workspace-edit EDITABLE_FILES allowlist contradicts spec write-path architecture [HIGH]

**Spec**: CL-10 line 1736 shows ALL 6 write endpoints (chunk PATCH, Loop soul, Loop memory, trust escalate, onboard, skills install) routing through the same validation layer to the same workspace-edit module.
**Pulse 29**: Says "EDITABLE_FILES allowlist restricts which OC files can be modified... (TOOLS.md, SETTINGS.md, CONNECTIONS.md -- never SOUL.md or MEMORY.md through this module)."
**Spec**: CL-10 lines 1737-1738 explicitly show `PATCH /api/loop/soul` and `PATCH /api/loop/memory` routing through the write path, which writes SOUL.md and MEMORY.md.
**Impact**: If pulse 29 implements the EDITABLE_FILES allowlist as stated, pulses 35-36 (Loop soul/memory sync) will be blocked from writing SOUL.md and MEMORY.md. The spec requires these files to be editable through the Loop sync path.
**Recommendation**: Revise pulse 29 to distinguish between the chunk write path (which should NOT allow SOUL.md/MEMORY.md direct edits) and the Loop sync path (which MUST allow SOUL.md/MEMORY.md edits). The EDITABLE_FILES list should be path-dependent, not a flat allowlist.

---

## Verification Matrix

| Check                               | Result                                                          |
| ----------------------------------- | --------------------------------------------------------------- |
| All 71 pulses have L0 >= 2          | **PASS** — minimum L0 is 2 (pulses 12, 19, 20, 44, 55)          |
| All 71 pulses have L1 >= 1          | **FAIL** — pulses 12 and 44 have L1 = 0 (F-08)                  |
| All 10 gate pulses have L3 >= 1     | **PASS** — all 10 gates have L3 >= 1 (F-07)                     |
| All 30 scenarios referenced         | **PASS** — all S01-S30 appear in at least 1 pulse               |
| Plan pulse count matches wave       | **FAIL** — cap-integration 37 vs 35 (F-01), tui 15 vs 16 (F-02) |
| Specs CL-10, CL-11, CL-12 covered   | **PARTIAL** — CL-10 comprehensive, CL-11/CL-12 minimal (F-10)   |
| 13 pitfalls (P-270-P-282) in pulses | **PASS** — all 13 present, 2 have thin coverage (F-09)          |
| oc:// path in write-path errors     | **FAIL** — not referenced in any write-path pulse (F-05)        |

---

## Disposition

**3 BLOCKING findings** (F-04, F-08, F-12) must be resolved before implementation begins.
**4 HIGH findings** (F-01, F-03, F-05, F-12) require plan or pulse amendments.
**3 MEDIUM findings** (F-02, F-06, F-09, F-10) should be addressed before CP-5.
**2 LOW findings** (F-07, F-11) are informational.

Total findings: 12. Blocking: 3. Recommended action: amend plans and pulses before first implementation checkpoint.
