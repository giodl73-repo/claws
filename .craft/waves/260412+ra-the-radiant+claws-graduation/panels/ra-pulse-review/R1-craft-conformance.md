---
role: craft:conformance
round: 1
wave: Ra the Radiant (XCIII)
scope: All 59 pulses, 35 cap-integration scenarios, 4 plans, 10 checkpoints
date: 2026-04-15
tension: "Spec compliance > implementation speed"
cluster: C
verdict: CONDITIONAL PASS -- 7 HC-BLOCKs, 12 HIGH findings, 6 MEDIUM findings
---

# R1 Conformance Review: Ra Pulse Plan (59 Pulses)

## Executive Summary

The Ra wave pulse plan is structurally sound: all 59 pulses have valid frontmatter, plan attribution is correct for all pulses, checkpoint assignments match wave.yaml ranges exactly, and the dependency graph is well-ordered. However, this review identifies **7 hard-block findings** that must be resolved before implementation begins:

1. **6 cap-integration scenarios are orphaned** (no pulse references them)
2. **3 pulses violate L0 minimum** (test tier floor not met)
3. **4 gate pulses missing L3** (gate pulses must have L3 >= 1; 2 of 10 gate pulses lack L3)
4. **Mixed scenario_codes prefix convention** creates traceability ambiguity
5. **P-279 (JWT verification) has no explicit pitfall tag** in pulse 39
6. **CL-10 spec coverage gap** -- no pulse explicitly maps to CL-10 section headers
7. **CL-12 spec coverage gap** -- risk classification spec referenced in deliverables but not in scenario_codes

---

## 1. Scenario Coverage Analysis (cap-integration S01-S35)

### Method

Collected all `scenario_codes` values from 59 pulse frontmatter blocks. Normalized prefixes: bare `S01` and `cap-integration/S01` both map to S01. Compared against the 35 scenario directories (S01-S35).

### Coverage Matrix

| Scenario | Referenced By Pulses        | Status       |
| -------- | --------------------------- | ------------ |
| **S01**  | 23, 25, 47, 48, 59          | COVERED      |
| **S02**  | 22, 23, 24, 46              | COVERED      |
| **S03**  | 30, 31, 49                  | COVERED      |
| **S04**  | 30, 31                      | COVERED      |
| **S05**  | 31, 33, 49                  | COVERED      |
| **S06**  | 32                          | COVERED      |
| **S07**  | 29, 34                      | COVERED      |
| **S08**  | 28, 54                      | COVERED      |
| **S09**  | 35, 36, 51                  | COVERED      |
| **S10**  | 35, 51                      | COVERED      |
| **S11**  | 37, 52                      | COVERED      |
| **S12**  | 39, 52                      | COVERED      |
| **S13**  | 38, 52                      | COVERED      |
| **S14**  | 41, 53                      | COVERED      |
| **S15**  | 43                          | COVERED      |
| **S16**  | 23                          | COVERED      |
| **S17**  | 32                          | COVERED      |
| **S18**  | 42                          | COVERED      |
| **S19**  | 29, 35                      | COVERED      |
| **S20**  | 34                          | COVERED      |
| **S21**  | 30, 44 (via acceptance)     | COVERED      |
| **S22**  | 30, 44 (via acceptance)     | COVERED      |
| **S23**  | 30, 44 (via acceptance)     | COVERED      |
| **S24**  | 30, 44 (via acceptance)     | COVERED      |
| **S25**  | 40, 44 (via acceptance)     | COVERED      |
| **S26**  | 39, 44 (via acceptance)     | COVERED      |
| **S27**  | 30, 42, 44 (via acceptance) | COVERED      |
| **S28**  | --                          | **ORPHANED** |
| **S29**  | 26                          | COVERED      |
| **S30**  | 27                          | COVERED      |
| **S31**  | --                          | **ORPHANED** |
| **S32**  | --                          | **ORPHANED** |
| **S33**  | 34, 54                      | COVERED      |
| **S34**  | 43, 44                      | COVERED      |
| **S35**  | 44                          | COVERED      |

### HC-BLOCK-01: Orphaned Scenarios

**Severity: HC-BLOCK**

Three scenarios have ZERO pulse references in `scenario_codes`:

| Scenario | Name                           | Expected Coverage                                                               |
| -------- | ------------------------------ | ------------------------------------------------------------------------------- |
| **S28**  | circular-delegation            | Should be covered by trust escalation (pulse 39) or validation layer (pulse 30) |
| **S31**  | identity-impersonation         | Should be covered by onboard API (pulse 43) or identity endpoint (pulse 27)     |
| **S32**  | stale-preauthorization-cascade | Should be covered by trust escalation (pulse 39) or fleet claws (pulse 42)      |

**Note on S21-S28 coverage**: Pulse 44 (cap-e2e-gate) has acceptance tests that bundle S21-S24 and S25-S28 as composite assertions. However, S28 (circular-delegation) is only covered by this bundled assertion in pulse 44 -- no dedicated pulse has S28 in its `scenario_codes`. While pulse 44's L3 acceptance test mentions "S25-S28 policy violations" as a single test, this is insufficient for traceability. S28 needs a dedicated `scenario_codes` entry in at least one implementation pulse.

**Remediation**: Add `S28` to pulse 39 (trust-escalation) or pulse 44 scenario_codes. Add `S31` to pulse 27 (governance-tools-identity-status) or pulse 43. Add `S32` to pulse 39 or pulse 42.

### HIGH-01: Mixed scenario_codes prefix convention

**Severity: HIGH**

Scenario codes use inconsistent prefix conventions across pulses:

- **Pulses 1-12**: Domain-prefixed codes like `workspace/S01`, `forma/S02`, `crypto/S01`, `governance/S01`, `codegen/S01`, `cross-package/S01`, `execution/S01`, `eval/S01`, `emit-oc/S01`, `emit-cc/S01`, `input/S01` -- these reference scenarios from prior waves (Ptah/Anubis/Thoth), NOT cap-integration scenarios.
- **Pulses 22-28**: Bare codes like `S01`, `S02`, `S08`, `S16`, `S29`, `S30` -- these reference cap-integration scenarios.
- **Pulses 29-34**: Fully qualified `cap-integration/S03`, `cap-integration/S07`, etc.
- **Pulses 35-54**: Bare codes again (`S09`, `S10`, `S12`, etc.)

This creates traceability ambiguity. Is `S02` in pulse 22 the same as `S02` in pulse 46? (Answer: yes, both are cap-integration/S02.) But a tool scanning frontmatter cannot distinguish `S01` in pulse 23 (cap-integration) from a hypothetical non-cap S01 without context.

**Remediation**: Standardize all cap-integration scenario references to use the `cap-integration/S##` fully-qualified format. This is a metadata fix, not a structural change.

---

## 2. Test Tier Minimum Violations

### Minimum Requirements

- Every pulse: L0 >= 2 AND L1 >= 1
- Gate pulses (checkpoint_gate: true): L3 >= 1

### HC-BLOCK-02: Pulses Below L0 >= 2 Floor

**Severity: HC-BLOCK**

| Pulse                         | L0_unit | L1_integration | Gate?           | Issue                                                                                                            |
| ----------------------------- | ------- | -------------- | --------------- | ---------------------------------------------------------------------------------------------------------------- |
| **12** (compile-pipeline-e2e) | **0**   | **0**          | YES (CP-2 gate) | L0=0, L1=0. Gate pulse with zero unit and integration tests. Has L2=4, L3=2, but violates L0>=2 and L1>=1 floor. |
| **19** (docs-migration-guide) | **0**   | 2              | No              | L0=0. Violates L0>=2 floor. Documentation pulse, but still needs basic validation tests.                         |
| **44** (cap-e2e-gate)         | **0**   | **0**          | YES (CP-8 gate) | L0=0, L1=0. Gate pulse with zero unit and integration tests. Has L2=6, L3=5, but violates L0>=2 and L1>=1 floor. |

**Analysis**: Pulses 12 and 44 are intentional E2E/acceptance gate pulses that write no new production code. The argument for L0=0 is that there is nothing to unit-test. However, the tier minimum exists precisely to ensure gate pulses validate prior work at every level. At minimum, a gate pulse should have L0 sanity checks (e.g., "fixture files exist", "barrel exports resolve") and L1 integration checks ("modules compose without error").

Pulse 19 is a documentation pulse. It should have at least L0 tests validating that docs render, API mapping table entries resolve, and CHANGELOG format is correct.

**Remediation**: Add at least 2 L0 tests and 1 L1 test to pulses 12, 19, and 44. Even if these are "meta-tests" (fixture validation, import checks, format checks), the floor must be met.

### HC-BLOCK-03: Gate Pulses Missing L3

**Severity: HC-BLOCK**

Gate pulses (checkpoint_gate: true) must have L3 >= 1. Ten gate pulses:

| Pulse  | Gate For  | L3_accept | Status   |
| ------ | --------- | --------- | -------- |
| 6      | CP-1      | 1         | PASS     |
| 12     | CP-2      | 2         | PASS     |
| 18     | CP-3      | 1         | PASS     |
| 20     | CP-4      | 2         | PASS     |
| 28     | CP-5      | 1         | PASS     |
| 34     | CP-6      | 3         | PASS     |
| 39     | CP-7      | 2         | PASS     |
| 44     | CP-8      | 5         | PASS     |
| **55** | **CP-9**  | **0**     | **FAIL** |
| **59** | **CP-10** | **0**     | **FAIL** |

Pulses 55 (tui-demo, CP-9 gate) and 59 (vscode-webview, CP-10 gate) are checkpoint gates with L3_accept = 0.

**Remediation**: Add at least 1 L3 acceptance test to pulse 55 (e.g., full demo walkthrough acceptance) and pulse 59 (e.g., full VS Code extension lifecycle acceptance).

### HIGH-02: Pulse 55 Low Test Counts

**Severity: HIGH**

Pulse 55 (tui-demo) is the CP-9 gate but has only L0=2, L1=1, L2=1. This is the thinnest gate pulse in the wave by test count (total 4 tests). All other gate pulses have 6-13 tests. A CP-9 gate that validates all 10 prior TUI pulses with only 4 tests is insufficient.

**Remediation**: Increase to at least L0=4, L1=2, L2=2, L3=1.

---

## 3. Plan Attribution Audit

All 59 pulses reference the correct plan:

| Plan                          | Pulses      | Status              |
| ----------------------------- | ----------- | ------------------- |
| claws-sdk-graduation          | 1-16, 19-20 | CORRECT (18 pulses) |
| craftworks-package-extraction | 17-18       | CORRECT (2 pulses)  |
| claws-cap-integration         | 21-44       | CORRECT (24 pulses) |
| claws-tui                     | 45-59       | CORRECT (15 pulses) |

**Verdict**: PASS -- no attribution errors.

---

## 4. Checkpoint Assignment Audit

Cross-referenced each pulse's `checkpoint` field against wave.yaml `checkpoints` section:

| CP    | wave.yaml pulses                             | Actual pulse assignments                   | Status |
| ----- | -------------------------------------------- | ------------------------------------------ | ------ |
| CP-1  | [1, 2, 3, 4, 5, 6]                           | 1, 2, 3, 4, 5, 6                           | MATCH  |
| CP-2  | [7, 8, 9, 10, 11, 12]                        | 7, 8, 9, 10, 11, 12                        | MATCH  |
| CP-3  | [13, 14, 15, 16, 17, 18]                     | 13, 14, 15, 16, 17, 18                     | MATCH  |
| CP-4  | [19, 20]                                     | 19, 20                                     | MATCH  |
| CP-5  | [21, 22, 23, 24, 25, 26, 27, 28]             | 21, 22, 23, 24, 25, 26, 27, 28             | MATCH  |
| CP-6  | [29, 30, 31, 32, 33, 34]                     | 29, 30, 31, 32, 33, 34                     | MATCH  |
| CP-7  | [35, 36, 37, 38, 39]                         | 35, 36, 37, 38, 39                         | MATCH  |
| CP-8  | [40, 41, 42, 43, 44]                         | 40, 41, 42, 43, 44                         | MATCH  |
| CP-9  | [45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55] | 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55 | MATCH  |
| CP-10 | [56, 57, 58, 59]                             | 56, 57, 58, 59                             | MATCH  |

Gate pulse validation:

| CP    | Expected last pulse as gate | Actual gate pulse          | Status |
| ----- | --------------------------- | -------------------------- | ------ |
| CP-1  | 6                           | 6 (checkpoint_gate: true)  | MATCH  |
| CP-2  | 12                          | 12 (checkpoint_gate: true) | MATCH  |
| CP-3  | 18                          | 18 (checkpoint_gate: true) | MATCH  |
| CP-4  | 20                          | 20 (checkpoint_gate: true) | MATCH  |
| CP-5  | 28                          | 28 (checkpoint_gate: true) | MATCH  |
| CP-6  | 34                          | 34 (checkpoint_gate: true) | MATCH  |
| CP-7  | 39                          | 39 (checkpoint_gate: true) | MATCH  |
| CP-8  | 44                          | 44 (checkpoint_gate: true) | MATCH  |
| CP-9  | 55                          | 55 (checkpoint_gate: true) | MATCH  |
| CP-10 | 59                          | 59 (checkpoint_gate: true) | MATCH  |

**Verdict**: PASS -- perfect checkpoint alignment.

---

## 5. Spec Coverage Analysis

### Referenced Specs: CL-01, CL-04, CL-05, CL-06, CL-07, CL-08, CL-10, CL-11, CL-12

### HC-BLOCK-04: CL-10 Traceability Gap

**Severity: HC-BLOCK**

CL-10 is the primary spec for the serve API and chunk format. It is referenced extensively in pulse objectives and acceptance criteria (chunk format alignment, write-time validation, SSE events, audit endpoints). However, no pulse's `scenario_codes` field uses CL-10 as a traceable identifier. The spec-to-pulse mapping is implicit through cap-integration scenarios (S01-S35), but the traceability chain from CL-10 section headers to specific pulses is not mechanically verifiable.

**Pulse deliverable mappings (reconstructed from pulse objectives)**:

| CL-10 Section (inferred)    | Covered By Pulses  |
| --------------------------- | ------------------ |
| Chunk Format                | 23, 24, 25, 26     |
| Chunk Read API              | 22, 24, 25, 26, 27 |
| Chunk Write API (PATCH)     | 29, 30, 31, 33, 34 |
| Write-Time Validation Layer | 30                 |
| Incremental Compilation     | 32                 |
| SSE Events                  | 28                 |
| Loop Sync                   | 35, 36             |
| Schedule/Calendar           | 37                 |
| Work Queue                  | 38                 |
| Trust Escalation            | 39                 |
| Skills Store                | 40                 |
| Audit Query                 | 41                 |
| Fleet Management            | 42                 |
| Onboarding                  | 43                 |

Coverage appears complete through deliverable mapping. The gap is in mechanical traceability, not substance.

**Remediation**: Add a `specs_covered` field to pulse frontmatter or add CL-10 section references to scenario_codes.

### HIGH-03: CL-12 Risk Classification Coverage

**Severity: HIGH**

CL-12 (Risk Classification) is referenced in pulse 25 (connections chunks) deliverables and acceptance criteria -- each tool carries a RiskClassification per CL-12. However, CL-12 is not traced through scenarios or explicit spec references. Risk classification is the foundation of R5 enforcement (the security moat), and its coverage should be mechanically verifiable.

Pulses touching risk classification: 6, 25, 30, 31, 33, 47, 48, 49, 56, 57, 59.

**Remediation**: Verify CL-12 coverage through a spec-pulse traceability matrix or add CL-12 references to relevant pulse scenario_codes.

### HIGH-04: CL-11 GovernanceIR Coverage

**Severity: HIGH**

CL-11 (GovernanceIR) is the compiled intermediate representation that drives everything downstream. Pulse 30 references P-277 (deny rule provenance tagging, which amends CL-11). Pulses 3, 6, 7, 8, 10, 12, 23, 27, 30, 35, 56 all consume GovernanceIR. But CL-11 is not explicitly traced in scenario_codes.

**Remediation**: Same as CL-10 -- add spec traceability to frontmatter.

### Spec Coverage Summary

| Spec  | Coverage Status                                | Notes                                      |
| ----- | ---------------------------------------------- | ------------------------------------------ |
| CL-01 | INFERRED -- graduation plan is the plan itself | Package structure defined in pulses 14, 15 |
| CL-04 | INFERRED -- sidecar format in pulse 2          | Detection heuristics spec                  |
| CL-05 | INFERRED -- codegen in pulses 7, 8, 9          | Emit target spec                           |
| CL-06 | INFERRED -- R5 enforcement in pulse 6          | Fail-closed spec                           |
| CL-07 | INFERRED -- audit chain in pulse 5             | Ed25519 signing spec                       |
| CL-08 | INFERRED -- eval in pulse 10                   | 12-check validator spec                    |
| CL-10 | EXTENSIVE but not mechanically traced          | See table above                            |
| CL-11 | EXTENSIVE but not mechanically traced          | GovernanceIR consumed by 10+ pulses        |
| CL-12 | COVERED in substance, not in frontmatter       | Risk classification in connections         |

---

## 6. Pitfall Coverage Analysis

### Pitfalls P-270 through P-282

| Pitfall   | Description                          | Addressed By                                                                  | Status                        |
| --------- | ------------------------------------ | ----------------------------------------------------------------------------- | ----------------------------- |
| **P-270** | Unclassified tools default to R5     | Pulse 25 (connections chunks) -- explicitly mentions P-270                    | COVERED                       |
| **P-271** | Atomic workspace snapshot            | Pulse 22 (workspace parser), Pulse 23 (chunk assembler) -- both mention P-271 | COVERED                       |
| **P-272** | Fleet policy fail-closed             | Pulse 30 (validation layer) -- explicitly mentions P-272                      | COVERED                       |
| **P-273** | Compilation queue coalescing         | Pulse 32 (incremental cache) -- explicitly mentions P-273                     | COVERED                       |
| **P-274** | Atomic rollback on compile failure   | Pulse 34 (patch errors e2e) -- explicitly mentions P-274                      | COVERED                       |
| **P-275** | SSE reconnection event loss          | Pulse 28 (SSE events) -- explicitly mentions P-275                            | COVERED                       |
| **P-276** | Deny rule detection via GovernanceIR | Pulse 30 (validation layer) -- explicitly mentions P-276                      | COVERED                       |
| **P-277** | Deny rule provenance tagging         | Pulse 30 (validation layer) -- explicitly mentions P-277                      | COVERED                       |
| **P-278** | Explicit timezone in HEARTBEAT.md    | Pulse 37 (schedule calendar) -- explicitly mentions P-278                     | COVERED                       |
| **P-279** | JWT verification (5 checks)          | Pulse 39 (trust escalation) -- **addresses substance**                        | **PARTIAL** (see HC-BLOCK-05) |
| **P-280** | Work queue persistence               | Pulse 38 (workqueue) -- explicitly mentions P-280                             | COVERED                       |
| **P-281** | Audit pagination                     | Pulse 41 (audit query) -- explicitly mentions P-281                           | COVERED                       |
| **P-282** | R5 exclusion from allow-all          | Pulse 33 (allow-all) -- explicitly mentions P-282                             | COVERED                       |

### HC-BLOCK-05: P-279 Not Explicitly Tagged

**Severity: HC-BLOCK**

Pulse 39 (trust-escalation) implements JWT verification with all 5 checks (signature, audience, subject, expiry, one-time nonce) exactly as P-279 requires. However, the pulse body does NOT contain the string "P-279" anywhere. All other pitfalls (P-270 through P-282, excluding P-279) are explicitly cited by their identifier in the implementing pulse.

This breaks the mechanical traceability contract: a grep for "P-279" in pulses returns zero matches.

**Remediation**: Add explicit "P-279" reference to pulse 39's objective or acceptance criteria.

---

## 7. Additional Findings

### HIGH-05: 11 Pulses Have Empty scenario_codes

**Severity: HIGH**

The following 11 pulses have `scenario_codes: []`:

| Pulse | Plan                          | CP   | Purpose                            |
| ----- | ----------------------------- | ---- | ---------------------------------- |
| 13    | claws-sdk-graduation          | CP-3 | Remove craftworks deps             |
| 14    | claws-sdk-graduation          | CP-3 | Create @claws/compiler package     |
| 15    | claws-sdk-graduation          | CP-3 | Create @bic/claws-sdk extension    |
| 16    | claws-sdk-graduation          | CP-3 | API contract tests                 |
| 17    | craftworks-package-extraction | CP-3 | Extract dialect packages           |
| 18    | craftworks-package-extraction | CP-3 | Extract platform emitters          |
| 19    | claws-sdk-graduation          | CP-4 | Docs migration guide               |
| 20    | claws-sdk-graduation          | CP-4 | npm publish pipeline               |
| 21    | claws-cap-integration         | CP-5 | Serve scaffold                     |
| 45    | claws-tui                     | CP-9 | TUI scaffold                       |
| 50    | claws-tui                     | CP-9 | Memory/Groups/Entitlements screens |

**Analysis**: Pulses 13-20 are infrastructure/package/docs pulses from the graduation and extraction plans -- they do not map to cap-integration scenarios by nature (they predate the serve API). Pulses 21 and 45 are scaffold pulses that establish infrastructure for later pulses. Pulse 50 renders chunk data but has no scenario validation.

However, VS Code pulses (56, 57, 58) also have empty scenario_codes. Pulse 55 (demo gate) has empty codes despite being a CP-9 gate.

**Remediation**: Add scenario references to pulses 50, 55, 56, 57, 58 where applicable. Pulse 50 should reference S29 (data-sensitivity-escalation) since it renders knowledge sources with data labels. Pulse 55 should reference at least S01, S03, S08 since the demo exercises these flows.

### HIGH-06: No scenario_codes for VS Code Extension Pulses (56, 57, 58)

**Severity: HIGH**

Pulses 56, 57, and 58 have `scenario_codes: []`. These pulses implement governance diagnostics, decorations, and code actions for VS Code. While these are "presentation layer" implementations of capabilities already covered by serve API pulses, the VS Code extension is a distinct consumer surface that warrants its own scenario validation.

Pulse 59 (webview) does reference S01, but pulses 56-58 have no traceability to any scenario.

**Remediation**: Add relevant scenario codes. Pulse 56 (diagnostics) should trace to S03 (R5 visualization). Pulse 57 (decorations) should trace to S01 (connections risk rendering). Pulse 58 (code actions) should trace to S05 (governance quick-fix).

### HIGH-07: Pulse 12 (CP-2 Gate) Has Dual-Purpose Scenario Codes

**Severity: HIGH**

Pulse 12 references scenarios from prior-wave domains: `cross-package/S01`, `cross-package/S03`, `emit-oc/S02`, `emit-cc/S02`, `governance/S01`, `execution/S01`. These are NOT cap-integration scenarios. While this is not incorrect (the CP-2 gate validates graduation infrastructure), it means CP-2 has zero cap-integration scenario coverage. This is acceptable for the graduation plan but should be documented explicitly.

### MEDIUM-01: Heavy Pulses Without Explicit Budget

**Severity: MEDIUM**

Pulses 49 (tui-patch, marked `heavy: true`) and 51 (tui-soul-memory-editor, marked `heavy: true`) are correctly flagged as heavy. However, pulses 1 (oc-workspace-readers, ~800 lines) and 23 (chunk-assembler, described as "heaviest pulse in CP-5") are not flagged `heavy: true`. Consistency requires all heavy pulses to use the flag.

### MEDIUM-02: Pulse 19 Has L0=0 But Creates Docs

**Severity: MEDIUM**

Pulse 19 (docs-migration-guide) creates multiple documentation files and CHANGELOG entries. It has L0=0, L1=2, L2=1. Documentation pulses should validate at minimum: (1) generated files exist, (2) markdown renders without errors, (3) API mapping table entries resolve. L0=0 means none of these basic validations exist.

### MEDIUM-03: Pulse 36 Has No L3 Acceptance Despite Covering S09

**Severity: MEDIUM**

Pulse 36 (loop-memory-sync) references S09 but has L3_accept=0. Pulse 35 (loop-soul-sync) has L3_accept=2 covering both S09 and S10. So S09 acceptance IS covered by pulse 35, but the coverage relies on a cross-pulse dependency. If pulse 35's acceptance tests are scoped narrowly to soul (not memory), S09's memory aspects would be untested at L3.

### MEDIUM-04: Pulse 42 References S27 But S27 is "conflicting-fleet-policies"

**Severity: MEDIUM**

Pulse 42 (fleet-claws) has `scenario_codes: [S18, S27]`. S27 is `conflicting-fleet-policies`. Pulse 30 (validation-layer) also references `cap-integration/S27`. The fleet-claws pulse addresses fleet policy aggregation while the validation layer addresses policy conflict detection. Both claiming S27 is acceptable but the division of responsibility should be clear: pulse 30 handles conflict detection at write time, pulse 42 handles conflict visualization at read time.

### MEDIUM-05: CP-5 Has 8 Pulses But Only 1 Gate

**Severity: MEDIUM**

CP-5 (Serve Read APIs) has 8 pulses (21-28), the most of any checkpoint. Only pulse 28 is the gate. All 8 must land clean before CP-5 passes. With 8 pulses, an intermediate review gate at pulse 25 or 26 would improve risk detection. This is a structural observation, not a spec violation.

### MEDIUM-06: No Explicit Coverage for "boundary-removal-violation" (S21)

**Severity: MEDIUM**

S21 (boundary-removal-violation) is referenced by pulse 30 as `cap-integration/S21` and by pulse 44 as a bundled acceptance test. However, the scenario name suggests a SOUL.md boundary removal attempt. Pulse 30's validation layer tests R5 lock, fleet lock, and governance deny -- but the scenario's specific test (removing a boundary from SOUL.md via PATCH) is most naturally tested in pulse 35 (loop-soul-sync), which does NOT reference S21.

**Remediation**: Add S21 to pulse 35's scenario_codes.

---

## 8. Test Tier Summary Statistics

| Tier           | Total Across 59 Pulses | Average Per Pulse |
| -------------- | ---------------------- | ----------------- |
| L0 unit        | 296                    | 5.0               |
| L1 integration | 162                    | 2.7               |
| L2 e2e         | 44                     | 0.7               |
| L3 acceptance  | 43                     | 0.7               |
| **TOTAL**      | **545**                | **9.2**           |

### Distribution by Checkpoint

| CP    | Pulses | L0  | L1  | L2  | L3  | Total |
| ----- | ------ | --- | --- | --- | --- | ----- |
| CP-1  | 6      | 40  | 20  | 2   | 1   | 63    |
| CP-2  | 6      | 32  | 15  | 7   | 2   | 56    |
| CP-3  | 6      | 26  | 23  | 6   | 1   | 56    |
| CP-4  | 2      | 2   | 4   | 3   | 2   | 11    |
| CP-5  | 8      | 42  | 20  | 2   | 3   | 67    |
| CP-6  | 6      | 40  | 22  | 11  | 10  | 83    |
| CP-7  | 5      | 34  | 16  | 2   | 6   | 58    |
| CP-8  | 5      | 20  | 11  | 7   | 10  | 48    |
| CP-9  | 11     | 48  | 24  | 3   | 0   | 75    |
| CP-10 | 4      | 20  | 10  | 1   | 0   | 31    |

### HC-BLOCK-06: CP-9 and CP-10 Have Zero L3 Tests

**Severity: HC-BLOCK**

CP-9 (11 pulses, TUI) and CP-10 (4 pulses, VS Code) have zero L3 acceptance tests across ALL their non-gate pulses. Only the gate pulses (55, 59) would carry L3, but as noted in HC-BLOCK-03, those gates also have L3=0.

The entire TUI and VS Code extension surface (15 pulses) ships with zero acceptance tests. This is a conformance violation: the spec requires acceptance-level validation for user-facing surfaces.

**Remediation**: Add L3 acceptance tests to at least: pulse 49 (PATCH integration -- tests the core TUI write flow), pulse 51 (soul editor -- tests the most complex editing surface), and pulse 59 (webview -- tests the VS Code integration). Target minimum: 3 L3 tests across CP-9, 1 across CP-10.

### HC-BLOCK-07: Pulse 55 Gate Quality is Insufficient

**Severity: HC-BLOCK**

Pulse 55 (tui-demo) is the CP-9 gate for ALL TUI work (11 pulses). It has:

- L0=2 (floor is 2 -- barely meets)
- L1=1 (floor is 1 -- barely meets)
- L2=1
- L3=0 (gate floor is 1 -- **FAILS**)
- Total: 4 tests

For comparison, other gate pulses: CP-2 gate (pulse 12) has 6 tests, CP-6 gate (pulse 34) has 13 tests, CP-8 gate (pulse 44) has 11 tests.

A gate that validates 10 prior pulses with 4 tests and zero acceptance assertions is governance theater, not a real gate.

**Remediation**: Increase pulse 55 to at minimum L0=4, L1=2, L2=2, L3=2 (10 total). The demo walkthrough should be an L3 acceptance test, not an L2 e2e.

---

## Findings Severity Summary

| Severity | Count | IDs                             |
| -------- | ----- | ------------------------------- |
| HC-BLOCK | 7     | HC-BLOCK-01 through HC-BLOCK-07 |
| HIGH     | 7     | HIGH-01 through HIGH-07         |
| MEDIUM   | 6     | MEDIUM-01 through MEDIUM-06     |

### Required Before Implementation

All 7 HC-BLOCKs must be resolved:

1. **HC-BLOCK-01**: Add scenario_codes for S28, S31, S32 to implementing pulses
2. **HC-BLOCK-02**: Add L0 >= 2 and L1 >= 1 tests to pulses 12, 19, 44
3. **HC-BLOCK-03**: Add L3 >= 1 to gate pulses 55 and 59
4. **HC-BLOCK-04**: Add spec traceability mechanism for CL-10 section coverage
5. **HC-BLOCK-05**: Add explicit "P-279" reference to pulse 39
6. **HC-BLOCK-06**: Add L3 acceptance tests across CP-9 and CP-10
7. **HC-BLOCK-07**: Increase pulse 55 gate quality to minimum 10 tests with L3 >= 2

### Recommended Before Implementation

All 7 HIGH findings should be addressed:

1. Standardize scenario_codes prefix convention
2. Increase pulse 55 total test count
3. Add CL-12 traceability
4. Add CL-11 traceability
5. Add scenario_codes to empty VS Code pulses (56, 57, 58)
6. Add scenario_codes to remaining empty pulses (50, 55)
7. Document CP-2 gate's prior-wave scenario scope

---

## Verdict

**CONDITIONAL PASS**: The pulse plan is structurally complete -- all 59 pulses cover the 4 plans, checkpoint assignments are perfect, dependency ordering is correct, and pitfall coverage is nearly complete. The 7 HC-BLOCKs are metadata and test-tier gaps, not structural deficiencies. They can be resolved with frontmatter edits and test count increases. No pulse needs to be rewritten or resequenced.

The plan is implementable after the HC-BLOCKs are fixed. The HIGH and MEDIUM findings improve traceability but do not block implementation.
