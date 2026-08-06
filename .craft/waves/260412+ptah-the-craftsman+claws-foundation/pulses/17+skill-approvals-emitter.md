---
pulse: 17
slug: skill-approvals-emitter
plan: claws-emit
depends_on: [16]
governing_roles: [claws:gateway-eng, craft:codegen]
scenario_codes: [emit-S04-*, emit-S05-*]
stage: implementation
test_tiers:
  L0_unit: 6
  L1_integration: 2
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run:
    - "cd claws-sdk && npx vitest run tests/emit/emit-skill.unit.test.ts"
    - "cd claws-sdk && npx vitest run tests/emit/emit-exec-approvals.unit.test.ts"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 3
checkpoint_gate: false
---

# Pulse 17: Governance SKILL.md + exec-approvals.json Emitters

## Objective

Emit the governance SKILL.md (L1 advisory prompt) and exec-approvals.json (L4 host backup). SKILL.md uses pinch compression from compiler-sdk for token-efficient advisory instructions — preserving safety-critical keywords while compressing non-critical text. The SKILL.md is self-sufficient for advisory-only platforms that lack hook APIs. exec-approvals.json contains entries for every R5 tool in the manifest with approval requirements, custom overrides, and built-in tool inclusion.

## Deliverables

- [ ] `claws-sdk/src/emit/emit-skill.ts` — Generate governance SKILL.md: advisory prompt with imperative instructions, pinch compression (basic governance profile), size management (inline vs reference threshold at 20 tools)
- [ ] `claws-sdk/src/emit/emit-exec-approvals.ts` — Generate exec-approvals.json: R5 tool entries with approval requirements, custom approval overrides, built-in tool inclusion, schema validation against OC platform spec
- [ ] `claws-sdk/tests/emit/emit-skill.unit.test.ts` — SKILL.md content quality, pinch compression, size threshold, provenance invisibility
- [ ] `claws-sdk/tests/emit/emit-exec-approvals.unit.test.ts` — JSON schema validation, R5 entries, custom overrides, built-in tools, platform field name mapping

## TDD Tests

### L0 Unit (6)

- emit-skill produces valid SKILL.md with governance instructions -> `tests/emit/emit-skill.unit.test.ts`
- pinch compression preserves safety-critical keywords -> `tests/emit/emit-skill.unit.test.ts`
- SKILL.md switches to reference mode above 20 tools -> `tests/emit/emit-skill.unit.test.ts`
- SKILL.md contains no provenance markers (no claws references in output) -> `tests/emit/emit-skill.unit.test.ts`
- exec-approvals.json has entries for every R5 tool -> `tests/emit/emit-exec-approvals.unit.test.ts`
- exec-approvals.json validates against OC platform schema -> `tests/emit/emit-exec-approvals.unit.test.ts`

### L1 Integration (2)

- Full SKILL.md emit on SOC2 fixture with diverse tool set -> `tests/emit/emit-skill.integration.test.ts`
- Cross-artifact consistency: exec-approvals R5 entries match SKILL.md R5 references -> `tests/emit/emit-exec-approvals.integration.test.ts`

## Scenario Findings Addressed

- emit-S04-F01: SKILL.md imperative instruction quality
- emit-S04-F02: pinch governance compression profile (preserve safety-critical keywords, P-075)
- emit-S04-F03: pinch compression level configuration
- emit-S04-F04: Cross-artifact consistency validation (P-080)
- emit-S04-F06: SKILL.md size management (inline vs reference at 20 tools)
- emit-S05-F01: exec-approvals.json schema validation against OC platform spec (P-072)
- emit-S05-F03: Custom approval overrides in exec-approvals
- emit-S05-F04: Built-in tool inclusion in exec-approvals
- emit-S08-F03: SKILL.md provenance invisibility (no claws markers)
- emit-S08-F07: Platform field name mapping in exec-approvals
- emit-S01-F07: SKILL.md self-sufficiency for advisory-only platforms

## Verification Gate

```bash
cd claws-sdk && npx vitest run tests/emit/emit-skill.unit.test.ts
cd claws-sdk && npx vitest run tests/emit/emit-exec-approvals.unit.test.ts
cd claws-sdk && npx tsc --noEmit
npm run build
```

## Key Constraints

- pinch compression must preserve safety-critical keywords — never compress R5/OBO/DENY tokens
- SKILL.md is self-sufficient for advisory-only platforms (no hook API dependency)
- exec-approvals.json schema must validate against the OC platform spec exactly
- Cross-artifact consistency: R5 tool lists in SKILL.md and exec-approvals must match
- No provenance markers in generated output — SKILL.md must not reference claws

## Governing Roles

Load these role files before starting:

- `.craft/roles/claws/gateway-eng.md` — OC integration, platform spec alignment, artifact conventions
- `.craft/roles/craft/codegen.md` — code generation patterns, pinch compression, template rendering

## Review Amendments (R1)

### Gateway-Eng: Frozen exec-approvals Schema

- [ ] Add frozen OC exec-approvals.json JSON Schema in test fixtures
- [ ] Validate generated exec-approvals.json against frozen schema
- [ ] Schema includes all R5 tools from manifest
