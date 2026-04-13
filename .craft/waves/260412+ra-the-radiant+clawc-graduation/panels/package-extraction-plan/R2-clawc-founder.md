# R2 Review: claws Founder

**Plan**: craftworks-package-extraction
**Date**: 2026-04-11
**Round**: 2
**Role**: claws/founder (Cluster A — Community trust > Enterprise revenue)

## R1 Consensus Finding Disposition

### C01 — Consolidate to domain-based packages [5/5 roles]

**Status: PARTIAL**

The 10+7 model is a significant improvement. 10 core packages + 7 emitter plugins is a catalog that a contributor can hold in their head. When someone visits our npm page, they see 17 packages with clear names — not 25 mixed-abstraction names that require an architecture degree to navigate.

The emitter split is particularly good for the community. A contributor who builds a CrewAI integration only needs to understand `@craftworks/codegen` and `@craftworks/emit-crewai`. They do not need to understand forma, governance, or execution. This is real progressive disclosure.

**The plan is not internally consistent.** The Package Map says 10+7 but the Extraction Strategy and SDK re-export sections still describe 25 packages. This is confusing for a contributor reading the plan. If a community member reads "How claws Uses This" and sees `@craftworks/oc-readers` + `@craftworks/oc-ir` + `@craftworks/audit-chain` + `@craftworks/normalize` + `@craftworks/platform-detect`, they see 6 packages. The actual model says `@craftworks/forma` + `@craftworks/crypto` + `@craftworks/workspace` = 3 packages. The plan tells two different stories.

### C02 — Define a canonical import path [4/5 roles]

**Status: UNRESOLVED**

For the community, this is a trust issue. If our documentation shows two import paths without declaring which is canonical, contributors will pick randomly. Half the ecosystem will import from `@craftworks/forma`, half from `@craftworks/compiler-sdk`. Skill authors will copy-paste from whichever example they find first. The result is a fragmented ecosystem where "how do I import X?" has two valid answers.

R1 consensus was: direct import is canonical. The plan needs to say this explicitly and commit to it in documentation, examples, and generated code.

### C03 — Compatibility manifest for fleet operations [3/5 roles]

**Status: UNRESOLVED**

I care about this from a different angle than platform-eng. For the open-source community, version compatibility confusion is the #1 reason people abandon a package ecosystem. If a contributor installs `@craftworks/forma@1.2.0` and `@craftworks/governance@1.4.0` and gets a cryptic runtime error because those versions were never tested together, we lose that contributor forever. npm's peer dependency mechanism is insufficient — a compatibility manifest (or at minimum, strict peer deps) is required.

### C04 — Gateway startup benchmark before and after [3/5 roles]

**Status: UNRESOLVED**

Less critical from the community perspective, but still relevant. If extraction makes OpenClaw Gateway startup noticeably slower, the community will notice. OC Gateway users are our largest user segment (3.2M MAU). Even 200ms matters when it happens every time an agent starts.

### C05 — Governance must be one package [4/5 roles]

**Status: RESOLVED**

Correct. One governance package means one version to document, one set of breaking change announcements, one migration guide. The community can follow one CHANGELOG, not two.

### C06 — No "out of scope" on public npm [3/5 roles]

**Status: UNRESOLVED**

This is my strongest finding. The Out of Scope section (line 269) still says:

> "Publishing to public npm (internal registry first, public is a separate decision)"

This directly contradicts the plan's own thesis. The plan says: "A consumer who only needs OC readers doesn't install the monolith." But if the packages are not on public npm, that consumer CANNOT install them at all. The 10+7 model only delivers value if the packages are installable. An internal-only registry means the extraction benefits exactly zero community members.

R1 consensus (3/5 roles) was: core packages target public npm from Phase 1. The plan ignores this.

**Required change**: Move "Publishing to public npm" from Out of Scope to Deliverables. At minimum, Phase 1 leaf packages (`@craftworks/crypto`, `@craftworks/relax`, `@craftworks/eval`) go to public npm. The rest follow as each phase completes.

## Evaluation of the 10+7 Model

### Community catalog assessment

The 10 core packages have good, intuitive names:

| Package | Name clarity | Contributor-friendly? |
|---------|-------------|----------------------|
| `@craftworks/forma` | Good — domain name | Yes |
| `@craftworks/workspace` | Excellent — obvious | Yes |
| `@craftworks/crypto` | Excellent — obvious | Yes |
| `@craftworks/governance` | Good — enterprise-y but clear | Yes |
| `@craftworks/codegen` | Good — familiar term | Yes |
| `@craftworks/relax` | Domain-specific but documented | Acceptable |
| `@craftworks/context` | Good — common concept | Yes |
| `@craftworks/execution` | Good — clear | Yes |
| `@craftworks/eval` | Excellent — obvious | Yes |
| `@craftworks/input` | Good — simple | Yes |

No left-pad-sized packages. No names that require reading an architecture doc to understand. This is a contributor-friendly catalog.

### Emitter plugins as community contribution points

This is where the 10+7 model shines for the community. Each emitter is a natural contribution target:

- A community member who uses Windsurf could contribute `@craftworks/emit-windsurf`
- A community member who uses Aider could contribute `@craftworks/emit-aider`
- The `@craftworks/codegen` base class defines the contract; the emitter implements it

This is the OpenClaw skill model applied to compiler output. The 7 initial emitters are seeds. The community grows the catalog. **This is the right model.**

### Missing: contribution guide for emitter plugins

The plan does not include a "How to contribute a new emitter" guide. If the 7 emitters are seeds, the plan should describe the plugin contract: what interface to implement, how to register, how to test, and how to submit. Without this, the "community grows the catalog" story is aspirational.

### Are there merges that should split, or splits that should merge?

**One question: should `@craftworks/relax` merge into `@craftworks/eval`?**

RELAX expressions are primarily used in eval rubrics and governance policies. A standalone RELAX package is useful if someone wants to use the expression language outside of eval/governance. But today, every RELAX consumer also uses eval or governance. If the community use case for standalone RELAX is speculative, it could merge into eval to reduce the package count to 9+7 = 16.

Counter-argument: RELAX is a genuine expression language with its own parser, evaluator, and test suite. Languages deserve their own package. I lean toward keeping it separate but flag it as worth monitoring — if standalone RELAX adoption is zero after 6 months, merge it.

## New Issues Introduced by Consolidation

### N07 — Out of Scope still blocks community value (MUST-ADDRESS)

See C06 above. The plan's Out of Scope section actively prevents the extraction from delivering its stated value to the community. This is not just an omission — it is a contradiction.

### N08 — No emitter plugin contribution guide (WARNING)

The 7 emitters are seeds, but there is no guide for growing the catalog. The plan should include as a deliverable: "docs/craftworks/contributing/emitter-plugin-guide.md — how to create, test, register, and submit a new emitter plugin."

### N09 — MIT license status of extracted packages (WARNING)

The plan does not mention licensing. OpenClaw's MIT license and the community's trust depend on extracted packages being MIT-licensed. This should be explicit: "All @craftworks/ packages are MIT-licensed. The LICENSE file is included in every package's npm tarball."

### N10 — Backward compat section references old names (NOTE)

The Backward Compatibility section (lines 147-155) shows:
```
import { readOCWorkspace } from '@craftworks/oc-readers';
import { FormaIR } from '@craftworks/oc-ir';
```

These should be:
```
import { readOCWorkspace } from '@craftworks/forma';
import { FormaIR } from '@craftworks/forma';
```

Small but matters for documentation correctness.

## Summary

| Finding | Status | Severity |
|---------|--------|----------|
| C01 — Consolidate to domain-based packages | PARTIAL | Must-address |
| C02 — Canonical import path | UNRESOLVED | Must-address |
| C03 — Compatibility manifest | UNRESOLVED | Must-address |
| C04 — Gateway startup benchmark | UNRESOLVED | Warning |
| C05 — Governance as one package | RESOLVED | -- |
| C06 — Public npm from Phase 1 | UNRESOLVED | Must-address |
| N07 — Out of Scope blocks community | NEW | Must-address |
| N08 — No emitter contribution guide | NEW | Warning |
| N09 — MIT license not specified | NEW | Warning |
| N10 — Old names in backward compat | NEW | Note |

**Total: 4 Must-address, 3 Warning, 1 Note**

The 10+7 model is the right model for the community. The emitter plugin architecture creates natural contribution points. The package names are clear and contributor-friendly. But the plan contradicts itself across sections, ignores 4 R1 consensus findings, and — most critically — still defers public npm, which prevents the extraction from delivering any community value at all.
