---
pulse: 72
slug: auto-snapshot
plan: claws-cap-integration
depends_on: [32, 70]
governing_roles: [craft:architect, craft:dragon]
scenario_codes: [S05, S29, S32]
stage: implementation
test_tiers:
  L0_unit: 6
  L1_integration: 4
  L2_e2e: 2
  L3_accept: 1
test_scope:
  run:
    - "cd claws-sdk && npx vitest run --project unit --coverage"
    - "cd claws-serve && npx vitest run"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
    - "cd claws-serve && npx tsc --noEmit"
checkpoint: 7
checkpoint_gate: false
---

# Pulse 72: Auto-Snapshot on External Writes

## Objective

Every external write (OC runtime, VS Code, OneDrive sync) triggers an auto-snapshot
of the PREVIOUS state before recompilation. This is the safety net for OC runtime
writes that bypass the API.

The auto-snapshot stores the last good GovernanceIR + file hashes in the compilation
forest under `.claws/snapshots/auto/{version}`. Bounded to last 20 auto-snapshots.
The time-travel API resolves `?at=auto:{timestamp}` to these.

Business logic in claws-sdk (snapshot manager). Triggered by file watcher in
claws-serve.

## Deliverables

- [ ] `claws-sdk/src/workspace/auto-snapshot.ts` — AutoSnapshotManager. On file watcher event: save current GovernanceIR + file hashes to `.claws/snapshots/auto/{version}` BEFORE recompiling. Bounded to 20 entries (LRU eviction). Uses the compilation forest's existing storage, not a separate copy.
- [ ] `claws-sdk/src/workspace/auto-snapshot-types.ts` — AutoSnapshot type: version, timestamp, fileHashes, governanceIrHash, trigger (oc_runtime | external_edit | onedrive_sync).
- [ ] `claws-sdk/src/workspace/auto-snapshot-trigger.ts` — Trigger hook in the SDK watch pipeline that intercepts file watcher events and calls AutoSnapshotManager.save() before passing to the recompile queue.
- [ ] Integrity check before storage: parse the file after stability window. If the file doesn't parse (partially written), skip the snapshot — let the recompile handle it as ERROR. Only snapshot parseable file states.
- [ ] Integration with time-travel: version-resolver (pulse 70) resolves `?at=auto:{timestamp}` to auto-snapshot entries.
- [ ] `claws-sdk/tests/workspace/auto-snapshot.unit.test.ts` — L0: 6 tests (save snapshot, LRU eviction at 20, timestamp accuracy, trigger attribution, resolve auto snapshot, empty snapshot dir).
- [ ] `claws-serve/tests/middleware/auto-snapshot.integration.test.ts` — L1: 4 tests (external edit triggers snapshot, OC runtime write triggers snapshot, OneDrive sync triggers snapshot, rapid edits don't exceed bounds).
- [ ] `claws-serve/tests/e2e/auto-snapshot.e2e.test.ts` — L2: 2 tests (edit file externally → snapshot created → diff shows change, OC runtime install skill → snapshot → violation detected → rollback to snapshot).
- [ ] L3 acceptance: OC runtime installs a skill with R5 tools, auto-snapshot captures pre-install state, admin can diff and rollback.

## Acceptance Criteria

- [ ] Every file watcher event creates an auto-snapshot BEFORE recompilation
- [ ] Auto-snapshots bounded to 20 (configurable), LRU eviction
- [ ] Time-travel API resolves ?at=auto:{timestamp}
- [ ] GET /api/diff?from=auto:previous&to=current shows what changed
- [ ] Trigger source attributed in snapshot metadata (oc_runtime/external_edit/onedrive_sync)
