---
pulse: 2
slug: budget-workspace
plan: claws-protect
depends_on: [1]
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 4
  L1_integration: 2
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

# Pulse 02: Budget Workspace

## Objective

Implement workspace-scoped budget tracking for the PROTECT command group. The budget module reads token usage from the audit chain and governance config (claws.json), computes usage percentage against configured limits, and checks three threshold levels (80%, 95%, 100%) to fire alerts.

This reuses the agent-sdk suite/budget.ts patterns for token accounting but adapts them to claws's audit-chain-as-source-of-truth model. The audit chain provides actual token consumption per tool invocation; claws.json provides the configured budget limits (daily and monthly). The budget function combines these to produce a BudgetReport with percentage used, remaining capacity, and any triggered threshold alerts.

## Deliverables

- [ ] `claws-sdk/src/protect/budget.ts` — workspace budget: read usage from audit chain + claws.json, compute percentage, check thresholds (80/95/100%). Exports `budget(workspacePath: string): Promise<BudgetReport>`. Reads token counts from audit chain entries, reads limits from claws.json budgetConfig, returns BudgetReport with percentage, alerts, and period breakdown.
- [ ] `claws-sdk/tests/protect/budget.unit.test.ts` — L0: usage calculation from token counts (2 tests), threshold detection fires at 80/95/100% boundaries (1 test), daily/monthly limit enforcement with warn/block modes (1 test)
- [ ] `claws-sdk/tests/protect/budget.integration.test.ts` — L1: budget read from fixture audit chain with realistic token entries (1 test), budget + threshold alert pipeline end-to-end (1 test)
- [ ] `claws-sdk/tests/protect/budget.e2e.test.ts` — L2: full `budget` on fixture workspace shows correct usage percentage and threshold state
- [ ] `claws-sdk/tests/protect/budget.accept.test.ts` — L3: SDK acceptance — consumer calls `budget()` on a reference workspace and validates BudgetReport shape, threshold alerts, and period breakdown without internal knowledge
- [ ] `claws-cli/tests/protect/budget.accept.test.ts` — L3: CLI acceptance — `claws protect budget` on reference workspace prints usage percentage, threshold alerts, and exits 0

## Acceptance Criteria

- [ ] `budget()` on workspace with 10k/50k tokens returns "20% used" with no alerts
- [ ] `budget()` on workspace at 40k/50k tokens triggers 80% threshold alert
- [ ] `budget()` on workspace at 48k/50k tokens triggers both 80% and 95% alerts
- [ ] `budget()` on workspace at 50k/50k tokens triggers all three alerts (80/95/100%)
- [ ] Daily limit enforcement returns warn or block per BudgetLimit enforcement mode
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/architect.md` — monorepo structure, cross-package import patterns
- `.craft/roles/claws/platform-eng.md` — audit chain format, claws.json schema, token accounting

## Dependencies

- Pulse 01 (protect-types): BudgetReport, ThresholdAlert, BudgetLimit types

## Test Gates

- [ ] L0 unit (4 tests): usage percentage calculation from raw token counts (1), usage calculation with zero tokens returns 0% (1), threshold detection at 80/95/100% boundaries (1), daily/monthly limit enforcement modes (1)
- [ ] L1 integration (2 tests): budget read from fixture audit chain (1), budget + threshold alert pipeline (1)
- [ ] L2 e2e (1 test): full budget on fixture workspace shows correct usage percentage
- [ ] L3 accept (2 tests): SDK acceptance — BudgetReport shape and threshold validation (1), CLI acceptance — `claws protect budget` output and exit code (1)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
