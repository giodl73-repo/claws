# R2 Review: Craft Architect

**Plan**: craftworks-package-extraction
**Date**: 2026-04-11
**Round**: 2
**Role**: craft/architect (Cluster D — Structural clarity > Rapid delivery)

## R1 Consensus Finding Disposition

### C01 — Consolidate to domain-based packages [5/5 roles]

**Status: PARTIAL**

The plan's Package Map (lines 34-67) correctly consolidates to 10+7. The merges are sound:

- forma = readers + IR (correct — reader returns IR types, inseparable)
- workspace = detect + discover + normalize (correct — one concern)
- crypto = crypto + audit-chain (correct — 200-line wrapper isn't a package)
- governance = primitives + runtime + budget (correct — C05 addressed by including budget)
- execution = engine + skill-resolver (correct — skill discovery is part of task execution)

**However, the plan contradicts itself.** The Package Map section defines 10 merged packages, but three other sections still reference the OLD 25-package names:

1. **"What the SDKs Become"** (lines 108-155): `compiler-sdk` re-exports from `@craftworks/oc-readers`, `@craftworks/oc-ir`, `@craftworks/platform-detect`, `@craftworks/normalize`, `@craftworks/emit-framework`, `@craftworks/context-dag`, `@craftworks/governance-primitives`, `@craftworks/compilation-host`, `@craftworks/skill-resolver`. These packages do not exist in the 10+7 model. Should be `@craftworks/forma`, `@craftworks/workspace`, `@craftworks/codegen`, `@craftworks/context`, `@craftworks/governance`, `@craftworks/execution`.

2. **"How claws Uses This"** (lines 159-178): References `@craftworks/oc-readers`, `@craftworks/oc-ir`, `@craftworks/audit-chain`, `@craftworks/normalize`, `@craftworks/platform-detect`, `@craftworks/context-dag`, `@craftworks/emit-framework`, `@craftworks/governance-runtime`, `@craftworks/eval-framework`. Again, old names.

3. **"Extraction Strategy" phases** (lines 183-218): Every phase lists old package names. Phase 1 lists `@craftworks/normalize`, `@craftworks/budget-tracker`, `@craftworks/workspace-discovery` — none of which exist in the 10+7 model.

This is a **structural contradiction**. The plan says 10+7 in one section and 25 in three others. A developer following the Extraction Strategy phases would extract the wrong packages.

**Required fix**: Rewrite the SDK re-export section, claws composition section, and all 6 phases to use the 10+7 package names.

### C02 — Define a canonical import path [4/5 roles]

**Status: UNRESOLVED**

The plan shows both import paths (lines 147-155) and says "no breaking changes" but never declares which is canonical. R1 consensus was: "Direct import is canonical. SDK is a convenience meta-package." The plan needs a one-line declaration: "Canonical import: `@craftworks/{package}`. SDK re-exports are convenience only."

### C03 — Compatibility manifest for fleet operations [3/5 roles]

**Status: UNRESOLVED**

No mention of `@craftworks/platform` manifest package or any tested-together version matrix. With 17 independently-versioned packages, fleet operators need a compatibility manifest. This was a hard requirement from 3 roles.

### C04 — Gateway startup benchmark before and after [3/5 roles]

**Status: UNRESOLVED**

No mention of a pre-extraction startup benchmark or the 200ms regression threshold. The plan jumps straight into extraction phases with no measurement baseline.

### C05 — Governance must be one package [4/5 roles]

**Status: RESOLVED**

The Package Map merges governance-primitives + governance-runtime + budget into a single `@craftworks/governance` package (~2200 lines). This directly addresses the version mismatch risk. Well done.

However, note the contradiction: the Extraction Strategy (Phase 2, Phase 3) still lists `@craftworks/governance-primitives` and `@craftworks/governance-runtime` as separate extraction targets. This undermines the resolution.

### C06 — No "out of scope" on public npm [3/5 roles]

**Status: PARTIAL**

The Out of Scope section (line 269) still says: "Publishing to public npm (internal registry first, public is a separate decision)." R1 consensus was that core packages (forma, workspace, crypto) should target public npm from Phase 1. The plan acknowledges R1 but has not updated its Out of Scope section.

## Evaluation of the 10+7 Model

### Are the 10 core merges correct?

**9 of 10 are correct. 1 needs scrutiny.**

The questionable merge is **execution = engine + skill-resolver**. Skill resolution (finding skills by ASP pattern) and task execution (stage-task graph, quality gates) are related but serve different consumers. `claws` needs skill resolution for `claws skills` but does not need the full execution engine. If skill-resolver stays in execution, `claws skills` must depend on the entire execution package. Consider whether skill-resolver should be its own leaf package or merge into context instead.

### Are the 7 emitter plugins justified?

**Yes.** This is the right granularity. Emitters are the consumer-facing cherry-pick point. A Bedrock customer should not install Cursor codegen. The emitters are small (~300-500 lines), rarely change, and have a single dependency (`@craftworks/codegen`). The maintenance overhead is proportional to the value.

### Does the dependency graph avoid diamonds?

**Cannot fully verify.** The dependency graph (lines 79-103) is incomplete — it shows rough structure but not the precise edges for all 17 packages. Specifically:

- `@craftworks/governance` depends on `@craftworks/crypto` (for hashing). Does it also depend on `@craftworks/context`? If so, does anything else create a diamond through both paths?
- `@craftworks/execution` merges skill-resolver. Skill-resolver originally depended on `@craftworks/forma` (oc-ir). Does execution now depend on forma? If so, the graph has an undocumented edge.

The plan should include a precise adjacency list, not just an ASCII sketch.

### Is the effort estimate realistic?

**No — the phases are internally inconsistent.** The Phase descriptions total 15 weeks but reference 25 packages, not 17. If the phases are rewritten for 17 packages, the effort should be lower (fewer extractions), but the merges add integration complexity (combining code from different source directories into one package). Net estimate: 12-14 weeks is realistic. The plan should update.

## New Issues Introduced by Consolidation

### N01 — `compilation-host` disappeared (MUST-ADDRESS)

The R1 model included `compilation-host` as a separate package. The 10+7 model does not mention it at all. Where does compilation-host logic go? It is referenced in the SDK re-export section (line 121: `@craftworks/compilation-host`) but is not in the Package Map. This is an orphan — code that exists but has no extraction target.

### N02 — Budget merged into governance without justification (WARNING)

R1 proposed `@craftworks/budget` as a standalone package (line 52 of R1-consolidated). The 10+7 model merges it into governance. Token counting has different consumers (agent-sdk uses budget; governance-runtime uses governance). If budget is inside governance, agent-sdk must depend on the full governance package. This may be correct (budget IS a governance concern) but needs explicit justification for the consumer impact.

### N03 — Headline H1 says "12 areas" but the plan delivers 10+7 (NOTE)

Headline H1 (line 6) says "Each of the 12 design/compiler/ areas maps to one npm package." The actual plan maps to 10+7. The headline needs updating to match the revised model.

## Summary

| Finding                                    | Status     | Severity     |
| ------------------------------------------ | ---------- | ------------ |
| C01 — Consolidate to domain-based packages | PARTIAL    | Must-address |
| C02 — Canonical import path                | UNRESOLVED | Must-address |
| C03 — Compatibility manifest               | UNRESOLVED | Must-address |
| C04 — Gateway startup benchmark            | UNRESOLVED | Must-address |
| C05 — Governance as one package            | RESOLVED   | --           |
| C06 — Public npm from Phase 1              | PARTIAL    | Must-address |
| N01 — compilation-host orphaned            | NEW        | Must-address |
| N02 — Budget in governance consumer impact | NEW        | Warning      |
| N03 — Headline mismatch                    | NEW        | Note         |

**Total: 5 Must-address, 1 Warning, 1 Note**

The 10+7 model is structurally sound, but the plan document is internally contradictory. Three major sections still describe the 25-package model. Four R1 consensus findings remain unresolved. The plan needs a consistency pass before it can be approved.
