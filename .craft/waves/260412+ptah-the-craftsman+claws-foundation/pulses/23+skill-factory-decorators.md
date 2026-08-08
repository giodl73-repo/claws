---
pulse: 23
slug: skill-factory-decorators
plan: claws-skill-kit
depends_on: [3]
governing_roles: [claws:skill-author, claws:gateway-eng]
scenario_codes:
  [
    skill-kit/skill-factory-basic,
    skill-kit/decorator-obo,
    skill-kit/decorator-classify,
    skill-kit/decorator-audit,
    skill-kit/decorator-validate,
    skill-kit/decorator-budget,
    skill-kit/decorator-timeout,
  ]
stage: implementation
test_tiers:
  L0_unit: 8
  L1_integration: 0
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run:
    - "cd claws-skill-kit && npx vitest run tests/factory/skill.unit.test.ts"
    - "cd claws-skill-kit && npx vitest run tests/decorators/obo.unit.test.ts"
    - "cd claws-skill-kit && npx vitest run tests/decorators/classify.unit.test.ts"
    - "cd claws-skill-kit && npx vitest run tests/decorators/audit.unit.test.ts"
    - "cd claws-skill-kit && npx vitest run tests/decorators/validate.unit.test.ts"
    - "cd claws-skill-kit && npx vitest run tests/decorators/budget.unit.test.ts"
    - "cd claws-skill-kit && npx vitest run tests/decorators/timeout.unit.test.ts"
  typecheck:
    - "cd claws-skill-kit && npx tsc --noEmit"
checkpoint: 2
checkpoint_gate: false
---

# Pulse 23: skill() Factory + 6 Decorators

## Objective

Create the @bic/claws-skill-kit package scaffolding and implement the core API: `skill()` factory function that creates a typed skill handler, and 6 governance decorators (@obo, @audit, @classify, @validate, @budget, @timeout) that annotate handlers with governance metadata. Decorators are compile-time metadata -- they annotate functions for the compiler to read at build time, they do NOT execute at runtime. The package works without claws CLI installed.

## Deliverables

- [ ] `claws-skill-kit/package.json` -- NEW: @bic/claws-skill-kit, peer dep on claws-sdk types only, exports map
- [ ] `claws-skill-kit/tsconfig.json` -- NEW: extends monorepo base, paths restricted to claws-sdk types
- [ ] `claws-skill-kit/vitest.config.ts` -- NEW: unit/integration/e2e projects
- [ ] Root `package.json` -- EDIT: add "claws-skill-kit" to workspaces array
- [ ] `claws-skill-kit/src/index.ts` -- NEW: package barrel exports (skill, decorators, types)
- [ ] `claws-skill-kit/src/factory/skill.ts` -- NEW: skill() factory creating typed SkillHandler with governance metadata slots
- [ ] `claws-skill-kit/src/decorators/obo.ts` -- NEW: @obo(type) decorator (email/message/calendar/social/purchase/transact)
- [ ] `claws-skill-kit/src/decorators/audit.ts` -- NEW: @audit() decorator for audit chain inclusion
- [ ] `claws-skill-kit/src/decorators/classify.ts` -- NEW: @classify(level) decorator for risk level (R1-R5)
- [ ] `claws-skill-kit/src/decorators/validate.ts` -- NEW: @validate(schema) decorator for input validation
- [ ] `claws-skill-kit/src/decorators/budget.ts` -- NEW: @budget(tokens) decorator for token budget limit
- [ ] `claws-skill-kit/src/decorators/timeout.ts` -- NEW: @timeout(seconds) decorator for execution timeout
- [ ] `claws-skill-kit/src/decorators/index.ts` -- NEW: barrel exports for all decorators
- [ ] `claws-skill-kit/src/types.ts` -- NEW: GovernanceAnnotation, SkillMetadata, DecoratorMetadata types
- [ ] `claws-skill-kit/tests/factory/skill.unit.test.ts` -- NEW: skill() creation, metadata slots, handler wrapping
- [ ] `claws-skill-kit/tests/decorators/obo.unit.test.ts` -- NEW: @obo application + metadata readback
- [ ] `claws-skill-kit/tests/decorators/classify.unit.test.ts` -- NEW: R1-R5 levels, invalid level rejection
- [ ] `claws-skill-kit/tests/decorators/audit.unit.test.ts` -- NEW: audit flag set on handler
- [ ] `claws-skill-kit/tests/decorators/validate.unit.test.ts` -- NEW: schema attachment to metadata
- [ ] `claws-skill-kit/tests/decorators/budget.unit.test.ts` -- NEW: token limit annotation
- [ ] `claws-skill-kit/tests/decorators/timeout.unit.test.ts` -- NEW: timeout annotation

## TDD Tests

### L0 Unit (8)

- skill() factory creates typed SkillHandler with empty governance metadata slots -> `claws-skill-kit/tests/factory/skill.unit.test.ts`
- skill() factory name parameter must match skill directory name convention -> `claws-skill-kit/tests/factory/skill.unit.test.ts`
- @obo('email') annotates handler with OBO boundary metadata readable via getGovernanceMetadata() -> `claws-skill-kit/tests/decorators/obo.unit.test.ts`
- @classify('R3') annotates handler with risk level, rejects invalid levels (R0, R6) -> `claws-skill-kit/tests/decorators/classify.unit.test.ts`
- @audit() sets audit trail inclusion flag on handler metadata -> `claws-skill-kit/tests/decorators/audit.unit.test.ts`
- @validate(schema) attaches Zod schema to handler metadata for input validation -> `claws-skill-kit/tests/decorators/validate.unit.test.ts`
- @budget(1000) annotates handler with token budget limit -> `claws-skill-kit/tests/decorators/budget.unit.test.ts`
- @timeout(300) annotates handler with execution timeout in seconds -> `claws-skill-kit/tests/decorators/timeout.unit.test.ts`

## Key Constraints

- Decorators are METADATA ONLY -- they annotate functions, they do NOT wrap or modify runtime behavior
- Each decorator stores metadata in a well-known symbol key on the function (readable by getGovernanceMetadata())
- skill() returns a standard OC skill shape -- a decorated skill IS a normal OC skill
- Package imports ONLY types from claws-sdk (`import type` enforced by ESLint consistent-type-imports)
- Uses TypeScript Stage 3 decorators (compatible with OC's TypeScript version)
- Zero runtime dependencies on claws-cli, claws-base-cli, or the compilation pipeline
- Follows ARCHITECTURE.md dependency rules: claws-skill-kit -> claws-sdk (types only)
- Depends on GovernanceIR types from pulse 03-05 (FailMode, RiskLevel type parameters)
- S01-F06: skill() name parameter must match skill directory name; log warning on mismatch
- S03-F06: R1 risk + transact OBO is contradictory -- schema should warn

## Governing Roles

Load these role files before starting:

- `.craft/roles/claws/skill-author.md` -- decorator ergonomics, factory API, adoption friction
- `.craft/roles/claws/gateway-eng.md` -- decorator metadata shape, OC Gateway compatibility, event model

## Dependencies

- Pulse 03 (governance-ir-types) -- GovernanceIR, FailMode, RiskLevel types for decorator parameters

## Verification Gate

```bash
cd claws-skill-kit && npx vitest run tests/factory/skill.unit.test.ts
cd claws-skill-kit && npx vitest run tests/decorators/
cd claws-skill-kit && npx tsc --noEmit
npm run build
```

## Review Amendments (R1)

### C02: Moved to CP-2

- [ ] Update frontmatter: `checkpoint: 2` (was 4, moved per founder review)
- [ ] Actual dependency is P03 only — runs in parallel with detection/parse
