---
pulse: 3
slug: budget-fleet
plan: claws-protect
depends_on: [2]
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: [fleet-operations/S04, fleet-operations/S05]
stage: implementation
test_tiers:
  L0_unit: 4
  L1_integration: 3
  L2_e2e: 1
  L3_accept: 2
test_scope:
  run:
    - "cd claws-sdk && npx vitest run"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 1
checkpoint_gate: false
---

# Pulse 03: Budget Fleet

## Objective

Implement fleet-scoped budget aggregation for the PROTECT command group. This pulse extends workspace budget tracking (Pulse 02) to operate across multiple workspaces discovered via the fleet scan mechanism (from Anubis wave Pulse 20). The fleet budget module discovers workspaces, collects per-workspace budget data in parallel, and produces a BudgetFleetReport sorted by spend percentage (highest spenders first).

Fleet budget is the enterprise view: CTOs and platform teams need to see which workspaces are consuming the most tokens, which are approaching limits, and what the aggregate spend looks like across the fleet. The sorted-by-percentage output enables quick identification of workspaces that need attention.

Addresses fleet integration coverage gap (74% → 90%+ target from THOTH-INTEGRATION-COVERAGE).

## Deliverables

- [ ] `claws-sdk/src/protect/budget-fleet.ts` — fleet aggregation: scan workspaces via fleet scan, collect per-workspace budget data using `budget()`, sort by spend%, compute fleet totals, produce BudgetFleetReport. Exports `budgetFleet(fleetRoot: string): Promise<BudgetFleetReport>`.
- [ ] `claws-sdk/tests/protect/budget-fleet.unit.test.ts` — L0: aggregation logic sums per-workspace tokens correctly (1), aggregation with empty workspace list returns zero totals (1), sorting by spend% puts highest first (1), per-workspace breakdown preserves individual reports (1)
- [ ] `claws-sdk/tests/protect/budget-fleet.integration.test.ts` — L1: fleet budget across 3 fixture workspaces with varying usage levels
- [ ] `claws-sdk/tests/protect/fleet-drift.integration.test.ts` — L1: fleet scan → drift detection → broadcast pipeline across 3 fixture workspaces (THOTH-INTEGRATION-COVERAGE)
- [ ] `claws-sdk/tests/protect/fleet-killswitch.integration.test.ts` — L1: fleet budget aggregation with kill-switch threshold breach (THOTH-INTEGRATION-COVERAGE)
- [ ] `claws-sdk/tests/protect/budget-fleet.e2e.test.ts` — L2: full fleet budget on fixture workspace set with realistic token distributions
- [ ] `claws-sdk/tests/protect/budget-fleet.accept.test.ts` — L3: SDK acceptance — consumer calls `budgetFleet()` on a multi-workspace fleet root and validates BudgetFleetReport shape, per-workspace breakdown, and descending sort order
- [ ] `claws-cli/tests/protect/budget-fleet.accept.test.ts` — L3: CLI acceptance — `claws protect budget --fleet` on reference fleet root prints aggregated spend, per-workspace rows sorted by usage%, and exits 0

## Acceptance Criteria

- [ ] `budgetFleet()` across 3 workspaces shows aggregated total spend
- [ ] Per-workspace breakdown includes individual BudgetReport for each workspace
- [ ] Results sorted by usage percentage descending (highest spender first)
- [ ] Workspace with 90% usage appears before workspace with 20% usage
- [ ] Fleet totals correctly sum individual workspace token counts and limits
- [ ] Empty fleet (no workspaces discovered) returns zero-valued BudgetFleetReport
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:

- `.craft/roles/craft/architect.md` — monorepo structure, fleet scan integration patterns
- `.craft/roles/claws/platform-eng.md` — fleet workspace discovery, parallel data collection

## Dependencies

- Pulse 02 (budget-workspace): `budget()` function for per-workspace budget data
- Anubis Pulse 20 (fleet-scan): workspace discovery mechanism

## Test Gates

- [ ] L0 unit (4 tests): aggregation sums tokens correctly (1), empty fleet returns zero totals (1), sorting by spend% descending (1), per-workspace breakdown preserved (1)
- [ ] L1 integration (3 tests): fleet budget across 3 fixture workspaces (1), fleet scan → drift detection → broadcast pipeline across 3 fixture workspaces (1), fleet budget aggregation with kill-switch threshold breach (1)
- [ ] L2 e2e (1 test): full fleet budget on fixture workspace set
- [ ] L3 accept (2 tests): SDK acceptance — BudgetFleetReport shape and sort order validation (1), CLI acceptance — `claws protect budget --fleet` output and exit code (1)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
