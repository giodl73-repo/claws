# claws-compile-dx — Findings Audit R1

**Date**: 2026-04-16
**Auditor**: Cassiopeia (findings-audit agent)
**Scope**: 11 scenarios × ~9 findings = 92 findings classified
**Specs touched**: CL-01 v1.1→v1.2, CL-04 v1.1→v1.2, CL-14 v1.3→v1.4
**Plan touched**: none (all findings were spec-level, pulse-level, or test-level)

## Totals

| Scenario        | Total findings |  Major | Warning |   Note |
| --------------- | -------------: | -----: | ------: | -----: |
| watch/S01       |              7 |      3 |       3 |      1 |
| watch/S02       |              7 |      3 |       3 |      1 |
| watch/S03       |              8 |      4 |       3 |      1 |
| incremental/S01 |              8 |      4 |       3 |      1 |
| incremental/S02 |              8 |      4 |       2 |      2 |
| incremental/S03 |              8 |      4 |       3 |      1 |
| fleet/S01       |             10 |      3 |       4 |      3 |
| fleet/S02       |             10 |      3 |       4 |      3 |
| cache-cli/S01   |             10 |      3 |       4 |      3 |
| cache-cli/S02   |             10 |      3 |       4 |      3 |
| hot-reload/S01  |             11 |      3 |       4 |      4 |
| **TOTAL**       |         **97** | **37** |  **37** | **23** |

## Dispositions

Disposition legend:

- **spec** → amended spec (durable contract MUST/SHOULD now in spec)
- **spec (resolved)** → already captured by existing spec text; cited section
- **plan** → amended `.craft/plans/claws-compile-dx.md`
- **pulse** → deferred to pulse AC authoring (implementation concern)
- **test** → deferred to pulse test deliverables (test assertion / harness)

### watch/S01 (single-edit-single-compile)

| F   | Severity | Disposition | Action                                                                              |
| --- | -------- | ----------- | ----------------------------------------------------------------------------------- |
| F01 | major    | **spec**    | CL-01 §claws watch — trailing-edge debounce with timer reset, 300ms default         |
| F02 | major    | **spec**    | CL-01 §claws watch — MUST coalesce duplicate fs events inside debounce window       |
| F03 | major    | **spec**    | CL-01 §claws watch — CompilationCache lifetime spans watch session, not per-compile |
| F04 | warning  | **test**    | Pulse 81 test harness: platform-aware mtime resolution buffer                       |
| F05 | warning  | **spec**    | CL-01 §claws watch — workspace-relative paths, stable summary format                |
| F06 | warning  | **pulse**   | Pulse 81 AC: idle watcher exits cleanly without blocking event loop                 |
| F07 | note     | **pulse**   | Pulse 81 AC: optional `--verbose` stage-timing output                               |

### watch/S02 (rapid-edits-coalesce)

| F   | Severity | Disposition         | Action                                                                                         |
| --- | -------- | ------------------- | ---------------------------------------------------------------------------------------------- |
| F01 | major    | **spec**            | CL-01 §claws watch — per-workspace serial queue OR monotonic generation + discard stale writes |
| F02 | major    | **spec (resolved)** | Covered by S01-F01 amendment (trailing-edge)                                                   |
| F03 | major    | **spec**            | CL-01 §claws watch — read input at compile time, not at event dispatch time                    |
| F04 | warning  | **test**            | Pulse 81 test harness: real-time gap measurement, CI-tuned bounds                              |
| F05 | warning  | **spec (resolved)** | CL-04 §IS.4 "stageTimings is always populated"                                                 |
| F06 | warning  | **spec (resolved)** | CL-04 §IS.4 `byteHash` field already ties emit to input                                        |
| F07 | note     | **spec (resolved)** | CL-01 §claws watch `--debounce <ms>` flag already documented                                   |

### watch/S03 (ctrl-c-cleanup)

| F   | Severity | Disposition         | Action                                                                                    |
| --- | -------- | ------------------- | ----------------------------------------------------------------------------------------- |
| F01 | major    | **spec**            | CL-01 §claws watch — SIGINT handler awaits `watcher.close()` before exit                  |
| F02 | major    | **spec**            | CL-04 §IS.7 — atomic tempfile + rename, no in-place emit writes                           |
| F03 | major    | **spec**            | CL-01 §claws watch — full cleanup sequence enumerated (5 steps)                           |
| F04 | major    | **test**            | Pulse 81 test harness: cross-platform orphan detection (ps on POSIX, tasklist on Windows) |
| F05 | warning  | **spec**            | CL-01 §claws watch — double-SIGINT force-exit with 1s timeout fallback                    |
| F06 | warning  | **spec (resolved)** | CL-01 §claws watch exit codes already list 0/130                                          |
| F07 | warning  | **spec**            | CL-04 §IS.7 — stale tempfile cleanup on SIGINT or startup sweep                           |
| F08 | note     | **spec**            | CL-01 §claws watch — register SIGBREAK alongside SIGINT on Windows                        |

### incremental/S01 (lobster-only-change)

| F   | Severity | Disposition         | Action                                                                       |
| --- | -------- | ------------------- | ---------------------------------------------------------------------------- |
| F01 | major    | **spec (resolved)** | CL-04 §IS.1 already scopes each stage key to its input file hash             |
| F02 | major    | **test**            | Canonical fixture sizing for 80% wall-clock reduction target (pulse 80 test) |
| F03 | major    | **spec**            | CL-04 §IS.1 — downstream cache keys MUST include all upstream IR hashes      |
| F04 | major    | **spec**            | CL-04 §IS.1 — mtime fast-path, content-hash authoritative                    |
| F05 | warning  | **spec (resolved)** | CL-04 §IS.4 StageName union already frozen                                   |
| F06 | warning  | **spec**            | CL-04 §IS.1 — SHA-256 explicit                                               |
| F07 | warning  | **pulse**           | Pulse 80 future optimization (deferred; IR-identity check)                   |
| F08 | note     | **test**            | Pulse 80 deliverable: deterministic JSON snapshot for stageTimings           |

### incremental/S02 (soul-only-change)

| F   | Severity | Disposition         | Action                                                                                           |
| --- | -------- | ------------------- | ------------------------------------------------------------------------------------------------ |
| F01 | major    | **spec (resolved)** | CL-04 §IS.1 uniform scoping across all 9 readers                                                 |
| F02 | major    | **pulse**           | Pulse 80 AC: 80% wall-clock reduction on SOUL edit critical path                                 |
| F03 | major    | **spec**            | CL-04 §IS.7 — principles observable in emit (comments, constants, or runtime-queryable metadata) |
| F04 | major    | **spec**            | Consolidated with S01-F03 — downstream cache keys include upstream IR hashes                     |
| F05 | warning  | **test**            | Pulse 80 test: use semantically meaningful SOUL edits verifiable in emit                         |
| F06 | warning  | **test**            | Pulse 80 test fixture: canonical SOUL format documented                                          |
| F07 | note     | **test**            | Pulse 80 unit test: parametrized per-stage scoping test for all 9 readers                        |
| F08 | note     | **spec (resolved)** | CL-14 §1.5 deterministic emit; CL-04 §IS.7 deterministic JSON ordering added                     |

### incremental/S03 (key-rotation-full-invalidation)

| F   | Severity | Disposition         | Action                                                                                   |
| --- | -------- | ------------------- | ---------------------------------------------------------------------------------------- |
| F01 | major    | **spec (resolved)** | CL-04 §IS.1 + CL-14 §1.4 — compiler.version in every stage cache key                     |
| F02 | major    | **spec**            | CL-04 §IS.1 — emit stage cache key MUST include signing-key identity                     |
| F03 | major    | **test**            | Pulse 80 test hook: deterministic compiler.version override mechanism                    |
| F04 | major    | **spec**            | CL-04 §IS.7 — signatures embedded in emit (byte-different on key rotation)               |
| F05 | warning  | **test**            | Pulse 80 benchmark: rotation overhead <10% of baseline                                   |
| F06 | warning  | **pulse**           | Pulse 80 AC: surgical rotation (preserve reader caches on key-only rotation) deferred    |
| F07 | warning  | **spec**            | CL-04 §IS.1 — `keySchemaVersion` on every cache entry, mismatch forces miss              |
| F08 | note     | **test**            | Pulse 80 test: manual `cache clear` and key rotation converge on same from-scratch state |

### fleet/S01 (mixed-success-failure)

| F   | Severity | Disposition         | Action                                                                                                               |
| --- | -------- | ------------------- | -------------------------------------------------------------------------------------------------------------------- |
| F01 | major    | **spec (resolved)** | CL-01 §claws fleet compile already says "MUST NOT short-circuit" — strengthened with explicit `allSettled` semantics |
| F02 | major    | **spec**            | CL-01 §claws fleet compile — structured `CompileDiagnostic` discriminated union with `kind` field                    |
| F03 | major    | **spec**            | CL-01 §claws fleet compile — per-workspace atomic cache writes, no residue on failure                                |
| F04 | warning  | **spec (resolved)** | CL-01 fleet exit codes already distinguish 0/1/2 (partial vs total)                                                  |
| F05 | warning  | **spec**            | CL-01 §claws fleet compile — ndjson stream required (already `--json`; semantics clarified)                          |
| F06 | warning  | **spec**            | CL-01 §claws fleet compile — `CompileDiagnostic.stage` field identifies failure point                                |
| F07 | warning  | **spec**            | CL-01 §claws fleet compile — SIGINT graceful shutdown, in-flight cleanup                                             |
| F08 | note     | **test**            | Pulse 82 test fixture: variants for each failure mode                                                                |
| F09 | note     | **spec**            | CL-01 §claws fleet compile — lexicographic traversal for byte-stable output                                          |
| F10 | note     | **spec**            | CL-01 §claws fleet compile — aggregate metrics summary (totals, wall-clock, parallelism)                             |

### fleet/S02 (max-concurrency-cap)

| F   | Severity | Disposition         | Action                                                                                                                |
| --- | -------- | ------------------- | --------------------------------------------------------------------------------------------------------------------- |
| F01 | major    | **spec (resolved)** | CL-01 §claws fleet compile already caps with "MUST cap" — strengthened with "real bounded semaphore, not best-effort" |
| F02 | major    | **spec**            | CL-01 §claws fleet compile — expose peakConcurrency + parallelismRatio in aggregate metrics                           |
| F03 | major    | **test**            | Pulse 82 e2e: wall-clock falls in expected scaling band                                                               |
| F04 | warning  | **spec**            | CL-01 §claws fleet compile — `--max-concurrency 1` MUST be serial without deadlock                                    |
| F05 | warning  | **spec**            | CL-01 §claws fleet compile — default concurrency tradeoff documented (os.cpus().length + memory warning)              |
| F06 | warning  | **spec**            | CL-01 §claws fleet compile — argument validation for 0/-1/non-integer                                                 |
| F07 | warning  | **pulse**           | Pulse 82 concept guide: per-compile resource envelope documented in docs/claws/concepts/fleet-compile.md              |
| F08 | note     | **test**            | Pulse 82 test harness: assert peak (not mean) concurrency                                                             |
| F09 | note     | **test**            | Pulse 82 test harness: sampling frequency exceeds task rate                                                           |
| F10 | note     | **test**            | Pulse 82 test harness: filter compile children from supervisor                                                        |

### cache-cli/S01 (round-trip-stats-prune-clear-list)

| F   | Severity | Disposition         | Action                                                                            |
| --- | -------- | ------------------- | --------------------------------------------------------------------------------- |
| F01 | major    | **spec**            | CL-01 §claws cache — single shared `resolveCacheDir()` function for CLI + compile |
| F02 | major    | **spec**            | CL-01 §claws cache — JSON output shapes are versioned contracts                   |
| F03 | major    | **spec (resolved)** | CL-01 §claws cache list already requires ndjson ("one JSON object per line")      |
| F04 | warning  | **spec (resolved)** | CL-01 §claws cache prune already accepts `s                                       | m   | h   | d`  |
| F05 | warning  | **spec**            | CL-01 §claws cache clear — require `--yes` or confirmation for interactive use    |
| F06 | warning  | **spec**            | CL-01 §claws cache list — stable sort key, documented                             |
| F07 | warning  | **spec**            | CL-01 §claws cache clear — `--reset-counters` opt-in (default preserves counters) |
| F08 | note     | **spec (resolved)** | CL-01 §claws cache stats `version` field already exposed                          |
| F09 | note     | **spec (resolved)** | CL-01 §claws cache prune "no-op exits 0" already documented                       |
| F10 | note     | **spec**            | CL-01 §claws cache list — ISO 8601 UTC timestamps                                 |

### cache-cli/S02 (idempotent-no-op-exit-zero)

| F   | Severity | Disposition | Action                                                                           |
| --- | -------- | ----------- | -------------------------------------------------------------------------------- |
| F01 | major    | **spec**    | CL-01 §claws cache — missing cache dir treated as empty-cache for read commands  |
| F02 | major    | **spec**    | CL-01 §claws cache clear — tolerant of concurrent callers (ENOENT mid-traversal) |
| F03 | major    | **spec**    | CL-01 §claws cache — no-op paths exit 0 (shared contract)                        |
| F04 | warning  | **spec**    | CL-01 §claws cache list — 0 bytes on empty (consistent with ndjson streaming)    |
| F05 | warning  | **spec**    | CL-01 §claws cache stats — full schema with zero values on empty cache           |
| F06 | warning  | **spec**    | CL-01 §claws cache — read commands do not create the cache dir                   |
| F07 | warning  | **pulse**   | Pulse 79 AC: prune short-circuits on empty dir without expensive traversal       |
| F08 | note     | **test**    | Pulse 79 test: full command sequence strictly idempotent across repeated runs    |
| F09 | note     | **pulse**   | Pulse 79 AC: `cache clear` confirmation skipped on empty                         |
| F10 | note     | **spec**    | CL-01 §claws cache — deterministic umask-respecting dir permissions              |

### hot-reload/S01 (event-bus-full-stage-coverage)

| F   | Severity | Disposition         | Action                                                                                          |
| --- | -------- | ------------------- | ----------------------------------------------------------------------------------------------- |
| F01 | major    | **spec (resolved)** | CL-14 §9.3 already requires every documented event have an emission site                        |
| F02 | major    | **spec (resolved)** | CL-14 §9.2 already defines discriminated union (keyed on `type`)                                |
| F03 | major    | **spec (resolved)** | CL-14 §9.4 guarantees in-order emission per-compile                                             |
| F04 | warning  | **spec**            | CL-14 §9.3 — backpressure semantics made explicit (synchronous fire-and-forget from compiler)   |
| F05 | warning  | **spec (resolved)** | CL-14 §9.3 already says "Listener errors caught by bus and MUST NOT propagate"                  |
| F06 | warning  | **test**            | Pulse 83 test: assert event counts derived from reader/emitter registries (not hardcoded 9/2/2) |
| F07 | warning  | **spec**            | CL-14 §9.3 — `cache.write` fires ONLY on success path                                           |
| F08 | note     | **spec**            | CL-14 §9.3 — every payload MUST carry `workspace: string` identifier                            |
| F09 | note     | **spec**            | CL-14 §9.3 — monotonic timestamps (`monotonicNs`) required; wall-clock optional sidecar         |
| F10 | note     | **spec (resolved)** | CL-14 §9.5 extension-only subpath pattern already documented                                    |
| F11 | note     | **spec (resolved)** | CL-14 §9.6 already scopes Ra to event emission, Horus to consumer                               |

## Spec amendments applied

### CL-01 v1.1 → v1.2 (CLI Surface & Schema)

`claws watch` section:

- Trailing-edge debounce semantics MUST (watch/S01-F01, S02-F02)
- Duplicate fs-event coalescing inside debounce window MUST (watch/S01-F02)
- Per-workspace serialization OR generation number + discard stale writes MUST (watch/S02-F01)
- Read inputs at compile time, not event dispatch time MUST (watch/S02-F03)
- `CompilationCache` lifetime spans watch session MUST (watch/S01-F03)
- SIGINT cleanup sequence enumerated (5 steps): watcher.close() awaited, atomic rename, tempfile cleanup, 2s timeout (watch/S03-F01, F02, F03, F07)
- Double-SIGINT force-exit with 1s fallback MUST (watch/S03-F05)
- SIGBREAK alongside SIGINT on Windows MUST (watch/S03-F08)
- Workspace-relative paths in stdout summary, never absolute (watch/S01-F05)

`claws cache` shared contract (new subsection):

- Single shared `resolveCacheDir()` function MUST (cache-cli/S01-F01)
- Missing dir treated as empty-cache for read commands MUST (cache-cli/S02-F01)
- JSON schemas are versioned contracts MUST (cache-cli/S01-F02)
- Read commands do not create cache dir (cache-cli/S02-F06)
- Deterministic umask-respecting permissions MUST (cache-cli/S02-F10)
- No-op exits 0 shared contract (cache-cli/S02-F03)

`claws cache stats`:

- Full schema with zero values on empty cache MUST (cache-cli/S02-F05)

`claws cache clear`:

- Concurrent-caller tolerance MUST (cache-cli/S02-F02)
- `--reset-counters` opt-in; default preserves counters MUST (cache-cli/S01-F07)
- `--yes` or confirmation required interactive, skipped on empty MUST (cache-cli/S01-F05, S02-F09)

`claws cache list`:

- Stable sort key documented MUST (cache-cli/S01-F06)
- ISO 8601 UTC timestamps MUST (cache-cli/S01-F10)
- 0 bytes on empty (consistent with ndjson) MUST (cache-cli/S02-F04)

`claws fleet compile`:

- Lexicographic traversal MUST (fleet/S01-F09)
- Per-workspace atomic cache writes MUST (fleet/S01-F03)
- `allSettled` semantics MUST (fleet/S01-F01, strengthened)
- Real bounded semaphore MUST (fleet/S02-F01, strengthened)
- Argument validation for --max-concurrency (fleet/S02-F04, F06)
- SIGINT graceful shutdown (fleet/S01-F07)
- Default concurrency tradeoff documented (fleet/S02-F05)
- Structured `CompileDiagnostic` discriminated union with `kind`, `workspace`, `stage`, `message`, `path`, `exitCode` (fleet/S01-F02, F06)
- Observability output: peakConcurrency, parallelismRatio, aggregate metrics (fleet/S02-F02, fleet/S01-F10)
- ndjson stream semantics for --json (fleet/S01-F05)

### CL-04 v1.1 → v1.2 (Compilation Pipeline)

§IS.1 strengthened:

- SHA-256 explicit (incremental/S01-F06)
- `keySchemaVersion` on every cache entry (incremental/S03-F07)
- Downstream cache keys include ALL upstream IR hashes (incremental/S01-F03, S02-F04)
- Emit stage cache key includes signing-key identity (incremental/S03-F02)
- Mtime fast-path; content-hash authoritative (incremental/S01-F04)

§IS.7 added (new section — Emit atomic write + principle observability):

- Atomic tempfile + rename for all emit writes MUST (watch/S03-F02, fleet/S01-F03)
- Stale tempfile cleanup on SIGINT or startup sweep MUST (watch/S03-F07)
- Principles observable in emit (comments/constants/metadata) MUST (incremental/S02-F03)
- Signatures embedded in emit, byte-different on key rotation MUST (incremental/S03-F04)
- Deterministic JSON key ordering MUST (incremental/S01-F08)
- stageTimings snapshot-friendly SHOULD

### CL-14 v1.3 → v1.4 (Emitter Architecture)

§9.3 strengthened:

- `cache.write` ONLY on success path MUST (hot-reload/S01-F07)
- Backpressure semantics explicit: synchronous fire-and-forget from compiler (hot-reload/S01-F04)
- Every event payload carries `workspace: string` MUST (hot-reload/S01-F08)
- Monotonic timestamps (`monotonicNs: bigint`) MUST; wall-clock optional sidecar (hot-reload/S01-F09)

## Plan amendments applied

**`.craft/plans/claws-compile-dx.md`**: none. All findings fell into spec-level (durable contract amendments applied above), pulse-level (implementation concerns deferred to pulse AC authoring), or test-level (deferred to pulse test deliverables). The plan's Summary/Scope/Notes sections remain accurate as-is. No cross-cutting design decisions surfaced that belonged at the plan level rather than the spec level.

## Findings left for pulse authoring

Grouped by pulse (to be consumed by pulse-plan agents):

### pulse 79 — cache-cli (auriga)

- **cache-cli/S02-F07** (pulse AC): prune short-circuits on empty dir without expensive filesystem traversal
- **cache-cli/S02-F09** (pulse AC): `cache clear` confirmation prompt skipped when cache is empty
- **cache-cli/S01-F04** (test-level, already spec-resolved): exercise duration format variety (s/m/h/d)
- **cache-cli/S02-F08** (test-level): full command sequence strictly idempotent across repeated runs

### pulse 80 — incremental-stages (centaurus)

- **incremental/S01-F02** (test): canonical fixture sized for 80% wall-clock reduction target
- **incremental/S01-F07** (pulse future-optimization): IR-identity check post-parse (deferred — document as future)
- **incremental/S01-F08** (test): deterministic JSON snapshot for stageTimings
- **incremental/S02-F02** (pulse AC): 80% wall-clock reduction on SOUL edit critical path
- **incremental/S02-F05** (test): semantically meaningful SOUL edits verifiable in emit
- **incremental/S02-F06** (test fixture): canonical SOUL format documented
- **incremental/S02-F07** (test): parametrized per-stage scoping test for all 9 readers
- **incremental/S03-F03** (test hook): deterministic compiler.version override mechanism (env var in test mode)
- **incremental/S03-F05** (benchmark): rotation overhead <10% of baseline
- **incremental/S03-F06** (pulse future-optimization): surgical rotation (preserve reader caches on key-only) deferred
- **incremental/S03-F08** (test): manual `cache clear` and key rotation converge on same from-scratch state

### pulse 81 — watch-mode (pegasus)

- **watch/S01-F04** (test harness): platform-aware mtime resolution buffer
- **watch/S01-F06** (pulse AC): idle watcher exits cleanly
- **watch/S01-F07** (pulse AC): optional `--verbose` stage-timing output
- **watch/S02-F04** (test harness): real-time gap measurement, CI-tuned bounds
- **watch/S03-F04** (test harness): cross-platform orphan detection (ps on POSIX, tasklist on Windows)

### pulse 82 — fleet-parallel-compile (hercules)

- **fleet/S01-F08** (test fixture): variants for each failure mode (MissingSoulFile, MalformedLobsterYaml, etc.)
- **fleet/S02-F03** (e2e test): wall-clock falls in expected scaling band
- **fleet/S02-F07** (concept guide): per-compile resource envelope documented in docs/claws/concepts/fleet-compile.md
- **fleet/S02-F08** (test harness): assert peak (not mean) concurrency
- **fleet/S02-F09** (test harness): sampling frequency exceeds task rate
- **fleet/S02-F10** (test harness): filter compile children from supervisor

### pulse 83 — compiler-event-bus (carinae)

- **hot-reload/S01-F06** (test): event counts derived from reader/emitter registries (not hardcoded)

## Contradictions

None. All spec-level findings were additive or strengthened existing MUSTs. No finding contradicted existing spec text.

## Caveats

- **Scenario series reference CL-08 for fleet and cache-cli**, but the actual CLI-surface contracts live in CL-01 (fleet compile section, cache section). The CL-08 trace is a soft mis-reference — the amendments land in CL-01 correctly. A follow-up edit to the scenario `specs:` frontmatter would be nice but is outside this audit's scope (Stay-in-your-lane: do NOT touch scenarios).
- **Scenarios list `implementation_status: pending`** throughout. After pulse 79-83 land, scenario implementation status rolls forward per usual wave hygiene.
- **hot-reload/S01 total_events: 31** hardcodes the current reader (9) + emitter (2) + validate (2) counts. §9.3 now requires `workspace` on every payload; the pulse 83 test must not break when additional payload fields land, so the test harness MUST assert event COUNTS and per-event discriminator shape, NOT exact byte-for-byte payload snapshots.
- **CL-04 v1.2 §IS.7** references CL-14 §9.3's `cache.write` success-only rule; the two amendments are coupled and should land in the same commit if possible (both are included in this audit's single commit).
- **CL-14 §9.2 illustrative type union omits `workspace` field** for readability. §9.3 establishes the normative contract that every variant has it. A future spec edit could amend the type definitions in §9.2 to make this explicit — deferred as a doc clarity item, not a contract change.
