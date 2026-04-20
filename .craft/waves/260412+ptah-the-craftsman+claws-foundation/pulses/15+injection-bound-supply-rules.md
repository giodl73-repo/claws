---
pulse: 15
slug: injection-bound-supply-rules
plan: claws-rules
depends_on: [13]
governing_roles: [claws:ciso, craft:dragon, claws:compliance]
scenario_codes: [S04-*, S05-*, S06-*, S07-*, S08-*, S09-*, S10-*, S11-*, S12-*]
stage: implementation
test_tiers:
  L0_unit: 10
  L1_integration: 2
  L2_e2e: 1
  L3_accept: 0
test_scope:
  run:
    - "cd claws-sdk && npx vitest run tests/governance/rules/g-input.unit.test.ts"
    - "cd claws-sdk && npx vitest run tests/governance/rules/g-output.unit.test.ts"
    - "cd claws-sdk && npx vitest run tests/governance/rules/g-bound.unit.test.ts"
    - "cd claws-sdk && npx vitest run tests/governance/rules/g-supply.unit.test.ts"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 3
checkpoint_gate: false
---

# Pulse 15: G-INPUT/CONTEXT/OUTPUT/BOUND + G-SUPPLY Rules

## Objective

Implement the remaining 17 governance rules across 5 categories: G-INPUT (4 input validation rules), G-CONTEXT (4 context isolation rules), G-OUTPUT (4 output guard rules), G-BOUND (4 bounded reasoning rules), and G-SUPPLY (1 supply chain rule). These rules form the injection defense layer (16 rules across INPUT/CONTEXT/OUTPUT/BOUND) and the supply chain security layer (G-SUPPLY). Together with P13 and P14, this completes all 29 governance rules in the registry.

## Deliverables

- [ ] `claws-sdk/src/governance/rules/g-input.ts` — 4 input validation rules: system prompt isolation, trust labeling, sanitization, URL validation
- [ ] `claws-sdk/src/governance/rules/g-context.ts` — 4 context isolation rules: boundary markers, tool isolation, memory isolation, skill isolation
- [ ] `claws-sdk/src/governance/rules/g-output.ts` — 4 output guard rules: data redaction, URL rules, format validation, chain validation
- [ ] `claws-sdk/src/governance/rules/g-bound.ts` — 4 bounded reasoning rules: step limits, tool limits, budget limits, recursion limits (includes delegation cycle detection)
- [ ] `claws-sdk/src/governance/rules/g-supply.ts` — supply chain rule: skill signing validation + malicious skill scanning
- [ ] `claws-sdk/src/compile/analyze.ts` — Phase 3 ANALYZE: apply all 29 registered rules to CapabilityManifest, produce GovAnalysis
- [ ] `claws-sdk/tests/governance/rules/g-input.unit.test.ts` — 4 input rules
- [ ] `claws-sdk/tests/governance/rules/g-output.unit.test.ts` — 4 output rules
- [ ] `claws-sdk/tests/governance/rules/g-bound.unit.test.ts` — 4 bounded reasoning rules including delegation cycle detection
- [ ] `claws-sdk/tests/governance/rules/g-supply.unit.test.ts` — signing validation, unsigned skill detection
- [ ] `claws-sdk/tests/compile/analyze.integration.test.ts` — full analysis on fixture manifests (minimal, SOC2, multi-agent)

## TDD Tests

### L0 Unit (10)

- G-INPUT system prompt isolation detects injection vector -> `tests/governance/rules/g-input.unit.test.ts`
- G-INPUT trust labeling flags unlabeled external content -> `tests/governance/rules/g-input.unit.test.ts`
- G-CONTEXT boundary marker enforcement -> `tests/governance/rules/g-input.unit.test.ts`
- G-CONTEXT memory isolation between agents -> `tests/governance/rules/g-input.unit.test.ts`
- G-OUTPUT data redaction flags CONFIDENTIAL in output -> `tests/governance/rules/g-output.unit.test.ts`
- G-OUTPUT chain validation across multi-step pipelines -> `tests/governance/rules/g-output.unit.test.ts`
- G-BOUND step limit enforcement -> `tests/governance/rules/g-bound.unit.test.ts`
- G-BOUND recursion limit with delegation cycle detection -> `tests/governance/rules/g-bound.unit.test.ts`
- G-SUPPLY flags unsigned marketplace skill -> `tests/governance/rules/g-supply.unit.test.ts`
- G-SUPPLY accepts signed skill with valid signature -> `tests/governance/rules/g-supply.unit.test.ts`

### L1 Integration (2)

- All 29 rules evaluated on SOC2 fixture produce categorized GovAnalysis -> `tests/compile/analyze.integration.test.ts`
- Full analysis on multi-agent fixture with A2A + injection + supply violations -> `tests/compile/analyze.integration.test.ts`

## Scenario Findings Addressed

- CFC-S01-F03: DENY-vs-TOOL governance-first resolution (prefer removing tool over removing deny)
- CFC-S04-F03: DATA-LABEL-MISMATCH safe resolution (restrict access > elevate ceiling)
- CFC-S04-F06: Default data flow ceiling PUBLIC when AGENTS.md omits ceiling
- CFC-S05-F03: G-BOUND delegation cycle detection complements recursion limits
- CP-S07-F04: AGENTS.md format flexibility (markdown headers, YAML blocks, structured lists)
- CP-S01-F05: Cold-start: rule loading within 200ms ANALYZE budget

## Verification Gate

```bash
cd claws-sdk && npx vitest run tests/governance/rules/g-input.unit.test.ts
cd claws-sdk && npx vitest run tests/governance/rules/g-output.unit.test.ts
cd claws-sdk && npx vitest run tests/governance/rules/g-bound.unit.test.ts
cd claws-sdk && npx vitest run tests/governance/rules/g-supply.unit.test.ts
cd claws-sdk && npx vitest run tests/compile/analyze.integration.test.ts
cd claws-sdk && npx tsc --noEmit
npm run build
```

## Key Constraints

- All 16 injection defense rules (INPUT/CONTEXT/OUTPUT/BOUND) form a layered defense — no single layer is sufficient alone
- G-BOUND recursion limits and delegation cycle detection are complementary — both must be present
- G-SUPPLY unsigned skill is always a violation, never advisory-only
- analyze.ts orchestrates all 29 rules and produces a single GovAnalysis — violations are aggregated, not short-circuited
- Each violation includes ruleId, severity, file, line, message, and remediation fields

## Governing Roles

Load these role files before starting:
- `.craft/roles/claws/ciso.md` — governance policy, compliance requirements, injection defense
- `.craft/roles/craft/dragon.md` — security review, threat modeling, layered defense validation
- `.craft/roles/claws/compliance.md` — regulatory alignment, supply chain governance, audit requirements

## Review Amendments (R1)

### Architect: Full Pipeline L2 Test
- [ ] Add 1 L2 test: full parse → extract → analyze on SOC2 fixture workspace
- [ ] Validates all 29 rules fire correctly on a realistic workspace, not just unit fixtures
- [ ] Update test_tiers: L2_e2e: 1
