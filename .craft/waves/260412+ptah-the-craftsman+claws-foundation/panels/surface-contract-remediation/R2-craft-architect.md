# R2 -- craft/architect Verification Review: surface-contract-remediation

**Reviewer**: craft/architect
**Round**: 2 (verification of R1 findings)
**Date**: 2026-04-12
**Plan**: `.craft/plans/surface-contract-remediation.md`

---

## R1 Major Finding Verification

| R1 ID | Finding | Verdict | Notes |
|-------|---------|---------|-------|
| M1 | DC-02 scope wrong: plan said 5, live check shows 15 | **RESOLVED** | Current State table now shows "15 | Stale manifest paths: 5 traces (05-09 are agent traces at wrong path), 10 deck/pptx paths". Phase 1 scope includes "Fix 15 stale manifest paths: traces 05-09 (agent traces, update to agent path or split manifest), 10 deck/pptx paths (update to area-scoped presentation paths)". Correct count, correct breakdown, scoped in Phase 1. |
| M2 | DC-01 area attribution wrong: plan said "6 claws + 2 works" but actual is 6 claws + 1 agent + 1 ambiguous | **RESOLVED** | Current State table now reads "8 | Parse errors: 6 claws (non-headline atoms with non-null narrative), 1 craft/personas (invalid docType: persona), 1 compiler/governance (concept atom with P1 narrative)". This is more precise than R1's own assessment -- R1 said "1 agent" but verified against live data: the persona parse error is in `design/craft/surface-contracts/personas.doc-domain.yaml` (uses `docType: persona` which is not in the DocType enum), not the agent personas contract (which uses `docType: concept` and parses clean). The compiler/governance error is `olet` in `role-system.doc-domain.yaml` (`docType: concept, narrative: P1` -- Invariant 2 violation). Plan's attribution is factually correct; R1's was not. Well corrected. |
| M3 | DC-08 count stale: plan said 46, live shows 51. Also missed Personas pattern (14/51). | **RESOLVED** | Current State table now shows "51 | Layer names in contracts don't match ATOMS.md headings (14 are 'Personas' convention)". Phase 3 explicitly includes: "Convention decision: 'Personas' layer name -- add `## Personas` heading to every ATOMS.md that has persona atoms, OR rename persona contract layers to match existing headings". Both the count correction and the batch-optimization for the Personas pattern are addressed. |
| M4 | Phase ordering creates rework: DC-11 collision fixes (was Phase 3) should precede DC-08 layer alignment; DC-04 baseline (Phase 6) depends on post-Phase-3 counts. | **RESOLVED** | The plan reordered phases. New sequence: Phase 1 (DC-01 + DC-02) -> Phase 2 (DC-11 collisions) -> Phase 3 (DC-08 layers) -> Phase 4 (DC-03 classification) -> Phase 5 (DC-07 + DC-10) -> Phase 6 (DC-04 + CI). Collisions now precede layer alignment and classification. Phase 4 says "Re-measure after Phases 2-3". Phase 5 says "Re-measure DC-10 count after Phases 2-4". Phase 6 says "Re-measure DC-04 after all prior phases (estimated ~700-800 remaining, down from 1018)". Each dependent phase explicitly re-measures. The cascading dependency issue is fully addressed. |

**M-findings: 4/4 RESOLVED.**

---

## R1 Warning Finding Verification

| R1 ID | Finding | Verdict | Notes |
|-------|---------|---------|-------|
| W1 | Phase 3's `reuses:` convention undefined -- no schema field exists | **RESOLVED** | The plan moves `reuses:` to Out of Scope: "Implementing `reuses:` cross-area reference field (deferred -- simple deduplication is sufficient for DC-11)". Phase 2 (collisions) uses removal of duplicate declarations, not a `reuses:` mechanism. The `DEPENDENCY_RULES` in `area-types.ts` reference `reuses:` in a comment but no YAML contract uses it and the schema does not support it. Correctly deferred. |
| W2 | Phase 4 target of "<20" is arbitrary; DC-01 fixes will reclassify 30+ atoms automatically | **RESOLVED** | Phase 4 now targets 0 unclassified (not <20): "Target: 0 unclassified (not <20 -- there is no valid reason for an atom to be in ATOMS.md but not in any contract)". Phase 4 also explicitly re-measures after Phases 2-3. The arbitrary threshold is replaced with a correct absolute target. |
| W3 | DC-10's 20 missing headline atoms include a duplicate from DC-11 collision | **RESOLVED** | Phase 5 now says "Re-measure DC-10 count after Phases 2-4 (collision removals change headline count)". The plan acknowledges the interaction without specifying a pre-fix count for DC-10, which is correct since the count will change. |
| W4 | No sequencing gate between phases | **RESOLVED** | Every phase now has an explicit gate: Phase 1 "Gate: re-run live checks, DC-01 and DC-02 must PASS", Phase 2 "Gate: re-run live checks, record new DC-03/DC-04/DC-10 baselines", Phase 3 "Gate: re-run live checks, DC-08 must PASS", Phase 4 "Gate: re-run live checks, DC-03 must PASS or WARN with 0", Phase 5 "Gate: re-run live checks, DC-07 and DC-10 must PASS", Phase 6 "Gate: re-run live checks, DC-04 count must be below 100". Sequential execution is enforced. |
| W5 | H3 headline "DC-03 drops below 20" not verifiable at plan time | **RESOLVED** | H3 is now "DC-03 passes (0 unclassified) -- Every atom in an ATOMS.md is classified in a surface contract". The threshold is replaced with a pass/fail binary target that is verifiable regardless of Phase 1 reclassification effects. |

**W-findings: 5/5 RESOLVED.**

---

## New Issues in Revised Plan

| # | Severity | Finding | Phase | Impact |
|---|----------|---------|-------|--------|
| N1 | Note | **Phase 1 DC-01 description says "1 craft/personas (invalid docType: persona)" but the fix task says "replace invalid `docType: persona` with `docType: concept`".** This fix is correct for parsing, but the 9 persona atoms in craft/personas also all have non-null narrative (`P1` or `P2`). After replacing `docType: persona` with `docType: concept`, those atoms will still fail Invariant 2 (non-headline with non-null narrative). The fix must be two steps: change docType AND set `narrative: null`. This is an implementation detail, not a plan structure issue -- the Phase 1 gate ("re-run live checks, DC-01 must PASS") will catch it. | Phase 1 | Low -- gate protects against incomplete fix |
| N2 | Note | **Phase 2 test task says "Add DC-11 test: sub-area atoms (compiler/forma) don't collide with parent (compiler)".** This is a valuable negative test, but the plan does not state whether sub-area atoms CAN legitimately appear in a parent area's ATOMS.md. The convention "an atom lives in exactly one top-level area" is scoped to top-level areas; it does not address sub-area vs parent overlap. The test will encode a convention that should be explicitly stated. | Phase 2 | Low -- convention gap, not a blocker |
| N3 | Note | **Phase 6 "Promote run-live-checks.ts to a proper integration test" task is good but the CI command uses `npx`.** The plan says: "Add to CI: `npx vitest run --project integration ...`". Per CLAUDE.md, `npx` is prohibited on Windows -- the global `vitest` binary should be used instead. This is a copy-paste issue; the actual CI config will presumably use `vitest` directly (npm scripts already do). | Phase 6 | Low -- will be caught during implementation |

---

## Architect Lens Checklist

| Question | Assessment |
|----------|------------|
| Does this change respect the SDK-owns-logic boundary? | **YES** -- All DC health check logic remains in `craftworks-sdk/src/domains/docs/`. The plan modifies YAML data files, ATOMS.md headings, and known-gaps.yaml entries. No SDK code changes except the test additions, which belong in SDK test directories. |
| Are dependency arrows pointing inward? | **N/A** -- No code changes to package boundaries. |
| Would a new contributor understand the module's responsibility from its location? | **YES** -- The plan maintains the `design/{area}/surface-contracts/` convention. Phase 2's collision resolution strengthens area boundaries by ensuring each atom is declared in exactly one area. Phase 3's Personas convention decision will reduce naming ambiguity. |
| Is the phasing correct? | **YES** -- The reordered sequence (parse -> collisions -> layers -> classification -> narrative/README -> gaps) correctly respects cascading dependencies. Each phase has a gate that re-measures before the next phase scopes its work. |
| Is the scope realistic? | **YES** -- Phase 1 is well-defined (8 parse errors + 15 manifest fixes). Phase 2 is bounded (29 collisions). Phase 3 depends on Phase 2 output but the Personas batch pattern gives a clear starting point. Phases 4-5 are explicitly deferred to post-measurement. Phase 6 acknowledges the ~700-800 estimate rather than committing to a precise count. |
| Are the headlines measurable? | **YES** -- All 8 headlines are now binary pass/fail or threshold-based with post-measurement context. H4 ("<100 after known-gaps subtraction") is the only threshold, and it is scoped after all preceding phases, making it a genuine residual target rather than a guess. |

---

## Summary

All 4 Major findings and all 5 Warning findings from R1 are **RESOLVED**. The revision made substantive changes:

1. **Corrected all three factual errors** (DC-02 count 5->15, DC-01 attribution claws+works -> claws+craft+compiler/governance, DC-08 count 46->51).
2. **Reordered phases** to put DC-11 collision resolution (Phase 2) before DC-08 layer alignment (Phase 3), fixing the cascading dependency issue.
3. **Added re-measurement gates** to every phase, preventing work against stale baselines.
4. **Eliminated the arbitrary <20 threshold** for DC-03, replacing it with a 0-unclassified target.
5. **Moved `reuses:` to out-of-scope**, avoiding an undefined schema convention.
6. **Added the Personas convention decision** as an explicit Phase 3 task.
7. **Adjusted DC-04 baseline estimate** to ~700-800 post-prior-phases (not 1018).

Three new Note-level observations were identified, none blocking. The plan is architecturally sound and ready for execution.

**Verdict**: PASS -- no unresolved findings. Plan is ready for implementation.
