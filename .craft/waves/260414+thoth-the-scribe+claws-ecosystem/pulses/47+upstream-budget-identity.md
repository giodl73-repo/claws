---
pulse: 47
slug: upstream-budget-identity
plan: claws-upstream-contrib
depends_on: [46]
governing_roles: [craft:architect, claws:founder]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 8
  L1_integration: 3
  L2_e2e: 2
  L3_accept: 1
test_scope:
  run:
    - "cd packages/budget-meter && npx vitest run"
    - "cd packages/identity-bridge && npx vitest run"
  typecheck:
    - "cd packages/budget-meter && npx tsc --noEmit && cd ../identity-bridge && npx tsc --noEmit"
checkpoint: 5
checkpoint_gate: false
---

# Pulse 47: @openclaw/budget-meter and @openclaw/identity-bridge

## Objective
**Execution context**: This pulse executes within the `craftworks/openclaw-governance` standalone monorepo (https://github.com/gim-home/openclaw-governance), NOT the claws repo. The test_scope paths (packages/...) are relative to that repo root. During wave execution, the openclaw-governance repo must be cloned and set up before these pulses can run.

Two standalone packages: @openclaw/budget-meter (~8KB) and @openclaw/identity-bridge (~3KB).

Budget-meter provides token/cost tracking with 80/95/100% threshold alerts and throttle enforcement. When usage hits 80%, a warning event fires. At 95%, a critical warning fires. At 100%, the throttle blocks further requests until the budget resets.

Identity-bridge provides OIDC/SAML token validation with role-based access control (RBAC). It validates tokens from identity providers and maps them to roles and permissions for authorization decisions.

Both packages have zero `@craftworks/*` imports and are publishable standalone under the `@openclaw` scope with MIT licenses.

## Deliverables
- [ ] `packages/budget-meter/package.json` — MIT license, zero peer deps
- [ ] `packages/budget-meter/src/meter.ts` — token/cost tracking with threshold alerts
- [ ] `packages/budget-meter/src/throttle.ts` — enforcement: block at 100%, warn at 80/95%
- [ ] `packages/budget-meter/src/types.ts` — BudgetConfig, ThresholdEvent types
- [ ] `packages/identity-bridge/package.json` — MIT license, zero peer deps
- [ ] `packages/identity-bridge/src/bridge.ts` — OIDC/SAML token validation
- [ ] `packages/identity-bridge/src/rbac.ts` — role-based access control checks
- [ ] `packages/identity-bridge/src/types.ts` — Identity, Role, Permission types
- [ ] `packages/budget-meter/tests/meter.unit.test.ts` — L0: threshold alerts at 80/95/100% (3), cost tracking (1)
- [ ] `packages/budget-meter/tests/throttle.unit.test.ts` — L0: throttle blocks at 100% (1), throttle warns at 95% (1)
- [ ] `packages/identity-bridge/tests/bridge.unit.test.ts` — L0: OIDC token validation (1)
- [ ] `packages/identity-bridge/tests/rbac.unit.test.ts` — L0: role check passes/fails (1)
- [ ] `packages/budget-meter/tests/budget-meter.integration.test.ts` — L1: budget + throttle pipeline (1), identity + RBAC composition (1)
- [ ] `packages/identity-bridge/tests/identity-bridge.integration.test.ts` — L1: OIDC + RBAC round-trip (1)
- [ ] L2 e2e (2 tests): standalone install + usage for each package
- [ ] L3 acceptance: OC workspace integration (documented)

## Acceptance Criteria
- [ ] Both packages have zero `@craftworks/*` and zero `@claws/*` imports
- [ ] Budget-meter fires threshold alerts at 80%, 95%, and 100% usage
- [ ] Throttle blocks requests at 100% budget utilization
- [ ] Identity-bridge validates OIDC tokens and returns identity claims
- [ ] RBAC checks correctly allow/deny based on role permissions
- [ ] Both packages compile standalone with `npx tsc --noEmit`

## Governing Roles
Load these role files before starting:
- `.craft/roles/craft/architect.md` — system-wide architecture constraints
- `.craft/roles/claws/founder.md` — OpenClaw upstream contribution standards

## Dependencies
- Pulse 46 (upstream-audit-chain) — audit-chain patterns inform the event model

## Test Gates
- [ ] L0 unit (8 tests): threshold alerts at 80/95/100%, cost tracking, throttle blocks at 100%, throttle warns at 95%, OIDC token validation, role check passes/fails
- [ ] L1 integration (3 tests): budget + throttle pipeline, identity + RBAC composition, OIDC + RBAC round-trip
- [ ] L2 e2e (2 tests): standalone install + usage for each package
- [ ] L3 acceptance (1 test, documented): OC workspace integration
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
