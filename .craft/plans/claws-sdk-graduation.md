---
slug: claws-sdk-graduation
preset: "claws"
plan: "3 headlines: claws compiles with zero @craftworks/ imports, free tier ships as standalone npm, paid tier unlocks fleet+compliance+SIEM"
area: claws
status: Implemented
phase: ra
atoms: [atom:claws-compiler, atom:governance-ir, atom:pinch, atom:three-rings, atom:obo-boundary]
specs: [CL-01, CL-04, CL-07, CL-08]
---

# claws-sdk Graduation — Standalone Compiler + Freemium Split

## Headlines

1. **H1: `claws compile && claws pinch && claws build` work with zero @craftworks/ imports** — The core compilation pipeline (parse 9 files, extract intents, analyze 29 rules, emit Gateway plugin) runs entirely from claws-sdk internalized code. No compiler-sdk, no agent-sdk at runtime. `npm install @bic/claws-sdk` installs a standalone package.
   - Validation: `npm pack @bic/claws-sdk` → tarball has zero `@craftworks/*` in dependencies
   - Validation: Fresh project: `npm init -y && npm install @bic/claws-sdk && npx claws pinch` works
   - Validation: `grep -r '@craftworks' node_modules/@bic/claws-sdk/` returns zero matches

2. **H2: Free tier ships as `@bic/claws-sdk` on GHE Packages with MIT license at source level** — The core compiler (parse, rules, emit, CLI, skill-kit, test) publishes to the bic-internal GHE Packages registry under `@bic/claws-` scope. Enterprise features (fleet, compliance, SIEM, PRESS compression, RELAX evaluation, identity, budget) remain in `@bic/claws-sdk` as the paid tier.
   - Validation: `@bic/claws-sdk` installs and runs without any `@craftworks/` package
   - Validation: `@bic/claws-sdk` extends `@bic/claws-sdk` with fleet/compliance/enterprise features
   - Validation: License file in `@bic/claws-sdk` says MIT; `@bic/claws-sdk` says proprietary

3. **H3: Paid tier extends free tier — never forks it** — `@bic/claws-sdk` imports from `@bic/claws-sdk` and adds enterprise modules. The paid tier is an extension, not a fork. Core bug fixes ship to both. No code duplication.
   - Validation: `@bic/claws-sdk` package.json has `@bic/claws-sdk` as dependency
   - Validation: Zero source file duplicated between the two packages
   - Validation: `claws pinch` produces identical output regardless of which package is installed

## Summary

After the 3 claws waves (Ptah, Anubis, Thoth) ship, claws-sdk depends on compiler-sdk and agent-sdk for OC readers, IR types, emit infrastructure, eval framework, audit chain, PRESS compression, RELAX evaluation, discovery, and crypto. This plan graduates the core compiler to standalone — internalizing the minimum set of borrowed infrastructure so `@bic/claws-sdk` ships with zero `@craftworks/` dependencies. Enterprise features stay in `@bic/claws-sdk` as the paid upgrade path. This creates a freemium funnel: free compiler → try governance → need fleet/compliance → pay for enterprise.

## The Freemium Boundary

```
  FREE: @bic/claws-sdk (MIT)              PAID: @bic/claws-sdk
  +--------------------------------+       +--------------------------------+
  | Parse (own OC readers)         |       | Fleet ops (scan, broadcast,    |
  | Rules (own 29 G-rules)         |       |   drift, kill, report)         |
  | R5 fail-closed enforcement     |       | Compliance (SOC2, HIPAA,       |
  | Emit: OC + Claude Code         |       |   EU AI Act evidence)          |
  | CLI (compile, pinch, build,    |       | SIEM (CEF, syslog, NDJSON)     |
  |      init, new, annotate)      |       | PRESS compression              |
  | Skill-kit (decorators, mock)   |       | RELAX policy evaluation        |
  | Test (12 checks, 16 scans)    |       | Identity (OIDC/SAML/RBAC)      |
  | Detection (7 platforms)        |       | Budget (tracking, fleet agg)   |
  | GovernanceIR (types, serial)   |       | Audit (RFC3161 timestamps,     |
  | Audit chain (Ed25519 signed)   |       |   fleet aggregation)           |
  | .claws sidecar (own impl)      |       | LSP (claws-lsp server)         |
  +--------------------------------+       | Snapshots (save/restore/diff)  |
           |                               | OntologyIR (compliance ontol)  |
           | extends (never forks)         | Context collections (DAG)      |
           | semver contract: ^1.0.0       | SERVE (API mode)               |
           | pinned with integrity hash    | CI/CD action                   |
           +------------------------------>| Multi-platform emit (5 more)   |
                                           +--------------------------------+

  Security minimum (free tier):            Scale + depth (paid tier):
  - R5 fail-closed (non-negotiable)        - Fleet-wide enforcement
  - Ed25519 local signing                  - RFC3161 timestamps for legal
  - Tamper-evident audit chain             - SIEM streaming
  - 2 emit targets (OC + Claude Code)      - 5 additional emit targets
```

## What Must Be Internalized (Free Tier)

These are the compiler-sdk and agent-sdk modules that the free tier currently imports. Each must be internalized (copied, simplified, or rewritten) into `@bic/claws-sdk`.

### From compiler-sdk (14 modules)

| Module | Current import | Graduation strategy | Effort |
|--------|---------------|---------------------|--------|
| OC workspace readers | `readOCWorkspaceViaFORMA()`, `oc-soul.ts`..`oc-lobster.ts` | **Rewrite**: simplified 9-file reader without FORMA abstraction. ~800 lines | L |
| FORMA format registry | `WorkspaceFormatSchema`, `.claws` sidecar | **Rewrite**: own sidecar resolver, no FORMA dependency. ~200 lines | M |
| FormaIR types | `OCWorkspaceIR`, field types | **Copy + simplify**: take the OC-specific subset. ~400 lines | M |
| PolicyIR types | `PolicyExpression`, rule structures | **Already own**: GovernanceIR replaces PolicyIR. No action | - |
| ToolIR types | `ToolClassification`, capability model | **Inline**: 3 types, ~50 lines. Trivial | S |
| TierIR types | Trust tier model T0-T4 | **Already own**: in `types/platform.ts`. No action | - |
| Emit framework | Platform registry, emitter base | **Rewrite**: 2-target emitter (OC + Claude Code). Multi-platform (5 more) is paid. ~450 lines | M |
| OperationIR TS emitter | TypeScript code generation patterns | **Rewrite**: simplified TS codegen for Gateway plugin. ~500 lines | M |
| PRESS modules | Bipartite split, cache, profiles, quality, rewrite | **Paid only**: PRESS stays in enterprise tier | - |
| RELAX evaluator | Expression parser + evaluator | **Paid only**: RELAX stays in enterprise tier | - |
| LSP patterns | Document cache, project index | **Paid only**: LSP stays in enterprise tier | - |
| Integrity/crypto | AES-256-GCM, HMAC-SHA256, SHA-256, Ed25519 | **Rewrite**: use Node.js `crypto` directly + Ed25519 keypair. ~250 lines | M |
| Cache/snapshot patterns | Layout, manifest, hashing | **Rewrite**: simplified cache with content-hash. ~200 lines | S |
| Compilation host | Workspace analysis, per-file caching | **Rewrite**: simplified compile orchestrator. ~400 lines | M |

### From agent-sdk (8 modules)

| Module | Current import | Graduation strategy | Effort |
|--------|---------------|---------------------|--------|
| Audit hash chain | `hash-chain.ts`, `verify.ts` | **Rewrite**: Ed25519-signed chain (local keys). ~500 lines. RFC3161 timestamps are paid | M+ |
| Audit export | `export.ts` (CEF, JSON, syslog) | **Paid only**: SIEM export stays in enterprise tier | - |
| Eval framework | `rubric.ts`, `assertions.ts`, `judge.ts` | **Rewrite**: simplified 12-check validator without eval engine. ~400 lines. Full eval is paid | M |
| Discovery | `scout.ts`, workspace detection | **Paid only**: fleet discovery stays in enterprise tier | - |
| Budget tracking | `budget.ts`, `budget-tracker.ts` | **Paid only**: budget management stays in enterprise tier | - |
| Gates | `suite/gates/` validation | **Paid only**: fleet gates stay in enterprise tier | - |
| Hashing utilities | `hashing/` SHA-256 | **Rewrite**: use Node.js `crypto` directly. ~30 lines | S |
| GovernanceManager | Runtime governance primitives | **Paid only**: runtime enforcement stays in enterprise tier | - |

### Effort Summary (revised per R1 review)

| Size | Count | Estimated lines | Weeks (1 dev) |
|------|-------|----------------|---------------|
| S (trivial) | 2 | ~230 | 0.5 |
| M (moderate) | 7 | ~3,050 | 4.5 |
| M+ (moderate+) | 1 | ~500 | 1 |
| L (large) | 1 | ~800 | 1.5 |
| BOM/CRLF normalization (R1 Architect M-03) | 1 | ~500 | 0.5 |
| **Total internalize** | **12** | **~5,080** | **8** |
| Paid-only (no work) | 10 | 0 | 0 |

**Note**: Revised from 5 weeks to 8 weeks per R1 review consensus (C3). Original estimate
excluded BOM/CRLF normalization (~500 lines from 40+ scenario findings), Ed25519 signing
(moved from paid to free per C6), and 2-target emit framework (per C4). Package split +
publish adds ~2 weeks. **Total: ~10 weeks for freemium launch.**

## What Stays as Dependency (Paid Tier)

`@bic/claws-sdk` keeps its compiler-sdk and agent-sdk dependencies. It imports `@bic/claws-sdk` for the core and extends with enterprise modules:

```typescript
// @bic/claws-sdk/src/index.ts
// Curated re-exports from free tier (NOT export * — C2 supply-chain fix)
export {
  GovernanceIR, FailMode, CapabilityManifest, GovAnalysis,
  ConflictReport, AuditEvent, MechanicalIntent,
  serialize, deserialize, validateFailModes,
  Platform, EnforcementModel, PlatformCapability,
  // ... explicit list of every re-exported symbol
} from '@bic/claws-sdk';

// Add enterprise extensions (curated, not wildcard)
export { FleetScanner, FleetBroadcaster, DriftDetector } from './fleet/index.js';
export { SOC2Evidence, HIPAAEvidence, EUAIActEvidence } from './compliance/index.js';
export { CEFEmitter, SyslogEmitter, NDJSONEmitter } from './siem/index.js';
export { PRESSCompressor } from './press/index.js';
export { RELAXEvaluator } from './relax/index.js';
export { IdentityBridge, RBACResolver } from './identity/index.js';
export { BudgetTracker, FleetBudgetAggregator } from './budget/index.js';
export { ClawsLanguageServer } from './lsp/index.js';
export { SnapshotManager } from './snapshot/index.js';
export { ContextDAG } from './context/index.js';
export { ClawsServer } from './serve/index.js';
```

### API Stability Contract (R1 review C5)

The free/paid boundary is governed by semver:

- `@bic/claws-sdk` follows semver strictly. Major = breaking, minor = features, patch = fixes.
- `@bic/claws-sdk` pins `@bic/claws-sdk` with exact version + integrity hash:
  ```json
  "@bic/claws-sdk": "1.2.3",
  "@bic/claws-sdk-integrity": "sha512-abc123..."
  ```
- Breaking changes to `@bic/claws-sdk` require a coordinated release of `@bic/claws-sdk`.
- The curated re-export list is the **public API contract** — symbols not in the list are internal.
- Every release runs: `npx publint` (packaging lint) + API diff check against previous version.
- A `CHANGELOG.md` in `@bic/claws-sdk` documents every public API change.

## Alternative: Full Graduation (No Freemium)

If the business decision is "claws must be 100% standalone with zero @craftworks/ at any tier," the additional work is:

| Module | Additional effort |
|--------|-----------------|
| Fleet ops (scan, broadcast, drift, kill) | 3 weeks |
| Compliance (SOC2, HIPAA, EU AI Act) | 2 weeks |
| SIEM export (CEF, syslog, NDJSON) | 1 week |
| PRESS compression (5 modules) | 2 weeks |
| RELAX evaluator | 3 weeks |
| Identity (OIDC/SAML/RBAC) | 2 weeks |
| Budget tracking | 1 week |
| LSP server | 3 weeks |
| Snapshots (save/restore/diff) | 1 week |
| Context DAG | 2 weeks |
| **Total full graduation** | **20 weeks (1 dev)** |

Full graduation = 5 weeks (core) + 20 weeks (enterprise) = **25 weeks**.
Freemium graduation = **8 weeks** core + **2 weeks** package split = **10 weeks total**.

## Coverage Contract

### Specs
- [ ] CL-04 — Internalized compilation pipeline (own readers, own emitters)
- [ ] CL-07 — Remove Praetor integration section (no longer extends, owns)
- [ ] CL-01 — Package split: @bic/claws-sdk (free) vs @bic/claws-sdk (paid)
- [ ] NEW — Freemium boundary specification (what's free, what's paid, extension contract)

### Concept Guides
- [ ] docs/claws/architecture/graduation.md — NEW: internalization strategy, freemium boundary
- [ ] docs/claws/architecture/packages.md — UPDATE: two-package model

### Scenario Coverage
- [ ] graduation/standalone-compile — compile+pinch+build with zero @craftworks/
- [ ] graduation/paid-extends-free — enterprise features import from @bic/claws-sdk
- [ ] graduation/identical-output — same pinch results regardless of package

### Test Tier Targets
| Tier | Target | Rationale |
|------|--------|-----------|
| L0 unit | 40 | Internalized readers, emitters, crypto, cache |
| L1 integration | 15 | Standalone compilation pipeline E2E |
| L2 e2e | 5 | Fresh install → compile → pinch → build |
| L3 acceptance | 3 | Freemium boundary verification |

## Scope

### Phase 1: Internalize Core (8 weeks — revised per R1 review)
- [ ] `@bic/claws-sdk/src/readers/` — Own 9-file OC reader via WorkspaceReader interface (Architect M-01: interface contract, not raw copy)
- [ ] `@bic/claws-sdk/src/readers/normalize.ts` — BOM stripping + CRLF normalization (Architect M-03: ~500 lines from 40+ scenario findings)
- [ ] `@bic/claws-sdk/src/sidecar/` — Own .claws sidecar resolver + detection heuristics split from FORMA (Architect M-02)
- [ ] `@bic/claws-sdk/src/emit/oc-plugin.ts` — Own Gateway plugin emitter for OpenClaw
- [ ] `@bic/claws-sdk/src/emit/cc-plugin.ts` — Claude Code emitter (CLAUDE.md + settings.json) — C4: 2nd target for value demo
- [ ] `@bic/claws-sdk/src/emit/codegen.ts` — Own TS code generation (no OperationIR)
- [ ] `@bic/claws-sdk/src/crypto/` — Ed25519 keypair + HMAC-SHA256 + SHA-256 via Node.js crypto (C6: Ed25519 in free tier)
- [ ] `@bic/claws-sdk/src/audit/` — Ed25519-signed audit chain with tamper detection (C6: not just HMAC)
- [ ] `@bic/claws-sdk/src/enforce/` — R5 fail-closed enforcement (C1: minimum viable security in free tier)
- [ ] `@bic/claws-sdk/src/test/` — Own 12-check validator (no eval framework)
- [ ] `@bic/claws-sdk/src/cache/` — Own content-hash cache (no snapshot patterns)
- [ ] `@bic/claws-sdk/src/host/` — Own compile orchestrator (no CompilationHost)
- [ ] Remove `@craftworks/compiler-sdk` and `@craftworks/agent-sdk` from `@bic/claws-sdk` dependencies

### Phase 2: Package Split
- [ ] `@bic/claws-sdk` — GHE Packages package (bic-internal), MIT license at source level
- [ ] `@bic/claws-sdk` — Re-export @bic/claws-sdk + enterprise modules
- [ ] `@bic/claws-skill-kit` — Already standalone (no changes)
- [ ] `@bic/claws-test` — Internalize eval framework subset, publish standalone
- [ ] `claws-cli` — Detect which package is installed, enable/disable enterprise commands

### Phase 3: Publish
- [ ] npm publish `@bic/claws-sdk` to GHE Packages (microsoft.ghe.com bic-internal)
- [ ] npm publish `@bic/claws-skill-kit` to GHE Packages
- [ ] npm publish `@bic/claws-test` to GHE Packages
- [ ] Getting-started tutorial: "Install claws in 30 seconds"
- [ ] Migration guide: existing @bic/claws-sdk users → no changes needed

## Deliverables

### Scenario Findings (added during wave)
*(empty — populated during implementation)*

## Out of Scope

- Full graduation of enterprise modules (fleet, compliance, SIEM, etc.) — separate plan if needed
- @bic/* upstream-shaped governance packages — that's claws-upstream-contrib plan
- Pricing model / licensing decisions — business decision, not engineering
- npm scope registration — @bic scope already exists on GHE Packages

## Dependencies

- **Requires**: All 3 waves (Ptah, Anubis, Thoth) complete — can't graduate what isn't built yet
- **Blocked by**: Business decision on freemium vs full graduation
- **Enables**: bic-internal rollout of claws as the governance compiler across bic teams

## R1 Review Amendments

Applied 6 consensus findings from R1 review (5 roles, 46 findings):

| # | Finding | Fix applied |
|---|---------|------------|
| C1 | Free tier has no R5 fail-closed — governance theater | Added `enforce/` module to Phase 1. R5 fail-closed is minimum viable security |
| C2 | `export *` supply-chain risk | Replaced with curated re-export list + integrity hash pinning |
| C3 | 5 weeks underscoped | Revised to 8 weeks core + 2 weeks split = 10 weeks total |
| C4 | Single-platform emit kills value prop | Added Claude Code as 2nd free emit target (OC + CC) |
| C5 | No API stability contract | Added semver contract, publint, API diff check, CHANGELOG |
| C6 | HMAC audit cryptographically insufficient | Moved Ed25519 to free tier. Paid keeps RFC3161 + fleet aggregation |

Also addressed: Architect M-01 (WorkspaceReader interface), M-02 (detection heuristics split), M-03 (BOM/CRLF normalization).

## Notes

- The freemium boundary aligns with the adoption funnel: free compiler → try governance → need fleet/compliance → buy enterprise
- "Free" does NOT mean "limited" — the free tier is a fully functional compiler with R5 fail-closed, Ed25519 signing, and 2 emit targets
- The paid tier is about SCALE (fleet, compliance) and DEPTH (PRESS, RELAX, LSP), not about basic functionality or security
- 8 weeks is the core internalization. The package split and publish add ~2 weeks. Total: ~10 weeks for freemium launch
- The free tier CLI shows "Enterprise features available in @bic/claws-sdk" for fleet/compliance commands — this is the upsell surface
- Every bug fix to the core compiler benefits both tiers automatically (curated re-exports, never forks)
- **Security minimum in free tier**: R5 fail-closed + Ed25519 signing + tamper-evident audit. These are not premium features — they are baseline responsible engineering
- Packages publish to GHE Packages (microsoft.ghe.com) under @bic scope — bic-internal only
