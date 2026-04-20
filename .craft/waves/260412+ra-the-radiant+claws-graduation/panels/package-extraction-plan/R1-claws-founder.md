# R1 Review: Craftworks Package Extraction — Founder Lens

**Role**: claws/founder
**Cluster**: A (Community trust > Enterprise revenue)
**Plan**: craftworks-package-extraction
**Date**: 2026-04-11
**Round**: 1

## Orientation

Evaluating whether 25-package extraction serves the open-source community or fragments it, whether "source of governance primitives for the OC ecosystem" is defensible, and whether the timeline and phasing are realistic.

## Findings

### F01 — Open-sourcing building blocks is the moat, not the risk [M]
**Severity**: Must-address
**Category**: Strategic positioning

The plan says extracted packages like @craftworks/oc-readers and @craftworks/crypto become independently installable. This is the right call. The community has 13,729 skill authors who could use oc-readers without buying claws. But the plan marks npm publish as "out of scope" and says "internal registry first, public is a separate decision." That hedge undermines the entire strategic thesis. If these packages never go public, claws graduation gains nothing from extraction that a simple internal refactor wouldn't provide. The moat is community adoption of the building blocks. Delaying public publish means someone else builds equivalent packages and the community adopts those instead.

**Recommendation**: Phase 1-2 leaf and core packages should target public npm from day one. Crypto, normalize, oc-readers, oc-ir are foundational and non-controversial. Gate the governance/execution packages if needed, but the readers are table stakes.

### F02 — 25 packages is ecosystem fragmentation, not ecosystem building [M]
**Severity**: Must-address
**Category**: Community experience

A contributor who wants to read OC workspaces today installs one package. Under this plan, they must decide between @craftworks/oc-readers, @craftworks/oc-ir, @craftworks/normalize, and @craftworks/platform-detect. Four packages to do what one did. Multiply by 25 packages and the contributor faces a wall of micro-dependencies they didn't ask for. The npm ecosystem's worst failure mode is "left-pad syndrome" — hundreds of tiny packages with unclear ownership and unclear value. OpenClaw's community chose simplicity. 25 @craftworks/ packages in the registry is the opposite of simple.

**Recommendation**: Consolidate to 8-10 packages that map to user-facing capabilities, not internal architecture. @craftworks/oc-toolkit (readers + IR + normalize + detect), @craftworks/governance (primitives + runtime), @craftworks/codegen (framework + all emitters), @craftworks/eval (framework + rubric), @craftworks/crypto (stays small), @craftworks/audit (chain + budget). Users pick by what they want to DO, not by which internal module the code came from.

### F03 — "Can the user rm -rf and walk away?" test fails at 25 deps [W]
**Severity**: Warning
**Category**: Vendor lock-in

The founder lens asks: can the user uninstall this? With 25 @craftworks/ packages wired into their dependency tree, uninstalling becomes archaeology. Which 6 did claws install? Which 4 did a skill author pull in transitively? The dependency graph in the plan shows deep transitive chains (crypto -> audit-chain -> governance-primitives -> compilation-host -> emit-framework -> emit-oc). A user who installs @craftworks/emit-oc gets 6 transitive deps. That's fine for an SDK, but the plan sells these as independently installable leaf packages. They're not leaves — they're a DAG.

**Recommendation**: The "independently installable" claim needs an asterisk. Document the transitive depth for each package. Packages with 3+ transitive @craftworks/ deps are not independently installable in any meaningful sense — they're modules of a framework.

### F04 — No contributor experience section [M]
**Severity**: Must-address
**Category**: Community friction

The plan has scope, deliverables, and dependency graph. It has zero mention of how contributors interact with 25 packages. Where do they file bugs? One repo or 25? How do they run tests across packages? How does a contributor who fixes oc-readers verify they didn't break compilation-host? The monorepo approach helps, but the plan doesn't describe the contributor workflow at all. This is an extraction plan written entirely from the consumer's perspective. Contributors are the community.

**Recommendation**: Add a "Contributor Experience" section: single repo, single `npm test` runs all, single issue tracker, cross-package CI, how to add a new test to an extracted package, how to verify backward compat.

### F05 — ~15 weeks is optimistic for 25 package extractions [W]
**Severity**: Warning
**Category**: Timeline

Each package extraction involves: package.json, move source, move tests, update imports, verify backward compat, verify standalone tests. That's 6 steps times 25 packages = 150 discrete tasks. Phase 2 alone has 5 packages in 3 weeks — each package needs a full CI setup, exports map, and integration verification. The plan says "extraction, not rewrite. Same code, new package boundaries. Minimal risk." But package boundary extraction always surfaces hidden coupling. The plan itself acknowledges crypto might merge into audit-chain, suggesting the boundaries aren't as clean as assumed.

**Recommendation**: Budget 20 weeks and build in a consolidation checkpoint after Phase 2. If Phase 2 reveals that boundaries are messier than expected, that's the natural decision point to merge packages and reduce from 25 to 10-12.

### F06 — The @openclaw/* upstream contribution story is absent [M]
**Severity**: Must-address
**Category**: Ecosystem strategy

The plan extracts into @craftworks/ scope. But the founder's mandate includes upstream @openclaw/* packages (audit-chain, budget-meter, identity-bridge). If @craftworks/audit-chain and @openclaw/audit-chain are the same code with different scopes, that's confusing. If they're different, that's duplication. The plan doesn't address how extracted packages relate to the upstream contributions described in the claws design.

**Recommendation**: Define the relationship explicitly. Either (a) @craftworks/ packages ARE the upstream candidates, renamed to @openclaw/ when contributed, or (b) @openclaw/ packages are purpose-built subsets. The community needs to know which packages are "ours" vs "craftworks-internal."

### F07 — Per-platform emitters as 7 separate packages is premature [N]
**Severity**: Note
**Category**: Granularity

7 emit packages (emit-oc, emit-cc, emit-cursor, emit-copilot, emit-bedrock, emit-langgraph, emit-crewai) at 300-500 lines each are too small to justify independent versioning and npm overhead. A user who wants to emit for 3 platforms installs 4 packages (framework + 3 emitters). The emitters are tightly coupled to emit-framework's base class and registry. They should be plugins loaded at runtime, not separate npm packages.

**Recommendation**: Bundle all emitters into @craftworks/codegen. If dynamic loading is needed later (third-party emitters), define a plugin interface within the single package.

### F08 — "Bug fixes propagate automatically through npm semver" is a promise, not a mechanism [W]
**Severity**: Warning
**Category**: Maintenance

H3 validates that "Bug fix in @craftworks/oc-readers -> npm update in @claws/compiler -> fix propagated." This only works if: (a) semver ranges are configured correctly, (b) no breaking changes sneak in as patch bumps, (c) consumers actually run npm update. With 25 packages versioned independently, the combinatorial surface for version mismatches is enormous. The plan doesn't describe a versioning strategy — independent semver, or lockstep?

**Recommendation**: Define the versioning strategy. Independent semver with 25 packages requires a compatibility matrix. Lockstep versioning (all bump together) is simpler but defeats the purpose of independent packages. A middle ground: version by phase group (leaf packages move together, framework packages move together).

## Summary

The extraction idea is sound — claws graduation needs it. But 25 packages optimizes for internal architecture rather than community experience. The founder lens says: if a contributor would be confused by the package map, the boundaries are wrong. Consolidate to 8-10 user-facing capability bundles, publish core packages to public npm from Phase 1, define the upstream @openclaw/* relationship, and add a contributor experience section. The 15-week timeline is tight; budget 20 with a Phase 2 checkpoint.

| Severity | Count |
|----------|-------|
| Must-address | 4 |
| Warning | 3 |
| Note | 1 |
