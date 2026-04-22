---
pulse: 32
slug: incremental-cache
plan: claws-cap-integration
depends_on: [21]
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: [cap-integration/S06, cap-integration/S17]
stage: implementation
test_tiers:
  L0_unit: 8
  L1_integration: 4
  L2_e2e: 2
  L3_accept: 1
test_scope:
  run:
    - "cd claws-sdk && npx vitest run --project unit --coverage"
    - "cd claws-sdk && npx vitest run --project integration --coverage"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 6
checkpoint_gate: false
---

# Pulse 32: Incremental Compilation Cache

## Objective

Build the per-phase compilation cache with dependency graph tracking for sub-200ms single-file recompiles. When a single OC file changes (e.g., TOOLS.md after a PATCH), only the affected compilation phases re-run — not the full pipeline. This is critical for responsive CAP settings: a user toggles a tool and sees the result in <200ms, not the 2-3 seconds of a full recompile.

The cache extends the existing CompilationHost + CompilationCache from `claws-sdk/src/compile/cache.ts` with three new capabilities:

1. **Per-file hash tracking**: SHA-256 hash per OC file. On change, only the changed file's hash updates. The dependency graph determines which phases are invalidated.
2. **Phase output caching**: Each compilation phase (parse, classify, evaluate, emit) caches its output keyed by input hashes. If inputs haven't changed, the phase is skipped entirely.
3. **Compilation queue (P-273)**: FIFO queue with coalescing — if two edits arrive for the same file before the first compile finishes, they coalesce into a single recompile with the latest content. Prevents compile storms from rapid sequential edits.

Target: single-file edit → recompile completes in <200ms (40ms typical, 200ms worst case with cold phase cache).

## Deliverables

- [ ] `claws-sdk/src/compile/phase-cache.ts` — PhaseCache class: per-phase output cache keyed by input content hashes. Methods: `get(phase: string, inputHashes: string[]): CachedOutput | undefined`, `set(phase: string, inputHashes: string[], output: PhaseOutput): void`, `invalidate(phase: string): void`, `invalidateByFile(filePath: string): void`. Dependency graph: map from OC file → affected phases, built during first full compile.
- [ ] `claws-sdk/src/compile/compilation-queue.ts` — CompilationQueue class: FIFO queue with coalescing (P-273). Methods: `enqueue(trigger: CompileTrigger): Promise<CompileResult>`, `drain(): void`. Coalescing: if a new trigger arrives for the same file as a pending trigger, the pending trigger is replaced (not duplicated). Callers await the returned promise which resolves when their compile (or the coalesced compile) completes.
- [ ] `claws-sdk/src/compile/phase-cache.ts` (dependency graph) — DependencyGraph class: tracks which OC files affect which compilation phases. Built during first full compile by recording which files each phase reads. On file change, returns the minimal set of phases to re-run.
- [ ] `claws-sdk/src/compile/cache.ts` (EDIT) — Integrate PhaseCache and CompilationQueue into existing CompilationCache. Hot path: file change → hash update → dependency graph lookup → phase cache invalidation → re-run only affected phases → update cache.
- [ ] `claws-sdk/tests/compile/phase-cache.unit.test.ts` — L0: phase cache hit returns cached output (1), phase cache miss returns undefined (1), invalidateByFile clears correct phases via dependency graph (1), dependency graph built from first full compile (1), cache eviction on memory pressure (1), hash mismatch invalidates phase (1)
- [ ] `claws-sdk/tests/compile/compilation-queue.unit.test.ts` — L0: single enqueue triggers compile (1), coalescing replaces pending trigger for same file (1)
- [ ] `claws-sdk/tests/compile/phase-cache.integration.test.ts` — L1: full compile → edit TOOLS.md → only classify+evaluate+emit re-run (1), sequential edits to different files invalidate correct phase subsets (1), coalesced compile produces correct output (1), cache survives across multiple compile cycles (1)
- [ ] `claws-sdk/tests/compile/phase-cache.e2e.test.ts` — L2: PATCH single tool → recompile completes in <200ms (1), rapid sequential edits coalesce — only one compile runs (1)
- [ ] `claws-sdk/tests/compile/phase-cache.accept.test.ts` — L3: S06 acceptance — single-file PATCH → recompile <200ms on reference workspace (1)

## Acceptance Criteria

- [ ] Single-file edit triggers partial recompile — only affected phases re-run (S06)
- [ ] Phase cache hit skips phase entirely — no re-execution
- [ ] Dependency graph correctly maps OC files to affected phases
- [ ] Compilation queue coalesces rapid edits to same file (P-273)
- [ ] PATCH single tool → recompile completes in <200ms (S06 key test)
- [ ] Rapid sequential edits produce exactly one compile with latest content
- [ ] Phase cache integrates with existing CompilationCache without breaking full compiles
- [ ] Memory-bounded: phase cache evicts LRU entries under memory pressure
- [ ] `npx vitest run --project unit --coverage` passes 95/90/95/95 per-file thresholds
- [ ] `npx vitest run --project integration --coverage` passes 85/70/80/85 whole-package thresholds
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/architect.md` — cache design patterns, dependency graph conventions, performance budgets
- `.craft/roles/claws/platform-eng.md` — CompilationHost integration, phase pipeline architecture

## Dependencies

- Pulse 21 (serve-scaffold) — CompilationHost and CompilationCache foundations, phase pipeline structure

## Test Gates

- [ ] L0 unit (8 tests): cache hit returns output (1), cache miss returns undefined (1), invalidateByFile clears correct phases (1), dependency graph built from first compile (1), cache eviction on memory pressure (1), hash mismatch invalidates (1), single enqueue triggers compile (1), coalescing replaces pending trigger (1)
- [ ] L1 integration (4 tests): full compile → edit → partial re-run (1), sequential edits invalidate correct subsets (1), coalesced compile correct output (1), cache survives multiple cycles (1)
- [ ] L2 e2e (2 tests): PATCH → recompile <200ms (1), rapid edits coalesce (1)
- [ ] L3 accept (1 test): S06 single-file PATCH <200ms acceptance (1)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
