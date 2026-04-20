---
pulse: 18
slug: workflow-inversion
plan: claws-emit
depends_on: [16]
governing_roles: [claws:gateway-eng, craft:dragon]
scenario_codes: [emit-S02-*, CP-S08-*]
stage: implementation
test_tiers:
  L0_unit: 6
  L1_integration: 2
  L2_e2e: 1
  L3_accept: 0
test_scope:
  run:
    - "cd claws-sdk && npx vitest run tests/emit/emit-workflow.unit.test.ts"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 3
checkpoint_gate: false
---

# Pulse 18: Workflow Inversion (lobster.compiled.yaml)

## Objective

Read `lobster.yaml`, identify governance-sensitive steps (R3+ tools, OBO actions, A2A delegation, sensitive data), and emit `lobster.compiled.yaml` with governance steps injected before and after sensitive operations. An R5/OBO `send-email` step gets a `claws-elicit-send-email` gate injected before it and a `claws-audit-send-email` step after it. Original step ordering is preserved — governance steps are inserted, not reordered. Handle parallel branch DAGs, conditional branches, and first-step edge cases.

## Deliverables

- [ ] `claws-sdk/src/emit/emit-workflow.ts` — Workflow inversion engine: read parsed lobster.yaml DAG from GovernanceAST, identify R3+ steps, inject governance steps (elicit/audit/classify), emit lobster.compiled.yaml preserving original order
- [ ] `claws-sdk/tests/emit/emit-workflow.unit.test.ts` — DAG rewriting, step injection ordering, naming conventions, parallel branches, conditional DAGs, first-step edge case
- [ ] `claws-sdk/tests/fixtures/minimal/lobster.yaml` — minimal workflow fixture for testing
- [ ] `claws-sdk/tests/fixtures/soc2/lobster.yaml` — complex workflow fixture with parallel branches and R5 steps

## TDD Tests

### L0 Unit (6)

- R5 send-email step gets elicit + audit steps injected -> `tests/emit/emit-workflow.unit.test.ts`
- Original step ordering preserved after injection -> `tests/emit/emit-workflow.unit.test.ts`
- R1-R2 steps get no injected governance steps -> `tests/emit/emit-workflow.unit.test.ts`
- Injected step naming follows `claws-{type}-{tool-name}` convention -> `tests/emit/emit-workflow.unit.test.ts`
- Classification step injected for ALL tool-using steps (not only R5) -> `tests/emit/emit-workflow.unit.test.ts`
- First-step governance: pre-workflow gate when trigger uses R5 tool -> `tests/emit/emit-workflow.unit.test.ts`

### L1 Integration (2)

- Full workflow inversion on SOC2 fixture with diverse steps -> `tests/emit/emit-workflow.integration.test.ts`
- Parallel branch handling: elicitation in parallel DAG branches -> `tests/emit/emit-workflow.integration.test.ts`

### L2 E2E (1)

- Complete emit-workflow on complex fixture, validate lobster.compiled.yaml against lobster schema -> `tests/emit/emit-workflow.e2e.test.ts`

## Scenario Findings Addressed

- CP-S08-F01: Workflow injected step naming `claws-{type}-{tool-name}` with disambiguation
- CP-S08-F02: Parallel branch workflow inversion (elicitation in parallel DAG branches)
- CP-S08-F04: Audit step async by default, non-blocking on audit failure
- CP-S08-F06: Classification step injection for ALL tool-using steps, not only R5
- CP-S08-F07: First-step governance edge case (pre-workflow gate)
- emit-S02-F01: Compiled workflow schema validation against lobster schema
- emit-S02-F02: Workflow-plugin handler name contract (shared naming function, P-081)
- emit-S02-F04: Overwrite vs incremental emit (content hash comparison)
- emit-S02-F06: Fail-mode metadata in compiled workflow governance steps
- emit-S02-F07: Branch-aware workflow inversion for conditional DAGs
- CFC-S01-F07: Elicitation as conditional deny resolution (suggest elicit gate)
- CFC-S07-F04: Tool alternative suggestions in conflict resolution

## Verification Gate

```bash
cd claws-sdk && npx vitest run tests/emit/emit-workflow.unit.test.ts
cd claws-sdk && npx vitest run tests/emit/emit-workflow.integration.test.ts
cd claws-sdk && npx tsc --noEmit
npm run build
```

## Key Constraints

- Original step ordering MUST be preserved — governance steps are inserted around existing steps, never reordered
- Injected step naming: `claws-{type}-{tool-name}` with disambiguation for multiple R5 tools using same tool
- Audit steps are async by default, non-blocking on audit failure
- Classification step injection for ALL tool-using steps, not only R5 (R3+ for elicit/audit, R1+ for classify)
- First-step edge case: when workflow trigger itself uses R5, inject pre-workflow gate
- Compiled workflow must validate against lobster schema
- Conditional artifact count: emit 3 artifacts when lobster.yaml absent, not always 4

## Governing Roles

Load these role files before starting:
- `.craft/roles/claws/gateway-eng.md` — OC integration, workflow DAG conventions, lobster schema
- `.craft/roles/craft/dragon.md` — security review, governance step injection, fail-closed enforcement
