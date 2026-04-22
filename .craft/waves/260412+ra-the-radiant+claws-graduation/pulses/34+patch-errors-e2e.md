---
pulse: 34
slug: patch-errors-e2e
plan: claws-cap-integration
depends_on: [31, 32]
governing_roles: [craft:architect, claws:platform-eng, claws:ciso]
scenario_codes: [cap-integration/S07, cap-integration/S20, cap-integration/S33]
stage: implementation
test_tiers:
  L0_unit: 4
  L1_integration: 2
  L2_e2e: 4
  L3_accept: 3
test_scope:
  run:
    - "cd claws-serve && npx vitest run --project unit --coverage"
    - "cd claws-serve && npx vitest run --project integration --coverage"
    - "cd claws-serve && npx vitest run --project e2e"
  typecheck:
    - "cd claws-serve && npx tsc --noEmit"
checkpoint: 6
checkpoint_gate: true
---

# Pulse 34: Patch Errors E2E and CP-6 Gate

## Objective

CP-6 gate pulse. All 8 PatchError types must be tested end-to-end through the full HTTP stack: request → middleware → validation → write → compile → response. This pulse verifies that every error path produces the correct HTTP status, PatchError body, and structured context when exercised through actual HTTP requests against a running claws-serve instance.

Additionally, this pulse implements atomic rollback on compilation failure (P-274): if the incremental recompile fails after a successful write, the OC file is rolled back to its pre-edit state. The user never sees a workspace in a broken state. The rollback itself is logged to the audit trail.

Startup health check: when claws-serve starts, it performs a full compilation to validate the workspace is in a compilable state. If the initial compile fails, the server starts in degraded mode — read-only endpoints work, but all write endpoints return 503 Service Unavailable with a diagnostic message. This prevents writes to an already-broken workspace.

## Deliverables

- [ ] `claws-serve/src/lifecycle/health-check.ts` — Startup health check: trigger full compile on server start, set server mode to `healthy` (reads + writes) or `degraded` (reads only, writes return 503). Expose mode via GET /health response. Degraded mode diagnostic includes the compilation error details.
- [ ] `claws-serve/src/routes/patch-chunks.ts` (EDIT) — Add atomic rollback on compilation failure (P-274): if incremental recompile fails after write, restore OC file from pre-edit snapshot, log rollback to audit trail, return COMPILATION_FAILED PatchError with rollback confirmation. Add degraded-mode guard: return 503 if server is in degraded mode.
- [ ] `claws-serve/tests/e2e/patch-errors.e2e.test.ts` — L2: all 8 PatchError types tested through full HTTP stack:
  - R5_LOCKED: PATCH to toggle R5 tool → 403 with R5_LOCKED body (1)
  - FLEET_LOCKED: PATCH on workspace with missing fleet policy → 403 with FLEET_LOCKED body (1)
  - GOVERNANCE_DENIED: PATCH violating governance deny rule → 403 with GOVERNANCE_DENIED body and provenance (1)
  - COMPILATION_FAILED + rollback: PATCH that triggers compile error → 500 with COMPILATION_FAILED, OC file rolled back to pre-edit state (1)
- [ ] `claws-serve/tests/lifecycle/health-check.unit.test.ts` — L0: healthy workspace → server starts in healthy mode (1), broken workspace → server starts in degraded mode (1), degraded mode → write endpoints return 503 (1), GET /health includes mode field (1)
- [ ] `claws-serve/tests/lifecycle/health-check.integration.test.ts` — L1: server startup → full compile → mode set correctly (1), degraded mode → PATCH returns 503 with diagnostic (1)
- [ ] `claws-serve/tests/e2e/patch-errors.accept.test.ts` — L3: S07 acceptance — all 8 PatchError HTTP responses correct (1), S20 acceptance — compilation failure triggers atomic rollback, OC file restored (1), S33 acceptance — startup health check sets degraded mode on broken workspace (1)
- [ ] `claws-serve/tests/fixtures/broken-workspace/` — fixture workspace that fails compilation (malformed OC file)
- [ ] `claws-serve/tests/fixtures/governance-deny-workspace/` — fixture workspace with GovernanceIR deny rules
- [ ] `claws-serve/tests/fixtures/fleet-missing-workspace/` — fixture workspace with no fleet policy
- [ ] Health check verifies fleet policy is loadable. Missing/corrupt fleet policy = health status 'degraded', all fleet-lockable fields locked until fleet policy is resolved.

## Acceptance Criteria

- [ ] All 8 PatchError types produce correct HTTP status and structured body through the full stack (S07)
- [ ] R5_LOCKED → 403, FLEET_LOCKED → 403, GOVERNANCE_DENIED → 403, VALIDATION_FAILED → 422, FILE_NOT_EDITABLE → 403, COMPILATION_FAILED → 500, ROLLBACK_FAILED → 500, UNKNOWN_ERROR → 500
- [ ] Atomic rollback on compilation failure (P-274): OC file restored to pre-edit state (S20)
- [ ] Rollback logged to audit trail with pre-edit and post-edit hashes
- [ ] Startup health check runs full compile on server start (S33)
- [ ] Broken workspace → degraded mode → write endpoints return 503
- [ ] Healthy workspace → full mode → all endpoints operational
- [ ] GET /health includes server mode (healthy/degraded)
- [ ] All CP-6 pulses (29-34) pass their test suites
- [ ] Full claws-serve and claws-sdk test suites green
- [ ] `npx vitest run --project unit --coverage` passes coverage thresholds
- [ ] `npx vitest run --project integration --coverage` passes coverage thresholds
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/architect.md` — CP gate criteria, rollback patterns, health check design
- `.craft/roles/claws/platform-eng.md` — server lifecycle, degraded mode implementation
- `.craft/roles/claws/ciso.md` — rollback audit requirements, degraded mode security posture

## Dependencies

- Pulse 31 (patch-routes) — PATCH route infrastructure, PatchError response mapping
- Pulse 32 (incremental-cache) — Incremental recompile pipeline, compilation queue

## Test Gates

- [ ] L0 unit (4 tests): healthy workspace → healthy mode (1), broken workspace → degraded mode (1), degraded mode → 503 on writes (1), GET /health includes mode (1)
- [ ] L1 integration (2 tests): startup → full compile → mode set (1), degraded → PATCH returns 503 (1)
- [ ] L2 e2e (4 tests): R5_LOCKED through HTTP stack (1), FLEET_LOCKED through HTTP stack (1), GOVERNANCE_DENIED through HTTP stack (1), COMPILATION_FAILED + rollback through HTTP stack (1)
- [ ] L3 accept (3 tests): S07 all 8 PatchError types acceptance (1), S20 atomic rollback acceptance (1), S33 startup health check acceptance (1)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
