---
pulse: 68
slug: batch-edits
plan: claws-cap-integration
depends_on: [31, 67]
governing_roles: [craft:architect, claws:gateway-eng]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 6
  L1_integration: 4
  L2_e2e: 2
  L3_accept: 0
test_scope:
  run:
    - "cd claws-sdk && npx vitest run --project unit --coverage"
    - "cd claws-serve && npx vitest run --coverage"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
    - "cd claws-serve && npx tsc --noEmit"
checkpoint: 6
checkpoint_gate: false
---

# Pulse 68: Batch Edits

## Objective

`POST /api/batch` accepts an array of operations as an atomic transaction. All-or-nothing
semantics: if any operation fails validation, the entire batch is rejected and no changes
are written. One recompilation for the entire batch (not per-operation). Supports
`?dryRun=true` on the batch endpoint.

Business logic (batch executor, validation aggregation, rollback) lives in claws-sdk.
The route in claws-serve is a thin HTTP adapter that deserializes the request, calls the
SDK batch executor, and serializes the response.

Batch size is capped at 20 operations to bound memory and latency.

## Deliverables

- [ ] `claws-sdk/src/workspace-edit/batch-executor.ts` — BatchExecutor: accepts array of edit operations, validates all before writing any, applies all atomically, triggers one recompilation. Returns per-operation results and aggregate governance summary. Enforces max 20 operations.
- [ ] `claws-serve/src/routes/batch.ts` — POST /api/batch route (thin adapter). Deserializes operations array, calls BatchExecutor, returns results.
- [ ] `claws-sdk/tests/workspace-edit/batch-executor.unit.test.ts` — L0: 6 tests for batch executor logic.
- [ ] `claws-serve/tests/routes/batch.integration.test.ts` — L1: 4 tests for batch route integration.
- [ ] `claws-serve/tests/e2e/batch.e2e.test.ts` — L2: 2 tests for live batch operations.

## Acceptance Criteria

- [ ] POST /api/batch with 3 valid operations applies all and returns success for each
- [ ] POST /api/batch with 1 invalid operation rejects entire batch (no partial writes)
- [ ] Rollback on failure: files unchanged when batch is rejected (verify file hashes)
- [ ] One recompilation triggered for the entire batch (not per-operation)
- [ ] POST /api/batch?dryRun=true validates all operations without writing
- [ ] Batch size limit enforced: >20 operations returns 400 with BATCH_SIZE_EXCEEDED error
- [ ] Each operation result includes its index for correlation
- [ ] Aggregate governance summary included in batch response

## Test Gates

- [ ] L0 unit (6 tests): 3-operation batch all succeed, batch with 1 failure rolls back all, batch with dryRun returns preview, batch size limit (>20 rejected), empty batch returns 400, single-operation batch works
- [ ] L1 integration (4 tests): batch across multiple OC files, batch rollback verifies no file mutation, batch dryRun with mixed valid/invalid, batch triggers single recompilation event
- [ ] L2 e2e (2 tests): start serve + send multi-operation batch + verify all applied, start serve + send batch with failure + verify rollback
