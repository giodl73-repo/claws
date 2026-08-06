---
pulse: 14
slug: a2a-elicit-data-rules
plan: claws-rules
depends_on: [13]
governing_roles: [claws:ciso, craft:dragon]
scenario_codes: [S03-*, S07-*, CP-S03-*, CP-S07-*, CFC-S02-*, CFC-S03-*, CFC-S05-*, CFC-S07-*]
stage: implementation
test_tiers:
  L0_unit: 10
  L1_integration: 2
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run:
    - "cd claws-sdk && npx vitest run tests/governance/rules/g-a2a.unit.test.ts"
    - "cd claws-sdk && npx vitest run tests/governance/rules/g-elicit.unit.test.ts"
    - "cd claws-sdk && npx vitest run tests/governance/rules/g-data.unit.test.ts"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 3
checkpoint_gate: false
---

# Pulse 14: G-A2A + G-ELICIT + G-DATA Rules

## Objective

Implement the A2A trust boundary rules (5 rules), elicitation gate rules (4 rules), and data sensitivity labeling (1 rule). G-A2A enforces identity, trust, flow, escalation, and delegation boundaries for subagent communication. G-ELICIT attaches approval gates to R5/OBO tools with timeout deny-default, chain limits, and audit logging. G-DATA assigns sensitivity labels (PUBLIC/INTERNAL/CONFIDENTIAL/RESTRICTED) with high-water-mark enforcement. Each rule produces typed violations with severity, file:line, and remediation hints.

## Deliverables

- [ ] `claws-sdk/src/governance/rules/g-a2a.ts` — 5 A2A rules: G-A2A-IDENTITY, G-A2A-TRUST, G-A2A-FLOW, G-A2A-ESCALATE, G-A2A-DELEGATE. FE6 fence pass cross-reference. Data flow ceiling applies to SENT data only.
- [ ] `claws-sdk/src/governance/rules/g-elicit.ts` — 4 elicitation rules: OBO gate (R5 tools get elicitRequired:true), timeout deny-default, chain limit, audit. Pre-authorized vs ungoverned distinction.
- [ ] `claws-sdk/src/governance/rules/g-data.ts` — G-DATA: sensitivity labels with high-water-mark enforcement. Distinguish "no labels declared" from "labels declared as PUBLIC".
- [ ] `claws-sdk/tests/governance/rules/g-a2a.unit.test.ts` — 5 A2A rules individually, trust escalation as always-error, delegation cycle detection, phantom tool flagging
- [ ] `claws-sdk/tests/governance/rules/g-elicit.unit.test.ts` — OBO detection, timeout deny, chain limit, audit, schedule delegation tracing, conditional standing approval
- [ ] `claws-sdk/tests/governance/rules/g-data.unit.test.ts` — sensitivity labeling, high-water-mark, no-labels vs PUBLIC distinction
- [ ] `claws-sdk/tests/fixtures/multi-agent/` — workspace fixture with subagents for A2A rule testing

## TDD Tests

### L0 Unit (10)

- G-A2A-IDENTITY warns when L0 default insufficient for configured A2A -> `tests/governance/rules/g-a2a.unit.test.ts`
- G-A2A-TRUST detects subagent trust violations -> `tests/governance/rules/g-a2a.unit.test.ts`
- G-A2A-DELEGATE flags phantom tools via FE6 cross-reference -> `tests/governance/rules/g-a2a.unit.test.ts`
- G-A2A-FLOW enforces data flow ceiling on SENT data only -> `tests/governance/rules/g-a2a.unit.test.ts`
- G-A2A-ESCALATE severity always error even in advisory mode -> `tests/governance/rules/g-a2a.unit.test.ts`
- G-ELICIT attaches gate to every R5 tool with elicitRequired:true -> `tests/governance/rules/g-elicit.unit.test.ts`
- G-ELICIT timeout results in DENY -> `tests/governance/rules/g-elicit.unit.test.ts`
- G-ELICIT distinguishes pre-authorized from ungoverned -> `tests/governance/rules/g-elicit.unit.test.ts`
- G-DATA labels with high-water-mark enforcement -> `tests/governance/rules/g-data.unit.test.ts`
- G-DATA distinguishes "no labels" from "PUBLIC" -> `tests/governance/rules/g-data.unit.test.ts`

### L1 Integration (2)

- Full A2A + ELICIT analysis on multi-agent fixture -> `tests/governance/rules/g-a2a.integration.test.ts`
- Cross-rule interaction: A2A delegation + ELICIT chain tracing -> `tests/governance/rules/g-a2a.integration.test.ts`

## Scenario Findings Addressed

- CP-S03-F01: G-A2A-IDENTITY warn when L0 default insufficient
- CP-S03-F02: G-ELICIT warn when R5/OBO tools exist without USER.md authority
- CP-S03-F03: G-DATA distinguish "no labels" from "PUBLIC"
- CP-S07-F02: G-A2A-DELEGATE FE6 cross-reference against TOOLS.md, flag phantom tools
- CP-S07-F03: G-A2A-FLOW ceiling applies to SENT data, not externally retrieved
- CFC-S02-F03: TRUST-ESCALATION: least-privilege resolution
- CFC-S02-F07: TRUST-ESCALATION severity always error, even in advisory
- CFC-S02-F04: FE6 fence pass must access full CapabilityManifest
- CFC-S03-F01: OBO-WITHOUT-ELICIT severity elevated to error (P-055)
- CFC-S03-F03: G-ELICIT pre-authorized vs ungoverned distinction
- CFC-S05-F02: CIRCULAR-DELEGATION human review escalation
- CFC-S05-F03: G-BOUND delegation cycle detection complements recursion limits
- CFC-S07-F01: SCHEDULE-NO-APPROVAL deterministic failure is always error
- CFC-S07-F02: Conditional standing approval for scheduled R5
- CFC-S07-F07: G-ELICIT-CHAIN schedule delegation traces to subagent R5 tool

## Verification Gate

```bash
cd claws-sdk && npx vitest run tests/governance/rules/g-a2a.unit.test.ts
cd claws-sdk && npx vitest run tests/governance/rules/g-elicit.unit.test.ts
cd claws-sdk && npx vitest run tests/governance/rules/g-data.unit.test.ts
cd claws-sdk && npx tsc --noEmit
npm run build
```

## Key Constraints

- G-A2A-ESCALATE severity is always error — cannot be downgraded even in advisory mode
- G-ELICIT timeout deny-default is non-negotiable for R5 tools
- G-A2A-FLOW ceiling applies to SENT data only, not externally retrieved data
- G-DATA "no labels declared" defaults to PUBLIC (least privilege) when AGENTS.md omits ceiling
- FE6 fence pass requires access to full CapabilityManifest for cross-checking
- Delegation cycle detection via G-BOUND complements recursion limits

## Governing Roles

Load these role files before starting:

- `.craft/roles/claws/ciso.md` — governance policy, risk classification, A2A trust boundaries
- `.craft/roles/craft/dragon.md` — security review, threat modeling, fail-closed enforcement
