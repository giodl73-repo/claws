# R2 Consolidated Review: Craftworks Package Extraction

**Plan**: craftworks-package-extraction
**Date**: 2026-04-11
**Round**: 2
**Panel**: craft/architect, claws/platform-eng, claws/founder

## Verdict: FIX NEEDED

The 10+7 model is the right model. No merges should split and no splits should merge (with one minor question about execution + skill-resolver noted below). The consolidation from 25 to 10+7 addresses R1's central criticism correctly.

**However, the plan document is internally contradictory and leaves 4 of 6 R1 consensus findings unresolved.** The Package Map section describes 10+7 packages while three other sections (SDK re-exports, claws composition, extraction phases) still describe the old 25-package model. This is not a minor editorial issue — a developer following the Extraction Strategy would extract the wrong packages.

Fix the contradictions and resolve the outstanding findings, then R3 should pass.

## R1 Consensus Finding Disposition

| Finding | Architect | Platform-eng | Founder | Consensus |
|---------|-----------|-------------|---------|-----------|
| **C01** — Consolidate to 10-12 | PARTIAL | PARTIAL | PARTIAL | **PARTIAL** — Package Map is correct; 3 sections still reference old names |
| **C02** — Canonical import path | UNRESOLVED | UNRESOLVED | UNRESOLVED | **UNRESOLVED** — No declaration of which import path is canonical |
| **C03** — Compatibility manifest | UNRESOLVED | UNRESOLVED | UNRESOLVED | **UNRESOLVED** — No manifest, no version matrix, blocker for fleet |
| **C04** — Gateway startup benchmark | UNRESOLVED | UNRESOLVED | UNRESOLVED | **UNRESOLVED** — No baseline measurement defined |
| **C05** — Governance as one package | RESOLVED | RESOLVED | RESOLVED | **RESOLVED** |
| **C06** — Public npm from Phase 1 | PARTIAL | PARTIAL | UNRESOLVED | **UNRESOLVED** — Out of Scope still defers public npm |

**Score: 1 resolved, 2 partial, 3 unresolved out of 6 consensus findings.**

## The Central Question: Is 10+7 the Right Model?

### Answer: Yes.

All three roles independently affirm 10+7 as the correct granularity:

| Role | Verdict | Key reasoning |
|------|---------|--------------|
| **Architect** | 9 of 10 merges correct | Domain-based boundaries, no artificial splits, emitters as plugins |
| **Platform-eng** | Correct for fleet ops | 17 x 47 = 799 version cells (tractable), targeted broadcast per emitter |
| **Founder** | Right for community | Contributor-friendly catalog, emitters as natural contribution points |

### Should any merges split?

**One to monitor**: execution + skill-resolver. The architect notes that `claws skills` needs skill resolution but not the full execution engine. If this creates an unwanted dependency pull, consider splitting skill-resolver back out. Not a blocker for R2 — flag for implementation.

### Should any splits merge?

**One to monitor**: relax into eval. The founder notes all current RELAX consumers also use eval or governance. If standalone RELAX adoption is zero after 6 months, merge it. Not a blocker for R2 — flag for post-Phase-5 review.

### Are the 7 emitter plugins justified?

**Unanimously yes.** Each role found independent justification:
- Architect: single dependency on codegen, no diamonds, clean plugin boundary
- Platform-eng: targeted fleet operations per emitter (upgrade 5 Cursor workspaces, not all 47)
- Founder: natural community contribution points (emit-windsurf, emit-aider as future community emitters)

## Must-Address Findings for R3

These must be resolved before the plan can pass:

### MA-01 — Internal consistency: rewrite SDK, claws, and phase sections (All 3 roles)

The plan's Package Map defines 10+7 but three sections still reference old 25-package names:
- "What the SDKs Become" (lines 108-155): references oc-readers, oc-ir, platform-detect, normalize, emit-framework, context-dag, governance-primitives, compilation-host, skill-resolver, audit-chain, workspace-discovery, eval-framework, governance-runtime, budget-tracker
- "How claws Uses This" (lines 159-178): same old names
- "Extraction Strategy" phases (lines 183-218): 4 of 4 Phase 1 packages are wrong (only crypto exists in 10+7)
- Backward Compatibility section: shows `@craftworks/oc-readers` instead of `@craftworks/forma`
- Headline H1: says "12 areas" but plan delivers 10+7

**Fix**: Rewrite all sections to use 10+7 names. Rewrite extraction phases with correct packages.

### MA-02 — Declare canonical import path (All 3 roles)

Add a one-paragraph section: "Canonical import: `@craftworks/{package}`. SDK re-exports (`@craftworks/compiler-sdk`) are convenience for existing consumers. All new documentation, examples, and generated code use direct imports. `claws drift` normalizes both paths to the canonical form."

### MA-03 — Add compatibility manifest (Platform-eng blocker, Architect + Founder agree)

Define `@craftworks/platform` (or equivalent mechanism): a manifest package that declares tested-together version combinations. This is a hard blocker for fleet operations. Without it, 17 independently-versioned packages cannot be safely managed across 47 workspaces.

### MA-04 — Move public npm to in-scope (Founder, supported by Platform-eng and Architect)

Remove "Publishing to public npm" from Out of Scope. The extraction delivers zero community value if packages are not publicly installable. At minimum, Phase 1 leaf packages go to public npm. Define registry strategy (npm org, scope, access level).

### MA-05 — Account for compilation-host (Architect)

The 10+7 model has no package for compilation-host logic, but the SDK re-export section references it. Define where compilation-host goes: does it merge into execution? Stay in compiler-sdk as wiring? Become an 11th core package? Currently it is orphaned.

### MA-06 — Add fleet test scenarios (Platform-eng)

Add 3 fleet scenarios to Scenario Coverage:
- `fleet/drift-detection-17-packages`
- `fleet/targeted-broadcast`
- `fleet/upgrade-rollback`

## Warning Findings

| # | Finding | Role(s) | Description |
|---|---------|---------|-------------|
| W05 | Gateway startup benchmark | All 3 | Define pre-extraction baseline and 200ms threshold |
| W06 | Budget in governance consumer impact | Architect | agent-sdk must now depend on full governance; document this |
| W07 | No rollback strategy | Platform-eng | Define `claws doctor --rollback` for partial upgrade failures |
| W08 | No emitter contribution guide | Founder | Plan should include emitter plugin contribution guide as deliverable |
| W09 | MIT license not specified | Founder | Explicitly state all packages are MIT; LICENSE in every tarball |
| W10 | Registry strategy undefined | Platform-eng | "Internal registry" is not defined (GitHub Packages? Artifactory?) |

## Note Findings

| # | Finding | Role | Description |
|---|---------|------|-------------|
| N11 | Headline says 12 areas | Architect | H1 says 12, plan delivers 10+7 |
| N12 | Relax standalone viability | Founder | Monitor — merge into eval if zero standalone adoption after 6 months |
| N13 | Execution + skill-resolver coupling | Architect | Monitor — split if claws skills gets unwanted execution dep |

## Severity Summary

| Severity | Count |
|----------|-------|
| Must-address | 6 (MA-01 through MA-06) |
| Warning | 6 (W05 through W10) |
| Note | 3 (N11 through N13) |
| **Total** | **15** |

## Path to PASS

The plan needs these changes for R3 approval:

1. **Rewrite for consistency** (MA-01): Every section uses 10+7 names. Extraction phases rewritten. 30 minutes of editing.
2. **Add canonical import declaration** (MA-02): One paragraph. 5 minutes.
3. **Add compatibility manifest** (MA-03): New section describing `@craftworks/platform` manifest package. 15 minutes.
4. **Move public npm in-scope** (MA-04): Move from Out of Scope to Deliverables with phase-aligned rollout. 10 minutes.
5. **Account for compilation-host** (MA-05): One paragraph explaining where it goes. 5 minutes.
6. **Add fleet scenarios** (MA-06): 3 scenario entries in Scenario Coverage. 5 minutes.

Estimated effort to reach PASS: ~70 minutes of plan editing. No architectural changes needed. The 10+7 model is sound.

## Comparison: R1 to R2

| Metric | R1 | R2 | Trend |
|--------|----|----|-------|
| Total findings | 41 | 15 | Improved |
| Must-address | 19 | 6 | Improved |
| R1 consensus resolved | -- | 1/6 | Needs work |
| Model verdict | Reject 25, propose 10-12 | Affirm 10+7 | Converging |
| Blocking issues | Package count (25) | Internal consistency | Improved |

The hard architectural question (how many packages?) is resolved. What remains is document quality and operational completeness. The plan is one revision away from approval.
