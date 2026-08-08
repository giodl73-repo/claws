---
pulse: 15
slug: doctor-checks
plan: claws-three-rings
depends_on: [6]
governing_roles: [claws:platform-eng, claws:compliance]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 8
  L1_integration: 2
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run:
    - "cd claws-sdk && npx vitest run"
    - "cd claws-cli && npx vitest run"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
    - "cd claws-cli && npx tsc --noEmit"
checkpoint: 2
checkpoint_gate: false
---

# Pulse 15: Doctor Checks

## Objective

Build the `claws doctor` diagnostic command that validates workspace health across multiple dimensions. The doctor orchestrator runs all registered checks, aggregates diagnostics into a unified report, and surfaces issues with severity levels (error, warning, info). Each check is a self-contained module that examines one aspect of workspace health.

Five checks ship initially: config-schema (validates claws.json against the current schema version), artifact-compat (verifies .claws/compiled/ artifacts match the current compiler version), dependency-check (verifies @bic/claws-skill-kit version alignment), policy-syntax (validates .claws/policies/*.yaml against the policy schema), and a health summary aggregator. The CLI surface is `claws doctor [--post-upgrade] [--fix]`.

## Deliverables

- [ ] `claws-sdk/src/doctor/index.ts` — public API barrel export for doctor module
- [ ] `claws-sdk/src/doctor/orchestrator.ts` — run all checks, aggregate diagnostics, produce report with severity levels
- [ ] `claws-sdk/src/doctor/checks/config-schema.ts` — validate claws.json against current schema version, report field errors
- [ ] `claws-sdk/src/doctor/checks/artifact-compat.ts` — verify .claws/compiled/ artifacts match current compiler version
- [ ] `claws-sdk/src/doctor/checks/dependency-check.ts` — verify @bic/claws-skill-kit version alignment across workspace
- [ ] `claws-sdk/src/doctor/checks/policy-syntax.ts` — validate .claws/policies/*.yaml against policy schema
- [ ] `claws-cli/src/commands/doctor.ts` — `claws doctor [--post-upgrade] [--fix]` thin CLI adapter
- [ ] `claws-sdk/tests/doctor/doctor-checks.unit.test.ts` — L0: 8 unit tests
- [ ] `claws-sdk/tests/doctor/doctor-checks.integration.test.ts` — L1: 2 integration tests

## Acceptance Criteria

- [ ] Doctor orchestrator runs all 4 checks and produces aggregated report
- [ ] config-schema check detects invalid claws.json fields and reports specific errors
- [ ] artifact-compat check detects version mismatch between artifacts and current compiler
- [ ] dependency-check detects @bic/claws-skill-kit version misalignment
- [ ] policy-syntax check detects invalid YAML in .claws/policies/
- [ ] Report includes severity (error/warning/info) for each diagnostic
- [ ] --post-upgrade flag runs checks relevant to post-upgrade validation
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:

- `.craft/roles/claws/platform-eng.md` — version compatibility, artifact management, upgrade paths
- `.craft/roles/claws/compliance.md` — policy validation, schema compliance

## Dependencies

- Pulse 6: base-cli config (needs workspace root detection and config loading)

## Test Gates

- [ ] L0 unit: 8 tests — config-schema pass, config-schema fail on invalid field, artifact-compat pass, artifact-compat fail on version mismatch, dependency-check pass, dependency-check fail on misalignment, policy-syntax pass, policy-syntax fail on invalid YAML
- [ ] L1 integration: 2 tests — doctor on reference workspace reports no errors, doctor on workspace with stale artifacts reports version mismatch
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
