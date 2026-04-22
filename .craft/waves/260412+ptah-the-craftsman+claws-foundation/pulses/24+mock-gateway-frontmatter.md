---
pulse: 24
slug: mock-gateway-frontmatter
plan: claws-skill-kit
depends_on: [23]
governing_roles: [claws:skill-author, claws:gateway-eng]
scenario_codes: [skill-kit/mock-gateway-event, skill-kit/annotation-schema-valid, skill-kit/annotation-schema-invalid]
stage: implementation
test_tiers:
  L0_unit: 6
  L1_integration: 2
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run:
    - "cd claws-skill-kit && npx vitest run tests/mock/mock-gateway.unit.test.ts"
    - "cd claws-skill-kit && npx vitest run tests/mock/mock-approval.unit.test.ts"
    - "cd claws-skill-kit && npx vitest run tests/schema/annotation.unit.test.ts"
  typecheck:
    - "cd claws-skill-kit && npx tsc --noEmit"
checkpoint: 2
checkpoint_gate: false
---

# Pulse 24: MockGateway + SKILL.md Frontmatter Schema

## Objective

Implement MockGateway which simulates OC Gateway `before_tool_call` events without the OC runtime, enabling unit testing of governance-aware skills in isolation. Implement the SKILL.md governance frontmatter Zod schema for validating governance annotations in skill metadata. Implement frontmatter-to-decorator value propagation so that `claws import` can use frontmatter values as the source of truth for decorator arguments.

## Deliverables

- [ ] `claws-skill-kit/src/mock/mock-gateway.ts` -- NEW: MockGateway simulating OC Gateway api.on() event lifecycle
- [ ] `claws-skill-kit/src/mock/mock-tools.ts` -- NEW: MockTools for simulated tool call/response pairs
- [ ] `claws-skill-kit/src/mock/mock-approval.ts` -- NEW: MockApproval for elicitation gate simulation (approve/deny/timeout)
- [ ] `claws-skill-kit/src/schema/annotation.ts` -- NEW: Zod schema for SKILL.md governance frontmatter validation
- [ ] `claws-skill-kit/src/schema/types.ts` -- NEW: GovernanceAnnotation, AnnotationError types
- [ ] `claws-skill-kit/src/schema/propagation.ts` -- NEW: frontmatter-to-decorator value propagation logic
- [ ] `claws-skill-kit/tests/mock/mock-gateway.unit.test.ts` -- NEW: event simulation, configurable responses, lifecycle
- [ ] `claws-skill-kit/tests/mock/mock-approval.unit.test.ts` -- NEW: approve/deny/timeout scenarios
- [ ] `claws-skill-kit/tests/schema/annotation.unit.test.ts` -- NEW: valid/invalid frontmatter, error messages, enum suggestions
- [ ] `claws-skill-kit/tests/integration/tier2-migration.integration.test.ts` -- NEW: full Tier 2 adoption on fixture skill
- [ ] `claws-skill-kit/tests/integration/tsc-type-check.integration.test.ts` -- NEW: decorated skill passes tsc --noEmit

## TDD Tests

### L0 Unit (6)

- MockGateway fires `before_tool_call` event with governance response when tool is invoked -> `claws-skill-kit/tests/mock/mock-gateway.unit.test.ts`
- MockGateway supports configurable hook responses (allow, deny, require-approval) -> `claws-skill-kit/tests/mock/mock-gateway.unit.test.ts`
- MockApproval simulates elicitation gate: approve, deny, and timeout scenarios -> `claws-skill-kit/tests/mock/mock-approval.unit.test.ts`
- Annotation schema accepts valid governance frontmatter with risk_level, obo, data_labels fields -> `claws-skill-kit/tests/schema/annotation.unit.test.ts`
- Annotation schema rejects invalid frontmatter with all errors collected (not fail-fast) and nearest-value suggestions -> `claws-skill-kit/tests/schema/annotation.unit.test.ts`
- Annotation schema handles YAML None/null disambiguation: string "None" parsed as "none", not null -> `claws-skill-kit/tests/schema/annotation.unit.test.ts`

### L1 Integration (2)

- Decorated skill with MockGateway simulates full before_tool_call -> handler -> response lifecycle -> `claws-skill-kit/tests/integration/tier2-migration.integration.test.ts`
- Decorated skill with @classify('R3') + @obo('email') passes tsc --noEmit against OC skill types -> `claws-skill-kit/tests/integration/tsc-type-check.integration.test.ts`

## HC-BLOCK / HC-WARN Findings Addressed

- S02-F02: Frontmatter-to-decorator value propagation -- frontmatter values are source of truth for decorator arguments
- S04-F01: Annotation schema closest-value suggestion -- Zod error messages suggest nearest valid enum value
- S04-F02: Collect-all-errors -- Zod schema validates all fields and reports all errors simultaneously
- S04-F04 / P-229: YAML None/null disambiguation -- annotation schema accepts string "None" as "none", not null
- S04-F03: Semantic context in validation errors -- risk level R6 error explains R1=READ through R5=TRANSACT

## Key Constraints

- MockGateway simulates the OC Gateway `api.on()` event model -- must use the same event types but in-memory
- MockGateway does NOT depend on the OC runtime -- it is a test double
- MockApproval supports 3 modes: auto-approve, auto-deny, timeout (configurable per test)
- Annotation schema uses Zod with `.superRefine()` for cross-field validation (e.g., R1 + transact OBO is contradictory per S03-F06)
- Frontmatter-to-decorator propagation: during `claws import`, frontmatter values seed decorator arguments
- S02-F01: Prompt-only skills cannot be TYPED (no code to decorate) -- schema enforces tier ceiling

## Governing Roles

Load these role files before starting:
- `.craft/roles/claws/skill-author.md` -- MockGateway usability, testing workflow, adoption friction
- `.craft/roles/claws/gateway-eng.md` -- event model fidelity, hook response types, approval flow

## Dependencies

- Pulse 23 (skill-factory-decorators) -- skill() factory + decorator metadata infrastructure

## Verification Gate

```bash
cd claws-skill-kit && npx vitest run tests/mock/
cd claws-skill-kit && npx vitest run tests/schema/
cd claws-skill-kit && npx tsc --noEmit
npm run build
```

## Review Amendments (R1)

### C02: Moved to CP-2
- [ ] Update frontmatter: `checkpoint: 2`

### C11: OC Type Snapshot for MockGateway
- [ ] Add frozen OC type snapshot (.d.ts) in test fixtures
- [ ] Structural test: `MockGatewayEvent satisfies OCBeforeToolCallEvent`
- [ ] If OC Gateway types change, this test breaks — forcing update
