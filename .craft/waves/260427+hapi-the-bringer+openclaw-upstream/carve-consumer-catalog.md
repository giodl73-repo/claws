# Consumer catalog — pre-carve impact assessment

**Date**: 2026-04-29
**Purpose**: before carving `packages/openclaw-{snap,policy,guardrails}` to conform to the v2 contracts, inventory their consumers so each carve is a known-impact refactor, not a surprise.

## Public API surface (what each package exports today)

| Package | Subpath exports |
|---|---|
| `@bic/openclaw-snap` | `.`, `./cli-handlers` |
| `@bic/openclaw-policy` | `.`, `./runtime`, `./types`, `./cli-handlers`, `./nonce-store`, `./seq-counter`, `./trust-set` |
| `@bic/openclaw-guardrails` | `.`, `./audit`, `./approvals`, `./budget`, `./identity`, `./siem`, `./secrets`, `./handle-binding` |

## Inter-package dependency graph

```
   @bic/openclaw-workspace        @bic/openclaw-guardrails
   (PR-1 substrate, shipped)      (leaf — no openclaw-* deps)
            ↑                              ↑
            │ canonicalize                 │ audit + types
            │                              │
   ┌────────┴───────────────┬──────────────┴───────────┐
   │                        │                          │
   @bic/openclaw-snap   @bic/openclaw-policy            │
            ↑                ↑                         │
            │                │                         │
            └─────claws CLI──┘                         │
                                                       │
                          ┌────────────────────────────┘
                          │
                  e2e tests (heavy use of all three)
```

**Verified clean**: no circular dependencies between snap/policy/guardrails. Earlier broader greps showed cross-references inside docstrings / comments, not actual `import` statements.

## External consumers (production code only — tests excluded)

### `@bic/openclaw-snap`

| File | Subpath used | What it does |
|---|---|---|
| `packages/claws/src/cli.ts` | `.` | claws CLI verb dispatch |
| `packages/claws/src/commands/snap-serve.ts` | `.` | claws-side `snap-serve` subcommand wrapper |

**Total: 2 production consumers.** Both internal to the claws monorepo.

### `@bic/openclaw-policy`

| File | Subpath used | What it does |
|---|---|---|
| `packages/claws/src/cli.ts` | `.` | claws CLI verb dispatch (9-verb policy subcommand group) |

**Total: 1 production consumer** (plus 6+ e2e/integration test files exercising the package).

### `@bic/openclaw-guardrails`

Used heavily by **openclaw-snap and openclaw-policy** (the inter-package dep graph above):

| File | Subpath used |
|---|---|
| `packages/openclaw-snap/src/server/audit.ts` | `./audit` |
| `packages/openclaw-policy/src/nonce-store/persistent-store.ts` | `./audit` |
| `packages/openclaw-policy/src/emit/emit-audit-chain.ts` | `./audit` |
| `packages/openclaw-policy/src/ops/verify-audit.ts` | `./audit` |
| `packages/openclaw-policy/src/ops/types.ts` | `./audit` |
| `packages/openclaw-policy/src/cli-handlers/doctor.ts` | `./audit` |
| `packages/openclaw-policy/src/cli-handlers/verify.ts` | `./audit` |
| `packages/openclaw-policy/src/trust-set/loader.ts` | `./audit` |

**Total: 8 production consumers across snap + policy.** All using the `./audit` subpath only (audit chain, audit entries, verify, sinks).

## Carve impact per package

### `openclaw-snap` → conforms to v2 `SnapshotStore`

**Drop:**
- `src/cli-handlers/serve.ts` (the `snap serve` daemon CLI handler) → folds into upstream's `openclaw snap serve` CLI verb when contract lands
- `src/server/handlers.ts`, `src/server/audit.ts`, `src/server/index.ts`, `src/server/startServer.ts` (HTTP server scaffolding) → folds into upstream's reference plugin under `extensions/snapshot/`

**Keep:**
- `src/store/filesystemStore.ts`, `src/store/inMemoryStore.ts` (the `SnapshotStore` impl bodies)
- `src/canonical.ts` (canonical hashing — composes with PR-1's `@openclaw/workspace/canonicalize`)
- `src/types.ts` (will conform to v2 `SnapshotStore` types after local-fork swap)
- `src/error.ts` (`SnapshotErrorCode` enum already aligned with v2 — verify and pin)

**External consumer impact:**
- `packages/claws/src/cli.ts` → UPDATE. The CLI dispatch needs to point at the new `SnapshotStore` impl entry instead of the daemon-shape registry.
- `packages/claws/src/commands/snap-serve.ts` → UPDATE OR REMOVE. The "claws-side snap-serve" wrapper either becomes a thin wrapper over `openclaw snap serve` (when upstream lands) OR gets removed if the upstream verb is sufficient.

**Risk: LOW.** Two consumer files in claws. Test suite continues to verify the impl.

### `openclaw-policy` → conforms to v2 `PolicyGenerator<CapabilityManifest>`

**Drop:**
- `src/cli-handlers/*` (the 9-verb subcommand) → moves to a downstream `claws/src/commands/policy-*.ts` set; reshape per the trim plan
- The R0-R5 tier system as separate first-class fields → encoded into PolicyIR `denyRules` per `realigned-story.md` "PolicyIR is generic; downstream R5-lowering"

**Keep:**
- `src/generator/`, `src/compile/`, `src/emit/` (the parse/compile/emit pipeline; emits v2 PolicyIR shape)
- `src/governance/`, `src/compliance/` (rule families that encode into PolicyIR `denyRules`)
- `src/runtime/` (the lock-point ABI helpers — composes with v2 `policy-ir-runtime`)
- `src/nonce-store/`, `src/seq-counter/`, `src/trust-set/` (downstream concerns; not in v2 PolicyIR contract)
- `src/ops/`, `src/migrate.ts`, `src/fs-pipeline.ts` (downstream pipeline)

**External consumer impact:**
- `packages/claws/src/cli.ts` → UPDATE. CLI dispatch may need to track the cli-handlers/ relocation.

**Risk: MEDIUM.** One consumer file, but the package is large (6.2k LoC) and the carve internally restructures the PolicyIR shape. Many internal test files will need updating in lockstep.

### `openclaw-guardrails` → adapter + policy-runtime + retained governance bundle

Per `guardrails-adapter.md` (R2 amendment), the carve is mostly ADDITIVE:

**Add:**
- `src/openclaw-adapter.ts` (~50 LoC) — `toTrustedToolPolicy(provider): PluginTrustedToolPolicyRegistration`
- `src/policy-runtime/policy-plugin.ts` (~120 LoC) — registered upstream plugin shell with cache + `evaluate(event, ctx)` lifecycle
- `src/policy-runtime/cache.ts` (~60 LoC) — bounded-LRU cache module per the runtime decisions

**Delete:**
- `src/shell-exec-provider.ts` (~78 LoC) — duplicates upstream's native `~/.openclaw/exec-approvals.json` consumer

**Keep (the 7 subpaths stay UNCHANGED):**
- `audit/`, `approvals/`, `budget/`, `identity/`, `siem/`, `secrets/`, `handle-binding/` — these continue to ship as the claws governance bundle. snap + policy continue importing from `@bic/openclaw-guardrails/audit` exactly as today.

**External consumer impact:**
- `ShellExecProvider` has **zero external consumers** — verified by grep. Only 3 files reference it: the file itself, its export from index.ts, and one default-export-coverage test. Safe to delete.
- `./audit` subpath: snap (1 file) + policy (8 files) consume this. **No changes required** — the subpath continues to ship.

**Risk: LOWEST.** The carve is additive (new adapter + new policy-runtime/ subdir) plus one zero-impact deletion. The 7 subpaths that downstream consumers actually use are untouched.

## Recommended carve order (revised from the original 1.5-day estimate)

1. **`openclaw-guardrails` first** (~1 hour). Lowest risk, most additive. Add adapter + policy-runtime/, delete shell-exec-provider, run tests. This unblocks consumer testing for the next two carves.
2. **Local-fork upstream contracts** (~30 min). New `packages/v2-upstream-fork/` with `snapshot.ts`, `policy-ir.ts`, `hook-types-extension.ts`. Pure types; no runtime.
3. **`openclaw-snap` carve** (~2-3 hrs). Drop daemon/HTTP, keep store impls, conform types to local-fork contract. Update `claws/src/cli.ts` + `claws/src/commands/snap-serve.ts` in same commit.
4. **`openclaw-policy` carve** (~3-4 hrs). Reshape generator to emit v2 PolicyIR. Heaviest internal restructure; many test updates needed in lockstep.
5. **End-to-end integration test** (~2 hrs). Wire all three carved packages together via local-fork contracts. Verify the full chain composes.

**Total revised estimate: 1.0-1.5 days of focused work** (adjusted slightly down from the earlier 1.5-day estimate because the guardrails carve turned out to be lower-risk than expected).

## Open question to resolve before step 3 (snap carve)

`packages/claws/src/commands/snap-serve.ts` — is this command kept (as a thin wrapper over the upcoming upstream `openclaw snap serve` verb) or removed? Removal is cleaner (one source of truth — upstream); keeping it preserves backward compat for anyone scripted against `claws snap-serve`. Leaning toward **remove**, but worth confirming before the carve.

**Resolved 2026-04-29**: removed. The snap carve landed as the two-layer
`SnapshotStore` (immutable bundles) + `RefStore` (per-workspace pointers).
`claws snap *` binds an in-process `filesystemStore` + `workspaceRefStore`
rooted at `<workspace>/.openclaw/snapshots/`; no daemon, no HTTP transport.
See commit `c6f73697`.

## Deferred — remote `SnapshotStore` impl + binding resolver

The carve that just landed is **local-only**. `commands/snap-store.ts:bind()`
unconditionally constructs `filesystemStore` + `workspaceRefStore` from the
workspace root. This is the right default but does NOT cover the production
gateway story.

What's needed in a future wave:

1. **Remote `SnapshotStore` impl(s)** — at least one of:
   - `@bic/openclaw-snap-http` — talks to a deployed `openclaw snap serve`
     instance (the upstream reference plugin, once that PR lands). Restores
     a thin HTTP transport, but as an SDK-conformant client, not the
     daemon-shaped surface we just removed.
   - `@bic/openclaw-snap-s3` (or similar) — writes bundles directly to a
     blob store with conditional-PUT atomicity. Needs a paired
     `StoreColocatedRefStore` (option 2 from the lifecycle discussion).
2. **Binding resolver** — ~30 LoC in `commands/snap-store.ts`:
   ```ts
   function resolveBindings(workspaceRoot: string): Bindings {
     // 1. Env override:    OPENCLAW_SNAP_STORE=<url>
     // 2. Config file:     <workspace>/.openclaw/config.json → snapStore
     // 3. Default:         local filesystemStore + workspaceRefStore
     ...
   }
   ```
   Picks an impl by URL scheme (`http://`, `s3://`, etc.) when overridden;
   otherwise falls through to the local default that ships today.
3. **Gateway-side wiring guidance** — the gateway's policy plugin already
   takes `{ store }` in `PolicyPluginOptions`; the deployment-time choice is
   "which `SnapshotStore` impl do I pass?" Document the local-vs-prod split
   in the gateway integration guide once a remote impl exists.

**Why deferred**: no remote impl exists yet, and adding the resolver scaffold
without a concrete remote to wire it to is yak shaving. The seam is small
(~30 LoC) and lands cleanly with the first remote impl.

**Track this in**: a follow-on wave after the v2 contract chain (PR-1..PR-5)
is upstreamed. Likely candidate: a "snap deployment models" wave that
introduces `@bic/openclaw-snap-http` as the first remote impl alongside the
gateway integration story.
