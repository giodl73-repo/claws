---
pulse: 43
slug: cicd-sarif-pipeline
plan: claws-cicd-action
depends_on: []
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: [platform-detection/S01, platform-detection/S02]
stage: implementation
test_tiers:
  L0_unit: 4
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

# Pulse 43: SARIF Pipeline for GitHub Code Scanning

## Objective
SARIF generation for GitHub Code Scanning. `claws pinch --diff $BASE --format sarif` produces SARIF 2.1.0 with ruleId, severity, file:line:column location, and fix suggestion. The action uploads SARIF via gh CLI to Code Scanning so violations appear as inline PR annotations.

The pipeline has 4 stages: Stage 0 (pre-commit), Stage 1 (PR check), Stage 2 (CD gate), Stage 3 (fleet cron). The action is a composite action (shell scripts wrapping the claws CLI), keeping the implementation portable and dependency-free.

## Deliverables
NOTE: bats (Bash Automated Testing System) must be available globally. Install via `npm install -g bats` or OS package manager.

- [ ] `claws-action/action.yml` — GitHub Action metadata: inputs (stage, format, fail-on, warn-only, framework, cache), outputs (sarif-file, violation-count, exit-code), branding
- [ ] `claws-action/scripts/run.sh` — composite action entry: parse inputs, run claws CLI command per stage, upload SARIF
- [ ] `claws-action/scripts/sarif-upload.sh` — SARIF upload to GitHub Code Scanning via `gh api`
- [ ] `claws-action/tests/action.bats` — L0: SARIF output has correct ruleId (1), SARIF severity mapping (1), action input parsing (1), action input parsing validates required fields (stage, format) (1)
- [ ] `claws-action/tests/sarif-pipeline.bats` — L1: SARIF generation + upload pipeline (1), Stage 0+1 wiring (1)
- [ ] `claws-action/examples/basic.yml` — minimal PR check workflow with SARIF
- [ ] `claws-action/tests/fixtures/` — fixture workspace for action testing
- [ ] `claws-sdk/tests/cicd/cicd-sarif-pipeline.e2e.test.ts` — L2: end-to-end SARIF generation from fixture workspace with mixed violations, validates SARIF 2.1.0 schema compliance and ruleId/severity/location fields
- [ ] `claws-sdk/tests/cicd/cicd-sarif-pipeline.accept.test.ts` — L3: SDK acceptance — consumer invokes SARIF generation API, verifies valid SARIF 2.1.0 output with correct ruleId, severity mapping, and file:line:column locations
- [ ] `claws-cli/tests/cicd/cicd-sarif-pipeline.accept.test.ts` — L3: CLI acceptance — runs `claws pinch --diff HEAD~1 --format sarif` on fixture workspace, verifies SARIF output file and exit code per stage

## Acceptance Criteria
- [ ] `claws pinch --diff $BASE --format sarif` produces valid SARIF 2.1.0 JSON
- [ ] SARIF output includes ruleId, severity, file:line:column location, and fix suggestion for each violation
- [ ] Composite action parses all declared inputs (stage, format, fail-on, warn-only, framework, cache)
- [ ] SARIF upload script calls `gh api` with correct Code Scanning endpoint
- [ ] Stage 0 (pre-commit) and Stage 1 (PR check) wiring works end-to-end
- [ ] Example workflow demonstrates minimal PR check with SARIF upload

## Governing Roles
Load these role files before starting:
- `.craft/roles/craft/architect.md` — system-wide architecture constraints
- `.craft/roles/claws/platform-eng.md` — CI/CD platform engineering standards

## Dependencies
None — this is the foundation pulse for the CI/CD action.

## Test Gates
- [ ] L0 unit (4 tests): SARIF output has correct ruleId, SARIF severity mapping, action input parsing, action input parsing validates required fields (stage, format)
- [ ] L1 integration (2 tests): SARIF generation + upload pipeline, Stage 0+1 wiring
- [ ] L2 e2e (1 test): full action run on fixture workspace
- [ ] L3 accept (2 tests): SDK acceptance — SARIF generation API produces valid output; CLI acceptance — `claws pinch --format sarif` end-to-end
- [ ] `shellcheck scripts/*.sh` exits 0
