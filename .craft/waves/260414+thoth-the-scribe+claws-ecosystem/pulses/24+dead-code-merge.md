---
pulse: 24
slug: dead-code-merge
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

# Pulse 24: Dead-Code Merge

## Objective

Implement three optimization passes for GovernanceIR: dead-code elimination, redundant check merging, and DataFrame materialization.

**Dead-Code Elimination**: Removes governance rules that are provably inapplicable to the current compilation target. Two elimination criteria:

- **Absent tool rules** — rules governing tools not present in the skill's manifest are removed. If a skill doesn't use `send-email`, governance rules for email sending are dead code.
- **Explicitly disabled rules** — rules marked as disabled in the governance configuration (via `enabled: false` or `disabled_rules[]` in `.claws-manifest.json`) are removed.

**Redundant Check Merging**: Combines governance checks that target the same tool with compatible rule predicates. If two rules both govern `browser-navigate` and their predicates can be AND-composed without semantic loss, they merge into a single check. Incompatible predicates (contradictory conditions, different risk levels requiring different remediation) are preserved as separate checks.

**DataFrame Materialization**: Converts DataFrame references in GovernanceIR to const objects for compile-time materialization. This eliminates runtime DataFrame resolution overhead in generated governance code, replacing dynamic lookups with static constants.

## Deliverables

- [ ] `claws-sdk/src/optimize/dead-code.ts` — remove inapplicable rules: tools not in manifest, explicitly disabled rules
- [ ] `claws-sdk/src/optimize/merge-checks.ts` — combine redundant checks: same tool + compatible rule predicates; preserve incompatible rules separately
- [ ] `claws-sdk/src/optimize/materialize.ts` — DataFrame to const objects for compile-time materialization
- [ ] `claws-sdk/tests/optimize/dead-code.unit.test.ts` — L0: absent tool rule removed (1), disabled rule removed (1)
- [ ] `claws-sdk/tests/optimize/merge-checks.unit.test.ts` — L0: compatible rules merged (1), incompatible rules preserved separately (1)
- [ ] `claws-sdk/tests/optimize/materialize.unit.test.ts` — L0: DataFrame to const serialization (1 test)
- [ ] `claws-sdk/tests/optimize/optimize-pipeline.integration.test.ts` — L1: dead-code + merge on fixture GovernanceIR (1)

## Acceptance Criteria

- [ ] Rules for absent tools are removed from GovernanceIR
- [ ] Explicitly disabled rules are removed from GovernanceIR
- [ ] Compatible rules for the same tool are merged into a single check
- [ ] Incompatible rules are preserved as separate checks (no semantic loss)
- [ ] DataFrame references are materialized to const objects
- [ ] Dead-code + merge pipeline produces valid GovernanceIR
- [ ] All 5 L0 unit tests pass
- [ ] All 1 L1 integration tests pass
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:

- `.craft/roles/craft/architect.md` — overall claws architecture and SDK boundaries
- `.craft/roles/claws/platform-eng.md` — implementation patterns, cross-platform concerns

## Dependencies

- Pulse 21 (pinch-profiles) — profiles define which rules are in-scope for elimination decisions

## Test Gates

- [ ] L0 unit (5 tests): absent tool rule removed (1), disabled rule removed (1), compatible rules merged (1), incompatible rules preserved separately (1), materialize.ts produces correct const objects from DataFrame (1)
- [ ] L1 integration (1 test): dead-code + merge on fixture GovernanceIR
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
