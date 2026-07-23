# claws Package Model

<!-- atom:claws-package-model -->

The claws package ecosystem splits along a single freemium boundary: a free-tier compiler, an enterprise extension that re-exports it, and a layer of contributed primitives the compiler produces output against. This document describes the two `@bic/*` packages and their relationship to the broader `@claws/*` / `@openclaw/*` tier map.

For the three-tier ecosystem (Tier 1 contributed, Tier 2 shared libraries, Tier 3 internal), see `three-tier-packages.md`. This document drills into the `@bic/*` split.

## The two-package freemium model

```
                  +---------------------------------------+
                  |                                        |
                  |   @bic/claws-sdk  (enterprise, UNLICENSED)
                  |   ----------------------------------  |
                  |   + fleet  + compliance  + siem       |
                  |   + press  + relax       + identity   |
                  |   + budget + lsp         + snapshot   |
                  |   + context + serve                    |
                  |                                        |
                  |   re-exports everything below          |
                  |                                        |
                  +-------------------+--------------------+
                                      |
                                      | depends on (pinned, hashed)
                                      v
                  +---------------------------------------+
                  |                                        |
                  |   @bic/claws-sdk  (free, MIT)     |
                  |   ---------------------------------    |
                  |   main entry + 5 subpaths:             |
                  |     ./governance  ./emit  ./audit      |
                  |     ./test        ./cache              |
                  |                                        |
                  |   160 curated public symbols           |
                  |   api-baseline.json enforced           |
                  |                                        |
                  +-------------------+--------------------+
                                      |
                                      | emits output referencing
                                      v
        +-----------------------------+---------------------+
        |                                                   |
        |   @claws/*  (Tier 2, shared libraries, MIT)        |
        |   @openclaw/*  (Tier 1, contributed, MIT)          |
        |                                                   |
        |   Generated output never imports @craftworks/*    |
        |                                                   |
        +---------------------------------------------------+
```

## `@bic/claws-sdk` — the free tier

**License**: MIT. **Registry**: GitHub Enterprise npm (`@bic` scope on `npm.pkg.github.com`). **License posture**: BIC-internal distribution only; the MIT license preserves the option to open-source the compiler later without changing the package manifest.

The compiler is the free tier's complete public API. Every exported symbol is curated in `packages/@bic/claws-sdk/src/index.ts` and the five subpath barrels — no `export *` is used anywhere in the package. The surface is 160 symbols across:

- **Main entry** — compile pipeline, GovernanceIR serialization, R5 fail-closed enforcement, audit chain helpers, platform types
- **`/governance`** — rule registry, capability classification, fail-mode configuration, authorization decisions, approval gate resolution, risk change auditing
- **`/emit`** — two free-tier emit targets (OC + Claude Code), emitter registry, supply-chain guards, Claude Code formatters
- **`/audit`** — Ed25519-signed, SHA-256-chained audit log persistence and verification
- **`/test`** — 12-check free-tier validator for compiled workspaces
- **`/cache`** — compilation cache operator surface

**Supply-chain guards**:

- `tsup` inlines `@bic/claws-sdk` source at build time — the tarball ships with zero `@craftworks/*` runtime dependencies
- `scripts/inline-dts-reexports.ts` bundles transitively reachable declarations into self-contained `.d.ts` files, so `tsc --noEmit` in an isolated tree works without any `@craftworks/*` resolution
- `scripts/generate-api-baseline.ts` reads compiled `.d.ts` via the TypeScript compiler API and writes `api-baseline.json`
- `scripts/check-api-diff.ts` blocks any publish where the baseline drifts without a matching version bump
- `scripts/integrity-hash.ts` computes the `sha512-<base64>` tarball hash that `@bic/claws-sdk` pins

## `@bic/claws-sdk` — the enterprise extension

**License**: UNLICENSED (proprietary). **Registry**: GitHub Enterprise npm (`@bic` scope on `npm.pkg.github.com`). **Private flag**: `true` — the package is not publishable to the public registry by mistake.

The SDK depends on `@bic/claws-sdk` at an exact pinned version (no caret, no tilde) with an `integrityPins` hash recorded in `package.json`. Installing the SDK pulls the compiler transitively and verifies the hash; consumers do not install both packages.

The SDK adds eleven enterprise modules on top of the compiler:

| Module     | Subpath       | What it does                                                  |
| ---------- | ------------- | ------------------------------------------------------------- |
| Fleet      | `/fleet`      | Scan, broadcast, drift detection across 47+ workspaces        |
| Compliance | `/compliance` | SOC 2, HIPAA, EU AI Act evidence builders                     |
| SIEM       | `/siem`       | CEF, syslog, NDJSON emitters                                  |
| PRESS      | `/press`      | Agent-output compression                                      |
| RELAX      | `/relax`      | Typed expression engine for policy rules (enterprise variant) |
| Identity   | `/identity`   | Entra / OIDC bridge, RBAC resolution                          |
| Budget     | `/budget`     | Token/cost tracking, fleet-wide aggregation                   |
| LSP        | `/lsp`        | Language server for claws config authoring                    |
| Snapshot   | `/snapshot`   | Workspace state snapshot / restore                            |
| Context    | `/context`    | Context DAG for multi-workspace dependency resolution         |
| Serve      | `/serve`      | `claws serve` daemon                                          |

The SDK also re-exports every free-tier symbol from `@bic/claws-sdk` at the same subpath. Enterprise consumers' imports work unchanged across the split.

## The freemium boundary

The split is a hard enforcement boundary, not a convention:

1. **Package identity** — free and enterprise code cannot coexist in the same installed tree. `@bic/claws-sdk` already depends on `@bic/claws-sdk`, so installing both produces a duplicate-module warning.
2. **License gate** — `@bic/claws-sdk` is MIT; `@bic/claws-sdk` is UNLICENSED. Anything that requires the compiler to open-source lives there; anything proprietary lives in the SDK.
3. **API contract gate** — moving a symbol from enterprise to free is a major-version bump on `@bic/claws-sdk` because it introduces a new public API. Moving a symbol from free to enterprise is breaking (and requires a major version).
4. **Integrity pin gate** — R1 review C5 requires the SDK to pin the compiler's sha512 hash. Upgrading the compiler in the SDK is a signed-off act.

## Dependency graph invariants

These invariants are enforced by tests and the build:

- `@bic/claws-sdk` has zero `@craftworks/*` runtime dependencies (`tests/exports.unit.test.ts` — "declares zero @craftworks/ runtime dependencies")
- `@bic/claws-sdk` dist ships self-contained `.d.ts` files (`tests/dts-hygiene.unit.test.ts`)
- `@bic/claws-sdk` pins `@bic/claws-sdk` at an exact version (no caret, no tilde) with an integrity hash
- Emit output (`OCEmitter`, `ClaudeCodeEmitter`) never references `@craftworks/*` (`verifyNoCraftworksRefs` — dependency rule #4 from CL-04)

## Versioning

Both packages follow semver independently. The SDK's integrity pin locks a specific compiler release; upgrading the compiler in the SDK is a minor SDK bump (the public surface didn't change) or a major SDK bump (if the compiler introduced a breaking change that propagates). The compiler's `api-baseline.json` diff check catches breakage before a publish lands.

## For the architect

Read the source of truth, not this document. `packages/@bic/claws-sdk/src/index.ts` and the five subpath barrels are the curated contract. `packages/@bic/claws-sdk/api-baseline.json` is the machine-readable snapshot.

## For the platform-eng

The compiler is the distribution unit on every workspace. The SDK is the management plane — it runs on the claws server, in CI, and on the admin workstations, but not on the individual workspaces. `claws watch` on a developer laptop needs only `@bic/claws-sdk`. `claws comply --fleet` runs the enterprise SDK.
