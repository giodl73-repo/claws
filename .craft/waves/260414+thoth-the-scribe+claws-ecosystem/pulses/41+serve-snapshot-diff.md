---
pulse: 41
slug: serve-snapshot-diff
plan: claws-serve
depends_on: [38, 39]
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 4
  L1_integration: 2
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run:
    - "cd claws-serve && npx vitest run"
  typecheck:
    - "cd claws-serve && npx tsc --noEmit"
checkpoint: 4
checkpoint_gate: false
---

# Pulse 41: Serve Snapshot, Diff, and Invalidate

## Objective

Build governance snapshot, diff, and cache invalidation endpoints. POST /snapshot saves a named governance snapshot by serializing the current GovernanceIR state with a user-provided name and timestamp. GET /diff compares two named snapshots and returns the delta: added/removed/changed violations, tension changes, and risk level shifts. POST /invalidate forces the CompilationHost cache to invalidate, ensuring the next GET /ir triggers a full recompile. Snapshot and diff reuse GovernanceIR serialization from claws-sdk to ensure format consistency across the toolchain.

Snapshot names are validated: alphanumeric characters, hyphens, and underscores only, max 128 characters. Names containing `/`, `\`, `..`, or null bytes are rejected. path.resolve() is used to verify the resolved path is within the expected snapshot directory.

## Deliverables

- [ ] `claws-serve/src/routes/snapshot.ts` — POST /snapshot: save named snapshot; GET /diff: compare two snapshots by name
- [ ] `claws-serve/src/routes/invalidate.ts` — POST /invalidate: force cache invalidation, next GET /ir triggers recompile
- [ ] `claws-serve/tests/routes/snapshot.unit.test.ts` — L0: snapshot save creates named snapshot (1), diff returns delta between snapshots (1)
- [ ] `claws-serve/tests/routes/invalidate.unit.test.ts` — L0: invalidate forces recompile on next GET /ir (1)
- [ ] `claws-serve/tests/routes/snapshot.unit.test.ts` (UPDATE) — add L0: path traversal in snapshot name rejected (1)
- [ ] `claws-serve/tests/routes/snapshot-diff.integration.test.ts` — L1: save, modify, save, diff shows delta (1), invalidate then GET /ir recompiles (1)

## Acceptance Criteria

- [ ] POST /snapshot saves a named snapshot with timestamp
- [ ] GET /diff returns delta between two named snapshots (added/removed/changed violations, tension changes, risk shifts)
- [ ] GET /diff returns 404 when a named snapshot does not exist
- [ ] POST /invalidate clears the CompilationHost cache
- [ ] After POST /invalidate, next GET /ir triggers a full recompile
- [ ] Snapshot serialization uses GovernanceIR format from claws-sdk
- [ ] Snapshot name with `../` is rejected with 400 Bad Request
- [ ] Snapshot name with null bytes is rejected
- [ ] All 4 L0 unit tests pass
- [ ] All 2 L1 integration tests pass

## Governing Roles

Load these role files before starting:
- `.craft/roles/claws/architect.md` — system-level design authority for claws packages
- `.craft/roles/claws/platform-eng.md` — implementation patterns and snapshot design

## Dependencies

- Pulse 38 (serve-foundation) — HTTP server entry point and route registration
- Pulse 39 (serve-compile-ir) — CompilationHost and GovernanceIR compilation

## Test Gates

- [ ] L0 unit (4 tests): snapshot save creates named snapshot, diff returns delta between snapshots, invalidate forces recompile on next GET /ir, path traversal in snapshot name rejected
- [ ] L1 integration (2 tests): save then modify then save then diff shows delta, invalidate then GET /ir recompiles
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
