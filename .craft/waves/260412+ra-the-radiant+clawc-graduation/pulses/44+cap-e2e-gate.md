---
pulse: 44
slug: cap-e2e-gate
plan: claws-cap-integration
depends_on: [35, 36, 37, 38, 39, 40, 41, 42, 43]
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: [S28, S34, S35]
stage: implementation
test_tiers:
  L0_unit: 2
  L1_integration: 0
  L2_e2e: 6
  L3_accept: 5
test_scope:
  run:
    - "cd claws-serve && npx vitest run --project integration --coverage"
    - "cd claws-serve && npx vitest run tests/e2e/full-api.e2e.test.ts"
  typecheck:
    - "cd claws-serve && npx tsc --noEmit"
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 8
checkpoint_gate: true
---

# Pulse 44: CAP E2E Gate

## Objective

Full end-to-end acceptance gate for the entire CAP integration API surface. All 20 endpoints are tested in a single integrated test suite that exercises the complete request lifecycle: authentication, validation, business logic, persistence, and response formatting. This pulse writes no new production code -- it is purely a test and verification gate.

Policy violation scenarios (S21-S28) are exercised to verify that governance enforcement works correctly across all write paths. The external edit bypass scenario (S33) verifies that OC files edited outside claws serve are detected and handled gracefully on next API request. This is the CP-8 gate pulse -- the full API surface must be operational and all acceptance scenarios must pass.

## Deliverables

- [ ] `claws-serve/tests/e2e/full-api-smoke.unit.test.ts` — L0: all 20 endpoint route registrations exist in serve route table (1), S28 circular delegation scenario fixture is well-formed (1)
- [ ] `claws-serve/tests/e2e/full-api.e2e.test.ts` — Comprehensive E2E test suite covering all 20 API endpoints:
  - L2 e2e (6 tests):
    1. Full chunk read cycle: GET all 6 chunk endpoints return typed JSON (1)
    2. Full chunk write cycle: PATCH -> validate -> write -> compile -> GET reflects change (1)
    3. Loop sync cycle: GET/PATCH soul and memory sections round-trip (1)
    4. Trust escalation cycle: GET trust -> PATCH escalate with JWT -> GET reflects new tier (1)
    5. Onboard cycle: POST transcript -> generate -> compile -> GET chunks reflect seed (1)
    6. External edit detection: modify OC file outside serve -> next GET reflects change (1)
  - L3 acceptance (5 tests):
    1. S21-S24 policy violations: R5 lock enforced on PATCH, fleet lock enforced, governance lock enforced, compound violation returns all errors (1)
    2. S25-S28 policy violations: skill install blocked for R5, trust escalation without JWT rejected, audit query pagination boundary, fleet policy hot-reload (1)
    3. S33 external edit bypass: OC file modified externally, serve detects and recompiles (1)
    4. S34 content validation: onboard with secrets rejected, injection blocked, oversized rejected (1)
    5. S35 full API surface: all 20 endpoints respond with correct status codes and typed schemas (1)

## Acceptance Criteria

- [ ] All 20 API endpoints respond with correct HTTP status codes
- [ ] All response bodies match typed schemas (no any-typed responses)
- [ ] R5 lock enforcement prevents writes to protected tools (S21)
- [ ] Fleet lock enforcement prevents writes to fleet-managed settings (S22)
- [ ] Governance lock enforcement prevents writes violating governance policies (S23)
- [ ] Compound violations return all applicable errors, not just the first (S24)
- [ ] Skill install blocked for R5-locked tools (S25)
- [ ] Trust escalation without valid JWT returns 401 (S26)
- [ ] Audit cursor pagination handles boundary correctly (S27 -- P-281)
- [ ] Fleet policy hot-reload reflects changes without restart (S28 -- P-272)
- [ ] External OC file edits detected and recompiled on next request (S33)
- [ ] Onboard content validation blocks secrets and injection (S34)
- [ ] Full API surface operational with all 20 endpoints (S35)
- [ ] All 6 L2 e2e tests pass
- [ ] All 5 L3 acceptance tests pass
- [ ] CP-8 gate: full API surface operational, all acceptance scenarios pass

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/architect.md` — system-level integration, API surface verification
- `.craft/roles/claws/platform-eng.md` — E2E testing patterns, acceptance gate criteria

## Dependencies

- All prior cap-integration pulses (35-43) — all endpoints must be implemented before this gate pulse

## Test Gates

- [ ] L0 unit (2 tests): all 20 endpoint route registrations exist (1), S28 circular delegation fixture well-formed (1)
- [ ] L2 e2e (6 tests): full chunk read cycle, full chunk write cycle, Loop sync cycle, trust escalation cycle, onboard cycle, external edit detection
- [ ] L3 acceptance (5 tests): S21-S24 policy violations, S25-S28 policy violations, S33 external edit bypass, S34 content validation, S35 full API surface
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
