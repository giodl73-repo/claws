# Graduation: The Internalization Strategy

<!-- atom:claws-graduation-strategy -->

This document explains why `@bic/claws-sdk` was carved out of `@bic/claws-sdk`, what moved, what stayed, and how bug fixes propagate across the boundary.

For the consumer-facing migration steps, see `docs/claws/migration/graduation-guide.md`.

## The problem

Before CP-4 of the Ra wave, every claws consumer pulled `@bic/claws-sdk` — a monolith mixing the compile pipeline, the governance IR, eleven enterprise modules, and the Craftworks compiler infrastructure. Three tensions surfaced as the internal rollout scaled:

1. **License posture** — the compiler is the free-tier value the org wants to seed broadly. Its license must be explicit (MIT). The enterprise modules are proprietary (UNLICENSED). One package, two licenses is incoherent.
2. **Supply-chain surface** — every consumer got every symbol. There was no way to say "you only need to compile, not manage a fleet." The dependency graph pulled `@craftworks/*` references into consumer tsconfig resolution, even for consumers who only called `compile()`.
3. **Semver contract** — `@bic/claws-sdk` is compiler infrastructure; its public API churns as the compiler evolves. A consumer wanting stability had no version pin to trust.

## The internalization strategy

Rather than fork the compiler or freeze an API snapshot, the split **internalizes** the surface:

- The free-tier value (compile, governance, emit, audit, test, cache) gets a new package, `@bic/claws-sdk`, with a curated public API and a machine-readable baseline
- The enterprise value (fleet, compliance, SIEM, PRESS, RELAX, identity, budget, LSP, snapshot, context, serve) gets `@bic/claws-sdk`, which re-exports the compiler and adds proprietary modules on top
- `@bic/claws-sdk` remains as the compiler source of truth — it is compiled into `@bic/claws-sdk` at build time and shipped with the dist

This is **extension**, not **fork**. There is one canonical implementation of `compile()`. The `@bic/*` packages are distribution artifacts; the behavior lives in `@bic/claws-sdk`.

## What moved, what stayed

### Moved into `@bic/claws-sdk` (free tier, MIT)

- The compile pipeline entry point (`compile`, `CompileOptions`, `CompileResult`, `CompileDiagnostic`, `CompileStage`)
- GovernanceIR serialization and hashing (`serialize`, `deserialize`, `hashIR`, `hashRaw`)
- R5 fail-closed enforcement (`OC_POLICY_E001`, `validateFailModes`, `FailMode`, `RuleLevel`)
- The audit chain helpers (`signAuditEntry`, `verifyAuditEntry`, `appendAuditEvent`, `readAuditChain`, `resolveActor`)
- Platform capability detection (`Platform`, `EnforcementModel`, `PlatformCapability`)
- The governance rule registry and classification (`/governance` subpath)
- The two free-tier emitters (`OCEmitter`, `ClaudeCodeEmitter`) and the supply-chain guard (`verifyNoCraftworksRefs`)
- The audit persistence layer (`/audit` subpath)
- The 12-check free-tier validator (`/test` subpath)
- The compilation cache operator surface (`/cache` subpath)

See `docs/claws/migration/api-mapping.md` for the full inventory.

### Stayed in `@bic/claws-sdk` (enterprise, UNLICENSED)

- Fleet management (scan, broadcast, drift)
- Compliance evidence builders (SOC 2, HIPAA, EU AI Act)
- SIEM emitters (CEF, syslog, NDJSON)
- PRESS compression, RELAX evaluator
- Identity / SSO bridge and RBAC resolution
- Budget tracking (per-workspace, fleet-aggregated)
- Language server (`ClawsLanguageServer`)
- Snapshot manager, context DAG, claws serve daemon

The SDK's `src/index.ts` re-exports every free-tier symbol from `@bic/claws-sdk` at the same subpath, so enterprise consumers migrate without touching imports.

### Stayed in `@bic/claws-sdk` (internal source)

The whole compiler implementation. `@bic/claws-sdk` is a curated distribution layer — its `src/` barrel files are thin re-exports (`export { compile } from '@bic/claws-sdk'`). The build inlines the dependency at publish time so the tarball is self-contained.

## The extension-not-fork principle

The discipline that holds the architecture together:

1. **One canonical implementation** — `@bic/claws-sdk` is the source of truth. `@bic/claws-sdk` and `@bic/claws-sdk` must never diverge behaviorally from it.
2. **No internal shims** — the `@bic/*` packages do not wrap, adapt, or "improve" `@craftworks/*` functions. Every public symbol is a direct re-export.
3. **Build-time inlining, not runtime re-delegation** — `tsup` bundles `@bic/claws-sdk` into the `@bic/claws-sdk` tarball. Consumers install one package, not two. The dist has zero `@craftworks/*` runtime deps.
4. **Curated surface is the only editable boundary** — when the compiler changes, the `src/index.ts` files in `@bic/claws-sdk` and `@bic/claws-sdk` are the only places a reviewer decides whether the change reaches the public.

Forking would mean `@bic/claws-sdk` gets its own implementation. That is a non-goal. The cost of keeping two implementations in sync is exactly the tax an extension-not-fork strategy avoids.

## How bug fixes propagate

A bug in `compile()` is fixed in `@bic/claws-sdk`. The next build of `@bic/claws-sdk` picks up the fix through the build-time inline. The SDK, which depends on the compiler at a pinned version, pulls the fix on its next release.

Concretely:

1. Fix lands in `claws-sdk/src/compiler/host.ts` (or wherever in `@bic/claws-sdk`)
2. `@bic/claws-sdk` version bumps: patch for a non-breaking fix, minor for an additive change, major for a breaking change
3. `@bic/claws-sdk` publishes — `api-baseline.json` diff is checked; `scripts/integrity-hash.ts` emits a new sha512
4. `@bic/claws-sdk` updates its `dependencies["@bic/claws-sdk"]` to the exact new version and its `integrityPins["@bic/claws-sdk"]` to the new sha512
5. `@bic/claws-sdk` publishes — enterprise consumers get the fix on their next install

The integrity pin is the enforcement gate that keeps step 4 honest. Without it, the SDK could quietly pull a different compiler build than the one it was tested against.

## Why not publish publicly

Both `@bic/*` packages publish to `microsoft.ghe.com/bic-internal/claws` on the GitHub Enterprise npm registry. There is no `npm.js.org` launch planned. The BIC-internal audience is the product audience, and the GHE registry is the distribution channel. Keeping the same `@bic` scope for both packages avoids the scope fragmentation that would come with a public launch.

If a public launch becomes the right move later, the MIT license on `@bic/claws-sdk` preserves that option without a license migration.

## What this does not change

- **No new public runtime behavior** — every symbol behaves exactly as it did in `@bic/claws-sdk` for the free-tier surface. The migration is a rename, not a rewrite.
- **No new test requirements on consumers** — existing test suites keep passing. The migration test (`packages/@bic/claws-sdk/tests/`) is an internal gate, not a consumer obligation.
- **No CLI impact** — `claws-cli` delegates to whichever package is installed. CI pipelines, fleet management, and operator workflows keep working.
- **No change to the three-tier model** — the `@openclaw/*` (Tier 1) and `@claws/*` (Tier 2) packages are unchanged. This split is entirely within Tier 3's distribution layer.

## Invariants going forward

The graduation is durable because these invariants are mechanically enforced:

- `api-baseline.json` + `check-api-diff.ts` block breaking changes without version bumps
- `integrityPins` + `integrity-hash.ts` block SDK / compiler drift
- `verifyNoCraftworksRefs` blocks `@craftworks/*` from leaking into emit output
- `tests/dts-hygiene.unit.test.ts` blocks `.d.ts` references to non-inlined chunks
- `tests/exports.unit.test.ts` blocks undocumented symbols from leaking through the main entry
- `tests/migration-docs.unit.test.ts` blocks the API mapping document from going stale

If any of these mechanisms regresses, the graduation has a path back to monolith-shaped drift. They are the load-bearing tests of the extension-not-fork principle.

## References

- `docs/claws/architecture/packages.md` — the two-package model and dependency graph
- `docs/claws/architecture/three-tier-packages.md` — the full Tier 1 / 2 / 3 ecosystem
- `docs/claws/migration/graduation-guide.md` — consumer-facing migration steps
- `docs/claws/migration/api-mapping.md` — complete symbol inventory
- `packages/@bic/claws-sdk/CHANGELOG.md` — compiler release history
- `packages/@bic/claws-sdk/CHANGELOG.md` — SDK release history
