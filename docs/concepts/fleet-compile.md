# `claws fleet compile` — parallel workspace compilation

`claws fleet compile <fleet-dir>` compiles every workspace under `<fleet-dir>`
in parallel using a bounded semaphore. Per-workspace failures are isolated:
one workspace's compile error does not short-circuit the batch, and each
workspace receives its own cache and output scope.

## When to use it

- CI pipelines that govern multiple agent workspaces in a single repository
- Operators curating an internal catalog of workspaces, regenerating emit
  artifacts after a policy change
- Horus hot-reload gateways that need structured per-workspace diagnostics
  to route remediation

## Command surface

```
claws fleet compile <fleet-dir>
  [--max-concurrency <N>]   # bounded parallel cap; default os.cpus().length
  [--json]                  # ndjson output: one result per line + summary
  [--stats]                 # human summary includes peak + parallelism ratio
  [--output-dir <path>]     # base output dir; each workspace gets a subdir
```

- Exit `0` — every workspace succeeded
- Exit `2` — at least one succeeded AND at least one failed (partial)
- Exit `1` — zero succeeded, OR fleet-dir scan failed, OR invalid flags

## How it works

### Discovery

`discoverWorkspaces(fleetDir)` returns the immediate child directories of
`<fleet-dir>` that contain a `lobster.yaml`, sorted lexicographically via
`Intl.Collator('en')`. Filesystem `readdir` order never leaks into output —
two operators on different filesystems see the same compile-start order.
Directories without `lobster.yaml` are silently skipped; a child file
(non-directory) is skipped. Only immediate children are considered — no
recursive walk.

### Concurrency

The bounded semaphore in `claws-sdk/src/compiler/fleet/semaphore.ts`
implements a real counter + FIFO waiter queue. `--max-concurrency N`
resolves to `N` permits:

- `acquire()` takes a permit if one is available, otherwise queues
- `release()` wakes the oldest waiter (FIFO) or credits the permit back
- `run(task)` acquires, awaits `task`, releases on settle (even on throw)
- `peakAcquired` — monotonic high-water-mark of in-flight count

This is **not** `Promise.all`-with-chunking. Chunking gives worst-of-both
ordering (the next chunk only starts after the slowest task in the prior
chunk finishes). A real semaphore starts the next queued workspace the
instant any in-flight compile settles.

### Failure isolation

Per-workspace compiles run under `Promise.allSettled` semantics: each task
is wrapped in a `try/catch` that converts throws into structured
`FleetWorkspaceResult.failure` records. The outer `Promise.all` over the
already-settled wrappers is safe because no inner failure reaches it.

When a compile returns `success: false` without throwing (e.g. sidecar
invalid, validate failed), the orchestrator extracts the first error
diagnostic, maps the host stage onto the 4-stage fleet surface
(`parse` / `enforce` / `emit` / `validate`), and emits a typed
`CompileDiagnostic` record.

### Per-workspace cache isolation

Each workspace receives its own `<cacheDir>/<basename>/` subdirectory by
construction. No shared lock file, no cross-workspace mutable cache state.
A failing workspace writes no cache entry — the per-compile cache set runs
only on `success: true`, and cache writes are atomic (tempfile + rename in
`CompilationCache`).

## Observability contract

Every run exposes a `FleetSummary` payload:

| Field              | Description                                              |
| ------------------ | -------------------------------------------------------- |
| `totalWorkspaces`  | discovered workspace count                               |
| `succeeded`        | workspaces with `status: 'success'`                      |
| `failed`           | workspaces with `status: 'failure'`                      |
| `skipped`          | workspaces with `status: 'cancelled'` or `'not-started'` |
| `wallClockMs`      | end-to-end wall-clock of the fleet run                   |
| `peakConcurrency`  | monotonic high-water-mark from the semaphore             |
| `parallelismRatio` | `sum(per-task ms) / wall-clock ms`; `>= 1` serial        |
| `maxConcurrency`   | the `--max-concurrency` cap that ran                     |

`peakConcurrency` is the **peak**, not the mean. If workspace durations vary
(`A` takes 1s, `B` takes 10s), the steady-state concurrency dips near the
tail, but `peakConcurrency` preserves the earliest high-water-mark so
operators can verify the cap was actually exercised.

## `--json` output shape (ndjson)

One `FleetWorkspaceResult` per line in lexicographic (= compile-start) order,
followed by a single `FleetSummary` line. Each line is standalone JSON —
no wrapping array, no trailing comma.

```
{"status":"success","workspace":"/fleet/alpha",...,"elapsedMs":234}
{"status":"failure","workspace":"/fleet/broken","diagnostic":{"kind":"MalformedLobsterYaml","stage":"parse",...},"elapsedMs":12}
{"status":"success","workspace":"/fleet/charlie",...,"elapsedMs":256}
{"totalWorkspaces":3,"succeeded":2,"failed":1,"skipped":0,"wallClockMs":301,"peakConcurrency":2,...}
```

## `CompileDiagnostic` kinds

The diagnostic `kind` field is a closed discriminated union per CL-01 v1.2:

| Kind                      | Typical stage | Cause                                   |
| ------------------------- | ------------- | --------------------------------------- |
| `MissingSoulFile`         | `parse`       | SOUL.md missing or unreadable           |
| `MalformedLobsterYaml`    | `parse`       | lobster.yaml YAML parse failed          |
| `MissingFrontmatterField` | `parse`       | required frontmatter field absent       |
| `PermissionDenied`        | `parse`       | EACCES / EPERM on a workspace file      |
| `CompileFailed`           | any           | generic fallback; message preserved     |
| `EmitFailed`              | `emit`        | emit stage rejected the IR              |
| `ValidationFailed`        | `validate`    | 12-check validator rejected emit output |

Adding a new `kind` is additive-only — new consumers must handle it; existing
consumers keep compiling.

## Resource envelope — memory budgeting for CI runners

Each in-flight compile loads the full workspace model into memory plus the
emit artifacts for every target. Approximate budget:

| Workspace size                            | Approx. peak memory per compile |
| ----------------------------------------- | ------------------------------- |
| Small (tutorial-scale)                    | ~50 MB                          |
| Medium (production workspace)             | ~200 MB                         |
| Large (SOC2 + multi-target + audit chain) | ~500 MB                         |

At `--max-concurrency N`, peak fleet memory is approximately `N × per-compile`
plus the orchestrator overhead (~20 MB). Some rules of thumb:

- Laptop / developer workstation — default (`os.cpus().length`) is fine
- CI runner with 2 GB memory — use `--max-concurrency 2` for production workspaces
- CI runner with 4 GB memory — `--max-concurrency 4` is comfortable
- CI runner with 8 GB+ — let the default saturate; reduce only if you hit OOM

**Recommended baseline for CI**: `--max-concurrency 4` on a 4 GB runner.
Measure actual peak memory with `--stats` and adjust down if the runner
shows memory pressure in the job metrics.

### Memory pressure signals

- CI job killed without a clean exit → OOM; lower `--max-concurrency`
- Wall-clock blows out while CPU stays low → swap thrashing; lower `--max-concurrency`
- Wall-clock plateaus despite raising the cap → workspaces too small to amortize
  the parallelism overhead, or CPU-bound past `os.cpus().length`

## Signals — SIGINT / SIGTERM

The orchestrator accepts an optional `AbortSignal`. On signal receipt,
queued workspaces are marked `not-started` / `cancelled`, in-flight
compiles complete naturally (cache writes are atomic), and the final
summary surfaces the cancelled ones under `skipped`.

## See also

- CL-01 v1.2 §`claws fleet compile` — the authoritative command contract
- `claws-sdk/src/compiler/fleet/` — SDK entry point
- `docs/claws/concepts/compile.md` — per-workspace compile pipeline
- `docs/claws/concepts/cache.md` — atomic cache writes + per-stage caches
