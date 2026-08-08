---
pulse: 28
slug: vitest-matchers-standalone
plan: claws-test-framework
depends_on: [27]
governing_roles: [claws:skill-author, craft:architect]
scenario_codes: [test/vitest-matchers-pass, test/vitest-matchers-fail, test/standalone-no-compiler]
stage: implementation
test_tiers:
  L0_unit: 4
  L1_integration: 2
  L2_e2e: 1
  L3_accept: 0
test_scope:
  run:
    - "cd claws-test && npx vitest run"
  typecheck:
    - "cd claws-test && npx tsc --noEmit"
checkpoint: 4
checkpoint_gate: true
---

# Pulse 28: Vitest Matchers + Standalone Packaging

## Objective

Implement 4 custom vitest matchers for governance assertions and finalize @bic/claws-test as a standalone package (~45KB) with zero compiler dependency. The matchers integrate governance testing into the standard vitest workflow. Full integration test: run governance validation + security scanning on a sample skill through the matcher API. This is the CP-4 gate pulse -- all 3 plans (CLI, skill-kit, test) must be passing.

## Deliverables

- [ ] `claws-test/src/matchers/governance.ts` -- NEW: 4 custom vitest matchers
  - `toPassGovernance()` -- asserts all 12 governance checks pass
  - `toHaveRiskLevel(level)` -- asserts skill declares specified risk level
  - `toRequireElicitation()` -- asserts R5 tools have elicitation gates
  - `toPassSecurityScan()` -- asserts zero security scanner findings
- [ ] `claws-test/src/matchers/index.ts` -- NEW: expect.extend() registration for all 4 matchers
- [ ] `claws-test/src/mock/mock-gateway.ts` -- NEW: re-export MockGateway from @bic/claws-skill-kit (convenience)
- [ ] `claws-test/src/index.ts` -- EDIT: finalize barrel exports (ScenarioRunner, GovernanceValidator, SecurityScanner, matchers, types)
- [ ] `claws-test/package.json` -- EDIT: finalize exports map, files array, size budget enforcement
- [ ] `claws-test/.eslintrc.json` -- NEW: no-restricted-imports blocking compiler-sdk, craftworks-sdk, claws-cli, shared-cli
- [ ] `claws-test/tests/matchers/governance.unit.test.ts` -- NEW: matcher pass/fail with assertion messages
- [ ] `claws-test/tests/standalone/zero-dep.unit.test.ts` -- NEW: verify zero compiler dependencies
- [ ] `claws-test/tests/standalone/size-budget.unit.test.ts` -- NEW: verify package size <45KB
- [ ] `claws-test/tests/integration/standalone.integration.test.ts` -- NEW: all tests run without claws CLI installed
- [ ] `claws-test/tests/integration/full-pipeline.integration.test.ts` -- NEW: governance + security on sample skill via matchers
- [ ] `claws-test/tests/e2e/full-governance-security.e2e.test.ts` -- NEW: end-to-end governance + security validation on Tier 2 skill
- [ ] `claws-test/tests/fixtures/tier3-skill/` -- NEW: VERIFIED skill with full governance coverage fixture

## TDD Tests

### L0 Unit (4)

- `toPassGovernance()` on clean skill with all 12 checks passing -> assertion passes -> `claws-test/tests/matchers/governance.unit.test.ts`
- `toHaveRiskLevel('R3')` on R5 skill -> assertion fails with clear message showing expected R3, actual R5 -> `claws-test/tests/matchers/governance.unit.test.ts`
- `toRequireElicitation()` on skill with R5 tool missing elicitation gate -> assertion fails with tool name -> `claws-test/tests/matchers/governance.unit.test.ts`
- `toPassSecurityScan()` on skill with eval() -> assertion fails with scanner findings listed -> `claws-test/tests/matchers/governance.unit.test.ts`

### L1 Integration (2)

- Full governance + security validation via matchers on Tier 2 fixture skill: `expect(skill).toPassGovernance()` + `expect(skill).toPassSecurityScan()` both pass -> `claws-test/tests/integration/full-pipeline.integration.test.ts`
- All @bic/claws-test features run without claws CLI installed (no compiler dependency) -> `claws-test/tests/integration/standalone.integration.test.ts`

### L2 E2E (1)

- End-to-end: import @bic/claws-test, register matchers, run full governance + security validation on Tier 2 skill, produce structured results -> `claws-test/tests/e2e/full-governance-security.e2e.test.ts`

## Key Constraints

- Custom vitest matchers use `expect.extend()` -- standard vitest/jest extension API, no custom test runner
- Matcher error messages must be clear: show expected vs actual, list specific failing checks or findings
- `toPassGovernance()` runs all 12 GovernanceValidator checks; fails on first failing check with details
- `toPassSecurityScan()` runs all 16 SecurityScanner rules; fails listing all findings
- MockGateway re-exported from @bic/claws-skill-kit for convenience -- peer dep resolution, no duplication
- Size budget: ~45KB per CL-06. TypeScript compiler API for SecurityScanner is the heaviest dependency.
- Zero dependency boundary: package.json must NOT list compiler-sdk, claws-cli, craftworks-sdk, or shared-cli
- Package follows ARCHITECTURE.md: claws-test -> claws-sdk (types + test utilities)
- **Checkpoint gate**: this is the final pulse in CP-4. All exit criteria must be met before proceeding.

## CP-4 Gate Verification

After this pulse passes, verify ALL CP-4 exit criteria:

```bash
# CLI package
cd claws-cli && npx vitest run
cd claws-cli && npx tsc --noEmit

# Skill-kit package
cd claws-skill-kit && npx vitest run
cd claws-skill-kit && npx tsc --noEmit

# Test package
cd claws-test && npx vitest run
cd claws-test && npx tsc --noEmit

# Monorepo
npm run build
```

## Governing Roles

Load these role files before starting:

- `.craft/roles/claws/skill-author.md` -- matcher ergonomics, assertion message clarity, test workflow
- `.craft/roles/craft/architect.md` -- package boundaries, size budget, dependency rules, standalone verification

## Dependencies

- Pulse 27 (security-scanner) -- SecurityScanner with all 16 rules
- Pulses 20-22 (claws-cli-foundation) -- CLI commands must be passing for gate
- Pulses 23-25 (claws-skill-kit) -- skill-kit package must be passing for gate

## Verification Gate

```bash
cd claws-test && npx vitest run
cd claws-test && npx tsc --noEmit
npm run build
```

## Review Amendments (R1)

### C10: Getting-Started Doc (CP-4 Gate)

- [ ] Write `docs/claws/getting-started/tutorial.md` — full getting-started tutorial: init → build → pinch → test
- [ ] This is the capstone doc that ties all 4 checkpoints together

### Dragon: Malicious Skill Detection Test

- [ ] Add test: skill declares @classify('R1') but handler calls R5 tool → GovernanceValidator catches mismatch
- [ ] This validates that self-declared risk levels are verified against actual behavior
