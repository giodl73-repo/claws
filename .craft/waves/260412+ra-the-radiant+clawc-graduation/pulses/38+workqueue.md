---
pulse: 38
slug: workqueue
plan: claws-cap-integration
depends_on: [22]
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: [S13]
stage: implementation
test_tiers:
  L0_unit: 4
  L1_integration: 2
  L2_e2e: 0
  L3_accept: 1
test_scope:
  run:
    - "cd claws-serve && npx vitest run --project unit --coverage"
    - "cd claws-serve && npx vitest run --project integration --coverage"
  typecheck:
    - "cd claws-serve && npx tsc --noEmit"
checkpoint: 7
checkpoint_gate: false
---

# Pulse 38: Work Queue

## Objective

Implement GET /api/workqueue that returns a runtime task list bridging HEARTBEAT.md schedule entries with active agent state (business logic in claws-sdk/src/workspace/, route is thin HTTP adapter). The work queue merges scheduled tasks from HEARTBEAT.md with runtime state (in-progress, completed, blocked) tracked in a persistent store at .claws/workqueue.json (P-280 requirement). This enables M365 To Do and Planner integration by providing a structured task list with status, priority, and due dates.

The workqueue store handles persistence, conflict resolution (HEARTBEAT.md is authoritative for scheduled tasks, runtime state is additive), and cleanup of stale entries when HEARTBEAT.md changes.

## Deliverables

- [ ] `claws-serve/src/routes/workqueue.ts` — GET /api/workqueue: returns WorkQueueItem[] merging HEARTBEAT.md tasks with runtime state. Supports ?status= filter (pending, in-progress, completed, blocked). Returns items sorted by priority then due date.
- [ ] `claws-serve/src/state/workqueue-store.ts` — Persistent store backed by .claws/workqueue.json (P-280). Manages runtime task state (status transitions, completion timestamps). HEARTBEAT.md is authoritative for task definitions; store tracks only runtime state. Stale entries cleaned on HEARTBEAT.md change. Atomic writes with temp file + rename.
- [ ] `claws-serve/tests/state/workqueue-store.unit.test.ts` — L0: store persists to .claws/workqueue.json (1), stale entries cleaned on heartbeat change (1), atomic write uses temp + rename (1), status transitions validated (1)
- [ ] `claws-serve/tests/routes/workqueue.integration.test.ts` — L1: GET returns merged task list (1), status filter works (1)
- [ ] L3 acceptance: S13 (work queue merges HEARTBEAT.md with runtime state for To Do integration) (1)

## Acceptance Criteria

- [ ] GET /api/workqueue returns WorkQueueItem[] with status, priority, and due dates
- [ ] Items merge HEARTBEAT.md scheduled tasks with runtime state from .claws/workqueue.json
- [ ] HEARTBEAT.md is authoritative for task definitions -- store only tracks runtime state
- [ ] Stale entries are cleaned when HEARTBEAT.md changes
- [ ] Persistence uses atomic writes (temp file + rename) per P-280
- [ ] Status filter (?status=) correctly filters items
- [ ] S13 acceptance: work queue merges HEARTBEAT.md with runtime state
- [ ] All 4 L0 unit tests pass
- [ ] All 2 L1 integration tests pass

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/architect.md` — monorepo structure, SDK-owns-logic rule
- `.craft/roles/claws/platform-eng.md` — state persistence patterns, atomic file operations

## Dependencies

- Pulse 22 (workspace parser) — WorkspaceState containing parsed HEARTBEAT.md

## Test Gates

- [ ] L0 unit (4 tests): store persists to .claws/workqueue.json, stale entries cleaned, atomic write temp + rename, status transitions validated
- [ ] L1 integration (2 tests): GET returns merged task list, status filter works
- [ ] L3 acceptance (1 test): S13 work queue merges HEARTBEAT.md with runtime state
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
