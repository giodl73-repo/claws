---
pulse: 42
slug: fleet-claws
plan: claws-cap-integration
depends_on: [27]
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: [S18, S27]
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
checkpoint: 8
checkpoint_gate: false
---

# Pulse 42: Fleet Claws

## Objective

Implement GET /api/fleet/claws for multi-claw aggregation through the Companion App (business logic in claws-sdk/src/fleet/, route is thin HTTP adapter). The endpoint queries multiple claw workspaces and returns a unified FleetView with per-claw status, governance compliance, drift detection, and aggregated metrics. Fleet policy hot-reload (P-272 requirement) ensures that policy changes propagate to the fleet view without server restart -- the endpoint always reflects the current fleet policy state.

The fleet view aggregates: claw count, per-claw trust tier, per-claw compilation status (clean, warnings, errors), policy compliance percentage, and drift indicators (claws that deviate from fleet baseline). This gives fleet administrators a single pane of glass across all managed claws.

## Deliverables

- [ ] `claws-serve/src/routes/fleet.ts` — GET /api/fleet/claws: returns FleetView { claws: ClawStatus[], totalCount, compliantCount, driftCount, lastPolicyRefresh }. Each ClawStatus includes id, name, trustTier, compilationStatus, policyCompliance, driftIndicators[]. Fleet policy is hot-reloaded on each request (P-272) -- reads current policy from fleet config, no caching of stale policy. Supports ?status= filter (compliant, drifted, error).
- [ ] `claws-serve/tests/routes/fleet.unit.test.ts` — L0: GET returns fleet view with claw statuses (1), fleet policy hot-reload reflects changes (1), status filter works (1), drift indicators computed correctly (1)
- [ ] `claws-serve/tests/routes/fleet.integration.test.ts` — L1: GET aggregates across multiple claw workspaces (1), policy change reflected without restart (1)
- [ ] L3 acceptance: S18 (multi-claw fleet aggregation with drift detection) (1)

## Acceptance Criteria

- [ ] GET /api/fleet/claws returns typed FleetView with per-claw ClawStatus[]
- [ ] Fleet policy is hot-reloaded on each request per P-272 -- no stale policy
- [ ] Per-claw status includes trust tier, compilation status, policy compliance
- [ ] Drift indicators identify claws deviating from fleet baseline
- [ ] Status filter (?status=) correctly scopes to compliant/drifted/error
- [ ] Aggregated metrics (totalCount, compliantCount, driftCount) are accurate
- [ ] S18 acceptance: multi-claw fleet aggregation with drift detection
- [ ] All 4 L0 unit tests pass
- [ ] All 2 L1 integration tests pass

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/architect.md` — monorepo structure, SDK-owns-logic rule
- `.craft/roles/claws/platform-eng.md` — fleet management patterns, hot-reload conventions

## Dependencies

- Pulse 27 (fleet operations) — fleet workspace discovery and policy infrastructure

## Test Gates

- [ ] L0 unit (4 tests): GET returns fleet view, policy hot-reload, status filter, drift indicators
- [ ] L1 integration (2 tests): multi-claw aggregation, policy change without restart
- [ ] L3 acceptance (1 test): S18 multi-claw fleet aggregation with drift detection
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
