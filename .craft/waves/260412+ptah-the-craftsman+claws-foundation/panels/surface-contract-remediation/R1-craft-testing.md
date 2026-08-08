# R1 — craft/testing Review: surface-contract-remediation

**Reviewer**: craft/testing
**Round**: 1
**Date**: 2026-04-12
**Plan**: `.craft/plans/surface-contract-remediation.md`

---

## Major Findings

| #   | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Phase   | Impact                                                                          |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------- |
| M1  | **Plan has zero test updates across 6 phases.** None of the 6 phases mention test modifications, new test cases, or fixture updates. Every behavioral change to DC checks or contract YAML files changes what the existing test suite validates. Shipping structural fixes without updating tests means the test suite silently drifts from reality -- passing on stale assumptions. Each phase should specify which test files change and what new assertions are needed.                                                                                                                                                                                                                                                                                                         | All     | High -- test suite becomes stale; future regressions undetectable               |
| M2  | **DC-01 fix description is inaccurate and will break existing schema tests.** The plan says "headline atoms need `narrative: platform`" but the actual parse errors in claws contracts come from **non-headline** atoms having non-null narrative (e.g., `governance-ir: concept + narrative: P2` in compiler-layer.doc-domain.yaml, `snap: feature + narrative: P2` in cli-layer.doc-domain.yaml). The Zod schema Invariant 2 rejects `docType !== 'headline' && narrative !== null`. The fix is either null out narrative on non-headline atoms or promote them to headline -- not add `narrative: platform`. Executing the plan as written would introduce _new_ schema violations. The `doc-domain-schema.unit.test.ts` tests at lines 80-93 explicitly assert this rejection. | Phase 1 | Critical -- plan guidance produces invalid YAML that tests correctly reject     |
| M3  | **DC-11 collision tests only cover the PASS path.** `area-health-checks.unit.test.ts` has 2 tests for DC-11: one for PASS (no collisions) and one for skip (no areas). There is no test that creates a fixture with **actual atom collisions** across areas and asserts FAIL. Phase 3 removes 29 collisions -- after which the live workspace will pass DC-11 -- but there is no unit test proving the FAIL path works. If the collision-detection logic has a bug, you would never know from the test suite. A fixture with overlapping atoms (e.g., `atom:sdk` in both works and compiler contracts) must be added.                                                                                                                                                              | Phase 3 | High -- collision detection is untested for the failure case it exists to catch |
| M4  | **`run-live-checks.ts` is a script, not a test.** It runs DC-01 through DC-12 against the real workspace and exits non-zero on failures, but it is not wired into vitest, not part of any test tier, and not in CI. After this plan lands and all 7 FAILs become PASSes, there is no automated gate preventing regressions. Any future YAML edit could re-break DC checks without anyone noticing until someone manually runs the script. This script should become a proper `.integration.test.ts` or a CI gate (or both).                                                                                                                                                                                                                                                        | All     | High -- no CI protection for the checks this plan fixes                         |

## Warning Findings

| #   | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Phase      | Impact                                                            |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------- |
| W1  | **Fixture `fixture-workspace-areas` has no collision scenario.** The areas fixture has works (sdk, workspace) and compiler (cross-platform) and compiler/forma (program-ir) -- all disjoint. Phase 3's collision fix needs a new fixture or fixture extension with an atom declared in 2+ top-level areas to properly test DC-11 FAIL. Without it, you cannot write unit tests for the collision path.                                                                                                                                                   | Phase 3    | Medium -- blocks unit-testing DC-11 collision detection           |
| W2  | **DC-08 layer alignment fix (46 orphans) has no area-aware test.** The existing DC-08 tests in `health-checks.unit.test.ts` use the legacy single-contracts-dir mode, not the area-aware path. Phase 2 renames layers across multiple areas. The area-aware code path for DC-08 is exercised only through `runAllChecks` in `area-health-checks.unit.test.ts`, where it happens to pass on the fixture. A dedicated area-aware DC-08 FAIL test (wrong layer heading in one area) is needed to confirm layer alignment works per-area, not just globally. | Phase 2    | Medium -- area-aware DC-08 path not explicitly tested for failure |
| W3  | **Phase 6 introduces `known-gaps.yaml` per area but fixture coverage is single-directory.** DC-05 and DC-06 tests use `fixture-workspace-known-gaps` and `fixture-workspace-orphan` which are single-directory fixtures. Phase 6 creates known-gaps.yaml files in multiple area directories. The `loadKnownGapsFromContext` helper aggregates across areas, but no test exercises multi-area gap loading. A regression where gaps from one area shadow another would be invisible.                                                                       | Phase 6    | Medium -- multi-area known-gaps aggregation untested              |
| W4  | **`area-discovery.unit.test.ts` runs against the live workspace, not fixtures.** Lines 11-12 resolve to the real repo root. This means its assertions (`expect(subNames).toContain('compiler/forma')`) break if the workspace structure changes. These are effectively snapshot tests against live state. After this plan changes real surface contracts, these tests may need assertion updates. The plan should flag this dependency.                                                                                                                  | All        | Medium -- live-workspace tests may break from plan changes        |
| W5  | **Regression risk: DC-07 narrative spine + DC-01 parse fixes interact.** Phase 1 fixes parse errors in claws contracts (non-headline atoms with non-null narrative). Phase 5 fixes DC-07 (P3 narrative thread has 0 headline atoms). If Phase 1 nulls out narrative on non-headline atoms, it may reduce the set of atoms the narrative validator sees, potentially changing DC-07 results. The plan does not discuss this interaction. Test the full DC-01 through DC-12 suite after Phase 1 and before Phase 5 to catch cascading effects.             | Phase 1, 5 | Medium -- cross-check interaction not addressed                   |

## Note Findings

| #   | Finding                                                                                                                                                                                                                                                                                                                                                                                                                 | Phase   | Impact                                                                          |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------- |
| N1  | **`loadAllAreaDomains` test in `area-health-checks.unit.test.ts` (line 147-157) reads the live workspace.** This test asserts `map.size > 0` which is fragile. If all area surface contracts happen to be broken (which they currently are -- 8 parse failures), this test may still pass because it checks the map size, not domain validity. After remediation, consider tightening the assertion.                    | All     | Low                                                                             |
| N2  | **Integration test `health-checks.integration.test.ts` uses `buildCtx` which reads fixture ATOMS.md atom slugs and layer headings.** This is correct behavior, but Phase 4 changes which atoms are classified in which area. If fixture ATOMS.md files are updated to match the new structure, the integration tests need re-validation.                                                                                | Phase 4 | Low                                                                             |
| N3  | **Doc-domain schema already supports `narrative: 'platform'` in the enum.** The `NarrativeSchema` at `doc-domain-schema.ts:23` is `z.enum(['P1', 'P2', 'P3', 'platform'])`. The narrative validator tests at `narrative-validator.unit.test.ts:138-153` already cover the platform narrative path. No schema changes are needed -- only contract YAML changes. This is good; confirm tests still pass after YAML fixes. | Phase 1 | Low -- positive: existing coverage is adequate for the platform narrative value |

---

## Testing Lens Checklist

| Question                                                             | Assessment                                                                                                                                                                                                                             |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Does every behavioral change have a corresponding test change?       | **NO** -- the plan has zero test changes across 6 phases. DC-01 parse fixes, DC-08 layer renames, DC-11 collision removal, DC-04 known-gaps additions -- all are behavioral changes with no test plan.                                 |
| Are snapshot updates reviewed for correctness, not just regenerated? | N/A -- no snapshot tests involved, but the `area-discovery.unit.test.ts` live-workspace tests function as implicit snapshots and need review.                                                                                          |
| Do tests assert behavior, not implementation details?                | Existing tests are well-structured: they assert check status and detail content, not internal data structures. But the DC-11 FAIL path has **no assertion at all** -- it cannot fail because no fixture exercises it.                  |
| Coverage without assertions is theater?                              | `loadAllAreaDomains` test asserts `map.size > 0` and loop body asserts `domains.length > 0` -- these are existence checks, not behavioral assertions. After remediation, these should assert specific area counts and domain validity. |

---

## Recommended Test Changes Per Phase

### Phase 1 (DC-01 parse errors)

- Correct the plan: the fix is nulling narrative on non-headline atoms, not adding `narrative: platform`
- Add a fixture or test case to `doc-domain-schema.unit.test.ts` for `concept + narrative: P2` rejection (already covered, but verify)
- Run full DC suite after fixes to catch cascading effects on DC-07

### Phase 2 (DC-08 layer alignment)

- Add area-aware DC-08 FAIL test to `area-health-checks.unit.test.ts`
- Create a fixture variant with a mismatched layer heading in one area

### Phase 3 (DC-11 collisions)

- Add collision fixture: put `atom:sdk` in both works and compiler surface contracts within `fixture-workspace-areas`
- Add DC-11 FAIL test asserting collision detection and detail message content

### Phase 4 (DC-03 atom classification)

- Update `area-health-checks.unit.test.ts` if fixture atom slugs change
- Consider adding a test for the boundary case: exactly 20 unclassified atoms (the plan's threshold)

### Phase 5 (DC-07 narrative + DC-10 README)

- Run DC-07 after Phase 1 to verify narrative counts still hold
- No new test fixtures needed if existing narrative fixtures are adequate

### Phase 6 (DC-04 surface gaps)

- Add multi-area known-gaps fixture and test for cross-area gap aggregation
- Add test for `known-gaps.yaml` in area directories (not just legacy docs/surface-contracts/)

### Cross-cutting

- Promote `run-live-checks.ts` to a proper integration test or CI gate
- Add a `test:dc-checks` npm script that runs live checks as part of CI

---

## Summary

The plan addresses a real and well-cataloged set of health check failures, but it treats remediation as purely a data-fix exercise -- editing YAML files and markdown -- with **zero** attention to the test suite that validates those files. This is the core gap: every phase changes what the DC checks see, but no phase updates what the tests assert.

The most urgent issue is M2: the Phase 1 fix description is factually wrong about what causes DC-01 failures. The claws contracts fail because non-headline atoms have non-null narrative (violating schema Invariant 2), not because headline atoms lack `narrative: platform`. Executing the plan as written would produce contracts that the existing schema tests correctly reject.

Beyond correctness, the DC-11 collision detection has never been tested for the failure case (M3), and the `run-live-checks.ts` script is the only thing that catches workspace-level regressions but is not in CI (M4). After this plan lands and all checks go green, there is no automated safety net preventing re-regression.

**Verdict**: The plan needs a test strategy section added to each phase before implementation begins. Without it, the remediation work will land without test protection and the suite will silently diverge from the new workspace state.
