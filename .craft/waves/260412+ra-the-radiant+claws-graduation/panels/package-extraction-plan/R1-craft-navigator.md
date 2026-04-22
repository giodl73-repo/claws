# R1 Review: Craftworks Package Extraction — Navigator Lens

**Role**: craft/navigator
**Cluster**: E (User journey coherence > Implementation simplicity)
**Plan**: craftworks-package-extraction
**Date**: 2026-04-11
**Round**: 1

## Orientation

Evaluating the developer experience of consuming 25 @craftworks/ packages — install story, import path mental model, migration path for existing consumers, progressive disclosure from "just works" to "I want fine-grained control," and whether the naming convention helps or confuses.

## Findings

### F01 — The naming convention mixes abstraction levels [M]
**Severity**: Must-address
**Category**: Naming coherence

The package names span three different abstraction models: (a) capability names that describe what you DO (oc-readers, emit-framework, budget-tracker), (b) domain names that describe architectural areas (governance-primitives, execution-engine, context-dag), (c) platform names that describe WHERE (emit-oc, emit-cc, emit-cursor). A developer browsing the @craftworks/ scope on npm sees: oc-readers, oc-ir, platform-detect, normalize, input-resolver, emit-framework, relax, context-dag, governance-primitives, execution-engine, compilation-host, skill-resolver, audit-chain, crypto, workspace-discovery, eval-framework, governance-runtime, budget-tracker, plus 7 emit-* packages. There is no naming pattern that helps a newcomer understand what to install.

**Recommendation**: Adopt a consistent naming strategy. Either all packages are named by domain (@craftworks/forma, @craftworks/governance, @craftworks/codegen, @craftworks/execution) or all are named by capability (@craftworks/oc-readers, @craftworks/oc-emitters, @craftworks/policy-check). Mixing "context-dag" (implementation detail) with "budget-tracker" (user action) with "normalize" (operation) creates an incoherent catalog.

### F02 — "Import from @craftworks/oc-readers vs @craftworks/compiler-sdk" creates a two-path confusion [M]
**Severity**: Must-address
**Category**: Mental model

The plan proudly shows that both paths work:
```typescript
import { readOCWorkspace } from '@craftworks/compiler-sdk/astro/workspace';
import { readOCWorkspace } from '@craftworks/oc-readers';
```
Two ways to import the same function is not a feature — it's a fork in the documentation, Stack Overflow answers, and LLM training data. Every tutorial, every example, every blog post must choose one path. If half the ecosystem uses compiler-sdk imports and half uses direct imports, refactoring becomes impossible because you can't grep for all callers.

**Recommendation**: Choose a canonical import path and deprecate the other with a timeline. Either: (a) "always import from @craftworks/compiler-sdk" (the bundle is the API) and direct imports are advanced/internal, or (b) "always import from the specific package" and compiler-sdk is a convenience meta-package. Both are fine. Having both as equally valid is not.

### F03 — The migration path for existing consumers is undefined [M]
**Severity**: Must-address
**Category**: Migration

The plan says "No breaking changes. The extraction is additive." But it doesn't address: (a) When should an existing consumer switch from compiler-sdk imports to direct imports? (b) Will compiler-sdk's size stay the same (since it re-exports everything) or shrink (defeating the install benefit)? (c) If a consumer wants the smaller install, what's the step-by-step migration? (d) Will there be a codemod? The plan assumes consumers will "just know" to switch, but inertia means nobody will unless there's an explicit migration guide and tooling.

**Recommendation**: Add a migration section: "If you use compiler-sdk today and want to reduce install size, run `npx @craftworks/migrate` which rewrites your imports to direct packages and updates your package.json." Without a codemod, migration won't happen and the extraction benefits accrue only to new consumers (claws).

### F04 — Progressive disclosure is inverted — complexity is the default [W]
**Severity**: Warning
**Category**: Progressive disclosure

Progressive disclosure says: simple by default, powerful on demand. Today: `npm install @craftworks/compiler-sdk` — done. After extraction, the "simple" path is the same (SDK bundle). But the npm registry shows 25 packages. npm search for "@craftworks" returns 25 results. The README presumably explains the package map. A new developer's first impression is "this ecosystem has 25 packages" — complexity is the first thing they see, even if they only need one install.

**Recommendation**: The npm registry presence matters. If you publish 25 packages, the first impression is 25 packages. Consider whether leaf packages (crypto, normalize, budget-tracker) need to be on public npm at all, or whether they should be workspace-only packages that consumers get transitively. Only publish packages that a consumer would intentionally install.

### F05 — The 54KB claws install claim needs an import map [W]
**Severity**: Warning
**Category**: Validation

H3 says claws drops from ~2MB to ~54KB. But the "How claws Uses This" section shows @claws/compiler importing 6 packages, and @bic/claws-sdk importing 5 more packages. The total install is 6 + 5 = 11 packages, each 200-2000 lines. At ~200 bytes/line of compiled JS, the 11 packages total ~2MB of source. The 54KB claim either counts only @claws/compiler (excluding its dependencies) or assumes aggressive tree-shaking. Either way, the user's node_modules won't be 54KB.

**Recommendation**: Clarify what "54KB" means. Is it: (a) the @claws/compiler package tarball on npm? (b) the total node_modules after install? (c) the bundled output after tree-shaking? Each has a very different DX implication. If it's (a), the install experience is still "npm install @claws/compiler" followed by watching 6 transitive packages download. Be honest about what the user actually sees.

### F06 — Error messages and stack traces will reference package internals [W]
**Severity**: Warning
**Category**: Error experience

Today, a stack trace shows `at readWorkspace (compiler-sdk/src/readers/oc.ts:42)`. After extraction, it shows `at readWorkspace (node_modules/@craftworks/oc-readers/src/oc.ts:42)`. A user who encounters an error must now understand which of 25 packages the error came from, find its issue tracker (same monorepo, but they don't know that), and understand its version. Error messages that reference `@craftworks/governance-primitives` when the user installed `@craftworks/compiler-sdk` create confusion: "I didn't install governance-primitives, why is it in my stack trace?"

**Recommendation**: Add a "source map" or error-context utility that maps package-internal errors back to the SDK-level concept. When a governance-primitives error surfaces through compiler-sdk, the error message should say "compiler-sdk: governance check failed (via @craftworks/governance-primitives@2.1.0)" — context first, package detail second.

### F07 — Documentation must not fragment across 25 READMEs [M]
**Severity**: Must-address
**Category**: Documentation

Each extracted package "gets its own CHANGELOG.md and semver versioning." Presumably also its own README.md. A consumer who wants to understand the governance system now reads: governance-primitives/README.md, governance-runtime/README.md, and compiler-sdk's docs on how governance works end-to-end. Documentation fragmentation is the DX equivalent of code fragmentation — the information exists but nobody can find it. The craft system's documentation strength has been centralized concept guides. 25 package READMEs undermine that.

**Recommendation**: Package READMEs should be minimal (what it does, how to install, link to central docs). All conceptual documentation stays in docs/concepts/ and docs/craftworks/. One place to learn, 25 places to install.

### F08 — No "getting started" journey for the extracted world [W]
**Severity**: Warning
**Category**: Onboarding

The plan has phases, dependency graphs, and validation criteria. It has no user journey: "I'm a skill author who wants to read OC workspaces. What do I install? What do I import? What does my code look like?" The plan assumes the consumer knows the package map. But the whole point of extraction is enabling new consumer profiles (skill authors, claws users, targeted installers). These consumers need a "getting started" guide that starts from their goal, not from the architecture.

**Recommendation**: Define 3 user journeys: (a) "I want to read/write OC workspaces" -> install oc-readers, here's 10 lines of code; (b) "I want to compile governance" -> install compiler-sdk (the bundle), here's the pipeline; (c) "I want to build on claws" -> install @claws/compiler, here's the composition. Each journey is a README section, not a 25-package tour.

## Summary

The extraction is architecturally motivated but experientially undefined. Two import paths for the same function, inconsistent naming across 25 packages, no migration tooling, inverted progressive disclosure (complexity first), and fragmented documentation create a DX that serves the implementer but not the consumer. The key fix is consolidation to fewer packages with consistent naming, a single canonical import path, and goal-oriented documentation. The 54KB claim needs honest accounting.

| Severity | Count |
|----------|-------|
| Must-address | 4 |
| Warning | 4 |
| Note | 0 |
