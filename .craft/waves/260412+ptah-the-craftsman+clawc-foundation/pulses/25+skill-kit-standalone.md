---
pulse: 25
slug: skill-kit-standalone
plan: claws-skill-kit
depends_on: [24]
governing_roles: [claws:skill-author, craft:architect]
scenario_codes: [skill-kit/install-clean-project, skill-kit/no-behavioral-change, skill-kit/tier2-migration]
stage: implementation
test_tiers:
  L0_unit: 3
  L1_integration: 2
  L2_e2e: 1
  L3_accept: 0
test_scope:
  run:
    - "cd claws-skill-kit && npx vitest run"
  typecheck:
    - "cd claws-skill-kit && npx tsc --noEmit"
checkpoint: 2
checkpoint_gate: false
---

# Pulse 25: Standalone Packaging + Zero-Dep Verification

## Objective

Finalize @bic/claws-skill-kit as a standalone npm package (~35KB) with zero transitive claws-cli dependencies. Verify that a decorated skill works as a normal OC skill without the claws compiler installed. Verify import type-only boundary from claws-sdk. Verify Tier 2 TYPED adoption path takes <15 minutes for an existing ungoverned skill.

## Deliverables

- [ ] `claws-skill-kit/package.json` -- EDIT: finalize exports map, files array, bundledDependencies, size budget enforcement
- [ ] `claws-skill-kit/src/index.ts` -- EDIT: finalize barrel exports (skill, decorators, mock, schema, types)
- [ ] `claws-skill-kit/.eslintrc.json` -- NEW: no-restricted-imports rules blocking claws-cli, claws-base-cli, craftworks-sdk, shared-cli
- [ ] `claws-skill-kit/tests/standalone/zero-dep.unit.test.ts` -- NEW: verify zero transitive claws-cli dependencies in package.json
- [ ] `claws-skill-kit/tests/standalone/import-type-only.unit.test.ts` -- NEW: verify all claws-sdk imports use `import type`
- [ ] `claws-skill-kit/tests/standalone/size-budget.unit.test.ts` -- NEW: verify package size <35KB
- [ ] `claws-skill-kit/tests/standalone/no-behavioral-change.integration.test.ts` -- NEW: decorated skill runs identically to undecorated skill
- [ ] `claws-skill-kit/tests/standalone/tier2-adoption.integration.test.ts` -- NEW: full Tier 2 migration on fixture skill (wrap, decorate, validate)
- [ ] `claws-skill-kit/tests/standalone/tier2-adoption.e2e.test.ts` -- NEW: end-to-end Tier 2 adoption from ungoverned skill to passing pinch

## TDD Tests

### L0 Unit (3)

- package.json has zero dependencies on claws-cli, claws-base-cli, craftworks-sdk, or shared-cli (direct or transitive) -> `claws-skill-kit/tests/standalone/zero-dep.unit.test.ts`
- All imports from claws-sdk use `import type` (no value imports from the SDK) -> `claws-skill-kit/tests/standalone/import-type-only.unit.test.ts`
- Built package size is under 35KB budget -> `claws-skill-kit/tests/standalone/size-budget.unit.test.ts`

### L1 Integration (2)

- Decorated skill with skill() + @classify('R3') + @obo('email') runs identically to the undecorated handler (same input -> same output) -> `claws-skill-kit/tests/standalone/no-behavioral-change.integration.test.ts`
- Existing ungoverned handler gains Tier 2 TYPED governance via: wrap with skill(), add @classify + @obo, add frontmatter (3 steps) -> `claws-skill-kit/tests/standalone/tier2-adoption.integration.test.ts`

### L2 E2E (1)

- End-to-end Tier 2 adoption: ungoverned fixture skill -> install @bic/claws-skill-kit -> wrap + decorate -> `claws pinch` passes -> `claws-skill-kit/tests/standalone/tier2-adoption.e2e.test.ts`

## Key Constraints

- Size budget: ~35KB per CL-06. Zod is the only non-trivial dependency; must be tree-shakeable.
- Zero dependency boundary: package.json must NOT list claws-cli, claws-base-cli, craftworks-sdk, or shared-cli as dependencies or peerDependencies
- `import type` only from claws-sdk: enforced by ESLint consistent-type-imports + no-restricted-imports
- Decorated skill IS a normal OC skill: the skill() wrapper and decorators add metadata but do not change behavior
- Tier 2 migration path: (1) npm install, (2) wrap with skill(), (3) add decorators, (4) add 3-line frontmatter
- ESLint boundary lint prevents future dependency creep
- Package follows ARCHITECTURE.md: claws-skill-kit -> claws-sdk (types only)

## Governing Roles

Load these role files before starting:
- `.craft/roles/claws/skill-author.md` -- adoption friction, migration path, getting-started experience
- `.craft/roles/craft/architect.md` -- package boundaries, dependency rules, size budgets

## Dependencies

- Pulse 24 (mock-gateway-frontmatter) -- MockGateway + annotation schema + all skill-kit modules complete

## Verification Gate

```bash
cd claws-skill-kit && npx vitest run
cd claws-skill-kit && npx tsc --noEmit
npm run build
```

## Review Amendments (R1)

### C02: Moved to CP-2
- [ ] Update frontmatter: `checkpoint: 2`
