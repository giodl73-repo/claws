---
pulse: 8
slug: e2e-check-loop
plan: claws-e2e-infrastructure
depends_on: [1, 2, 3, 4, 5, 6]
governing_roles: [claws:skill-author, craft:navigator]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 0
  L1_integration: 0
  L2_e2e: 1
  L3_accept: 0
test_scope:
  run:
    - "cd claws-sdk && npx vitest run"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 1
checkpoint_gate: false
---

# Pulse 08: E2E Check Loop

## Objective

Create the end-to-end test that verifies the full check pipeline: running claws check against the reference workspace, validating that the correct violations are reported with complete diagnostic fields (WHAT + HOW + WHERE), and verifying that all output formats (JSON, SARIF) produce valid, parseable output.

This test proves that the check command correctly identifies governance violations in OC source files and reports them through the formatter pipeline with the expected exit code semantics (exit 1 when violations found).

## Deliverables

- [ ] `claws-sdk/tests/e2e/check-violations.e2e.test.ts` — L2 e2e test with the following sequence:
  1. Run claws check on the reference workspace (fixtures/oc-reference-workspace/)
  2. Verify violation count matches expected-violations.json
  3. Verify each violation has WHAT + HOW + WHERE fields populated
  4. Verify --json output is parseable JSON and matches the violation set
  5. Verify --format sarif output validates against the SARIF 2.1.0 schema
  6. Verify exit code = 1 (violations found)

## Acceptance Criteria

- [ ] claws check produces violations matching the expected-violations.json fixture count
- [ ] Every reported violation has non-empty WHAT, HOW, and WHERE fields
- [ ] JSON output parses to an array of violations matching the expected set
- [ ] SARIF output is valid SARIF 2.1.0 with correct run, tool, and results structure
- [ ] Exit code is 1 when violations are found (not 0, not 2+)
- [ ] Exit code is 0 when no violations are found (tested with a clean workspace variant)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:

- `.craft/roles/claws/skill-author.md` — violation semantics from the author perspective, diagnostic field requirements
- `.craft/roles/craft/navigator.md` — UX expectations for check output, exit code conventions

## Dependencies

- Pulse 01 (reference-workspace) — provides fixture OC files and expected-violations.json
- Pulse 02 (gateway-simulator) — audit types shared with violation reporting
- Pulse 03 (base-cli-formatters) — SARIF and JSON formatters used in output validation
- Pulse 04 (base-cli-error-contract) — DiagnosticError with WHAT/HOW/WHERE contract
- Pulse 05 (base-cli-progress) — UI components (must build but not directly tested)
- Pulse 06 (base-cli-config) — config loading for check pipeline setup

## Test Gates

- [ ] L2 e2e: 1 test — full check-to-violation reporting loop with format validation
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
