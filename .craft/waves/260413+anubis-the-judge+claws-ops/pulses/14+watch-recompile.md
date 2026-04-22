---
pulse: 14
slug: watch-recompile
plan: claws-three-rings
depends_on: [13]
governing_roles: [claws:gateway-eng, claws:platform-eng]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 4
  L1_integration: 2
  L2_e2e: 1
  L3_accept: 0
test_scope:
  run:
    - "cd claws-sdk && npx vitest run"
    - "cd claws-cli && npx vitest run"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
    - "cd claws-cli && npx tsc --noEmit"
checkpoint: 2
checkpoint_gate: false
---

# Pulse 14: Watch Recompile

## Objective

Extend the watch core from Pulse 13 with auto-analyze and auto-recompile behaviors. After each incremental parse, the watch pipeline runs the full analyze pass (29 governance rules) and updates the terminal output if violations have changed. If build artifacts already exist in .claws/compiled/, the watcher auto-recompiles to keep artifacts in sync with workspace state. Cache invalidation is content-hash-driven: a hash mismatch invalidates the compile cache for that file, triggering recompilation of affected artifacts.

This completes the inner development loop: edit an OC file → watch detects change → analyze runs → violations update → artifacts recompile — all within seconds.

## Deliverables

- [ ] `claws-sdk/src/watch/auto-analyze.ts` — after incremental parse, run analyze (29 rules), diff violations against previous state, emit change events
- [ ] `claws-sdk/src/watch/auto-recompile.ts` — if .claws/compiled/ exists, recompile affected artifacts on change, update compile cache
- [ ] `claws-sdk/src/watch/cache-invalidation.ts` — content hash mismatch → invalidate compile cache for file → mark dependent artifacts stale
- [ ] `claws-cli/src/commands/watch.ts` — updated terminal output: violation count changes, recompile status, timing
- [ ] `claws-sdk/tests/watch/watch-recompile.unit.test.ts` — L0: 4 unit tests
- [ ] `claws-sdk/tests/watch/watch-recompile.integration.test.ts` — L1: 2 integration tests
- [ ] `claws-sdk/tests/watch/watch-recompile.e2e.test.ts` — L2: 1 e2e test

## Acceptance Criteria

- [ ] Auto-analyze triggers after every incremental parse and produces correct violation set
- [ ] Violation diff correctly identifies new, resolved, and unchanged violations
- [ ] Auto-recompile updates .claws/compiled/ artifacts when source OC files change
- [ ] Cache invalidation correctly marks stale artifacts when content hash changes
- [ ] No recompile occurs when content hash hasn't changed (save-without-edit)
- [ ] Terminal output shows violation count delta and recompile timing
- [ ] Watch <1s latency verified on Windows (NTFS fs.watch behavior)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:
- `.craft/roles/claws/gateway-eng.md` — analyze pipeline, violation diffing, artifact management
- `.craft/roles/claws/platform-eng.md` — cache invalidation, recompile performance, cross-platform fs behavior

## Dependencies

- Pulse 13: watch core (watcher, debounce, content-hash, incremental parse)

## Test Gates

- [ ] L0 unit: 4 tests — auto-analyze triggers on change, cache invalidation on hash mismatch, artifact update after recompile, violation diff identifies new/resolved
- [ ] L1 integration: 2 tests — watch + edit TOOLS.md → auto-recompile → gateway-sim verifies new enforcement, unchanged save → no recompile; Windows integration: watch <1s latency on NTFS
- [ ] L2 e2e: 1 test — watch detects violation within 1s of save on reference workspace
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
