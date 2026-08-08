---
pulse: 79
slug: cache-cli
plan: claws-compile-dx
depends_on: [11]
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: [cache-cli/S01, cache-cli/S02]
stage: implementation
test_tiers:
  L0_unit: 8
  L1_integration: 2
  L2_e2e: 1
  L3_accept: 2
test_scope:
  run:
    - "cd claws-sdk && npx vitest run --project unit --coverage src/compiler/cache"
    - "cd claws-cli && npx vitest run --project unit --coverage src/commands/cache"
    - "cd claws-cli && npx vitest run --project integration"
    - "cd claws-cli && npx vitest run --project e2e"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
    - "cd claws-cli && npx tsc --noEmit"
checkpoint: 3
checkpoint_gate: false
specs: [CL-01, CL-04]
source: "claws-compile-dx plan H4; findings from cache-cli/S01-S02 (audit R1)"
---

# Pulse 79: `claws cache` CLI — stats / prune / clear / list

## Objective

Expose the existing `CompilationCache` (pulse 11) through four operator-facing CLI
subcommands per CL-01 v1.2 H4 (Cache CLI management) and CL-04 v1.2 (cache schema
versioning). Add `pruneOlderThan(ms)` and `list()` to the cache API, then wire four
thin CLI commands (`stats`, `prune`, `clear`, `list`) that share a single
`resolveCacheDir()` resolver with the compile path. Every pulse-level finding from
the cache-cli/S01 + cache-cli/S02 scenarios (audit R1, 2026-04-16) is encoded as an
explicit Acceptance Criterion below so the implementing agent can trace behavior
back to the source finding.

## Scenario Findings Applied

Audit source: `.craft/waves/260412+ra-the-radiant+claws-graduation/panels/claws-compile-dx-findings-audit/R1-audit.md`.

| Finding           | Severity | Disposition                                                                            | AC reference            |
| ----------------- | -------- | -------------------------------------------------------------------------------------- | ----------------------- |
| cache-cli/S01-F01 | major    | spec (CL-01 shared contract) → implementation follows shared resolver                  | AC-1                    |
| cache-cli/S01-F02 | major    | spec (CL-01 JSON shape contracts) → versioned JSON schema snapshot tests               | AC-2                    |
| cache-cli/S01-F03 | major    | spec (resolved, CL-01 requires ndjson) → implementation assertion                      | AC-3                    |
| cache-cli/S01-F04 | warning  | spec (resolved, duration `s\|m\|h\|d`) → test-level (this pulse) exercises all 4 units | AC-4                    |
| cache-cli/S01-F05 | warning  | spec (CL-01 `--yes`/prompt) → AC + prompt-skip on empty                                | AC-5, AC-13             |
| cache-cli/S01-F06 | warning  | spec (stable sort key) → AC + unit test                                                | AC-6                    |
| cache-cli/S01-F07 | warning  | spec (`--reset-counters` opt-in) → AC + unit test                                      | AC-7                    |
| cache-cli/S01-F08 | note     | spec (resolved, `version` field) → AC                                                  | AC-2                    |
| cache-cli/S01-F09 | note     | spec (resolved, no-op exit 0) → AC                                                     | AC-11                   |
| cache-cli/S01-F10 | note     | spec (ISO 8601 UTC) → AC + unit test                                                   | AC-8                    |
| cache-cli/S02-F01 | major    | spec (missing dir == empty for reads) → AC + unit test                                 | AC-9                    |
| cache-cli/S02-F02 | major    | spec (concurrent-clear tolerant) → AC + integration test                               | AC-10                   |
| cache-cli/S02-F03 | major    | spec (no-op exits 0) → AC                                                              | AC-11                   |
| cache-cli/S02-F04 | warning  | spec (0 bytes on empty list) → AC + unit test                                          | AC-12                   |
| cache-cli/S02-F05 | warning  | spec (full schema with zero values) → AC + unit test                                   | AC-2                    |
| cache-cli/S02-F06 | warning  | spec (reads don't create dir) → AC + unit test                                         | AC-14                   |
| cache-cli/S02-F07 | warning  | **pulse AC** (prune short-circuit on empty)                                            | **AC-15**               |
| cache-cli/S02-F08 | note     | **test** (strict idempotence across repeated runs)                                     | **AC-16 / L3-S02 test** |
| cache-cli/S02-F09 | note     | **pulse AC** (`clear` prompt skipped on empty)                                         | **AC-13**               |
| cache-cli/S02-F10 | note     | spec (umask-respecting perms on lazy dir create) → AC + unit test                      | AC-17                   |

The two rows marked bold (S02-F07, S02-F08, S02-F09) are the audit's explicit
`findings left for pulse authoring` for pulse 79. Every other row is included so
the implementing agent sees the whole finding set in one place, knows which are
already spec-resolved, and can write direct implementation assertions without
re-reading each scenario file.

## Deliverables

### SDK — cache API extension (`claws-sdk/src/compiler/cache/`)

- [x] `claws-sdk/src/compiler/cache/cache.ts` — add two methods to `CompilationCache`: - `pruneOlderThan(maxAgeMs: number): Promise<PruneResult>` where
      `PruneResult = { removedCount: number; removedBytes: number }`. On an
      empty / missing cache dir, MUST return `{ removedCount: 0, removedBytes: 0 }`
      **without** a full directory traversal (addresses S02-F07). - `list(): Promise<readonly CacheEntryInfo[]>` returning per-entry metadata,
      sorted by `lastAccess` DESC (stable tiebreak on `key` lexicographic)
      per CL-01 v1.2 (S01-F06). On an empty / missing cache dir returns `[]`
      (S02-F01, S02-F04).
- [x] `claws-sdk/src/compiler/cache/types.ts` — add `CacheEntryInfo`:
      `ts
    readonly key: string;
    readonly stage: StageName;
    readonly inputHash: string;
    readonly sizeBytes: number;
    readonly createdAt: string;        // ISO 8601 UTC (S01-F10)
    readonly lastAccessedAt: string;   // ISO 8601 UTC (S01-F10)
    `
      Plus `PruneResult` as above.
- [x] `claws-sdk/src/compiler/cache/resolve.ts` — export `resolveCacheDir(workspaceRoot: string): string` as the **single shared resolver** consumed by both the CLI and the compile path (S01-F01). If the `CompilationCache` ctor currently resolves inline, refactor to go through this function.
- [x] `claws-sdk/src/compiler/cache/clear.ts` (or inline in `cache.ts`) — `clear()` MUST: - tolerate ENOENT mid-traversal (S02-F02) — concurrent callers must not produce errors - preserve `hitCount` / `missCount` counters by default; accept a `resetCounters: boolean` option that, when true, zeros the counters (S01-F07) - create the cache dir lazily IF absent with umask-respecting permissions (S02-F10)

### CLI — command surface (`claws-cli/src/commands/cache/`)

Each command is a thin adapter over the SDK. No business logic in the CLI.

- [x] `claws-cli/src/commands/cache/stats.ts` — `claws cache stats`: - reads `CompilationCache.stats()` and prints a **single JSON object** with
      exactly the 5 fields: `sizeBytes`, `entryCount`, `hitCount`, `missCount`,
      `version` (S01-F02, S01-F08) - on empty cache (incl. missing dir), emits the **full schema with zero values**,
      NOT `{}` (S02-F05) - MUST NOT create the cache directory (S02-F06)
- [x] `claws-cli/src/commands/cache/prune.ts` — `claws cache prune --older-than <duration>`: - duration parser accepts `/^\d+(s|m|h|d)$/` (addresses S01-F04 assertion) - reports `pruned <N> entries (<M> bytes)` to stdout, exit 0 on zero matches (S01-F09, S02-F03) - short-circuits without expensive traversal when the cache dir is empty or missing (S02-F07)
- [x] `claws-cli/src/commands/cache/clear.ts` — `claws cache clear [--yes] [--reset-counters]`: - interactive invocation requires `--yes` OR prompts for confirmation (S01-F05) - confirmation prompt short-circuits when cache is empty — nothing to lose (S02-F09) - `--reset-counters` is opt-in; default preserves `hitCount` / `missCount` (S01-F07) - concurrent-clear tolerant: ENOENT during traversal is not an error (S02-F02) - exit 0 whether cache was populated or already empty (S02-F03)
- [x] `claws-cli/src/commands/cache/list.ts` — `claws cache list [--json]`: - default: human-readable table (`key`, `stage`, `sizeBytes`, `created`, `lastAccess`) - `--json`: **ndjson** (one JSON object per line), NOT a JSON array (S01-F03) - empty cache emits 0 bytes on stdout (S02-F04), exit 0 - timestamps are **ISO 8601 UTC** (`2026-04-16T14:23:00Z`), never epoch seconds or local-TZ (S01-F10) - stable sort by `lastAccess` DESC, tiebreak on `key` lexicographic (S01-F06); sort order documented in `--help` - MUST NOT create the cache directory (S02-F06)
- [x] `claws-cli/src/commands/cache/index.ts` — subcommand router wiring stats/prune/clear/list; invalid flags exit 2 (CL-01 convention)
- [x] Wire the `cache` group into the top-level `claws` CLI command tree

### Tests

- [x] `claws-sdk/tests/compiler/cache/list.unit.test.ts` — L0 (2 tests): 1. empty dir returns `[]` (S02-F01, S02-F04) 2. populated cache returns entries sorted `lastAccess` DESC, ISO 8601 timestamps (S01-F06, S01-F10)
- [x] `claws-sdk/tests/compiler/cache/prune-older-than.unit.test.ts` — L0 (3 tests): 1. all entries new → 0 removed, exit-equivalent-0 return (S01 step 4, S01-F09) 2. some entries older than threshold → correct count removed 3. empty/missing cache → short-circuits without traversal (S02-F07); a spy on fs.readdir confirms it is called **at most once** (early exit)
- [x] `claws-sdk/tests/compiler/cache/clear.unit.test.ts` — L0 (2 tests): 1. `resetCounters: false` (default) preserves hitCount/missCount (S01-F07) 2. ENOENT mid-traversal does not throw (S02-F02); simulate by racing two clears on an fs-mocked dir
- [x] `claws-sdk/tests/compiler/cache/resolve.unit.test.ts` — L0 (1 test):
      single resolver is exported and the compile path imports the **same** function as the CLI (assert by identity / module reference) (S01-F01)
- [x] `claws-cli/tests/commands/cache/stats.unit.test.ts` — L0 (2 tests): 1. populated cache → JSON with all 5 fields, `version` non-empty (S01-F02, S01-F08) 2. empty cache / missing dir → full schema with zero values, NOT `{}` (S02-F05); dir is NOT created (S02-F06) — assert post-run that the dir still does not exist
- [x] `claws-cli/tests/commands/cache/list.unit.test.ts` — L0 (2 tests): 1. empty cache → 0 bytes stdout, exit 0 (S02-F04); dir not created (S02-F06) 2. `--json` emits ndjson (lines are individually JSON-parseable; whole stdout is NOT valid JSON) (S01-F03)
- [x] `claws-cli/tests/commands/cache/prune.unit.test.ts` — L0 (2 tests): 1. duration parser accepts `30s`, `15m`, `24h`, `7d`; rejects `1w`, `abc`, empty (S01-F04) 2. fresh populated cache with `--older-than 1d` removes 0, exit 0, summary line printed (S01 step 4, S01-F09)
- [x] `claws-cli/tests/commands/cache/clear.unit.test.ts` — L0 (2 tests): 1. `--yes` skips prompt; default preserves counters (S01-F05, S01-F07) 2. empty cache invocation without `--yes` does NOT prompt, exits 0 (S02-F09, S02-F03)
- [x] `claws-cli/tests/commands/cache/round-trip.integration.test.ts` — L1 (1 test):
      full S01 sequence: compile 3 fixtures → `stats` (entryCount=3) → `list --json` (3 ndjson lines, sorted) → `prune --older-than 1d` (0 removed) → `clear --yes` → `stats` (entryCount=0). CLI and compile path share the resolved cache dir (S01-F01 end-to-end).
- [x] `claws-cli/tests/commands/cache/concurrent-clear.integration.test.ts` — L1 (1 test):
      two `cache clear` invocations racing on the same populated dir both exit 0 (S02-F02)
- [x] `claws-cli/tests/e2e/cache-roundtrip.e2e.test.ts` — L2 (1 test):
      spawn real `claws` subprocess, run S01 full sequence against a temp workspace with real fs; assert per-step exit codes and output shapes
- [x] `claws-cli/tests/accept/cache-cli-S01.accept.test.ts` — L3 (1 test):
      maps every S01 finding (F01–F10) to a concrete assertion (shared resolver, schema fields, ndjson, duration units, `--yes`, stable sort, counter preservation, `version` present, no-op exit 0, ISO 8601); traces each assertion with `// cache-cli/S01-Fxx` comment
- [x] `claws-cli/tests/accept/cache-cli-S02.accept.test.ts` — L3 (1 test):
      maps every S02 finding (F01–F10) to a concrete assertion, plus the **strict idempotence** check (S02-F08): run the full sequence twice in succession on a fresh temp dir, snapshot stdout + filesystem after each run, assert byte-identical output and identical state

## Acceptance Criteria

### Finding-cited

- [x] **AC-1 — shared resolver (S01-F01)**: CLI commands and the compile path import `resolveCacheDir()` from the same module; no CLI command resolves the cache dir independently. A unit test asserts module-identity.
- [x] **AC-2 — stable JSON schema (S01-F02, S01-F08, S02-F05)**: `cache stats` JSON contains exactly `sizeBytes`, `entryCount`, `hitCount`, `missCount`, `version`. On an empty cache, all five fields are present with zero values (`""` or a version string for `version`; `0` for the others). A schema-snapshot test locks the shape.
- [x] **AC-3 — ndjson list (S01-F03)**: `cache list --json` output is newline-delimited JSON: each line parses independently; the concatenated output does NOT parse as a JSON array.
- [x] **AC-4 — duration units (S01-F04)**: `prune --older-than` accepts `s`, `m`, `h`, `d` units; rejects `w`, `ms`, bare integers with a clear error on stderr and exit code 2.
- [x] **AC-5 — clear confirmation (S01-F05)**: Non-TTY or `--yes` proceeds; interactive TTY without `--yes` prompts and aborts on a "no" response. A test uses a mock stdin.
- [x] **AC-6 — stable sort (S01-F06)**: `cache list` output is sorted by `lastAccess` DESC, tiebreak `key` lexicographic. Documented in `--help`. A unit test with colliding timestamps asserts tiebreak order.
- [x] **AC-7 — counter preservation (S01-F07)**: `cache clear` default preserves `hitCount` / `missCount`; `cache clear --reset-counters` zeros both. Asserted via `stats` before + after both paths.
- [x] **AC-8 — ISO 8601 timestamps (S01-F10)**: Every timestamp emitted by `cache list` matches `/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/`. No Unix epoch seconds, no locale strings.
- [x] **AC-9 — missing dir == empty read (S02-F01)**: `cache stats` and `cache list` on a missing cache dir exit 0, emit zero-state, and do NOT throw ENOENT.
- [x] **AC-10 — concurrent clear tolerant (S02-F02)**: Two simultaneous `cache clear` calls on the same dir both exit 0; neither throws on ENOENT mid-traversal.
- [x] **AC-11 — no-op exits 0 (S01-F09, S02-F03)**: `prune` with zero matches, `clear` on empty, `list` on empty, and `stats` on empty all exit 0 with no stderr output.
- [x] **AC-12 — empty list is 0 bytes (S02-F04)**: `cache list` (and `cache list --json`) on empty cache writes exactly `0` bytes to stdout.
- [x] **AC-13 — empty-clear skips prompt (S02-F09)**: `cache clear` on an empty cache does not prompt even without `--yes`; exits 0.
- [x] **AC-14 — reads do not create dir (S02-F06)**: Running `cache stats` or `cache list` on a workspace with no cache dir leaves the dir absent post-run. Asserted via `fs.existsSync` negative check.
- [x] **AC-15 — prune short-circuits on empty (S02-F07)**: `cache prune --older-than Xd` on empty/missing cache calls `fs.readdir` at most once (fast path); no per-entry `stat` calls. A spy on the fs module verifies call counts.
- [x] **AC-16 — strict idempotence (S02-F08)**: Running the full `cache clear → compile → stats → list → prune → clear` sequence twice produces byte-identical stdout and identical filesystem state both times.
- [x] **AC-17 — umask-respecting perms (S02-F10)**: When the cache dir is lazily created (e.g., by a compile run or by an explicit write path), its permissions match the process umask. A unit test sets a known umask and asserts the resulting mode.

### Standard quality gates

- [x] `cd claws-sdk && npx tsc --noEmit` exits 0
- [x] `cd claws-cli && npx tsc --noEmit` exits 0
- [x] `cd claws-sdk && npx vitest run --project unit --coverage src/compiler/cache` passes per-file 95/90/95/95 (stmts/branches/funcs/lines)
- [x] `cd claws-cli && npx vitest run --project unit --coverage src/commands/cache` passes per-file 95/90/95/95
- [x] `cd claws-cli && npx vitest run --project integration` all green (2 integration tests added by this pulse)
- [x] `cd claws-cli && npx vitest run --project e2e` green (1 e2e test added)
- [x] `npm run build` from repo root exits 0
- [x] cache-cli/S01 and cache-cli/S02 L3 acceptance tests pass; every finding in each scenario traced to a concrete assertion

## Dependencies

- **Pulse 11** (CompilationCache implementation) — this pulse extends the existing cache API with `pruneOlderThan` + `list` and refactors dir resolution to go through a single shared function
- **CL-01 v1.2** (CLI Surface & Schema) — `claws cache` subcommand surface + shared contract + per-subcommand MUSTs landed in the findings audit; this pulse implements those contracts
- **CL-04 v1.2** (Compilation Pipeline) — cache schema versioning (`keySchemaVersion` on every entry, `version` field in stats output); emit entries written by the compile path since `pulse 11` already carry the version field, so this pulse only surfaces it through `stats`

## Out of Scope

- **Paid-tier cache features** (shared/distributed cache, cross-machine blob storage) — deferred per plan Out of Scope
- **Cache `--migrate` command** (version-mismatch migration) — the `version` field is surfaced so operators can detect mismatches; automated migration is a separate DX pulse
- **`cache export` / `cache import`** — not in the H4 surface; would be a follow-up
- **Snapshot lifecycle commands** (`claws snapshot {...}`) — separate pulse; the `cache clear` contract explicitly leaves `.claws/snapshots/` untouched
- **Interactive TUI for `cache list`** — the table output is plain stdout; any rich terminal UI is follow-up
- **80% wall-clock reduction validation** — belongs to pulse 80 (incremental-stages)
- **Watcher-cache-lifecycle semantics** — belongs to pulse 81 (watch-mode); this pulse's cache commands operate on a static snapshot of the cache at invocation time

## Deferred to other pulses

None. All 20 findings from cache-cli/S01 + S02 are either spec-resolved (and asserted by this pulse's tests) or implemented directly by this pulse. The audit listed S01-F04 (duration units) as "test-level, already spec-resolved" — this pulse's test deliverables cover it.

## Notes

- **Shared resolver seam**: `resolveCacheDir()` should live in `claws-sdk/src/compiler/cache/resolve.ts` so the `claws-cli` commands import it via the SDK rather than duplicating the resolution logic. The existing `CompilationCache` constructor can delegate to it. This keeps the "single source of truth" property enforceable by a module-identity assertion in the unit test.
- **ndjson is 0 bytes on empty**: Resist the temptation to emit `"\n"` or `"[]"` on empty — the contract is 0 bytes (S02-F04). A test that measures stdout length keeps this from regressing.
- **Short-circuit seam**: `pruneOlderThan` should check `fs.readdir(cacheDir, { withFileTypes: true })` once and early-exit if empty; any deeper walk only happens when entries exist. The spy-based test (AC-15) catches a regression where someone adds a per-entry `stat` before the empty check.
- **Counter preservation**: `hitCount` / `missCount` live in a sidecar metadata file (or the cache's manifest). `clear()` without `--reset-counters` MUST rewrite the manifest preserving those values — do NOT delete the manifest file and rely on defaults, or counters silently reset.
- **Umask test isolation**: The AC-17 test must set + restore `process.umask()` to avoid leaking state into other tests; use `beforeEach`/`afterEach` discipline.
- **Accept tests trace findings inline**: Each finding-mapped assertion should carry a `// cache-cli/Sxx-Fyy` comment so a future reader can `grep` for finding IDs. This is the pattern used by pulse 12.5's scenario-trace tests.
