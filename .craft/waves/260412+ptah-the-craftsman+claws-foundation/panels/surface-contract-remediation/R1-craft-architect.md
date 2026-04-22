# R1 — craft/architect Review: surface-contract-remediation

**Reviewer**: craft/architect
**Round**: 1
**Date**: 2026-04-12
**Plan**: `.craft/plans/surface-contract-remediation.md`

---

## Major Findings

| # | Finding | Phase | Impact |
|---|---------|-------|--------|
| M1 | **DC-02 scope is wrong: plan says 5 stale traces, live check shows 15 items.** The plan accounts for traces 05-09 (5 stale trace paths) but the live DC-02 check reports 15 failures: 5 traces plus 10 stale deck/presentation manifest entries (skills-at-scale, business-processes, crest-deep, forma, press-optimization, relax-reports, roles, sdk-architecture, skills-pipeline, data-sync — all pointing to nonexistent `.pptx` files under `docs/craft/presentations/`). Phase 1 only mentions trace paths. The 10 deck manifests are a separate structural issue requiring a decision: remove manifest entries for decks not yet created, or create placeholder manifests. Either way, the plan undercounts DC-02 by 200%. | Phase 1 | High — DC-02 will not pass after Phase 1 as planned |
| M2 | **DC-01 area attribution is wrong: plan says "6 claws + 2 works" but actual failures are 6 claws + 1 agent + 1 ambiguous.** Live DC-01 reports 8 parse errors: `cli-layer`, `compiler-layer`, `devex-layer`, `platform-layer`, `runtime-layer`, `security-layer` (6 claws), `role-system.doc-domain.yaml` (agent area, not works), and `personas.doc-domain.yaml` (ambiguous — exists in agent, compiler, and craft areas, and the DC-01 check reports only the filename without directory prefix). Zero of the 8 failures are in works. The plan's fix guidance ("Fix 2 works surface contracts: same issue") targets the wrong area entirely. | Phase 1 | High — misdirected fix effort; works contracts may not need Phase 1 changes at all |
| M3 | **DC-08 count is stale: plan says 46, live check shows 51 orphan layers.** The plan's Phase 2 scope of "Audit all 46 orphan layers" undercounts by 5. Of the 51, 14 are the "Personas" layer name repeated across areas (agent, compiler, craft, and sub-areas each have a `personas.doc-domain.yaml` with `layer: "Personas"`). Fixing just the Personas convention (adding a "Personas" heading to each area's ATOMS.md, or renaming layers to "Agent Personas", "Compiler Personas", etc.) would immediately resolve 14 of 51 items. The plan does not identify this pattern or the efficiency gain of handling it as a single convention decision rather than 14 individual audits. | Phase 2 | Medium — scope underestimate and missed optimization |
| M4 | **Phase ordering creates unnecessary rework: DC-11 collision fixes (Phase 3) reduce DC-04 gap counts (Phase 6) but Phase 6 scoping assumes the pre-fix count of 1018.** When you remove a colliding atom from a non-authoritative area's surface contract, that atom no longer generates surface-gap entries from that area. 29 collision atoms, each generating approximately 5-10 surface gaps from their duplicate declaration, means Phase 3 alone could reduce DC-04 by 150-290 entries. The plan's Phase 6 target of "<100" and the known-gaps.yaml strategy should be scoped AFTER Phase 3 lands, not before. Running the DC-04 count after Phase 3 is necessary to establish the true baseline. Similarly, fixing DC-01 parse errors (Phase 1) will make previously-unparseable contracts contribute atoms to DC-04, potentially increasing the count. The plan assumes a static 1018 baseline that will shift after every preceding phase. | Phase 3, 6 | High — Phase 6 scope is premature; count will change after Phases 1-3 |

## Warning Findings

| # | Finding | Phase | Impact |
|---|---------|-------|--------|
| W1 | **Phase 3's `reuses:` convention is undefined.** The plan says "Cross-area references use `reuses:` field (not duplicate declarations)" but the `AtomEntrySchema` in `doc-domain-schema.ts` has no `reuses` field. The Zod schema accepts: `visibility`, `docType`, `narrative`, `pipeline`, `surfaces`, `surfaceOverrideReason`. Adding a `reuses` field requires a schema change, which the plan does not scope. Either the convention is documentation-only (ATOMS.md cross-references) and doesn't touch surface contracts, or it requires schema work that Phase 3 omits. Clarify which. | Phase 3 | Medium — undefined schema convention may block implementation |
| W2 | **Phase 4 goal of "<20 unclassified" is arbitrary and may be too generous.** Of the 77 unclassified atoms, the majority are claws atoms (30+: `claws-compiler`, `claws-init`, `claws-uninstall`, `claws-json`, `claws-sdk`, `claws-build`, `claws-test`, `claws-publish`, `claws-lsp`, `claws-doctor`, `claws-watch`, `claws-assess`, `claws-relax`, `claws-bypass`, `pinch`, `snap`, `progressive-disclosure`, `three-rings`, `skill-kit`, etc.) that already appear in claws surface contracts but fail DC-03 because DC-01 parse errors prevent those contracts from being loaded. Fixing DC-01 in Phase 1 will cause the parser to successfully load claws contracts, which will reclassify many of these atoms automatically. Phase 4's actual workload may be 20-30 atoms, not 77. The plan should note this dependency and re-measure DC-03 after Phase 1. | Phase 1, 4 | Medium — Phase 4 is likely much smaller than estimated |
| W3 | **DC-10's 20 missing headline atoms include a duplicate.** The live check shows `sdk-architecture` twice in the DC-10 list (it appears in both works and craft surface contracts as a headline atom). This is a DC-11 collision manifesting in DC-10. After Phase 3 resolves the collision (one area owns `sdk-architecture`), DC-10 will drop to 19 or fewer. The plan's Phase 5 target of "drops to 0" is correct, but the work estimate should account for this interaction. | Phase 3, 5 | Low — minor count adjustment |
| W4 | **No sequencing gate between phases.** The plan lists 6 phases but doesn't specify whether they execute sequentially within one wave or can be parallelized. Given the cascading count dependencies (Phase 1 changes DC-03 and DC-04 counts, Phase 3 changes DC-04 and DC-10 counts), Phases 1-3 MUST execute and re-measure before Phases 4-6 can be properly scoped. The plan should add explicit "re-run DC checks" gates between Phase 3 and Phase 4. | All | Medium — without gates, Phase 4-6 scope will be wrong |
| W5 | **H3 headline "DC-03 drops below 20" is not verifiable at plan time.** The <20 threshold was chosen before understanding that DC-01 parse fixes will reclassify 30+ atoms. After Phase 1, DC-03 might already be below 20 with zero Phase 4 work. The headline should be "DC-03 drops below 20 after Phase 1 reclassification" or the target should be refined to a post-Phase-1 baseline. | Phase 4 | Medium — headline measures the wrong thing |

## Note Findings

| # | Finding | Phase | Impact |
|---|---------|-------|--------|
| N1 | **DC-08 "Personas" pattern suggests a naming convention gap.** 14 of 51 orphan layers are `"Personas"`. The convention `layer name = ATOMS.md ## heading (exact match)` needs a decision: should persona contracts use area-prefixed layer names ("Agent Personas", "Compiler Personas") or should every area's ATOMS.md have a `## Personas` heading? The former is cleaner architecturally (unique layer names across the system); the latter is simpler but creates 14 identically-named layers across areas. | Phase 2 | Low — convention decision, not a blocker |
| N2 | **Phase 6's known-gaps.yaml approach is structurally sound.** The `KnownGapSchema` requires `atom`, `surface`, `plan`, and `reason` (min 10 chars). The `subtractKnownGaps` function correctly removes acknowledged gaps from DC-04 counts. The gap detector's `loadAllAreaKnownGaps` aggregates across areas. Phase 6's approach of creating per-area known-gaps.yaml files will work with the existing infrastructure. No schema changes needed. | Phase 6 | Low — positive: infrastructure supports the approach |
| N3 | **The plan correctly identifies 29 DC-11 collisions, and the breakdown is: 18 works/craft, 5 works/compiler, 5 agent/compiler, 1 agent/craft.** The plan's note that collisions are "mostly works vs craft" is accurate (18/29 = 62%). However, the agent/compiler collisions (eval-harness, eval-signal, pipeline-gate, flash, relax-scope-model) may be harder to adjudicate because both areas have legitimate ownership claims. Phase 3 should prioritize the 18 works/craft collisions (clear: works owns platform primitives, craft owns runtime) and handle agent/compiler separately with more analysis. | Phase 3 | Low — priority ordering suggestion |

---

## Architect Lens Checklist

| Question | Assessment |
|----------|------------|
| Does this change respect the SDK-owns-logic boundary? | **YES** — the plan modifies YAML data files and documentation, not SDK code. The DC health check logic in `craftworks-sdk/src/domains/docs/` is unchanged. |
| Are dependency arrows pointing inward (CLI -> SDK -> types)? | **N/A** — no code changes, only data contract fixes. |
| Would a new contributor understand the module's responsibility from its location? | **PARTIALLY** — the plan correctly scopes work to `design/{area}/surface-contracts/` directories. But the "Personas" layer naming ambiguity (same name in 14 areas) and the cross-area collision pattern would confuse a new contributor. Phase 2 and Phase 3 should produce a convention doc or comment explaining the resolution. |
| Is the phasing correct? Are dependencies between phases right? | **NO** — Phases are listed 1-6 but the plan does not account for cascading effects. Phase 1 (DC-01 fixes) changes DC-03 counts by reclassifying ~30 atoms. Phase 3 (DC-11 fixes) changes DC-04 counts by removing duplicate surface obligations. Phase 6's "<100" target and known-gaps strategy depend on the post-Phase-3 DC-04 count, which is unknown. The plan needs re-measurement gates. |
| Is the scope realistic? | **PARTIALLY** — Phases 1, 2, 3, 5 are realistic and well-scoped (with corrections to M1 and M2). Phase 4 is likely over-scoped (will shrink after Phase 1). Phase 6 is under-specified: "reduce from 1018 to <100" is a 90% reduction that depends on how many known-gaps.yaml entries are needed, and each entry requires a concrete `plan` slug, meaning Phase 6 implicitly requires creating plans for every undocumented surface area. |
| Are the headlines measurable and verifiable? | **MOSTLY** — H1, H2, H5, H6, H7, H8 are binary (pass/fail). H3 "<20" and H4 "<100" are thresholds. H4 is problematic because the 1018 baseline will shift; H3 may already be met after Phase 1. |

---

## Summary

The plan identifies a real and valuable set of health check failures and proposes a reasonable 6-phase remediation. The structural approach is sound: fix parse errors first, then layer alignment, then collisions, then classification, then narrative/README, then surface gaps.

**The core architectural issue is cascading dependencies between phases.** The plan treats each DC check as independent, but:

1. Fixing DC-01 parse errors (Phase 1) makes previously-unparseable contracts visible to DC-03 and DC-04, changing their counts.
2. Fixing DC-11 collisions (Phase 3) removes duplicate atom declarations, reducing DC-04 gap counts by an estimated 150-290 entries.
3. Phase 6's target of "<100" DC-04 gaps and known-gaps.yaml strategy depend on the post-Phase-3 count, which could be ~730-870 rather than 1018.

The plan also has three factual errors in its Current State table: DC-02 is 15 items (not 5), DC-01 failures are 6 claws + 1 agent + 1 ambiguous (not 6 claws + 2 works), and DC-08 is 51 items (not 46).

**Recommended changes before implementation:**

1. **Re-run live checks and update the Current State table** with accurate counts.
2. **Add re-measurement gates** after Phase 1 and Phase 3 — re-run the full DC suite and update Phases 4-6 scope based on actual counts.
3. **Expand Phase 1 to include DC-02 deck manifests** — the 10 stale `.pptx` manifest entries must be addressed.
4. **Correct Phase 1 area attribution** — the parse errors are in claws and agent, not claws and works.
5. **Clarify the `reuses:` convention** — document-level only, or schema change required?
6. **Add Phase 2 Personas convention decision** — one fix pattern for 14/51 orphan layers.

**Verdict**: The plan's structural approach is correct, but the scoping and phasing need revision to account for inter-check dependencies and corrected baselines. Fix the factual errors and add re-measurement gates before entering execution.
