---
role: craft:architect
round: 1
plan: claws-sdk-graduation
date: 2026-04-11
verdict: CONDITIONAL — 3 MUST findings require resolution before implementation
tension: "Structural clarity > rapid delivery"
---

# R1 Review — craft:architect — claws-sdk-graduation

## Summary

The graduation plan proposes a clean freemium split: `@claws/compiler` (free, MIT) extends into `@bic/claws-sdk` (paid, proprietary). The "extends, never forks" headline is architecturally sound in principle, but the internalization strategy carries structural risks that could undermine the goal. The plan underestimates the coupling depth of the forma layer, proposes copy-and-simplify where wrapping would be safer, and leaves the sidecar implementation split unclear. The 3,430-line estimate is plausible for the happy path but does not account for the test surface or the normalization pipeline that claws-parse already mandates.

## Findings

### M-01: "Copy + simplify" OC readers will diverge from upstream forma within one release cycle

**Severity**: MUST

The plan proposes rewriting simplified 9-file readers (~800 lines) without the FORMA abstraction. The existing readers in `compiler-sdk/src/astro/readers/` (oc-soul.ts through oc-lobster.ts) are 12+ files totaling substantial logic, and they evolve with every upstream OC format change. A simplified copy creates a fork in everything but name. When OC adds a new field to TOOLS.md or changes AGENTS.md schema, the fix must be applied in two places with no shared test infrastructure.

**Alternative**: Create a thin `@claws/oc-readers` internal package that re-exports the subset of compiler-sdk reader output types claws needs. During graduation, this package vendors the reader source (a true copy), but the package boundary makes it explicit. Better yet: define a `WorkspaceReader` interface in `@claws/compiler` and provide a default implementation that reads OC files directly (no FORMA). If compiler-sdk ever exposes its readers as a separate package, `@claws/compiler` can swap implementations.

**Action**: Define a `WorkspaceReader` interface contract before writing any reader code. The interface, not the implementation, is the graduation boundary.

### M-02: Removing FORMA removes format auto-detection — no replacement proposed

**Severity**: MUST

FORMA (`compiler-sdk/src/astro/forma/`, ~9,772 lines) provides format detection, schema validation, amendment pipelines, error recovery, and delta caching. The plan says "Rewrite: own sidecar resolver, no FORMA dependency. ~200 lines." But FORMA does more than sidecar resolution — it detects whether a workspace is OC, Cursor, Copilot, etc. The plan's own freemium boundary diagram shows "Detection (7 platforms)" in the free tier. Without FORMA, how does the free tier detect which platform a workspace uses? 200 lines cannot replicate detection for 7 platforms.

**Alternative**: Split the concern. Platform detection is a small, stable function (read a few marker files). FORMA's value is in the full parse-validate-amend pipeline, which claws does not need for its own readers. Internalize only the detection heuristic (~100 lines of marker-file checks) and the sidecar resolver (~100 lines). Document explicitly that the free tier detects platforms but only parses OC files — detection is informational, not functional.

**Action**: Add a "platform-detect.ts" module to the internalization table with a clear scope: marker-file detection only, no schema validation, no amendment pipeline.

### M-03: 3,430-line estimate excludes the normalization pipeline mandated by claws-parse

**Severity**: MUST

The claws-parse plan lists 40+ scenario findings that the internalized readers must handle: BOM stripping across 3 encodings, CRLF normalization, two-pass parsing, per-file parser isolation, error recovery, diagnostic codes, tool name normalization, and collect-all-errors strategy. These are not optional — they are already committed as findings in the parse plan. The graduation plan's "~800 lines for 9-file reader" does not account for this normalization layer, which is easily 400-600 additional lines plus 15-20 additional unit tests.

**Action**: Revise the effort table to include a "normalization pipeline" row (M effort, ~500 lines, 1 week) that covers BOM/CRLF/encoding handling, or explicitly state that the internalized readers delegate to the normalization layer already designed in claws-parse.

### W-01: The "extends, never forks" contract has no enforcement mechanism

**Severity**: WARN

The plan states `@bic/claws-sdk` re-exports everything from `@claws/compiler` and adds enterprise modules. This is the correct pattern, but there is no CI check proposed that verifies the contract. Without enforcement, a developer adding a fleet feature could accidentally import from `compiler-sdk` directly instead of from `@claws/compiler`, creating an invisible fork. The test tier targets list 3 L3 acceptance tests for "freemium boundary verification" but do not specify what they check.

**Action**: Add a concrete CI check: `grep -r '@craftworks/compiler-sdk' @bic/claws-sdk/src/` must return zero matches (enterprise modules import only from `@claws/compiler` or `@craftworks/agent-sdk`, never from `compiler-sdk` directly). Add this to the Coverage Contract.

### W-02: Simplified emit framework (OC-only) duplicates patterns that already exist in 40+ emitters

**Severity**: WARN

The emit directory in compiler-sdk has 40+ platform emitters with a shared emit core, template system, and sidecar infrastructure. The plan proposes rewriting "simplified single-target emitter, ~300 lines." But the Gateway plugin emitter in claws-emit already uses compiler-sdk's emit patterns (OperationIR TS emitter, template rendering, hook-emitter). Internalizing a simplified version means the free tier cannot later add a second emit target (e.g., Cursor rules) without either re-importing from compiler-sdk or expanding the simplified emitter. This makes the "detection for 7 platforms but emit to 1" boundary fragile — the moment a user asks "why can't I emit to Cursor?" the answer is "buy the enterprise tier or wait for us to rebuild emit infrastructure."

**Action**: Consider whether the freemium upsell for multi-platform emit is worth the architectural cost. If yes, document explicitly that adding a second free-tier emit target requires either re-importing compiler-sdk emit infrastructure or a significant rewrite of the simplified emitter. This is a business decision, not a technical one, but the plan should make the tradeoff visible.

### W-03: Feature flags in a shared codebase would be cheaper than two code paths

**Severity**: WARN

The plan creates two separate packages with two separate dependency trees. An alternative: ship a single `@claws/sdk` package where enterprise features are gated by a license key or feature flag. Unlicensed installations get the free tier behavior. This eliminates the internalization effort entirely (no code copying), maintains a single dependency on compiler-sdk/agent-sdk, and reduces the maintenance surface from two packages to one. The trade-off is that the free tier would `npm install` more than it uses and would have `@craftworks/*` in its dependency tree (which the plan explicitly forbids).

The plan's H1 validation ("zero @craftworks/ in dependencies") is a strong product signal — it tells potential adopters that claws is independent. But it comes at 5 weeks of internalization work plus ongoing maintenance. The architect lens asks: is the structural cost justified by the product signal?

**Action**: Add a "Decision Record" section to the plan that explicitly captures this tradeoff and the business rationale for choosing two packages over feature flags. Without it, a future maintainer will ask why.

### W-04: The paid tier's `export * from '@claws/compiler'` re-export creates a wide public API surface

**Severity**: WARN

The paid tier re-exports everything from the free tier plus its own modules. This means `@bic/claws-sdk` exposes every internal type and function from `@claws/compiler` as part of its own public API. If `@claws/compiler` adds an internal helper function, it becomes part of the paid tier's API too. This makes semver management difficult — a breaking change in an "internal" free-tier module is a breaking change for all paid-tier consumers.

**Action**: Use named re-exports instead of `export *`. Define an explicit public API surface for `@bic/claws-sdk` that selectively re-exports from `@claws/compiler`. This is a one-time cost at package split time.

### W-05: Cache/snapshot internalization (~200 lines) ignores incremental compilation host complexity

**Severity**: WARN

The plan lists "Rewrite: simplified cache with content-hash. ~200 lines" and "Rewrite: simplified compile orchestrator. ~400 lines." But the claws-parse plan already commits to incremental compilation features: "TOOLS.md change invalidates agents with 'all' delegation" (PC1-S05-F03), delta-cache patterns, and per-file caching in the compilation host. A "simplified" cache that only does content-hashing will not support the invalidation graph that incremental compilation requires. This means either (a) the free tier does not support incremental compilation, or (b) the cache must be more sophisticated than estimated.

**Action**: Decide and document whether incremental compilation is a free-tier feature. If yes, revise the cache estimate upward (~400-500 lines). If no, add it to the paid tier boundary diagram.

### N-01: The audit chain split (HMAC free, Ed25519 paid) is clean and well-scoped

**Severity**: NOTE

The plan correctly separates basic audit (HMAC chain) from cryptographic audit (Ed25519 + RFC3161 timestamping). This is one of the cleanest boundary decisions in the plan. The free tier provides tamper evidence; the paid tier provides non-repudiation. This maps well to the adoption funnel.

### N-02: Phase ordering is correct — internalize before split

**Severity**: NOTE

The three phases (internalize core, package split, publish) are correctly sequenced. Trying to split packages before internalization would create circular dependencies. The plan gets this right.

### N-03: The "Full Graduation" alternative section is valuable for business decision-making

**Severity**: NOTE

Including the 25-week full-graduation estimate alongside the 5-week freemium estimate gives business stakeholders a clear cost comparison. This should be preserved in the final plan.

## Verdict

The plan's architecture is directionally correct — "extends, never forks" is the right relationship between free and paid tiers. The three MUST findings address risks that would compound into significant maintenance burden if unresolved: reader divergence (M-01), missing platform detection (M-02), and underestimated normalization work (M-03). The WARN findings represent architectural trade-offs that should be documented as decisions, not left implicit. Resolve the three MUSTs and document the WARNs before moving to implementation.

| Severity  | Count  |
| --------- | ------ |
| MUST      | 3      |
| WARN      | 5      |
| NOTE      | 3      |
| **Total** | **11** |
