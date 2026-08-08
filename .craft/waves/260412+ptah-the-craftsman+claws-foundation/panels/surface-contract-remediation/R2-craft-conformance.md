# R2 Conformance Review -- Surface Contract Remediation Plan

**Reviewer**: craft:conformance
**Scope**: .craft/plans/surface-contract-remediation.md
**Date**: 2026-04-12
**Round**: 2 (verification of R1 findings)
**Verdict**: PASS (4M resolved, 3W addressed, 0 new issues)

---

## R1 Finding Verification

### Majors

| R1 ID | Finding                                                                                                                 | Status       | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ----- | ----------------------------------------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1    | DC-01 root cause diagnosis was wrong (non-headline atoms with non-null narrative, not headline atoms needing narrative) | **RESOLVED** | Phase 1 now correctly states both invariants and identifies all 8 failures as Invariant 2 violations. Lines 49-53: "The 8 parse errors are ALL Invariant 2 violations (non-headline atoms with non-null narrative), NOT missing narratives on headlines." Fix tasks correctly say "set `narrative: null`" on feature/concept atoms.                                                                                                         |
| M2    | Works had 0 parse errors; actual distribution was 6 claws + 1 craft/personas + 1 compiler/governance                    | **RESOLVED** | Current State table (line 21) now correctly reads: "6 claws (non-headline atoms with non-null narrative), 1 craft/personas (invalid docType: persona), 1 compiler/governance (concept atom with P1 narrative)." No mention of works failures. Phase 1 tasks enumerate all 3 categories with correct fix actions.                                                                                                                            |
| M3    | DC-11 proposed `reuses:` mechanism does not exist in validation code                                                    | **RESOLVED** | Phase 2 now uses pure deduplication: "Remove duplicate atom declarations from non-authoritative areas' ATOMS.md + surface contracts" (line 69). Convention is clear: "an atom lives in exactly one top-level area. Cross-area usage does NOT require re-declaration" (line 70). The `reuses:` mechanism is explicitly listed in Out of Scope (line 128) as deferred. This is the correct approach -- it avoids creating a spec-to-code gap. |
| M4    | DC-03 target of <20 was too permissive; should be 0                                                                     | **RESOLVED** | Phase 4 now states "Target: 0 unclassified (not <20 -- there is no valid reason for an atom to be in ATOMS.md but not in any contract)" (line 91). Gate requires DC-03 to PASS or WARN with 0 (line 92).                                                                                                                                                                                                                                    |

### Warnings

| R1 ID | Finding                                                                                 | Status                  | Assessment                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ----- | --------------------------------------------------------------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W1    | Phase 6 known-gaps.yaml needs DC-05 pre-validation as acceptance gate                   | **PARTIALLY ADDRESSED** | The Notes section (line 135) mentions "DC-05/DC-06 validate it" for known-gaps.yaml. However, Phase 6's explicit gate (line 110) only says "DC-04 count must be below 100" -- it does not list DC-05 PASS as a gate condition. The final CI gate in Phase 6 test updates (line 115) does cover this: "all DC checks PASS or WARN (no FAIL allowed in CI)." Since DC-05 would FAIL if known-gaps entries are malformed, and the CI gate rejects any FAIL, this is functionally covered. Acceptable. |
| W2    | DC-06 orphan detection becomes an active concern after known-gaps.yaml creation         | **ADDRESSED**           | The CI gate (line 115) covers DC-06: "all DC checks PASS or WARN (no FAIL allowed in CI)." Any future PR that writes a manifest for a previously-gapped surface will trigger DC-06 FAIL in CI, forcing known-gaps.yaml cleanup. This is the correct enforcement mechanism -- no separate maintenance protocol needed when CI catches it.                                                                                                                                                           |
| W3    | craft/personas.doc-domain.yaml uses invalid docType: persona (not just narrative issue) | **RESOLVED**            | Phase 1 now has a dedicated task: "Fix 1 craft/personas contract: replace invalid `docType: persona` with `docType: concept`" (line 56). This correctly addresses both the docType enum violation and (implicitly) the narrative null requirement for concepts.                                                                                                                                                                                                                                    |

### Notes

| R1 ID | Finding                                  | Status                                                      |
| ----- | ---------------------------------------- | ----------------------------------------------------------- |
| N1    | DC-12 fragility as regression risk       | Acknowledged -- DC-12 passes and is reasonably out of scope |
| N2    | DC-09 WARN-not-FAIL threshold            | Acknowledged -- manual audit during Phase 5 is reasonable   |
| N3    | Phase ordering respects dependency chain | Confirmed -- ordering unchanged, still correct              |

---

## New Issues Introduced by Revision

No new issues found. The revision is clean:

1. **Phase ordering preserved.** The dependency chain (1: parse -> 2: collisions -> 3: layers -> 4: classification -> 5: narrative/README -> 6: gaps/CI) remains correct.
2. **Coverage contract is realistic.** 3 L0 unit tests + 1 L1 integration test is proportionate to the work scope.
3. **Out of Scope is well-bounded.** The `reuses:` deferral, missing surface authoring, and matrix restructuring are all reasonable exclusions that do not create hidden debt.
4. **DC-01 root cause explanation is now technically precise.** The invariant numbering matches `doc-domain-schema.ts` lines 60-76.
5. **DC-11 deduplication strategy aligns with existing code.** `checkDC11()` (health-checks.ts:423-460) only detects slug collisions across top-level areas. The plan's fix (remove from non-authoritative area) directly addresses what the code checks.

---

## Lens Checklist

| Question                                                                       | Assessment                                                                                                                                                                                   |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Does every spec ID referenced in this change have a passing conformance check? | YES -- DC-01 through DC-11 root causes and fixes now align with actual code behavior. DC-01 fix targets Invariant 2 (correct). DC-11 fix targets slug deduplication (matches `checkDC11()`). |
| Are there spec constraints that this change silently relaxes?                  | NO -- DC-03 target is now 0 (full compliance). DC-04 uses known-gaps.yaml which is validated by DC-05. The CI gate (all-PASS-or-WARN) prevents silent relaxation.                            |
| Is the spec-to-code traceability maintained?                                   | YES -- The `reuses:` mechanism that had no code backing is moved to Out of Scope. All remaining fix strategies map to existing validation logic.                                             |

---

## Verdict

All 4 R1 Majors are resolved. All 3 R1 Warnings are addressed (W1 partially, but functionally covered by the CI gate). No new issues introduced. The plan is ready for execution.

**PASS**
