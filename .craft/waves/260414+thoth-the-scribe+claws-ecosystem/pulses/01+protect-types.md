---
pulse: 1
slug: protect-types
plan: claws-protect
depends_on: []
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 4
  L1_integration: 0
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run:
    - "cd claws-sdk && npx vitest run --project unit --coverage"
    - "cd claws-sdk && npx vitest run --project integration --coverage"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 1
checkpoint_gate: false
---

# Pulse 01: Protect Types

## Objective

Create the type foundations for the PROTECT command group. This pulse establishes all shared types that downstream protect pulses depend on: BudgetReport and BudgetFleetReport for workspace and fleet budget tracking, VaultConfig for encrypted secrets management, IdentityConfig for SSO/RBAC integration, ThresholdAlert for budget threshold notifications, and BudgetLimit for daily/monthly usage caps.

These types must be precise enough to drive implementation (not just shapes) and export cleanly from the protect barrel. Every subsequent protect pulse imports from this module, so the type surface must be stable from day one.

This pulse also configures the dual-coverage CI gate for claws-sdk: two vitest project configurations (unit and integration) with separate coverage thresholds. Unit tests gate at 95/90/95/95 (stmts/branches/funcs/lines) per-file. Integration tests gate at 85/70/80/85 whole-package. Both runs must pass at every checkpoint gate.

## Deliverables

- [ ] `claws-sdk/src/protect/types.ts` — BudgetReport (workspace-scoped usage data: tokenCount, limit, percentage, period), BudgetFleetReport (fleet-scoped aggregation: workspaces array, totalSpend, sortedByUsage), VaultConfig (algorithm, saltPath, vaultPath, keyDerivation), IdentityConfig (provider type OIDC/SAML, issuer, clientId, roleMapping), ThresholdAlert (level 80/95/100, triggered boolean, message), BudgetLimit (daily/monthly caps, enforcement mode warn/block)
- [ ] `claws-sdk/src/protect/index.ts` — barrel exports for protect module: re-exports all types from types.ts
- [ ] `claws-sdk/tests/protect/types.unit.test.ts` — L0: type construction for BudgetReport and VaultConfig (2 tests), threshold enum values validate 80/95/100 (1 test), budget limit validation rejects negative values (1 test)
- [ ] `claws-sdk/vitest.config.ts` (EDIT) — Add dual-project configuration: `unit` project (include `**/*.unit.test.ts`, coverage thresholds 95/90/95/95 per-file) and `integration` project (include `**/*.integration.test.ts` + `**/*.e2e.test.ts`, coverage thresholds 85/70/80/85 whole-package). Gate pulses run both: `npx vitest run --project unit --coverage` then `npx vitest run --project integration --coverage`.

## Acceptance Criteria

- [ ] All types compile cleanly with strict TypeScript
- [ ] Barrel exports resolve: `import { BudgetReport, VaultConfig, IdentityConfig } from '../protect'` works
- [ ] ThresholdAlert levels are constrained to 80, 95, 100
- [ ] BudgetLimit rejects negative daily/monthly values at construction
- [ ] `npx vitest run --project unit --coverage` passes 95/90/95/95 per-file thresholds
- [ ] `npx vitest run --project integration --coverage` passes 85/70/80/85 whole-package thresholds
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:

- `.craft/roles/craft/architect.md` — monorepo structure, type design patterns, barrel export conventions
- `.craft/roles/claws/platform-eng.md` — SDK type foundations, cross-module integration patterns

## Dependencies

None — this is the first pulse in CP-1.

## Test Gates

- [ ] L0 unit (4 tests): BudgetReport construction with valid fields (1), VaultConfig construction with algorithm and paths (1), ThresholdAlert enum values validate 80/95/100 only (1), BudgetLimit rejects negative daily/monthly values (1)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
