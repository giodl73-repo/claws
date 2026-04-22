# R1 Review: Craftworks Package Extraction — Gateway-eng Lens

**Role**: claws/gateway-eng
**Cluster**: B (Runtime performance > Governance completeness)
**Plan**: craftworks-package-extraction
**Date**: 2026-04-11
**Round**: 1

## Orientation

Evaluating whether the 25-package extraction preserves Gateway runtime contracts — latency budgets, fail-open behavior, generated TypeScript quality — and whether fragmenting the SDK into smaller packages introduces startup cost, resolution overhead, or hidden coupling that degrades the production runtime.

## Findings

### F01 — Module resolution overhead from 25 packages at Gateway startup [M]
**Severity**: Must-address
**Category**: Runtime performance

The OC Gateway is a Node.js process. When it loads governance skills, it resolves imports. Today, `import { ... } from '@craftworks/compiler-sdk'` resolves one package.json, loads one index, and Node's module cache handles the rest. After extraction, the same logical import fans out to 10+ packages, each with its own package.json, exports map, and entry point. Node.js module resolution is synchronous and file-system bound. On Gateway startup (which already has 10 restarts in 8 hours as a real scenario), loading 25 packages instead of 2 SDKs adds measurable cold-start latency.

**Recommendation**: Benchmark Gateway startup before and after extraction. The compiler-sdk re-export bundle should pre-resolve all package entries so consumers who import from the SDK pay zero additional resolution cost. Only consumers who import directly from extracted packages should pay the resolution cost. If startup exceeds current baseline by >200ms, bundle the re-exports into a single entry point with no dynamic resolution.

### F02 — emit-oc as a standalone package must preserve Gateway plugin contract [M]
**Severity**: Must-address
**Category**: Runtime contract

The Gateway loads governance skills that are generated TypeScript. These skills use emit-oc (or its internals) to produce openclaw.json modifications. Today, emit-oc is part of compiler-sdk and shares types, caches, and configuration with the compilation host. As a standalone package, emit-oc must carry its own type definitions, its own configuration loading, and its own relationship with the platform registry. If the standalone emit-oc's behavior diverges from what compilation-host expects (because they're now separately versioned), the Gateway could produce governance skills that don't match the workspace state.

**Recommendation**: Define a runtime contract interface (TypeScript interface) between emit-framework/emit-oc and compilation-host. The contract should be in a shared types package (or in emit-framework itself). Both packages depend on the contract, not on each other's internals. Version the contract separately and gate breaking changes.

### F03 — compilation-host thinning must not lose the incremental cache [M]
**Severity**: Must-address
**Category**: Runtime performance

The plan shows compilation-host at ~2000 lines providing "workspace analysis, per-file caching, incremental." The per-file cache is what makes repeated compilations fast — the Gateway re-compiles on policy changes, and without the cache, every compilation is a cold start. If compilation-host is extracted, its cache must remain compatible with the oc-readers and oc-ir packages it depends on. A version mismatch (oc-ir@2.1.0 produces IRs that compilation-host@2.0.0's cache keys don't recognize) would silently invalidate the entire cache, causing performance regression.

**Recommendation**: Cache keys must include package version hashes of all dependencies that contribute to the cached artifact. If oc-ir bumps, the cache automatically invalidates for affected entries rather than silently serving stale results or failing to match.

### F04 — governance-primitives and governance-runtime split creates a runtime seam [W]
**Severity**: Warning
**Category**: Hidden coupling

The plan splits governance into @craftworks/governance-primitives (from compiler-sdk) and @craftworks/governance-runtime (from agent-sdk). The Gateway's before_tool_call hook uses governance at runtime — it evaluates policies (runtime) against rules defined in the workspace (primitives). If primitives and runtime are on different versions, a policy defined with primitives@2.1 might use a gate type that runtime@2.0 doesn't recognize. The fail-mode policy (R1-R2 open, R3-R4 configurable, R5 closed) depends on both packages agreeing on what the risk levels mean.

**Recommendation**: governance-primitives and governance-runtime should either be one package (@craftworks/governance) or have a shared schema package that both depend on. The risk-level enum and gate-type definitions must live in exactly one place.

### F05 — "No breaking changes" claim needs Gateway-specific validation [M]
**Severity**: Must-address
**Category**: Backward compatibility

The plan says "No breaking changes. The extraction is additive." But the Gateway imports from specific subpaths: `@craftworks/compiler-sdk/astro/workspace`, `@craftworks/compiler-sdk/astro/types`. These subpath exports must continue resolving to the same runtime types. If compiler-sdk's re-export changes the shape (e.g., re-exporting a type from oc-ir that has a slightly different generic signature due to separate compilation), TypeScript might accept it but the runtime behavior could differ (different prototype chains, different instanceof checks, different Symbol.for keys).

**Recommendation**: Add a Gateway-specific backward compatibility test: install the current compiler-sdk, capture the runtime types of all Gateway-used exports (using typeof checks and structural assertions), then verify the post-extraction SDK produces identical runtime shapes. TypeScript assignability is not sufficient — runtime identity matters for the Gateway.

### F06 — Transitive dependency depth affects before_tool_call latency [W]
**Severity**: Warning
**Category**: Latency budget

The dependency graph shows: crypto -> audit-chain -> governance-primitives -> compilation-host -> emit-framework -> emit-oc. That's 6 levels deep. A before_tool_call hook that needs to evaluate governance loads the full chain. If each package has its own initialization (config loading, type registration, cache warming), the first invocation pays the full chain's init cost. The 50ms latency budget per hook is tight — 6 packages each doing 10ms of init on first call exceeds it.

**Recommendation**: Lazy initialization is not enough — the first call still pays. Pre-warm the governance chain at Gateway startup (outside the hot path). Document that governance packages must have zero-cost require (no side effects on import) and explicit init() calls that the Gateway controls.

### F07 — The plan doesn't address Gateway hot-reload scenarios [W]
**Severity**: Warning
**Category**: Operational

The Gateway can reload governance skills without full restart (hot-reload). After extraction, hot-reloading a skill that was compiled against emit-oc@2.0 into a Gateway running emit-oc@2.1 could cause subtle mismatches. The hot-reload path must validate that the skill's compiled-against versions match the running Gateway's versions, or at least are compatible.

**Recommendation**: Generated governance skills should embed a version manifest (which @craftworks/ package versions they were compiled against). The Gateway checks this manifest on hot-reload and warns or rejects if there's a mismatch.

### F08 — crypto at 200 lines is too small for Gateway to depend on directly [N]
**Severity**: Note
**Category**: Granularity

@craftworks/crypto at ~200 lines (SHA-256, HMAC-SHA256, Ed25519 wrappers around Node.js crypto) is essentially a utility file. Having the Gateway depend on a 200-line package that wraps builtins adds a dependency with almost no abstraction value. If the Ed25519 signature verification in before_tool_call imports from @craftworks/crypto, it's importing 200 lines of wrappers to call `crypto.verify()`.

**Recommendation**: Merge crypto into audit-chain. The Gateway's Ed25519 verification should come from audit-chain, which provides the meaningful abstraction (signed audit entries) rather than the raw primitive.

## Summary

The Gateway's primary risk from extraction is death by a thousand cuts: startup resolution overhead, cache invalidation from version mismatches, governance split across two packages that must agree on risk semantics, and transitive init costs on the hot path. The plan's "no breaking changes" claim is TypeScript-level true but may not be runtime-level true for Gateway-specific patterns (instanceof, Symbol.for, prototype identity). The key mitigations are: benchmark startup, define runtime contracts between split packages, version-tag the cache, merge governance into one package, and pre-warm the dependency chain at startup rather than on first hook invocation.

| Severity | Count |
|----------|-------|
| Must-address | 4 |
| Warning | 3 |
| Note | 1 |
