---
pulse: 10
slug: eval-validator
plan: claws-sdk-graduation
depends_on: [1, 3]
governing_roles: [craft:testing, claws:platform-eng]
scenario_codes: [eval/S01, eval/S02, eval/S03, eval/S04]
stage: implementation
test_tiers:
  L0_unit: 8
  L1_integration: 3
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run:
    - "cd claws-sdk && npx vitest run --project unit --coverage"
    - "cd claws-sdk && npx vitest run --project integration --coverage"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 2
checkpoint_gate: false
---

# Pulse 10: Eval Validator (12-Check)

## Objective

Build the simplified 12-check validator that replaces the full eval engine from agent-sdk. ~400 lines. The current implementation imports `rubric.ts`, `assertions.ts`, and `judge.ts` from agent-sdk for comprehensive evaluation. The free tier needs a lightweight validator that runs 12 specific checks on compiled output, not a general-purpose evaluation framework.

The 12 checks validate: (1) schema conformance, (2) required field presence, (3) trust level consistency, (4) R5 fail-closed compliance, (5) emit target validity, (6) handler type safety, (7) circular dependency absence, (8) audit chain integrity, (9) sidecar version match, (10) platform marker alignment, (11) governance rule coverage, (12) output hash stability. Each check produces a pass/fail result with diagnostic message.

## Deliverables

- [ ] `claws-sdk/src/compiler/validate/types.ts` -- ValidationCheck (id 1-12, name, description), CheckResult (checkId, pass boolean, message, severity), ValidationReport (checks array, passCount, failCount, overallPass boolean)
- [ ] `claws-sdk/src/compiler/validate/checks.ts` -- 12 individual check functions, each taking (workspace: OCWorkspaceIR, analysis: GovAnalysis, emitResult?: EmitResult) and returning CheckResult. Pure functions, no side effects. ~250 lines
- [ ] `claws-sdk/src/compiler/validate/validator.ts` -- `validate(workspace: OCWorkspaceIR, analysis: GovAnalysis, emitResult?: EmitResult): ValidationReport` -- runs all 12 checks, collects results, computes overall pass/fail. Checks run independently (no short-circuit on first failure)
- [ ] `claws-sdk/src/compiler/validate/formatter.ts` -- Format ValidationReport as human-readable text (for CLI output) and as JSON (for programmatic consumption). ~80 lines
- [ ] `claws-sdk/src/compiler/validate/index.ts` -- Barrel exports for validate module
- [ ] `claws-sdk/tests/compiler/validate/checks.unit.test.ts` -- L0: schema conformance check passes valid IR (1), required field check detects missing field (1), trust level check detects inconsistency (1), R5 check detects fail-open violation (1), emit target check rejects unknown platform (1), circular dependency check detects cycle (1), output hash check detects instability (1), overall validator returns correct pass/fail counts (1)
- [ ] `claws-sdk/tests/compiler/validate/validator.integration.test.ts` -- L1: full validation of fixture workspace passes all 12 checks (1), validation of intentionally broken workspace reports expected failures (1), validation report JSON format matches schema (1)

## Acceptance Criteria

- [ ] Zero imports from `@craftworks/agent-sdk` -- no rubric.ts, no assertions.ts, no judge.ts
- [ ] Exactly 12 checks implemented (no more, no less for free tier)
- [ ] Each check is a pure function (no side effects, no file I/O, no network)
- [ ] All 12 checks run independently -- one failure does not skip subsequent checks
- [ ] ValidationReport includes both human-readable and JSON output formats
- [ ] R5 fail-closed compliance check (check #4) mirrors the enforceR5 logic from pulse 6
- [ ] Uses OCWorkspaceIR from pulse 3 and reader output from pulse 1
- [ ] `npx vitest run --project unit --coverage` passes 95/90/95/95 per-file thresholds
- [ ] `npx vitest run --project integration --coverage` passes 85/70/80/85 whole-package thresholds
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/testing.md` -- validation patterns, check design, assertion conventions
- `.craft/roles/claws/platform-eng.md` -- SDK validation module patterns

## Dependencies

- Pulse 1 (oc-workspace-readers) -- workspace model as validation input
- Pulse 3 (formir-types) -- OCWorkspaceIR and GovAnalysis types as validation input

## Test Gates

- [ ] L0 unit (8 tests): schema conformance (1), required fields (1), trust consistency (1), R5 fail-open (1), emit target (1), circular deps (1), hash stability (1), pass/fail counts (1)
- [ ] L1 integration (3 tests): full 12-check pass (1), intentional failures (1), JSON format (1)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
