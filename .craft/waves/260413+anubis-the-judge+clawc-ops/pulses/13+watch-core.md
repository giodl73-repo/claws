---
pulse: 13
slug: watch-core
plan: claws-three-rings
depends_on: [6]
governing_roles: [claws:gateway-eng, craft:navigator]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 6
  L1_integration: 2
  L2_e2e: 0
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

# Pulse 13: Watch Core

## Objective

Build the core file-watching infrastructure for `claws watch`. The watcher monitors all 9 OC files (SOUL.md, TOOLS.md, AGENTS.md, IDENTITY.md, USER.md, MEMORY.md, HEARTBEAT.md, skills/*/SKILL.md, lobster.yaml) plus claws.json and .claws/policies/ for changes. When files change, the debounce layer batches events within a 300ms window, deduplicates, and the content-hash layer skips files whose SHA-256 hash hasn't actually changed (handling editor save-without-edit). The incremental parser re-parses only genuinely changed files and merges results with cached parse output.

This pulse builds the watch engine only — the auto-analyze and auto-recompile behaviors are added in Pulse 14.

## Deliverables

- [ ] `claws-sdk/src/watch/index.ts` — public API barrel export for watch module
- [ ] `claws-sdk/src/watch/watcher.ts` — fs.watch() on OC files + claws.json + .claws/policies/, event normalization
- [ ] `claws-sdk/src/watch/debounce.ts` — 300ms batch window, collect changed file paths, deduplicate within window
- [ ] `claws-sdk/src/watch/content-hash.ts` — SHA-256 per-file content hash, skip files with unchanged hash
- [ ] `claws-sdk/src/watch/incremental.ts` — re-parse only changed files, merge with cached parse results, expose merged state
- [ ] `claws-sdk/src/watch/event-normalizer.ts` — normalize Windows fs.watch duplicate events (NTFS double-fire dedup), handle VS Code rename-as-change save pattern
- [ ] `claws-cli/src/commands/watch.ts` — terminal output: file changed → re-checking → results (thin CLI adapter)
- [ ] `claws-sdk/tests/watch/watch-core.unit.test.ts` — L0: 6 unit tests
- [ ] `claws-sdk/tests/watch/watch-core.integration.test.ts` — L1: 2 integration tests + Windows event normalization deduplicates NTFS double-fire

## Acceptance Criteria

- [ ] Watcher detects file creation, modification, and deletion for all watched paths
- [ ] Debounce batches 3 rapid saves within 300ms into a single batch
- [ ] Content hash correctly identifies unchanged files (save without edit) and skips them
- [ ] Incremental parser only re-parses files in the change set, not the entire workspace
- [ ] Merged state reflects current workspace after incremental update
- [ ] CLI adapter displays file change events in terminal
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:
- `.craft/roles/claws/gateway-eng.md` — OC file formats, watch semantics, incremental parse
- `.craft/roles/craft/navigator.md` — cross-module integration, event-driven architecture

## Dependencies

- Pulse 6: base-cli config (needs workspace root detection and config loading)

## Test Gates

- [ ] L0 unit: 6 tests — debounce batches 3 events into 1, content hash detects unchanged file, content hash detects changed file, incremental parse re-parses only changed file, file dedup within batch, watcher normalizes events
- [ ] L1 integration: 2 tests — watch on reference workspace detects TOOLS.md edit and triggers re-parse, dedup 3 rapid saves produces single batch
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
