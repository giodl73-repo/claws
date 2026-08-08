---
pulse: 3
slug: governance-ir-types
plan: claws-governance-ir
depends_on: [1, 2]
governing_roles: [craft:dragon, claws:gateway-eng, craft:architect]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 8
  L1_integration: 0
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run:
    - "cd claws-sdk && npx vitest run tests/ir/governance-ir.unit.test.ts"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 1
checkpoint_gate: false
---

# Pulse 03: GovernanceIR Types + FailMode<R>

## Objective

Define the GovernanceIR interface as the stable pivot between analysis and emission. Implement FailMode<R> as a parameterized type where R5 fail-open is structurally unrepresentable by the TypeScript compiler. Define CapabilityManifest type stub, all 5 mechanical intent types (DenyIntent, ElicitIntent, RequireIntent, LimitIntent, LabelIntent), and the IR barrel exports.

## Deliverables

- [ ] `claws-sdk/src/ir/governance-ir.ts` — GovernanceIR interface with capability manifest, analysis, intents, delegation map, compiler version metadata
- [ ] `claws-sdk/src/ir/fail-mode.ts` — `FailMode<R>` parameterized type: `R extends 5 ? 'closed' : 'open' | 'closed'`, OC-POLICY-E001 diagnostic
- [ ] `claws-sdk/src/ir/mechanical-intent.ts` — DenyIntent, ElicitIntent, RequireIntent, LimitIntent, LabelIntent types
- [ ] `claws-sdk/src/ir/capability-manifest.ts` — CapabilityManifest type stub (tools, skills, agents, workflows)
- [ ] `claws-sdk/src/ir/gov-analysis.ts` — GovAnalysis type stub (violations, warnings, enforcementPlan)
- [ ] `claws-sdk/src/ir/index.ts` — barrel re-exports for all IR types
- [ ] `claws-sdk/tests/ir/governance-ir.unit.test.ts` — 8 L0 tests:
  - Construct minimal GovernanceIR with all required fields
  - FailMode<5> accepts only 'closed'
  - FailMode<5> with 'open' is rejected by TypeScript (type-level test)
  - FailMode<3> accepts both 'open' and 'closed'
  - FailMode<4> accepts both 'open' and 'closed'
  - DenyIntent, ElicitIntent, RequireIntent construction
  - LimitIntent, LabelIntent construction
  - GovernanceIR carries compiler version metadata

## Acceptance Criteria

- [ ] GovernanceIR interface compiles with all required fields populated
- [ ] `FailMode<5>` assignment to `'open'` causes TypeScript compilation error
- [ ] `FailMode<5>` assignment to `'closed'` compiles successfully
- [ ] `FailMode<3>` and `FailMode<4>` accept both `'open'` and `'closed'`
- [ ] All 5 mechanical intent types are constructable and type-safe
- [ ] CapabilityManifest type has tools, skills, agents, workflows arrays
- [ ] GovAnalysis type has violations, warnings, enforcementPlan fields
- [ ] All 8 unit tests pass: `cd claws-sdk && npx vitest run tests/ir/governance-ir.unit.test.ts`
- [ ] `cd claws-sdk && npx tsc --noEmit` passes

## Governing Roles

Load these role files before starting:

- `.craft/roles/craft/dragon.md` — type safety enforcement, structural correctness, invariant verification
- `.craft/roles/claws/gateway-eng.md` — Gateway API constraints, governance model alignment, FailMode semantics
- `.craft/roles/craft/architect.md` — IR design patterns, FormaIR pivot pattern from compiler-sdk (Spec 109)

## Dependencies

Pulse 01 must be complete — claws-sdk package must exist with build tooling before IR types can be added.

## Review Amendments (R1)

### C08: Canonical AuditEvent Type

- [ ] Define `AuditEvent` interface: timestamp, eventType, actor, target, action, outcome, ruleId, severity, policyVersion, hmacSignature, keyId, algorithm
- [ ] All audit-producing code across all pulses MUST emit this type
- [ ] Export from claws-sdk/src/ir/audit-event.ts

### Architect: P03 depends_on must include P02

- [ ] Update frontmatter: `depends_on: [1, 2]` (lint must be active before IR code)

### Dragon: FailMode Deserialization Guard

- [ ] Add runtime validation: when deserializing GovernanceIR from JSON, validate that no R5 rule has fail-open mode
- [ ] `validateFailModes(ir: GovernanceIR): void` throws OC-POLICY-E001 if violation found
- [ ] This guards against hand-edited .claws/compiled/governance-ir.json tampering
