# R2 — craft/testing Verification Review: surface-contract-remediation

**Reviewer**: craft/testing
**Round**: 2
**Date**: 2026-04-12
**Plan**: `.craft/plans/surface-contract-remediation.md`
**Prior**: `R1-craft-testing.md`

---

## R1 Finding Verification

### Major Findings

| R1 # | Finding | R2 Status | Evidence |
|-------|---------|-----------|----------|
| M1 | Plan has zero test updates across 6 phases | **RESOLVED** | Plan now includes a "Test updates" subsection in Phases 1, 2, 3, 4, and 6, plus a "Coverage Contract" section with explicit tier targets (3 L0 unit, 1 L1 integration). Phase 5 is the only phase without a test subsection, which is acceptable since its work (assigning a headline to P3, adding atoms to README) does not change check logic — only YAML data. |
| M2 | DC-01 fix description inaccurate — said "headline atoms need `narrative: platform`" but actual errors are Invariant 2 violations (non-headline with non-null narrative) | **RESOLVED** | Phase 1 now correctly states: "The 8 parse errors are ALL Invariant 2 violations (non-headline atoms with non-null narrative), NOT missing narratives on headlines." The fix items now say `set narrative: null` on non-headline atoms and fix the invalid `docType: persona`. Root cause analysis in the plan matches the Zod schema and existing test at `doc-domain-schema.unit.test.ts:80-93`. |
| M3 | DC-11 collision tests only cover the PASS path — no FAIL-path fixture | **RESOLVED** | Phase 2 "Test updates" section now includes: (1) "Add DC-11 FAIL-path fixture: two areas declaring the same atom -> collision detected" and (2) "Add DC-11 test: sub-area atoms (compiler/forma) don't collide with parent (compiler)." Both address the gap. The sub-area non-collision test is a good addition not requested in R1 — it covers an edge case where `compiler/forma` atoms should not collide with `compiler` atoms. |
| M4 | `run-live-checks.ts` is a script, not a test — not in CI | **RESOLVED** | Phase 6 "Test updates" section now includes: "Promote run-live-checks.ts to a proper integration test (vitest, not standalone script)" and "Add to CI" with a specific test path and gate criteria ("all DC checks PASS or WARN, no FAIL allowed in CI"). This is exactly what R1 recommended. |

### Warning Findings

| R1 # | Finding | R2 Status | Evidence |
|-------|---------|-----------|----------|
| W1 | `fixture-workspace-areas` has no collision scenario for DC-11 | **RESOLVED** | Covered by Phase 2's test updates (DC-11 FAIL-path fixture). The plan does not specify whether to extend the existing fixture or create a new one, but either approach works. Acceptable. |
| W2 | DC-08 layer alignment fix has no area-aware FAIL test | **RESOLVED** | Phase 3 "Test updates" now includes: "Add area-aware fixture with orphan layer -> DC-08 FAIL path covered." This directly addresses the gap. |
| W3 | Phase 6 `known-gaps.yaml` per area but fixture coverage is single-directory | **PARTIALLY RESOLVED** | Phase 6 test updates mention promoting `run-live-checks.ts` to integration test and adding a CI gate, but do **not** explicitly add a multi-area known-gaps fixture or unit test for cross-area gap aggregation. The live integration test will exercise this path against the real workspace, which provides some coverage, but a fixture-based unit test for `loadKnownGapsFromContext` across multiple area directories is still missing. This is a minor gap — the integration test provides adequate regression protection, but the unit-level isolation is absent. Downgraded from Warning to Note since the integration test covers the path. |
| W4 | `area-discovery.unit.test.ts` runs against live workspace, not fixtures | **UNRESOLVED** | The plan does not mention `area-discovery.unit.test.ts` or flag its live-workspace dependency. Verified: lines 11-12 of `area-discovery.unit.test.ts` still resolve to the real repo root. Assertions like `expect(subNames).toContain('compiler/forma')` will break if workspace structure changes. However, this is a pre-existing design choice and the plan's scope is fixing DC check failures, not refactoring test infrastructure. Downgraded from Warning to Note — the plan should acknowledge this dependency in a comment but is not obligated to fix it. |
| W5 | DC-07 narrative spine + DC-01 parse fixes interact — Phase 1 may cascade to DC-07 | **RESOLVED** | Phase ordering now explicitly states: "Phase ordering matters: 1 -> 2 -> 3 -> 4 -> 5 -> 6. Each phase changes counts for subsequent phases." and "Re-measurement gates between phases prevent working against stale baselines." Phase 5 (DC-07 narrative) is sequenced after Phase 1 (DC-01 parse fixes), and Phase 5's fix items include "Re-measure DC-10 count after Phases 2-4." While Phase 5 does not explicitly say "re-measure DC-07 after Phase 1," the overall gate structure (re-run live checks between phases) handles this. Acceptable. |

---

## New Issues in Revised Plan

### Warning

| # | Finding | Phase | Impact |
|---|---------|-------|--------|
| W-NEW-1 | **Phase 6 CI gate uses `npx vitest`**. Line reads: "Add to CI: `npx vitest run --project integration tests/domains/docs/live-health-checks.integration.test.ts`". CLAUDE.md rule: "No `npx` (REQUIRED) — npx leaves orphaned processes on Windows." The CI command should use globally installed `vitest` or `cd craftworks-sdk && vitest run ...` per project convention. | Phase 6 | Medium — violates cross-platform discipline; will leave orphaned processes on Windows CI runners |
| W-NEW-2 | **Phase 4 test updates say "Existing DC-03 tests cover this adequately" — but no verification step.** DC-03 currently has tests for PASS, WARN (unclassified slug), and FAIL (strict mode). These use the legacy single-directory fixture, not the area-aware path. After Phases 2-3 change the collision and layer landscape, DC-03 area-aware coverage should be re-verified. The plan should include: "Run DC-03 area-aware tests against fixture-workspace-areas after Phase 3 changes to confirm no regression." This is not a new test to write — just a verification step. | Phase 4 | Low — existing tests likely sufficient, but explicit verification is missing |

### Note

| # | Finding | Phase | Impact |
|---|---------|-------|--------|
| N-NEW-1 | **Coverage Contract tier targets are well-structured but don't name specific test files.** The 3 L0 targets map to DC-11 FAIL path, DC-08 orphan layer, and Invariant 2 violation. The 1 L1 target maps to the live health check. For implementation clarity, the Coverage Contract should reference: `area-health-checks.unit.test.ts` (DC-11, DC-08), `doc-domain-schema.unit.test.ts` (Invariant 2 already exists at line 80), and the new `live-health-checks.integration.test.ts`. | All | Low — implementation guidance, not a correctness issue |
| N-NEW-2 | **Phase 1 test update says "Add unit test: non-headline atom with non-null narrative -> parse error (Invariant 2 coverage)." This test already exists.** `doc-domain-schema.unit.test.ts` lines 80-93 test exactly this: a feature atom with `narrative: 'P1'` is rejected. The plan should say "verify existing test covers this" rather than "add unit test." Not harmful — implementing this task will discover the existing test — but it creates unnecessary work during execution. | Phase 1 | Low — redundant task, not incorrect |
| N-NEW-3 | **`area-discovery.unit.test.ts` uses live workspace (R1's W4).** Not addressed in the plan but not a plan obligation. Flagged here for completeness: after this plan lands and modifies workspace structure, the assertions at lines 27-38 (`expect(subNames).toContain(...)`) and line 62 (`expect(flat.length).toBeGreaterThan(12)`) may need updates. The implementer should run this test file after Phase 2 (collision removal) to catch assertion drift. | Phase 2+ | Low — pre-existing risk, not introduced by this plan |

---

## Testing Lens Checklist (R2)

| Question | R1 Assessment | R2 Assessment |
|----------|---------------|---------------|
| Does every behavioral change have a corresponding test change? | **NO** — zero test changes | **YES** — Phases 1-4 and 6 all have test subsections. Phase 5 (data-only YAML changes) does not need test changes. |
| Are snapshot updates reviewed for correctness? | N/A | N/A — no snapshot tests involved. `area-discovery.unit.test.ts` still functions as an implicit snapshot against live state (unchanged). |
| Do tests assert behavior, not implementation details? | DC-11 FAIL path had no assertion | **YES** — Plan adds DC-11 FAIL-path fixture + assertion, DC-08 area-aware FAIL test, and CI gate. All test behavior, not internals. |
| Coverage without assertions is theater? | `loadAllAreaDomains` test only asserts `map.size > 0` | Unchanged — plan does not address this test. Acceptable: it is out of scope for a remediation plan. |

---

## Summary

The revised plan addresses all 4 Major findings and 4 of 5 Warning findings from R1. The most critical fix was M2 (DC-01 root cause inversion) — the plan now correctly identifies Invariant 2 violations and prescribes `narrative: null` fixes instead of the incorrect `narrative: platform` addition. The Coverage Contract section with explicit tier targets (3 L0 + 1 L1) is a strong addition.

Two new warnings surfaced: the `npx vitest` command in Phase 6's CI gate violates the project's no-npx rule (W-NEW-1), and Phase 4's "existing tests are adequate" claim lacks an explicit verification step (W-NEW-2). Neither is blocking — W-NEW-1 is a one-word fix (`npx vitest` -> `vitest`), and W-NEW-2 is a process note.

The one partially resolved item (W3 — multi-area known-gaps fixture) is adequately covered by the promoted integration test. The unresolved item (W4 — `area-discovery.unit.test.ts` live-workspace dependency) is a pre-existing design choice outside the plan's scope.

**Verdict**: Plan is ready for implementation. Fix W-NEW-1 (`npx` -> direct `vitest` invocation) before execution.
