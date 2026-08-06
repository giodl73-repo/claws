---
pulse: 81
slug: watch-mode
plan: claws-compile-dx
depends_on: [80]
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: [watch/S01, watch/S02, watch/S03]
stage: implementation
test_tiers:
  L0_unit: 5
  L1_integration: 2
  L2_e2e: 2
  L3_accept: 3
test_scope:
  run:
    - "cd claws-sdk && npx vitest run --project unit --coverage src/compiler/watch"
    - "cd claws-sdk && npx vitest run --project integration --coverage"
    - "cd claws-cli && npx vitest run --project unit"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
    - "cd claws-cli && npx tsc --noEmit"
checkpoint: 4
checkpoint_gate: false
specs: [CL-01, CL-04]
source: "claws-compile-dx plan H1; findings from watch/S01-S03"
---

# Pulse 81: `claws watch` — debounced auto-rebuild with SIGINT cleanup

## Objective

Implement H1 of the `claws-compile-dx` plan: a single-process file watcher that
observes the 9 OC input files in a workspace, trailing-edge debounces
rapid-fire edits, and triggers incremental compile on each settled burst. The
watcher reuses pulse 80's per-stage `CompilationCache` singleton so that
unchanged readers short-circuit on `cacheHit: true`. SIGINT (and SIGBREAK on
Windows) triggers the full 5-step cleanup sequence codified in CL-01 §claws
watch: stop accepting events, drain or discard in-flight compile, atomic
rename guarantees on emit, tempfile sweep, exit `0` within 2000ms.

Watch mode is a primary consumer of the event bus surface (pulse 83). When
`options.events` is threaded through to `compile()`, every compile in the
watch session publishes the same discriminated-union events documented in
CL-14 §9 — the watch session itself does NOT define new event types. Event-bus
integration semantics are TESTED in pulse 83's scenario; pulse 81's job is
to thread `options.events` through cleanly and prove it does not break any
other watch assertion.

## Deliverables

- [ ] `claws-sdk/src/compiler/watch/watcher.ts` (NEW) — single-process chokidar
      watcher. Observes the 9 OC inputs (`SOUL.md`, `TOOLS.md`, `AGENTS.md`,
      `MEMORY.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, `lobster.yaml`,
      `skills/**/SKILL.md`). Exports `startWatcher(workspaceRoot, options):
    WatcherHandle` returning `{ close(): Promise<void>, onCompile(cb) }`.
      Uses a single chokidar instance; does NOT spawn subprocesses.
- [ ] `claws-sdk/src/compiler/watch/debouncer.ts` (NEW) — trailing-edge
      debouncer. `createDebouncer(windowMs: number, fn: () => void | Promise<void>)`
      returns `{ fire(): void, cancel(): void, flush(): Promise<void> }`. Timer
      RESETS on every `fire()`; `fn` runs `windowMs` after the LAST `fire()`.
- [ ] `claws-sdk/src/compiler/watch/compile-queue.ts` (NEW) — per-workspace
      serial queue with monotonic generation number. `enqueueCompile(gen, fn)`
      discards stale writes: if `gen < latestGen` when compile returns, its
      emit output is dropped. Prevents edit #5's compile from overwriting
      edit #10's output.
- [ ] `claws-sdk/src/compiler/watch/lifecycle.ts` (NEW) — SIGINT / SIGBREAK
      handlers, 2000ms cleanup budget, 1000ms double-signal force-exit timer,
      tempfile cleanup sweep. Exports `installSignalHandlers(handle):
    () => void` returning an uninstall fn for tests.
- [ ] `claws-sdk/src/compiler/watch/index.ts` (NEW) — barrel exports:
      `startWatcher`, `WatcherHandle`, `WatcherOptions`.
- [ ] `claws-sdk/src/compiler/emit/atomic-write.ts` (NEW or amend pulse 7
      emitter) — `writeAtomic(path, bytes)`: writes to `<path>.tmp-<pid>-<rand>`
      then `fs.rename` on success. Satisfies CL-04 §IS.7 atomic-emit MUST
      referenced by watch/S03-F02.
- [ ] `claws-cli/src/commands/watch.ts` (NEW) — `claws watch [--debounce <ms>]
    [--verbose]` CLI wrapper. Parses flags, resolves workspace root, calls
      `startWatcher`, wires summary printer to stdout, installs signal
      handlers, never prints absolute paths (always workspace-relative).
- [ ] `claws-cli/src/commands/index.ts` — register `watch` subcommand in the
      top-level `claws` command tree.
- [ ] Tests:
  - L0 unit (5):
    - debouncer: trailing-edge semantics — 3 `fire()` calls < windowMs produce 1 invocation (1)
    - debouncer: timer RESET on each `fire()` — not leading-edge (1)
    - compile-queue: stale generation emit is discarded (1)
    - lifecycle: SIGINT handler awaits `watcher.close()` before resolving (1)
    - lifecycle: double-SIGINT or 1000ms timeout triggers force-exit with exit code 1 (1)
  - L1 integration (2):
    - watcher + debouncer + compile-queue: 10 simulated fs events <50ms apart produce ≤3 compile invocations (1)
    - watcher reuses `CompilationCache` singleton across the session — 2nd compile observes reader `cacheHit` (1)
  - L2 e2e (2):
    - `claws watch` against fixture: edit `SOUL.md`, assert `plugins/claws-governance/index.ts` mtime advances within 1000ms + platform-aware tolerance (1)
    - `claws watch` SIGINT cleanup: no orphan node processes on POSIX (`ps`) or Windows (`tasklist`), no `.tmp-*` files remain in emit dir (1)
  - L3 accept (3):
    - `watch/S01-single-edit-single-compile` scenario traced (1)
    - `watch/S02-rapid-edits-coalesce` scenario traced (1)
    - `watch/S03-ctrl-c-cleanup` scenario traced (1)

## Acceptance Criteria

Each AC below traces to a spec MUST or a scenario finding. AC order matches
CL-01 §claws watch spec order where possible.

### Debounce + coalescing (watch/S01, watch/S02)

- [ ] Default debounce window is `300ms`, configurable via `--debounce <ms>`
      flag; minimum enforced at 50ms (per CL-01 §claws watch flag table).
      _(watch/S02-F07; spec-resolved)_
- [ ] Debouncer uses trailing-edge semantics ONLY: timer resets on each fs
      event; `compile()` fires `<window>` ms AFTER the last event, never after
      the first. Leading-edge AND leading+trailing are both prohibited.
      _(watch/S01-F01, watch/S02-F02; CL-01 §claws watch MUST)_
- [ ] A 10-edit rapid-fire burst (inter-edit gap `<50ms`) coalesces into `≤3`
      compile invocations. Harness uses a monotonic clock to measure actual
      inter-edit gaps and fails the run with explicit CI-noise documentation
      if gaps stretch past 80ms, rather than loosening the bound silently.
      _(watch/S02-F04; CL-01 §claws watch MUST)_
- [ ] Duplicate fs events inside the debounce window are coalesced at the
      watcher layer (chokidar deduplication). VS Code temp-file-then-rename
      saves on Windows MUST be treated as one edit, not two. _(watch/S01-F02;
      CL-01 §claws watch MUST)_

### Compile serialization + input freshness (watch/S02)

- [ ] Compile invocations are serialized per-workspace via a compile queue
      OR each compile carries a monotonic generation number and late writes
      from stale generations are discarded. Edit #5's compile emit MUST NOT
      overwrite edit #10's emit. _(watch/S02-F01; CL-01 §claws watch MUST)_
- [ ] Input files are read at compile ENTRY time, not at fs-event dispatch
      time. OS write buffering cannot cause the compile to observe a pre-edit
      byte image. `compile()` re-stats the workspace on entry. _(watch/S02-F03;
      CL-01 §claws watch MUST)_
- [ ] Every compile invocation populates `stageTimings` — not only the
      full-fresh path. The timing collector runs on every compile, including
      mid-burst compiles that straddle debounce windows. _(watch/S02-F05;
      CL-04 §IS.4 spec-resolved)_

### Cache lifetime (watch/S01)

- [ ] `CompilationCache` singleton lifetime spans the watch SESSION, not
      per-compile. The watcher creates the cache once at session start and
      reuses it across all compiles. Pulse 80's per-stage caches are the
      authoritative cache surface; pulse 81 MUST NOT reinvent cache logic.
      _(watch/S01-F03; CL-01 §claws watch MUST)_
- [ ] After the first compile populates the cache, subsequent compiles on
      unchanged readers observe `cacheHit: true` via pulse 80's per-stage
      cache keys (content-hash-keyed, with upstream IR hashes per CL-04
      §IS.1). The L1 integration test verifies this round-trip.

### SIGINT cleanup (watch/S03)

- [ ] SIGINT installs a handler that AWAITS `watcher.close()` before exiting.
      Synchronous `process.exit()` on SIGINT is prohibited — chokidar's
      native handles leak, causing `ERROR_SHARING_VIOLATION` on Windows and
      kqueue descriptor exhaustion on macOS. _(watch/S03-F01; CL-01 §claws
      watch MUST, step 1)_
- [ ] Emit writes go through `writeAtomic`: tempfile-plus-rename, never
      in-place. An interrupted compile leaves either the old complete file
      or the new complete file — never a partial. _(watch/S03-F02; CL-04
      §IS.7 MUST)_
- [ ] SIGINT handler executes the 5-step cleanup sequence in order:
      (1) stop accepting events, (2) drain OR discard in-flight compile with
      prior emit intact, (3) atomic rename guarantee, (4) tempfile sweep
      (`*.tmp-<pid>-*`) on SIGINT OR next-startup, (5) exit `0` within 2000ms.
      _(watch/S03-F03, F07; CL-01 §claws watch MUST)_
- [ ] Double-SIGINT (or a 1000ms fallback timeout on `watcher.close()`)
      triggers force-exit with code `1` and a logged warning. Impatient Ctrl-C
      twice MUST NOT deadlock on a slow close. _(watch/S03-F05; CL-01 §claws
      watch MUST)_
- [ ] Windows: register for SIGBREAK alongside SIGINT. cmd.exe and
      PowerShell may send SIGBREAK where Git Bash forwards SIGINT; both are
      clean-exit triggers. _(watch/S03-F08; CL-01 §claws watch MUST)_
- [ ] Exit code is `0` on clean shutdown within 2000ms. The `130` exit code
      is reserved for watcher-leak cases and MUST NOT occur under the
      cleanup MUST. _(watch/S03-F06; CL-01 exit-code table)_

### Idle + output hygiene (watch/S01)

- [ ] An idle watcher (started, zero events received) exits cleanly on
      SIGINT. The event loop holds no references that block process exit
      when idle. Handler installation is symmetric with teardown — no
      long-lived timers leak. _(watch/S01-F06; pulse AC)_
- [ ] Per-change stdout summary uses WORKSPACE-RELATIVE paths, never
      absolute. Absolute paths leak `$HOME` into logs and break snapshot
      tests across machines. Summary format matches the CL-01 §claws watch
      output contract column shape (timestamp, path, verb, elapsed,
      cacheHit N/9, diagnostics). _(watch/S01-F05; CL-01 §claws watch
      output contract)_
- [ ] Optional `--verbose` flag surfaces per-stage timings from the
      incremental compile to stdout. Default (no `--verbose`) keeps the
      single-line per-change summary format. _(watch/S01-F07; pulse AC)_

### Event bus threading (pulse 83 seam)

- [ ] `claws-cli/src/commands/watch.ts` accepts an `options.events?:
    CompilerEventBus` parameter and threads it through to every
      `compile()` call in the watch session. Watch mode MUST NOT define
      new event types. Event-emission correctness is TESTED in pulse 83's
      scenario (`hot-reload/S01`); pulse 81's job is to prove threading
      does not regress any watch assertion. When `options.events` is
      absent, the compiler MUST NOT allocate a bus (CL-14 §9.3).

### Test harness hygiene (watch/S01, watch/S02, watch/S03)

- [ ] Output mtime assertions use a platform-aware tolerance buffer:
      NTFS 100ns resolution on Windows, APFS ns on modern macOS, HFS+ 1s on
      legacy macOS. Hard-coded 100ms buffers are prohibited (flaky on slow
      CI). _(watch/S01-F04; test-level)_
- [ ] Inter-edit-gap measurement in the coalescing test uses a monotonic
      clock (`performance.now()`), not wall clock. CI-tuned bounds documented
      inline when the real-time gap exceeds 80ms. _(watch/S02-F04; test-level)_
- [ ] Cross-platform orphan detection in the SIGINT e2e test: capture
      pre-SIGINT PID set via `ps -ef` (POSIX) or `tasklist /fi "imagename
    eq node.exe"` (Windows); assert post-exit PID set is a strict subset.
      _(watch/S03-F04; test-level)_

### Quality gates

- [ ] `cd claws-sdk && npx vitest run --project unit --coverage` passes
      per-file 95/90/95/95 on `src/compiler/watch/**` and on any touched
      files in `src/compiler/emit/` (atomic-write).
- [ ] `cd claws-sdk && npx vitest run --project integration --coverage`
      passes package thresholds.
- [ ] `cd claws-cli && npx vitest run --project unit` passes.
- [ ] `cd claws-sdk && npx tsc --noEmit` exits 0.
- [ ] `cd claws-cli && npx tsc --noEmit` exits 0.
- [ ] `npm run build` from repo root exits 0 (fresh dist/).

## Scenario Findings Applied

| Finding       | Severity | Disposition        | AC hook                               |
| ------------- | -------- | ------------------ | ------------------------------------- |
| watch/S01-F01 | major    | spec (CL-01)       | Trailing-edge debounce AC             |
| watch/S01-F02 | major    | spec (CL-01)       | fs-event coalescing AC                |
| watch/S01-F03 | major    | spec (CL-01)       | Cache lifetime AC                     |
| watch/S01-F04 | warning  | test               | mtime tolerance harness AC            |
| watch/S01-F05 | warning  | spec (CL-01)       | Workspace-relative paths AC           |
| watch/S01-F06 | warning  | **pulse AC**       | Idle watcher clean exit AC            |
| watch/S01-F07 | note     | **pulse AC**       | `--verbose` flag AC                   |
| watch/S02-F01 | major    | spec (CL-01)       | Compile serialization AC              |
| watch/S02-F02 | major    | spec-resolved      | Trailing-edge (covered by S01-F01)    |
| watch/S02-F03 | major    | spec (CL-01)       | Read at compile entry AC              |
| watch/S02-F04 | warning  | test               | Monotonic-clock harness AC            |
| watch/S02-F05 | warning  | spec-resolved      | stageTimings on every invocation      |
| watch/S02-F06 | warning  | spec-resolved      | byteHash input identity (CL-04 §IS.4) |
| watch/S02-F07 | note     | spec-resolved      | `--debounce <ms>` flag                |
| watch/S03-F01 | major    | spec (CL-01)       | Await watcher.close() AC              |
| watch/S03-F02 | major    | spec (CL-04 §IS.7) | Atomic tempfile+rename AC             |
| watch/S03-F03 | major    | spec (CL-01)       | 5-step cleanup sequence AC            |
| watch/S03-F04 | major    | test               | Cross-platform orphan detection AC    |
| watch/S03-F05 | warning  | spec (CL-01)       | Double-SIGINT force-exit AC           |
| watch/S03-F06 | warning  | spec-resolved      | Exit-code table 0/130                 |
| watch/S03-F07 | warning  | spec (CL-04 §IS.7) | Tempfile sweep AC                     |
| watch/S03-F08 | note     | spec (CL-01)       | SIGBREAK on Windows AC                |

## Dependencies

- **Pulse 80 (incremental-stages)** — hard dependency. Watch mode consumes
  pulse 80's per-stage `CompilationCache` surface and its `stageTimings`
  schema. Pulse 81 MUST NOT reinvent incremental logic; if a cache behavior
  is missing or wrong, fix it in pulse 80's scope.
- **Pulse 83 (compiler-event-bus)** — seam dependency. Pulse 81 threads
  `options.events?` through to `compile()`; pulse 83 defines the
  `CompilerEventBus` interface and emission sites. Event-payload correctness
  is tested in pulse 83's `hot-reload/S01` scenario, not here.
- **Pulse 7 (emit-oc-target) / pulse 12.5 (emit-ast-codegen)** — soft
  dependency. The emitter must route through `writeAtomic`; this pulse adds
  `atomic-write.ts` and wires the emitter through it.
- **CL-01 v1.2 §claws watch** — normative spec for all behavior AC above.
- **CL-04 v1.2 §IS.7** — atomic emit + tempfile sweep requirements.
- **CL-14 v1.4 §9** — event bus surface (consumed, not defined).

## Governing Roles

Load these role files before starting:

- `.craft/roles/craft/architect.md` — watch lifecycle, SIGINT cleanup
  sequencing, seam with incremental cache + event bus, exit-code contract.
- `.craft/roles/claws/platform-eng.md` — chokidar integration patterns,
  cross-platform signal handling, atomic-write discipline, CLI wiring.

## Test Gates

- [ ] L0 unit (5 tests)
- [ ] L1 integration (2 tests)
- [ ] L2 e2e (2 tests) — live fixture + SIGINT cleanup
- [ ] L3 acceptance (3 tests) — watch/S01, S02, S03 each traced
- [ ] Per-file 95/90/95/95 coverage on `src/compiler/watch/**`
- [ ] `npx tsc --noEmit` exits 0 on claws-sdk AND claws-cli
- [ ] `npm run build` from repo root exits 0

## Out of Scope

- Polling-fallback watcher for mounted volumes / WSL edge cases — deferred
  to a DX hardening pass (plan notes §Non-goals).
- Browser-based watch via VS Code file events — lives in CP-10 extension.
- Event-bus correctness tests — owned by pulse 83 (`hot-reload/S01`).
- New event types for watch-session lifecycle (e.g., `watch.started`) —
  if needed, file a DCR; default stance is to reuse the CL-14 §9 union.
