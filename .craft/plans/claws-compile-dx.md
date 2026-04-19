---
slug: claws-compile-dx
preset: "claws"
plan: "5 headlines: watch mode, incremental compile, fleet parallel compile, cache CLI management, hot-reload hook surface for Horus"
area: claws
status: Implemented
atoms: [atom:incremental-compile, atom:watch-mode, atom:fleet-parallel-compile, atom:cache-cli, atom:hot-reload-hooks]
specs: [CL-01, CL-04, CL-14]
---

# claws-compile-dx — Watch, Incremental, Fleet, Cache CLI, Hot-Reload Hooks

## Headlines

1. **H1: `claws watch` auto-rebuilds on file change** — developer saves SOUL.md (or any of the 9 OC files) and emit output is updated within 1 second. The watcher uses a single debounced chokidar (or node:fs.watch) process, reuses the in-process `CompilationCache` singleton, and prints per-change compile summaries to stdout.
   - Validation: `claws watch` in a fixture workspace; edit `SOUL.md`; assert emitted `plugins/claws-governance/index.ts` mtime is newer within 1000ms
   - Validation: a 10-edit rapid-fire burst coalesces into ≤3 compile runs (debounced)
   - Validation: Ctrl-C exits cleanly; no orphaned watcher or node process remains

2. **H2: Incremental compile skips unchanged subsystems** — when only `lobster.yaml` changes, the skills/memory/soul/identity/heartbeat reader stages short-circuit on cached IR, only the lobster-reader + downstream dependents re-run. Stage timings surface the skip in compile output.
   - Validation: compile a workspace, capture stage timings; touch `lobster.yaml`; compile again and assert soul/tools/agents/memory/identity/user/heartbeat/skills reader stages report `cacheHit: true` with 0ms work
   - Validation: total wall-clock for a lobster-only change is ≥80% lower than the from-scratch baseline on the canonical fixture
   - Validation: changing `SOUL.md` correctly invalidates the soul-reader cache entry but keeps everything else cached

3. **H3: Fleet parallel compile** — `claws fleet compile <dir>` compiles every workspace under the directory in parallel with a per-workspace cache, reporting per-workspace success/failure without short-circuiting the batch on any single failure.
   - Validation: run against a fleet of 3 workspaces (one broken, two healthy); assert the two healthy compiles succeed and the broken one reports a structured failure
   - Validation: wall-clock is < sum of the three individual compile times (parallel execution proven)
   - Validation: `--max-concurrency N` flag caps in-flight compiles; verify via process-count snapshot during a 10-workspace run

4. **H4: Cache CLI management** — `claws cache {stats, prune, clear, list}` expose cache internals to the operator, sharing the same `CompilationCache` API the compile path uses.
   - Validation: `claws cache stats` prints JSON with `sizeBytes`, `entryCount`, `hitCount`, `missCount`, `version`
   - Validation: `claws cache prune --older-than 7d` removes entries with `lastAccess` > 7 days old; reports count removed
   - Validation: `claws cache list --json` emits one line per cache entry with key, size, timestamps
   - Validation: `claws cache clear` empties the cache directory and returns exit 0

5. **H5: Hot-reload hook surface ready for Horus** — a typed `CompilerEventBus` emits structured events at every compile stage (`compile.start`, `read.complete`, `enforce.denied`, `emit.start`, `emit.complete`, `validate.failed`, `compile.complete`, `compile.failed`), published via a new public subpath `./compiler/events`. The hook surface is the seam Horus wave's hot-reload integration consumes to connect compile output to a live OC Gateway session.
   - Validation: subpath export `@bic/claws-sdk/compiler/events` resolves; `import { CompilerEventBus, CompilerEvent } from '@bic/claws-sdk/compiler/events'` type-checks clean
   - Validation: unit test registers a listener on a fresh `CompilerEventBus`, drives a compile, asserts every expected event fires in order with typed payloads
   - Validation: CL-14 amendment documents the event contract; Horus wave's hot-reload plan references §9 `CompilerEventBus` directly

## Summary

Give claws the compilation-forest DX features developers expect — file-watch auto-rebuild, dependency-tracked incremental recompile, fleet parallel compile, cache management CLI, and a typed compile-event bus. The first four land in Ra's remaining checkpoints (amended into CP-3/CP-4/CP-7). The fifth (H5) lands the HOOK interface and subpath export in Ra so the Horus wave's hot-reload integration has a stable contract to build against — the live-reload runtime implementation itself is explicitly a Horus deliverable, not Ra's.

## Coverage Contract

### Specs
- [ ] CL-01 (CLI Surface) — add `claws watch`, `claws cache {stats, prune, clear, list}`, `claws fleet compile` to the command surface
- [ ] CL-04 (Compilation Pipeline) — add §Incremental Stages documenting the per-subsystem cache lookup that precedes each reader stage
- [ ] CL-14 (Emitter Architecture) — add §9 `CompilerEventBus` interface documentation (hot-reload hook contract)

### Concept Guides
- [ ] docs/claws/concepts/watch-mode.md — NEW: how `claws watch` works, debounce behavior, cache integration
- [ ] docs/claws/concepts/incremental-compile.md — NEW: per-subsystem cache entries, dependency rules, what invalidates what
- [ ] docs/claws/concepts/fleet-compile.md — NEW: parallel compile semantics, failure isolation, concurrency controls
- [ ] docs/claws/concepts/cache-management.md — NEW: `claws cache` commands, operator playbook
- [ ] docs/claws/concepts/compiler-events.md — NEW: the CompilerEventBus contract, event payload types, subscriber patterns (Horus hot-reload as canonical consumer)

### Scenario Coverage
- [ ] watch/S01 — single-file edit triggers single compile within debounce window
- [ ] watch/S02 — rapid-fire edits coalesce via debounce (N edits → ≤ceil(N/3) compiles)
- [ ] watch/S03 — Ctrl-C cleanup: no orphan processes, no partial-write state
- [ ] incremental/S01 — lobster-only change: soul/tools/agents/memory/identity/user/heartbeat/skills readers all cacheHit
- [ ] incremental/S02 — SOUL-only change: soul reader invalidates; downstream dependents re-run; siblings cacheHit
- [ ] incremental/S03 — crypto/key rotation invalidates ALL cache entries (key is part of cache key)
- [ ] fleet/S01 — 3-workspace fleet with one broken: 2 succeed, 1 reports structured failure, batch exits non-zero
- [ ] fleet/S02 — `--max-concurrency` caps in-flight compiles; 10-workspace batch with N=3 stays under 3 concurrent
- [ ] cache-cli/S01 — `stats` / `prune --older-than` / `clear` / `list --json` all round-trip cache state
- [ ] cache-cli/S02 — `prune` with no matches exits 0; `clear` on empty cache exits 0
- [ ] hot-reload/S01 — CompilerEventBus emits every stage event for a successful compile; payloads type-check against CompilerEvent union (spec-level validation; Horus wave owns the live-reload integration test)

### Test Tier Targets
| Tier | Target | Rationale |
|------|--------|-----------|
| L0 unit | 20 | Per-command (watch/fleet/cache) unit tests, event-bus listener tests, incremental cache-key derivation |
| L1 integration | 8 | watch + compile pipeline round-trips, fleet concurrency caps, cache CLI touching real filesystem |
| L2 e2e | 5 | End-to-end: `claws watch` against a live fixture, `claws fleet compile` against a real fleet dir, `claws cache` commands |
| L3 acceptance | 3 | Scenario-traced: watch/S01-S03, incremental/S01-S03 bundled, hot-reload/S01 subpath-export acceptance |

## Scope

### Incremental compile — `claws-sdk/src/compiler/host/`
- `claws-sdk/src/compiler/host/compile.ts` — split the monolithic `compile()` function into per-subsystem cached stages. Each of the 9 reader stages (soul, tools, agents, memory, identity, user, heartbeat, skills, lobster) gets its own sub-cache key derived from the input file's content hash. Stage timings surface in the `CompileResult`.
- `claws-sdk/src/compiler/host/stage-cache.ts` (NEW) — per-stage cache wrapper that takes an upstream `CompilationCache` and scopes it to a single stage.
- `claws-sdk/src/compiler/host/types.ts` — extend `CompileResult` with `stageTimings: Record<StageName, StageTiming>`.

### Watch mode — `claws-sdk/src/compiler/watch/`
- `claws-sdk/src/compiler/watch/watcher.ts` (NEW) — single-process file watcher (chokidar or node:fs.watch) that observes the workspace directory, debounces events, and triggers incremental compile on change.
- `claws-sdk/src/compiler/watch/debouncer.ts` (NEW) — coalesce rapid-fire edits into a single compile trigger; default 300ms debounce window.
- `claws-sdk/src/compiler/watch/index.ts` (NEW) — barrel.
- `claws-cli/src/commands/watch.ts` (NEW) — CLI command wrapping the watcher, handling Ctrl-C + writing per-change output.

### Fleet parallel compile — `claws-sdk/src/compiler/fleet/`
- `claws-sdk/src/compiler/fleet/fleet-compile.ts` (NEW) — parallel compile across N workspaces with per-workspace cache isolation; `Promise.all` gated by `p-limit` or native concurrency.
- `claws-sdk/src/compiler/fleet/types.ts` (NEW) — `FleetCompileOptions`, `FleetCompileResult` (per-workspace success/failure + aggregate stats).
- `claws-sdk/src/compiler/fleet/index.ts` (NEW) — barrel.
- `claws-cli/src/commands/fleet-compile.ts` (NEW) — CLI wiring with `--max-concurrency` + progress output.

### Cache CLI — `claws-cli/src/commands/cache/`
- `claws-cli/src/commands/cache/stats.ts` (NEW) — `claws cache stats` → JSON report via `CompilationCache.stats()`.
- `claws-cli/src/commands/cache/prune.ts` (NEW) — `claws cache prune --older-than Nd`; parses duration, calls a new `CompilationCache.pruneOlderThan(ms)` method.
- `claws-cli/src/commands/cache/clear.ts` (NEW) — `claws cache clear`; wraps `CompilationCache.clear()`.
- `claws-cli/src/commands/cache/list.ts` (NEW) — `claws cache list [--json]`; wraps a new `CompilationCache.list()` method.
- `claws-sdk/src/compiler/cache/cache.ts` — add `pruneOlderThan(ms)` and `list()` methods (extends the existing cache API).

### Hot-reload hook surface — `claws-sdk/src/compiler/events/`
- `claws-sdk/src/compiler/events/bus.ts` (NEW) — `CompilerEventBus` class wrapping `EventEmitter` with typed `on(event, listener)` overloads.
- `claws-sdk/src/compiler/events/types.ts` (NEW) — the `CompilerEvent` discriminated union (start, read.*, enforce.*, emit.*, validate.*, complete, failed).
- `claws-sdk/src/compiler/events/index.ts` (NEW) — barrel.
- `claws-sdk/src/compiler/host/compile.ts` — accept optional `CompileOptions.events?: CompilerEventBus` and emit stage events from the host.
- `claws-sdk/package.json` + `claws-sdk/tsup.config.ts` — add `./compiler/events` public subpath (follows the same pattern as `./compiler/emit/ts-builder` from CL-14 §3.2).

## Deliverables

### Specs & Design
- [ ] CL-01 amendment — `claws watch`, `claws cache {stats, prune, clear, list}`, `claws fleet compile` command surface
- [ ] CL-04 amendment — §Incremental Stages + `stageTimings` field on CompileResult
- [ ] CL-14 amendment — §9 CompilerEventBus contract + subpath export
- [ ] 5 concept guides (listed in Coverage Contract)
- [ ] 11 scenario files under `design/claws/scenarios/{watch,incremental,fleet,cache-cli,hot-reload}/`

### SDK Logic
- [ ] `claws-sdk/src/compiler/host/stage-cache.ts` + extend `compile.ts` for incremental
- [ ] `claws-sdk/src/compiler/watch/` (3 files)
- [ ] `claws-sdk/src/compiler/fleet/` (3 files)
- [ ] `claws-sdk/src/compiler/events/` (3 files)
- [ ] `claws-sdk/src/compiler/cache/cache.ts` — `pruneOlderThan` + `list` methods
- [ ] `claws-sdk/package.json` + `tsup.config.ts` — `./compiler/events` subpath export
- [ ] Unit tests: 20 total (listed in Coverage Contract)

### CLI Wiring (claws-cli)
- [ ] `claws-cli/src/commands/watch.ts`
- [ ] `claws-cli/src/commands/fleet-compile.ts`
- [ ] `claws-cli/src/commands/cache/{stats,prune,clear,list}.ts`

### Tests
- [ ] 8 L1 integration tests
- [ ] 5 L2 e2e tests
- [ ] 3 L3 acceptance tests

### Scenario Findings (added during wave)
*(empty — populated during implementation)*

## Proposed Checkpoint Placement (amendments to Ra I + Ra II)

Splits the 5 headlines across existing unstarted Ra checkpoints to save time vs spinning a new wave:

| Headline | Proposed CP | Rationale |
|----------|-------------|-----------|
| H4 Cache CLI | Ra I CP-3 (Package Split) | Small surface (~200 LoC); fits CP-3's package/API work |
| H2 Incremental compile | Ra I CP-4 (Publish) | Foundation for H1; must land before watch mode is useful; CP-4 is light today (2 pulses) |
| H1 Watch mode | Ra I CP-4 (Publish) | Depends on H2; bundles with H2 into CP-4 |
| H3 Fleet parallel compile | Ra I CP-7 (Lobster Collaboration) | Fleet ops are Lobster-adjacent; fits CP-7's fleet story |
| H5 Hot-reload hooks | Ra I CP-4 (Publish) OR Ra II CP-8 (Companion) | The hook SURFACE (interface + subpath export) ships in Ra; Horus wave implements the live consumer |

Out-of-scope for Ra: the hot-reload RUNTIME consumer (live OC Gateway integration that applies recompiled output without session restart) — that's a Horus wave deliverable.

## Out of Scope

- **Live hot-reload runtime integration** — Horus wave consumes the H5 event-bus; Ra only ships the hook interface + subpath export
- **Snapshot lifecycle commands** (`claws snapshot {create, list, restore, diff}`) — pulses 70-72 already in CP-6/CP-7 provide the snapshot API; user-facing CLI is follow-up work
- **Dependency-aware fleet compile** (compile workspaces in topologically-sorted order based on skill imports) — deferred; fleet parallel compile assumes independent workspaces
- **Cache distribution** (shared cache across machines via blob store) — deferred; each machine has its own cache
- **Production watcher with polling fallback** for environments where native file-watch doesn't work (e.g. mounted volumes, WSL edge cases) — deferred to a DX hardening pass
- **Browser-based watch** (claws-lsp integration with VS Code file events) — lives inside CP-10 VS Code extension, tracked separately

## Notes

- **Seams with CL-14 (Emitter Architecture)**: the H5 `CompilerEventBus` subpath export follows the exact pattern v1.2 established for `./compiler/emit/ts-builder` — public subpath, extension-only stability framing, not re-exported from the top-level barrel.
- **Seams with CM-4 cache key**: incremental per-stage cache keys MUST include `compiler.version` (per CL-14 §1.4) so a compiler upgrade invalidates stale stage caches.
- **Seams with CP-5/CP-6 serve APIs**: watch mode and fleet compile are CLI-side DX; the serve APIs are HTTP-side. Both share the CompilationCache singleton but via separate entry points.
- **Horus seam (H5)**: Horus wave's hot-reload plan will import `CompilerEventBus` from the Ra-shipped subpath and register listeners that translate compile events into OC Gateway reload signals. Ra's obligation is stability of the event contract + typed payloads; Horus's obligation is the listener-side runtime.
- **Dependency on CP-2 landing**: incremental compile requires the cache (pulse 11, done) and the content-hash key logic (CM-4 fix in commit 571b937d0); both are already on the branch.
- **Pulse allocation**: this plan probably adds ~5 pulses (one per headline) to the Ra wave. Exact numbering assigned when `/craft:run new` or the `/craft-wave` amendment step runs.
