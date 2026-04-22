# R1 Review: Craftworks Package Extraction — Architect Lens

**Role**: craft/architect
**Cluster**: D (Structural clarity > Rapid delivery)
**Plan**: craftworks-package-extraction
**Date**: 2026-04-11
**Round**: 1

## Orientation

Evaluating whether the 25-package decomposition produces clean dependency graphs with correct directionality, whether package boundaries land on real architectural seams or arbitrary lines, and whether the thin-SDK model creates clarity or maintenance burden.

## Findings

### F01 — Dependency graph has a hidden diamond through compilation-host [M]
**Severity**: Must-address
**Category**: Dependency structure

The plan's dependency graph shows compilation-host depending on oc-readers, oc-ir, and governance-primitives. emit-framework also depends on oc-ir. Both compilation-host and emit-framework are consumed by the emit-* packages. This creates a diamond: emit-oc -> emit-framework -> oc-ir, and emit-oc -> (transitively via compilation-host) -> oc-ir. If oc-ir has version-specific behavior (e.g., a new IR node type in @2.1), emit-framework and compilation-host might resolve different versions of oc-ir unless npm deduplication handles it perfectly. In monorepo development this works (workspace resolution), but for external consumers installing from npm, diamond dependencies with different semver ranges are the leading cause of "works on my machine" bugs.

**Recommendation**: oc-ir must use exact version pins in all packages that depend on it, or all downstream packages must declare it as a peerDependency. The peerDependency model is correct here: oc-ir is a shared type system, not an implementation detail. Every package that touches IR types should declare `"peerDependencies": { "@craftworks/oc-ir": "^2.x" }`.

### F02 — The plan extracts by origin (compiler-sdk vs agent-sdk), not by architectural seam [M]
**Severity**: Must-address
**Category**: Boundary placement

The package map has two sections: "From compiler-sdk (12 packages)" and "From agent-sdk (6 packages)." This traces the origin of the code, not the architectural boundaries. For example, governance-primitives comes from compiler-sdk and governance-runtime comes from agent-sdk. But architecturally, governance is one domain with two layers (definitions and evaluation). Splitting it across two packages because it currently lives in two SDKs is an incidental boundary, not a structural one. The same applies to eval-framework (agent-sdk) which consumes types from oc-ir (compiler-sdk) — the eval framework is architecturally part of the compilation feedback loop, not a standalone agent concern.

**Recommendation**: Redraw boundaries by domain, not by origin. Governance is one package. The evaluation framework is either standalone (if it genuinely has no compiler deps) or part of the execution domain. The question isn't "which SDK did this code come from?" but "which domain does this code serve?"

### F03 — "SDK becomes thin orchestrator" creates a re-export maintenance tax [W]
**Severity**: Warning
**Category**: Maintenance burden

The plan shows compiler-sdk as `export * from '@craftworks/oc-readers'` times 10 packages plus ~200 lines of wiring. Every time an extracted package adds or renames an export, compiler-sdk must update its re-exports (or use `export *` and hope there are no naming collisions across 10 packages). With 10 packages all `export *`-ing into one namespace, the probability of name collision is non-trivial — two packages might both export a `Config` type, a `parse` function, or a `validate` utility. TypeScript will error on ambiguous re-exports, but only when someone consumes compiler-sdk, not when the individual packages are built.

**Recommendation**: Replace `export *` with explicit named re-exports for compiler-sdk's public API surface. This creates a curated facade rather than an accidental aggregation. Yes, this is more maintenance — but it catches collisions at build time and gives the SDK a deliberate, documented API.

### F04 — oc-readers and oc-ir should be one package [M]
**Severity**: Must-address
**Category**: Boundary placement

The plan splits forma/ into @craftworks/oc-readers (read 9 OC workspace files) and @craftworks/oc-ir (OCWorkspaceIR, FormaIR types, serialization). But reading an OC workspace produces IR types. The reader's return type IS the IR. Splitting them means oc-readers depends on oc-ir for its return types, and any consumer of oc-readers implicitly consumes oc-ir. There's no use case for "I want to read an OC workspace but I don't want the IR types." These are one cohesive unit.

**Recommendation**: Merge into @craftworks/oc (or @craftworks/forma). One package: read workspaces, get typed IR back. Saves one package and eliminates a mandatory transitive dependency.

### F05 — input-resolver placement in Phase 3 suggests misclassified dependency [W]
**Severity**: Warning
**Category**: Dependency ordering

input-resolver depends on oc-readers and crypto. It's placed in Phase 3 (framework packages), but it's structurally a Phase 2 package — it depends only on Phase 1 (crypto) and Phase 2 (oc-readers) packages. Its placement in Phase 3 either means there's an undocumented dependency on a Phase 3 package, or it's misclassified. Misclassification extends the timeline and blocks parallelism.

**Recommendation**: Verify input-resolver's actual dependency set. If it only depends on Phase 1-2 packages, move it to Phase 2 and execute it in parallel with oc-readers.

### F06 — The dependency graph is acyclic but barely — skill-resolver has unclear deps [W]
**Severity**: Warning
**Category**: Dependency structure

skill-resolver depends on oc-ir per the dependency table, but the dependency graph diagram doesn't show it. skill-resolver "discovers skills, resolves ASP, builds dependency graph." ASP resolution likely needs context-dag (for structural operations), governance-primitives (for policy-gated skills), and possibly emit-framework (to resolve platform-specific skills). If these dependencies exist but aren't declared, the extracted package will fail at runtime when it tries to import from packages it doesn't list as dependencies.

**Recommendation**: Audit skill-resolver's actual import graph before extraction. Use `madge` on the current compiler-sdk to map skill-resolver's real dependencies. The plan's dependency table appears incomplete for this package.

### F07 — workspace-discovery and platform-detect overlap [N]
**Severity**: Note
**Category**: Boundary clarity

@craftworks/workspace-discovery (from agent-sdk, "workspace enumeration, marker scanning") and @craftworks/platform-detect (from compiler-sdk, "7-platform detection from markers") both scan workspaces for markers. One discovers workspaces, the other detects their platform. These are adjacent concerns that a consumer would use together: "find all workspaces in this directory and tell me what platform each one is." Separate packages mean separate installs for a single logical operation.

**Recommendation**: Consider merging into @craftworks/workspace (discovery + platform detection). If they're genuinely independent (discovery doesn't need detection, detection doesn't need discovery), keep separate but document the distinction clearly.

### F08 — No shared types package in the graph [M]
**Severity**: Must-address
**Category**: Dependency structure

The dependency graph has no shared types layer. Every package defines its own types and exports them. When emit-framework needs IR types, it imports from oc-ir. When context-dag needs IR types, it also imports from oc-ir. When governance-primitives needs crypto types, it imports from crypto. This works, but it means oc-ir and crypto are not just implementation packages — they're also type providers. Their type definitions ARE the public API contract for the entire ecosystem. This dual role (implementation + type authority) should be explicit.

**Recommendation**: Either (a) make oc-ir and crypto explicitly "type authority" packages with stability guarantees beyond normal semver, or (b) extract a @craftworks/types package that holds the shared interfaces (IR types, crypto types, governance types) with stricter versioning. Option (a) is simpler but requires discipline. Option (b) is more explicit but adds a package.

### F09 — The "zero circular deps" validation needs enforcement, not just checking [N]
**Severity**: Note
**Category**: CI/CD

H1 validates "npx madge --circular shows zero circular deps between extracted packages." This is a point-in-time check. Without CI enforcement, a future PR could introduce a cycle (e.g., context-dag imports from governance-primitives, which already depends on context-dag transitively). The plan should add madge as a CI gate, not just a validation criterion.

**Recommendation**: Add `madge --circular` to the CI pipeline for every PR that touches packages/. Make it a blocking check.

## Summary

The dependency graph is acyclic today but has diamonds through oc-ir that will cause npm deduplication issues for external consumers. Package boundaries follow SDK origin rather than domain architecture — governance, workspace discovery, and forma are split across packages that should be unified. The thin-SDK re-export model works but needs explicit named exports to prevent collision as packages grow. The most impactful consolidations: merge oc-readers + oc-ir, merge governance-primitives + governance-runtime, merge workspace-discovery + platform-detect. This alone drops from 25 to 22, and further emitter consolidation drops to ~12.

| Severity | Count |
|----------|-------|
| Must-address | 4 |
| Warning | 3 |
| Note | 2 |
