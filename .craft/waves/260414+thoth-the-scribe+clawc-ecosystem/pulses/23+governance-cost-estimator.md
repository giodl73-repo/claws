---
pulse: 23
slug: governance-cost-estimator
plan: claws-press-context
depends_on: [21]
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 5
  L1_integration: 1
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run:
    - "cd claws-sdk && npx vitest run"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 3
checkpoint_gate: false
---

# Pulse 23: Governance Cost Estimator

## Objective
Implement token cost estimation for governance content and a cost-based rule ordering optimizer. This is distinct from the PRESS token-counter — the governance cost estimator uses governance-specific heuristics rather than attention-based ordering.

**Token Cost Estimation**: Estimates the token cost of each governance rule based on three governance-specific heuristics:
- **Rule weight** — higher-weight rules (critical policy, OBO requirements) cost more tokens because they require more context to express accurately
- **Risk level** — rules governing high-risk operations (R4-R5) need additional context tokens for remediation guidance and escalation paths
- **OBO complexity** — rules involving delegation chains require tokens proportional to chain depth and authorization scope

**Rule Ordering Optimizer**: Given a token budget from a pinch profile, orders governance rules to minimize total token cost while preserving governance fidelity. The optimizer uses a governance-specific cost model (not the attention-based ordering from PRESS) because governance content has different redundancy patterns — rules share policy preambles, risk categories cluster together, and OBO chains have structural overlap that can be exploited for compression.

## Deliverables
- [ ] `claws-sdk/src/optimize/pinch/governance-cost-estimator.ts` — token cost estimation with governance heuristics (rule weight, risk level, OBO complexity)
- [ ] `claws-sdk/src/optimize/pinch/rule-ordering-optimizer.ts` — cost-based rule ordering that minimizes token cost while preserving all rules (governance-specific, not attention-based)
- [ ] `claws-sdk/tests/optimize/pinch/governance-cost-estimator.unit.test.ts` — L0: cost estimation accuracy (2 tests), governance heuristic weighting (1 test)
- [ ] `claws-sdk/tests/optimize/pinch/rule-ordering-optimizer.unit.test.ts` — L0: cost-based ordering (1 test), ordering preserves all rules (1 test)
- [ ] `claws-sdk/tests/optimize/pinch/cost-pipeline.integration.test.ts` — L1: full cost estimation + ordering pipeline (1 test)

## Acceptance Criteria
- [ ] Token cost estimation accounts for rule weight, risk level, and OBO complexity
- [ ] Cost estimates are deterministic for the same input
- [ ] Rule ordering minimizes token cost while preserving all rules (no rules dropped)
- [ ] Ordering is governance-specific, not attention-based
- [ ] Full pipeline (estimate + order) produces valid output within profile budget
- [ ] All 5 L0 unit tests pass
- [ ] All 1 L1 integration tests pass
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles
Load these role files before starting:
- `.craft/roles/craft/architect.md` — overall claws architecture and SDK boundaries
- `.craft/roles/claws/platform-eng.md` — implementation patterns, cross-platform concerns

## Dependencies
- Pulse 21 (pinch-profiles) — profile definitions with token budgets that the cost estimator optimizes against

## Test Gates
- [ ] L0 unit (5 tests): cost estimation accuracy (2), governance heuristic weighting (1), cost-based ordering (1), ordering preserves all rules (1)
- [ ] L1 integration (1 test): full cost estimation + ordering pipeline
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
