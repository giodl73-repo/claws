---
pulse: 82
slug: fleet-parallel-compile
plan: claws-compile-dx
depends_on: [11, 12]
governing_roles: [craft:architect, craft:perf-stress]
scenario_codes: [fleet/S01, fleet/S02]
stage: implementation
test_tiers:
  L0_unit: 5
  L1_integration: 3
  L2_e2e: 2
  L3_accept: 2
test_scope:
  run:
    - "cd claws-sdk && npx vitest run --project unit --coverage src/compiler/fleet"
    - "cd claws-sdk && npx vitest run --project integration src/compiler/fleet"
    - "cd claws-cli && npx vitest run --project unit"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
    - "cd claws-cli && npx tsc --noEmit"
checkpoint: 7
checkpoint_gate: false
specs: [CL-01]
source: "claws-compile-dx plan H3; findings from fleet/S01-S02"
---

# Pulse 82: `claws fleet compile` — parallel compile with bounded semaphore + failure isolation

## Objective

Ship `claws fleet compile <fleet-dir>` per CL-01 v1.2 §`claws fleet compile`. Compile
every workspace under `<fleet-dir>` in parallel using a real bounded semaphore,
isolate per-workspace failures into a structured `CompileDiagnostic` discriminated
union, and emit fleet-level observability metrics (peak concurrency, parallelism
ratio, wall-clock totals). The batch MUST NOT short-circuit when any single
workspace fails — every workspace is attempted, and the run reports per-workspace
status regardless.

## Deliverables

- [ ] `claws-sdk/src/compiler/fleet/fleet-compile.ts` — `fleetCompile(fleetDir, options)` orchestrator; walks immediate child dirs containing `lobster.yaml`, schedules compiles through a bounded semaphore, returns `FleetCompileResult` with per-workspace outcomes + aggregate metrics
- [ ] `claws-sdk/src/compiler/fleet/semaphore.ts` — real bounded semaphore (counter + FIFO queue of waiters) with `acquire()` / `release()` + `peakAcquired` observability counter; NOT `Promise.all`-with-chunking
- [ ] `claws-sdk/src/compiler/fleet/discover.ts` — `discoverWorkspaces(fleetDir)` returning immediate child directories containing a `lobster.yaml`, sorted lexicographically
- [ ] `claws-sdk/src/compiler/fleet/diagnostic.ts` — `CompileDiagnostic` discriminated union per CL-01 v1.2: `kind` ∈ {`MissingSoulFile`, `MalformedLobsterYaml`, `MissingFrontmatterField`, `PermissionDenied`, `CompileFailed`, `EmitFailed`, `ValidationFailed`}, `workspace`, `stage`, `message`, `path?`, `exitCode?`
- [ ] `claws-sdk/src/compiler/fleet/types.ts` — `FleetCompileOptions`, `FleetWorkspaceResult` (success | failure discriminated by `status`), `FleetSummary` (totals + `peakConcurrency`, `parallelismRatio`, `wallClockMs`, `maxConcurrency`), `FleetCompileResult`
- [ ] `claws-sdk/src/compiler/fleet/index.ts` — barrel
- [ ] `claws-cli/src/commands/fleet-compile.ts` — CLI wiring with `--max-concurrency <N>`, `--json`, `--stats`; human table output + ndjson mode per CL-01 v1.2 observability contract
- [ ] Wire into top-level `claws` CLI command tree under the `fleet` subcommand group
- [ ] L0 unit: semaphore peak/FIFO, discover lexicographic order, diagnostic union shape, cache isolation guard, arg validation (5 tests)
- [ ] L1 integration: 3-workspace success/failure mix; 10-workspace N=3 concurrency cap; `--max-concurrency 1` serial correctness (3 tests)
- [ ] L2 e2e: ndjson `--json` stream shape; wall-clock scaling band (2 tests)
- [ ] L3 accept: fleet/S01 + fleet/S02 scenario acceptance (2 tests)

## Acceptance Criteria

Every finding from fleet/S01 and fleet/S02 is encoded here as an explicit AC.
The scenario audit (R1) marked 4 AC-level items as spec-resolved; those MUSTs
are already durable in CL-01 v1.2 and implementation MUST satisfy them too.

### Executor semantics (scenario fleet/S01)

- [ ] **AC-01 — Failure isolation (fleet/S01-F01)**: A per-workspace failure MUST NOT short-circuit the batch. Every workspace is attempted. Implementation MUST use `Promise.allSettled`-style semantics OR per-task `try`/`catch` that converts throws into `FleetWorkspaceResult.failure`. **Direct use of `Promise.all` over the workspace task array is forbidden** — reject in code review.
- [ ] **AC-02 — Structured `CompileDiagnostic` (fleet/S01-F02)**: Every failed workspace surfaces a `CompileDiagnostic` object with the exact shape defined in CL-01 v1.2 (`kind`, `workspace`, `stage`, `message`, `path?`, `exitCode?`). No `new Error(string)` leaks into fleet output. Free-form error text in the diagnostic `message` field is fine; the wrapping object is a typed union.
- [ ] **AC-03 — `kind` field coverage (fleet/S01-F02)**: The diagnostic `kind` field MUST produce one of the 7 documented variants. The failure mapping lives in `diagnostic.ts`; unknown internal errors fall back to `CompileFailed` with the original message preserved. Adding a new `kind` is additive-only per CL-01 v1.2.
- [ ] **AC-04 — `stage` field identifies failure point (fleet/S01-F06)**: `CompileDiagnostic.stage` MUST be one of `parse`, `enforce`, `emit`, `validate`. The executor catches at each pipeline boundary and tags the stage on the way out — consumers route remediation by `stage`.
- [ ] **AC-05 — Per-workspace cache isolation (fleet/S01-F03)**: Each concurrent compile MUST receive its own `CompilationCache` instance scoped to that workspace's `.claws/cache/` directory. No shared mutable in-process cache state between concurrent compiles; no shared lock file. Verified by construction — the executor constructs a fresh cache per task.
- [ ] **AC-06 — Atomic cache writes (fleet/S01-F03)**: Cache entry writes use tempfile + rename (already provided by pulse 11 `CompilationCache`). A workspace that fails MUST leave NO cache residue for itself — no partial entries, no stale tempfiles visible after process exit. Verified via fleet/S01 fixture.
- [ ] **AC-07 — Exit codes (fleet/S01-F04, per CL-01 P-174)**: Exit `0` when every workspace succeeds. Exit `2` when at least one succeeded and at least one failed (partial). Exit `1` when zero succeeded OR the fleet-dir itself could not be scanned (ENOENT, ENOTDIR, permission denied on root). Exit `1` on invalid flags per spec §`claws fleet compile`.
- [ ] **AC-08 — SIGINT / SIGTERM graceful shutdown (fleet/S01-F07)**: On signal receipt, the executor MUST stop accepting new work from the queue, let in-flight compiles finish OR cancel them with `AbortController`, and report each workspace as `completed`, `cancelled`, or `not-started` in the final output. No half-written plugin output remains on disk (cache writes are atomic per AC-06).

### Concurrency + observability (scenario fleet/S02)

- [ ] **AC-09 — Real bounded semaphore (fleet/S02-F01)**: `--max-concurrency <N>` MUST cap in-flight compiles via a real semaphore (counter + FIFO waiter queue) in `semaphore.ts`. **Forbidden patterns**: `Promise.all(tasks)` with no gating, `Promise.all(chunks.map(chunk => Promise.all(chunk)))` (artificial chunking that gives worst-of-both ordering), or any scheme that starts all tasks eagerly and hopes the runtime throttles. The semaphore MUST acquire a permit before starting each compile and release it on settle (success OR failure). If `p-limit` is already in `package.json` dependencies, using it is acceptable; otherwise implement the semaphore inline.
- [ ] **AC-10 — Default concurrency = `os.cpus().length` (fleet/S02-F05)**: Absent the `--max-concurrency` flag, the default is `os.cpus().length`. `--help` output documents the default and advises memory budgeting for CI runners per CL-01 v1.2.
- [ ] **AC-11 — `--max-concurrency 1` serial correctness (fleet/S02-F04)**: `--max-concurrency 1` MUST function as serial execution without deadlock. One permit total, acquired + released per task, no synchronous early-return paths that hold the permit forever. Covered by an explicit L1 integration test over 3 workspaces.
- [ ] **AC-12 — Argument validation (fleet/S02-F06)**: Invalid `--max-concurrency` values (`0`, negative, non-integer, `"foo"`) MUST fail at argument parse time with the exact message `"--max-concurrency must be a positive integer"` and exit `1` (per CL-01 v1.2 §`claws fleet compile`). Never silently fall through.
- [ ] **AC-13 — Peak-concurrency counter (fleet/S02-F02, S02-F08)**: The semaphore MUST expose an instrumented peak counter (`peakAcquired`). `peak` means the highest simultaneous in-flight count observed during the run, NOT the steady-state mean. The counter increments on `acquire()` and decrements on `release()`; `peakAcquired` is monotonic non-decreasing across the run.
- [ ] **AC-14 — `FleetSummary` observability payload (fleet/S02-F02, S01-F10, per CL-01 v1.2 observability contract)**: The `FleetSummary` returned from `fleetCompile()` and emitted on `stdout` MUST include: `totalWorkspaces`, `succeeded`, `failed`, `skipped`, `wallClockMs`, `peakConcurrency` (from AC-13), `parallelismRatio` (observed concurrent-work seconds / wall-clock seconds), `maxConcurrency` (the effective cap used).
- [ ] **AC-15 — Lexicographic workspace discovery (fleet/S01-F09, per CL-01 v1.2)**: `discoverWorkspaces(fleetDir)` returns immediate child directories of `<fleet-dir>` containing a `lobster.yaml`, sorted lexicographically (`localeCompare` or `Intl.Collator` with a stable locale). Filesystem `readdir` order MUST NOT leak into output.
- [ ] **AC-16 — Workspace discovery scope**: Only immediate child directories are considered; no recursive walk. A child directory without `lobster.yaml` is silently skipped (not reported as failure). A child file (non-directory) is skipped. This keeps fleet-dir layout contracts simple.

### CLI surface

- [ ] **AC-17 — ndjson `--json` output shape (fleet/S01-F05, per CL-01 v1.2 observability)**: `--json` MUST emit newline-delimited JSON: one `FleetWorkspaceResult` per line (in lexicographic workspace order, which is also compile-start order), followed by a final line containing `FleetSummary`. Each line is valid standalone JSON; no trailing comma, no wrapping array.
- [ ] **AC-18 — Human-readable output shape (per CL-01 v1.2 output contract)**: Without `--json`, stdout prints the header line (`claws fleet compile -- N workspaces, concurrency K`), a per-workspace status line with glyph + path + elapsed ms + diagnostic summary for failures, and a final summary line (`N workspaces: S ok, F failed in Wms`). Summary line includes `peakConcurrency` + `parallelismRatio` when `--stats` is passed.

## Dependencies

- Pulse 11 (`CompilationCache` — atomic write-then-rename) — imported per-workspace via AC-05
- Pulse 12 (compile pipeline with stage boundaries) — the `parse`/`enforce`/`emit`/`validate` boundaries AC-04 tags
- CL-01 v1.2 §`claws fleet compile` — durable command surface + exit codes + `CompileDiagnostic` shape + observability contract

## Test plan

### L0 unit (5)

- [ ] `semaphore.unit.test.ts` — FIFO waiter order, permit acquire/release, `peakAcquired` monotonicity, N=1 serial correctness, permit released on task throw (AC-09, AC-11, AC-13)
- [ ] `discover.unit.test.ts` — lexicographic sort, non-dir filtered, dirs without `lobster.yaml` filtered, ENOENT root returns error (AC-15, AC-16)
- [ ] `diagnostic.unit.test.ts` — all 7 `kind` variants constructable, `stage` ∈ {parse,enforce,emit,validate}, unknown failure maps to `CompileFailed` (AC-02, AC-03, AC-04)
- [ ] `fleet-compile.unit.test.ts` — `Promise.allSettled` path invoked, one task throwing does not cancel siblings, per-task cache instances constructed fresh (AC-01, AC-05)
- [ ] `arg-validation.unit.test.ts` — `--max-concurrency 0 / -1 / "foo"` all reject with exact message + exit 1 (AC-12)

### L1 integration (3)

- [ ] `fleet-mixed-success-failure.integration.test.ts` — 3-workspace fixture (2 healthy, 1 with missing SOUL.md); assert batch does not short-circuit, 2 successes + 1 `CompileDiagnostic.kind: MissingSoulFile` with `stage: parse`, exit code 2 (fleet/S01 AC-01/02/03/04/07)
- [ ] `fleet-concurrency-cap.integration.test.ts` — 10-workspace fixture with `--max-concurrency 3`; assert `peakAcquired` never exceeds 3 via the semaphore's instrumented counter; all 10 succeed (AC-09, AC-13, fleet/S02-F08)
- [ ] `fleet-max-concurrency-1.integration.test.ts` — 3-workspace fixture with `--max-concurrency 1`; assert strictly serial timing (`peakAcquired === 1`), all 3 succeed, no deadlock (AC-11)

### L2 e2e (2)

- [ ] `fleet-json-stream.e2e.test.ts` — spawn `claws fleet compile --json` on a 3-workspace fixture; assert each stdout line is valid JSON, line N-1 is `FleetWorkspaceResult`, final line is `FleetSummary` with all required fields (AC-14, AC-17)
- [ ] `fleet-wall-clock-scaling.e2e.test.ts` — 6-workspace fixture with per-workspace sleep `T=200ms`; measure wall-clock with `--max-concurrency 3`; assert wall-clock ∈ [1.5T, 3T] = [300ms, 600ms] ceiling of `ceil(6/3) * T`; serial baseline (`--max-concurrency 1`) is `≈ 6T = 1200ms` — `parallelismRatio >= 2.5x` holds (fleet/S02-F03)

### L3 acceptance (2)

- [ ] `fleet-S01-mixed-success-failure.accept.test.ts` — exercises every `expect:` clause in `scenarios/fleet/S01-mixed-success-failure/scenario.yaml`: batch exit non-zero, per-workspace reporting, structured diagnostic, stdout includes all three plus failure reason
- [ ] `fleet-S02-max-concurrency-cap.accept.test.ts` — exercises every `expect:` clause in `scenarios/fleet/S02-max-concurrency-cap/scenario.yaml`: declared_max=3 enforced, peak never exceeded, 10/10 success, `parallelismRatio >= 2.5x`

### Test harness requirements (pulse-level findings)

- [ ] **fleet/S01-F08** — Fixture variants MUST cover multiple failure modes: `MissingSoulFile`, `MalformedLobsterYaml`, `MissingFrontmatterField` at minimum. Each variant lives under `tests/fixtures/fleet-s01/<kind>/` and runs through the L3 scenario test as a parametrized case.
- [ ] **fleet/S02-F08** — Concurrency assertion MUST measure PEAK (not mean) acquired count. Use the semaphore's instrumented `peakAcquired` monotonic counter (AC-13), not a sampling probe only. Sampling probes are fine as a secondary signal but never the sole assertion.
- [ ] **fleet/S02-F09** — If a sampling-based probe is used (e.g., to cross-check against a process-count), sampling frequency MUST exceed the per-task completion rate by ≥10× (per-task 200ms → sample every ≤20ms). Document the chosen rate in the test comment.
- [ ] **fleet/S02-F10** — Any OS-level process probe MUST filter to compile children only (match by process name or `--tag`), not count the supervisor process. Otherwise the baseline is off by 1 and near-cap assertions false-fail. The preferred approach remains the in-process semaphore counter; OS probes are defense-in-depth.

## Concept guide

- [ ] **fleet/S02-F07** — `docs/claws/concepts/fleet-compile.md` (listed in plan H3 Concept Guides) documents the per-compile resource envelope: approximate peak memory per workspace compile, recommended `--max-concurrency` for various fleet sizes × machine specs, and the tradeoff between the `os.cpus().length` default and CI-runner memory limits. Doc delivery is a plan H3 line item; this pulse owns the acceptance check that the concept guide includes the memory-budgeting section before checkpoint close.

## Scenario Findings Applied

| Finding | Severity | Disposition | AC ref | Notes |
|---------|---------:|-------------|--------|-------|
| fleet/S01-F01 | major | spec (resolved) + AC | AC-01 | `allSettled` semantics; `Promise.all` forbidden |
| fleet/S01-F02 | major | spec + AC | AC-02, AC-03 | Structured `CompileDiagnostic` union |
| fleet/S01-F03 | major | spec + AC | AC-05, AC-06 | Per-workspace cache isolation + atomic writes |
| fleet/S01-F04 | warning | spec (resolved) + AC | AC-07 | Exit 0/1/2 already in CL-01 |
| fleet/S01-F05 | warning | spec + AC | AC-17 | ndjson `--json` output shape |
| fleet/S01-F06 | warning | spec + AC | AC-04 | `stage` field in diagnostic |
| fleet/S01-F07 | warning | spec + AC | AC-08 | SIGINT graceful shutdown |
| fleet/S01-F08 | note | **test** | test harness | Multi-mode failure fixtures |
| fleet/S01-F09 | note | spec + AC | AC-15 | Lexicographic traversal |
| fleet/S01-F10 | note | spec + AC | AC-14 | Aggregate metrics in summary |
| fleet/S02-F01 | major | spec (resolved) + AC | AC-09 | Real bounded semaphore |
| fleet/S02-F02 | major | spec + AC | AC-13, AC-14 | Peak + parallelismRatio exposed |
| fleet/S02-F03 | major | **test** (e2e) | L2 scaling test | Wall-clock scaling band |
| fleet/S02-F04 | warning | spec + AC | AC-11 | `--max-concurrency 1` serial |
| fleet/S02-F05 | warning | spec + AC | AC-10 | Default = `os.cpus().length` |
| fleet/S02-F06 | warning | spec + AC | AC-12 | Argument validation |
| fleet/S02-F07 | warning | **pulse** (concept guide) | docs | Resource envelope doc |
| fleet/S02-F08 | note | **test** (harness) | L1/L3 | Peak-not-mean assertion |
| fleet/S02-F09 | note | **test** (harness) | harness | Sampling frequency ≥10× task rate |
| fleet/S02-F10 | note | **test** (harness) | harness | Filter supervisor from probe |

## Coverage target

Per-file 95/90/95/95 (stmts/branches/funcs/lines) on all new files under
`claws-sdk/src/compiler/fleet/` and `claws-cli/src/commands/fleet-compile.ts`.
Run `npx vitest run --coverage` after implementation and before commit.
