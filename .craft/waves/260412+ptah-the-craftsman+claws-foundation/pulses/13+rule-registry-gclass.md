---
pulse: 13
slug: rule-registry-gclass
plan: claws-rules
depends_on: [5, 12]
governing_roles: [craft:dragon, claws:ciso, claws:gateway-eng]
scenario_codes: [S01-*, S02-*, CP-S06-*]
stage: implementation
test_tiers:
  L0_unit: 10
  L1_integration: 3
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run:
    - "cd claws-sdk && npx vitest run tests/governance/rule-registry.unit.test.ts"
    - "cd claws-sdk && npx vitest run tests/governance/rules/g-class.unit.test.ts"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 3
checkpoint_gate: false
---

# Pulse 13: Rule Registry + G-CLASS Classification

## Objective

Create the extensible rule registry (function-per-rule, not switch statement) and implement G-CLASS R1-R5 risk classification via capability analysis. The registry follows the compiler-sdk pass registry pattern: register a function, lookup by rule ID, iterate all rules. G-CLASS assigns risk levels to tools based on capability analysis with four-level classification precedence (override > capability > heuristic > keywords). OBO detection patterns identify R5/TRANSACT tools ("send on behalf of", "act as user", credential forwarding). Risk level assignment determines fail-mode defaults: R1-R2 fail-open, R3-R4 configurable, R5 fail-closed.

## Deliverables

- [ ] `claws-sdk/src/governance/types.ts` — GovernanceRule interface, Violation type, RuleResult type, Severity enum (critical/high/medium/low)
- [ ] `claws-sdk/src/governance/rule-registry.ts` — register(), get(), all(), evaluate() functions. Extensible: new rules added by registering a function, not modifying core.
- [ ] `claws-sdk/src/governance/rules/g-class.ts` — 3 G-CLASS rules: risk scoring (R1-R5), capability mapping (READ/WRITE/COMMUNICATE/EXECUTE/TRANSACT), OBO detection patterns
- [ ] `claws-sdk/src/governance/rules/g-perm.ts` — G-PERM: capability-based permissions matrix, default permissive when unspecified, bidirectional fix suggestions
- [ ] `claws-sdk/tests/governance/rule-registry.unit.test.ts` — register, lookup, evaluate, extensibility (adding 30th rule requires only registration)
- [ ] `claws-sdk/tests/governance/rules/g-class.unit.test.ts` — R1-R5 classification for varied tools, OBO detection, override precedence, multi-capability max-risk, platform built-in defaults

## TDD Tests

### L0 Unit (10)

- Register a rule and retrieve it by ID -> `tests/governance/rule-registry.unit.test.ts`
- Evaluate all registered rules against a manifest -> `tests/governance/rule-registry.unit.test.ts`
- Add custom rule without modifying core registry -> `tests/governance/rule-registry.unit.test.ts`
- Classify read-only tool as R1 -> `tests/governance/rules/g-class.unit.test.ts`
- Classify "send email on behalf of user" as R5 with oboDetected:true -> `tests/governance/rules/g-class.unit.test.ts`
- Multi-capability tool classified at highest risk level -> `tests/governance/rules/g-class.unit.test.ts`
- Override replaces derived score (audited as [OVERRIDE]) -> `tests/governance/rules/g-class.unit.test.ts`
- Platform built-in tool uses default classification table -> `tests/governance/rules/g-class.unit.test.ts`
- G-PERM: default capability set is permissive when unspecified -> `tests/governance/rules/g-class.unit.test.ts`
- G-PERM: capability name normalization to uppercase closed enum -> `tests/governance/rules/g-class.unit.test.ts`

### L1 Integration (3)

- Full G-CLASS + G-PERM analysis on SOC2 fixture manifest -> `tests/governance/rules/g-class.integration.test.ts`
- 50+ tools classified within 200ms budget -> `tests/governance/rules/g-class.integration.test.ts`
- Rule registry cold-start within 200ms ANALYZE budget -> `tests/governance/rule-registry.integration.test.ts`

## Scenario Findings Addressed

- S01-F01, S01-F03: Four-level classification precedence (override > capability > heuristic > keywords)
- S01-F02: R1 audit failure behavior — fail-open audit with fallback log
- S01-F04: Override replaces (not caps) derived score, audited as [OVERRIDE]
- S01-F06: Platform built-in tool default classification tables
- S02-F01: Default capability set is permissive when unspecified
- S02-F02: Bidirectional fix suggestions for capability mismatch
- S02-F04: Multi-capability intersection semantics (all required, not any)
- S02-F06: Capability name normalization to uppercase closed enum
- CP-S06-F01: R1 vs R2 distinction requires data sensitivity context
- CP-S06-F02: OBO detection must consider context for ambiguous tools
- CP-S06-F03: 50+ tools within 200ms ANALYZE budget
- CP-S06-F05: Multi-capability max-risk rule

## Verification Gate

```bash
cd claws-sdk && npx vitest run tests/governance/rule-registry.unit.test.ts
cd claws-sdk && npx vitest run tests/governance/rules/g-class.unit.test.ts
cd claws-sdk && npx tsc --noEmit
npm run build
```

## Key Constraints

- Rule registry follows compiler-sdk pass registry pattern — function-per-rule, not switch
- Each violation must include: ruleId, severity, file, line, message, remediation
- G-CLASS classification precedence: override > capability > heuristic > keywords
- Performance: 50+ tools within 200ms ANALYZE budget
- R5 fail-closed is non-negotiable — cannot be overridden to fail-open

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/dragon.md` — security review, threat modeling, fail-closed enforcement
- `.craft/roles/claws/ciso.md` — governance policy, risk classification, compliance requirements
- `.craft/roles/claws/gateway-eng.md` — OC integration patterns, plugin conventions

## Review Amendments (R1)

### Architect: analyze.ts Orchestrator Shell
- [ ] Create `claws-sdk/src/compile/analyze.ts` as lightweight orchestrator shell in this pulse (not P15)
- [ ] analyze() accepts CapabilityManifest + RuleRegistry, returns GovAnalysis
- [ ] P14 and P15 add rules to the registry; P13 creates the orchestrator that runs them
- [ ] This ensures rule tests in P14/P15 can use the real orchestrator, not a mock
