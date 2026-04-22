---
pulse: 2
slug: forbidden-import-lint
plan: claws-sdk-bootstrap
depends_on: [1]
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 2
  L1_integration: 0
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run:
    - "cd claws-sdk && npx vitest run"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 1
checkpoint_gate: false
---

# Pulse 02: Forbidden Import Lint + Boundary

## Objective

Configure ESLint `no-restricted-imports` rules in both `claws-sdk` and `claws-cli` that block any import from `@craftworks/craftworks-sdk`, `@craftworks/shared-cli`, `@craftworks/craft-cli`, `@craftworks/guard-cli`, `@craftworks/fleet-cli`, and `@craftworks/forge-cli`. Write a canary test that proves the boundary is enforced at lint time. Ensure tsconfig.json paths do NOT include aliases for any forbidden package.

## Deliverables

- [ ] `claws-sdk/.eslintrc.cjs` — `no-restricted-imports` for all 6 forbidden packages
- [ ] `claws-cli/.eslintrc.cjs` — `no-restricted-imports` for all 6 forbidden packages plus craftworks-sdk
- [ ] `claws-sdk/tests/lint/forbidden-import-canary.unit.test.ts` — L0: ESLint programmatic API reports error on forbidden import
- [ ] `claws-sdk/tests/lint/tsconfig-no-forbidden-paths.unit.test.ts` — L0: tsconfig.json paths exclude all forbidden packages
- [ ] Verify: tsconfig.json paths in both packages do NOT alias forbidden packages

## Acceptance Criteria

- [ ] ESLint reports error on `import { anything } from '@craftworks/craftworks-sdk'`
- [ ] ESLint reports error on `import { anything } from '@craftworks/shared-cli'`
- [ ] ESLint reports error on `import { anything } from '@craftworks/craft-cli'`
- [ ] ESLint reports error on `import { anything } from '@craftworks/guard-cli'`
- [ ] ESLint reports error on `import { anything } from '@craftworks/fleet-cli'`
- [ ] ESLint reports error on `import { anything } from '@craftworks/forge-cli'`
- [ ] tsconfig.json paths do NOT include aliases for any forbidden package
- [ ] Canary test passes: `cd claws-sdk && npx vitest run tests/lint/forbidden-import-canary.unit.test.ts`

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/architect.md` — dependency boundaries, monorepo package isolation rules
- `.craft/roles/claws/platform-eng.md` — claws sibling architecture, import boundary enforcement

## Dependencies

Pulse 01 must be complete — packages must exist before lint rules can be configured.
