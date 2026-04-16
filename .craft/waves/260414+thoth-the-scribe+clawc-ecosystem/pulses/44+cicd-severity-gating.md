---
pulse: 44
slug: cicd-severity-gating
plan: claws-cicd-action
depends_on: [43]
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: [platform-detection/S03, platform-detection/S04]
stage: implementation
test_tiers:
  L0_unit: 3
  L1_integration: 2
  L2_e2e: 1
  L3_accept: 2
test_scope:
  run:
    - "cd claws-action && bats tests/"
  typecheck:
    - "echo 'shell scripts — no typecheck'"
checkpoint: 5
checkpoint_gate: false
---

# Pulse 44: Severity Gating for Gradual Rollout

## Objective
`warn-only` and `fail-on` severity gating for gradual rollout. When `warn-only: true`, the action reports all violations as warnings but exits 0, allowing teams to observe violations without blocking merges. The `fail-on` input selects which severities block merges: `critical`, `high`, `medium`, or `all`.

The recommended 8-week adoption ramp is: Week 1 (warn-only), Week 2 (fail-on: critical), Week 4 (fail-on: high), Week 8 (fail-on: all). This gives teams time to remediate existing violations before enforcement tightens.

## Deliverables
NOTE: bats (Bash Automated Testing System) must be available globally. Install via `npm install -g bats` or OS package manager.

- [ ] `claws-action/scripts/run.sh` (EDIT) — add warn-only mode (exit 0 with warnings), fail-on severity filtering
- [ ] `claws-action/examples/gradual.yml` — 8-week gradual adoption workflow template
- [ ] `claws-action/tests/severity-gating.bats` — L0: warn-only exits 0 with violations (1), fail-on: critical blocks on critical only (1), fail-on: high passes medium-only (1)
- [ ] `claws-action/tests/severity-gating-pipeline.bats` — L1: warn-only -> fail-on: critical -> fail-on: all progression (1), Stage 2 CD gate with --sign (1)
- [ ] `claws-action/tests/severity-gating.e2e.bats` — L2: full action run with warn-only on fixture workspace
- [ ] `claws-sdk/tests/cicd/cicd-severity-gating.e2e.test.ts` — L2: end-to-end severity gating progression from warn-only through fail-on levels on fixture workspace with mixed-severity violations
- [ ] `claws-sdk/tests/cicd/cicd-severity-gating.accept.test.ts` — L3: SDK acceptance — consumer configures warn-only and fail-on severity levels via API, verifies exit behavior matches gating policy for each severity threshold
- [ ] `claws-cli/tests/cicd/cicd-severity-gating.accept.test.ts` — L3: CLI acceptance — runs action with `warn-only: true` and `fail-on: critical/high/all`, verifies exit codes and warning output per gating level

## Acceptance Criteria
- [ ] `warn-only: true` causes the action to exit 0 even when violations are present
- [ ] `fail-on: critical` blocks merges only when critical-severity violations exist
- [ ] `fail-on: high` blocks on critical or high violations, passes on medium-only
- [ ] `fail-on: all` blocks on any violation
- [ ] Stage 2 CD gate supports `--sign` flag for artifact signing
- [ ] Gradual adoption example demonstrates the 8-week ramp

## Governing Roles
Load these role files before starting:
- `.craft/roles/craft/architect.md` — system-wide architecture constraints
- `.craft/roles/claws/platform-eng.md` — CI/CD platform engineering standards

## Dependencies
- Pulse 43 (cicd-sarif-pipeline) — requires the base action and SARIF generation

## Test Gates
- [ ] L0 unit (3 tests): warn-only exits 0 with violations, fail-on: critical blocks on critical only, fail-on: high passes medium-only
- [ ] L1 integration (2 tests): warn-only -> fail-on: critical -> fail-on: all progression, Stage 2 CD gate with --sign
- [ ] L2 e2e (1 test): full action run with warn-only on fixture workspace
- [ ] L3 accept (2 tests): SDK acceptance — severity gating API behavior per threshold; CLI acceptance — action exit codes per warn-only/fail-on level
- [ ] `shellcheck scripts/*.sh` exits 0
