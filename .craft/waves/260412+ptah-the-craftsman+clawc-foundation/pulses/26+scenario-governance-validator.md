---
pulse: 26
slug: scenario-governance-validator
plan: claws-test-framework
depends_on: [23, 5]
governing_roles: [claws:skill-author, claws:ciso, craft:dragon]
scenario_codes: [test/scenario-runner-basic, test/scenario-runner-declared-vs-actual, test/governance-validator-tier2, test/governance-validator-fail-mode, test/governance-validator-obo]
stage: implementation
test_tiers:
  L0_unit: 12
  L1_integration: 3
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run:
    - "cd claws-test && npx vitest run tests/scenario/runner.unit.test.ts"
    - "cd claws-test && npx vitest run tests/scenario/parser.unit.test.ts"
    - "cd claws-test && npx vitest run tests/governance/validator.unit.test.ts"
  typecheck:
    - "cd claws-test && npx tsc --noEmit"
checkpoint: 4
checkpoint_gate: false
---

# Pulse 26: ScenarioRunner + GovernanceValidator (12 Checks)

## Objective

Create the @bic/claws-test package scaffolding and implement two of the four testing layers: ScenarioRunner which replays SKILL.md scenarios against built skill handlers, and GovernanceValidator which runs 12 governance checks. The 12 checks are: (1) risk level consistency, (2) OBO boundary consistency, (3) data label coverage, (4) fail-mode correctness per risk level, (5) capability/permission alignment, (6) elicitation gate presence for R5 tools, (7) A2A trust boundary declarations, (8) input validation presence, (9) output guard presence, (10) bounded reasoning limits, (11) audit trail completeness, (12) supply chain signature.

## Deliverables

- [ ] `claws-test/package.json` -- NEW: @bic/claws-test, peer deps (@bic/claws-skill-kit, vitest), exports map
- [ ] `claws-test/tsconfig.json` -- NEW: extends monorepo base, forbidden import paths
- [ ] `claws-test/vitest.config.ts` -- NEW: unit/integration/e2e projects
- [ ] Root `package.json` -- EDIT: add "claws-test" to workspaces array
- [ ] `claws-test/src/index.ts` -- NEW: package barrel exports
- [ ] `claws-test/src/types.ts` -- NEW: ScenarioResult, ValidationResult, CheckResult, SecurityFinding types
- [ ] `claws-test/src/scenario/parser.ts` -- NEW: SKILL.md scenario section parser (extract test cases from markdown)
- [ ] `claws-test/src/scenario/runner.ts` -- NEW: ScenarioRunner replaying scenarios against handler
- [ ] `claws-test/src/governance/validator.ts` -- NEW: GovernanceValidator orchestrator (runs 12 checks, aggregates results)
- [ ] `claws-test/src/governance/checks/risk-level.ts` -- NEW: declared-vs-actual risk level check
- [ ] `claws-test/src/governance/checks/obo-boundary.ts` -- NEW: OBO boundary consistency check
- [ ] `claws-test/src/governance/checks/data-labels.ts` -- NEW: data label coverage check
- [ ] `claws-test/src/governance/checks/fail-mode.ts` -- NEW: fail-mode correctness per risk level (R5 must be closed)
- [ ] `claws-test/src/governance/checks/capabilities.ts` -- NEW: capability/permission alignment check
- [ ] `claws-test/src/governance/checks/elicitation.ts` -- NEW: elicitation gate presence for R5 tools
- [ ] `claws-test/src/governance/checks/a2a-trust.ts` -- NEW: A2A trust boundary declarations check
- [ ] `claws-test/src/governance/checks/input-validation.ts` -- NEW: input validation presence check
- [ ] `claws-test/src/governance/checks/output-guards.ts` -- NEW: output guard presence check
- [ ] `claws-test/src/governance/checks/bounded-reasoning.ts` -- NEW: step/tool/budget/recursion limits check
- [ ] `claws-test/src/governance/checks/audit-completeness.ts` -- NEW: audit trail completeness check
- [ ] `claws-test/src/governance/checks/supply-chain.ts` -- NEW: supply chain signature check
- [ ] `claws-test/tests/scenario/parser.unit.test.ts` -- NEW: SKILL.md scenario extraction tests
- [ ] `claws-test/tests/scenario/runner.unit.test.ts` -- NEW: scenario replay, declared-vs-actual comparison
- [ ] `claws-test/tests/governance/validator.unit.test.ts` -- NEW: all 12 checks individually
- [ ] `claws-test/tests/integration/full-validation.integration.test.ts` -- NEW: validator on fixture skill (all 12 checks)
- [ ] `claws-test/tests/fixtures/clean-skill/` -- NEW: properly governed skill fixture (zero findings expected)
- [ ] `claws-test/tests/fixtures/vulnerable-skill/` -- NEW: skill with governance gaps

## TDD Tests

### L0 Unit (12)

- ScenarioRunner.run() replays a SKILL.md scenario and returns declared-vs-actual behavior delta -> `claws-test/tests/scenario/runner.unit.test.ts`
- SKILL.md parser extracts scenario sections with given/when/then structure -> `claws-test/tests/scenario/parser.unit.test.ts`
- Check 1: risk-level -- declared R3 vs actual R5 tool usage -> fail with mismatch details -> `claws-test/tests/governance/validator.unit.test.ts`
- Check 2: obo-boundary -- declared OBO 'email' but handler accesses 'calendar' -> fail -> `claws-test/tests/governance/validator.unit.test.ts`
- Check 3: data-labels -- handler processes PII without data label declaration -> fail -> `claws-test/tests/governance/validator.unit.test.ts`
- Check 4: fail-mode -- R5 risk with fail-mode 'open' -> fail (R5 must be closed) -> `claws-test/tests/governance/validator.unit.test.ts`
- Check 5: capabilities -- handler uses tool not listed in capability manifest -> fail -> `claws-test/tests/governance/validator.unit.test.ts`
- Check 6: elicitation -- R5 tool without elicitation gate -> fail -> `claws-test/tests/governance/validator.unit.test.ts`
- Check 7: a2a-trust -- handler delegates to agent without trust boundary declaration -> fail -> `claws-test/tests/governance/validator.unit.test.ts`
- Check 8: input-validation -- handler accepts input without validation -> fail -> `claws-test/tests/governance/validator.unit.test.ts`
- Check 9: output-guards -- handler returns unguarded output for R4+ operations -> fail -> `claws-test/tests/governance/validator.unit.test.ts`
- Check 10-12: bounded-reasoning + audit + supply-chain grouped -> `claws-test/tests/governance/validator.unit.test.ts`

### L1 Integration (3)

- GovernanceValidator.validate() on clean Tier 2 fixture skill returns 12 passing checks -> `claws-test/tests/integration/full-validation.integration.test.ts`
- GovernanceValidator.validate() on vulnerable fixture skill returns specific failing checks with finding details -> `claws-test/tests/integration/full-validation.integration.test.ts`
- ScenarioRunner + GovernanceValidator pipeline: parse scenarios, replay, validate, aggregate results -> `claws-test/tests/integration/full-validation.integration.test.ts`

## Key Constraints

- @bic/claws-test imports types from claws-sdk and peer-depends on @bic/claws-skill-kit (for MockGateway re-export)
- GovernanceValidator reuses agent-sdk eval/ framework: rubric.ts for structured check definitions, assertions.ts for typed assertion helpers
- Each of the 12 checks is a separate file in governance/checks/ with a standard interface (check name, input, result)
- ScenarioRunner parses SKILL.md ## Scenarios section, extracts given/when/then blocks
- Check results include: check name, pass/fail, severity, finding details, remediation hint
- Package follows ARCHITECTURE.md dependency rules: claws-test -> claws-sdk (types). DOES NOT IMPORT: craftworks-sdk, shared-cli, any CLI package.
- R5 fail-mode rule: R5 TRANSACT operations MUST have fail-mode 'closed' (never 'open')

## Governing Roles

Load these role files before starting:
- `.craft/roles/claws/skill-author.md` -- test ergonomics, validation result clarity, fixture patterns
- `.craft/roles/claws/ciso.md` -- governance check completeness, fail-mode rules, trust boundary enforcement
- `.craft/roles/craft/dragon.md` -- SDK architecture, eval framework reuse, type safety

## Dependencies

- Pulse 23 (skill-factory-decorators) -- @bic/claws-skill-kit for decorator metadata reading
- Pulse 05 (governance-ir types) -- GovernanceIR types for check parameters

## Verification Gate

```bash
cd claws-test && npx vitest run tests/scenario/
cd claws-test && npx vitest run tests/governance/
cd claws-test && npx tsc --noEmit
npm run build
```
