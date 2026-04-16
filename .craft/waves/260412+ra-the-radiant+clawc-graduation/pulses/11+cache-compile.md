---
pulse: 11
slug: cache-compile
plan: claws-sdk-graduation
depends_on: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
governing_roles: [craft:architect, craft:perf-stress, claws:platform-eng]
scenario_codes: [execution/S01, execution/S03, cross-package/S03]
stage: implementation
test_tiers:
  L0_unit: 6
  L1_integration: 3
  L2_e2e: 1
  L3_accept: 0
test_scope:
  run:
    - "cd claws-sdk && npx vitest run --project unit --coverage"
    - "cd claws-sdk && npx vitest run --project integration --coverage"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 2
checkpoint_gate: false
---

# Pulse 11: Compilation Cache + Host

## Objective

Build the simplified compilation cache and compilation host that replaces compiler-sdk's cache/snapshot patterns and CompilationHost. ~600 lines total. The cache uses content-addressable hashing (SHA-256 from pulse 4) to skip recompilation when input files haven't changed. The compilation host orchestrates the full pipeline: read → parse → analyze → enforce → emit.

The free-tier cache is file-based (one cache directory per workspace) with content-hash keys. No snapshot save/restore/diff (that's paid). No fleet-wide cache sharing (that's paid). The compilation host wires together all prior pulse modules into a single `compile(workspaceRoot: string, options: CompileOptions): CompileResult` entry point.

## Deliverables

- [ ] `claws-sdk/src/compiler/cache/types.ts` -- CacheEntry (key: SHA-256 hash, value: serialized IR, timestamp, size), CacheManifest (entries map, totalSize, hitCount, missCount), CacheOptions (cacheDir, maxSize, ttl)
- [ ] `claws-sdk/src/compiler/cache/content-hash.ts` -- `contentHash(files: WorkspaceFile[]): string` -- SHA-256 hash of concatenated file contents (sorted by path for determinism). Uses crypto/hash.ts from pulse 4. ~60 lines
- [ ] `claws-sdk/src/compiler/cache/cache.ts` -- CompilationCache class: get(key), set(key, value), has(key), invalidate(key), clear(), stats(). File-based storage with manifest. LRU eviction when maxSize exceeded. ~200 lines
- [ ] `claws-sdk/src/compiler/cache/index.ts` -- Barrel exports for cache module
- [ ] `claws-sdk/src/compiler/host/types.ts` -- CompileOptions (targets, cacheEnabled, verbose, dryRun, outputDir), CompileResult (success boolean, emitResults per target, validationReport, cacheHit boolean, duration, diagnostics)
- [ ] `claws-sdk/src/compiler/host/compile.ts` -- `compile(workspaceRoot: string, options: CompileOptions): Promise<CompileResult>` -- the main entry point. Pipeline: (1) readOCWorkspace, (2) resolveSidecar, (3) map to OCWorkspaceIR, (4) run governance analysis, (5) enforceR5, (6) emit per target, (7) validate, (8) cache result. ~250 lines
- [ ] `claws-sdk/src/compiler/host/index.ts` -- Barrel exports for host module
- [ ] `claws-sdk/tests/compiler/cache/cache.unit.test.ts` -- L0: set→get round-trip (1), cache miss returns undefined (1), content-hash is deterministic (1), content-hash changes when file content changes (1), LRU eviction removes oldest entry (1), cache stats track hits and misses (1)
- [ ] `claws-sdk/tests/compiler/host/compile.integration.test.ts` -- L1: compile from fixture workspace succeeds (1), compile with cache hit skips recompilation (1), compile with changed file invalidates cache (1)
- [ ] `claws-sdk/tests/compiler/host/compile.e2e.test.ts` -- L2: full compile pipeline from fixture: read 9 files → parse → analyze → enforce → emit OC + CC → validate → cache (1)

## Acceptance Criteria

- [ ] Zero imports from `@craftworks/compiler-sdk` -- no CompilationHost, no cache patterns, no snapshot
- [ ] Content-hash is deterministic: same input files always produce same hash regardless of read order
- [ ] Cache hit skips the full pipeline (returns cached CompileResult)
- [ ] Cache miss runs the full pipeline and stores the result
- [ ] LRU eviction prevents unbounded cache growth
- [ ] Compilation host wires together all prior modules: readers (P1), sidecar (P2), IR (P3), crypto (P4), audit (P5), enforce (P6), emit (P7/P8), validate (P10)
- [ ] `compile()` is the single public entry point for the entire compilation pipeline
- [ ] No snapshot save/restore/diff -- that is paid-tier
- [ ] `npx vitest run --project unit --coverage` passes 95/90/95/95 per-file thresholds
- [ ] `npx vitest run --project integration --coverage` passes 85/70/80/85 whole-package thresholds
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/architect.md` -- compilation pipeline design, host orchestration, cache strategy
- `.craft/roles/craft/perf-stress.md` -- cache performance, LRU eviction, content-hash determinism
- `.craft/roles/claws/platform-eng.md` -- SDK host patterns, pipeline integration

## Dependencies

- Pulse 1 (oc-workspace-readers) -- readOCWorkspace for pipeline step 1
- Pulse 2 (forma-sidecar-resolver) -- resolveSidecar for pipeline step 2
- Pulse 3 (formir-types) -- OCWorkspaceIR mapping for pipeline step 3
- Pulse 4 (crypto-internalize) -- SHA-256 hash for content-addressable cache keys
- Pulse 5 (audit-chain-local) -- Ed25519 audit entries for pipeline audit step
- Pulse 6 (r5-fail-closed) -- enforceR5 for pipeline enforcement step
- Pulse 7 (emit-oc-target) -- OC emitter for pipeline emit step
- Pulse 8 (emit-claude-code) -- Claude Code emitter for pipeline emit step
- Pulse 9 (ts-codegen) -- TS codegen integration
- Pulse 10 (eval-validator) -- validation for pipeline validate step

## Test Gates

- [ ] L0 unit (6 tests): set→get (1), cache miss (1), hash deterministic (1), hash changes (1), LRU eviction (1), cache stats (1)
- [ ] L1 integration (3 tests): fixture compile (1), cache hit (1), cache invalidation (1)
- [ ] L2 e2e (1 test): full pipeline from fixture (1)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
