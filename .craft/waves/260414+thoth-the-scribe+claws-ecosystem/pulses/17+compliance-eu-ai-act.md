---
pulse: 17
slug: compliance-eu-ai-act
plan: claws-comply-audit
depends_on: [15]
governing_roles: [claws:founder, claws:ciso]
scenario_codes: [compliance-evidence/S06]
stage: implementation
test_tiers:
  L0_unit: 3
  L1_integration: 1
  L2_e2e: 1
  L3_accept: 2
test_scope:
  run:
    - "cd claws-sdk && npx vitest run"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 2
checkpoint_gate: false
---

# Pulse 17: Compliance EU AI Act

## Objective

EU AI Act assessment engine. Article 6/Annex III classification (minimal/limited/high/unacceptable). System-level classification separate from per-tool R1-R5. Article 13 transparency status, Article 14 human oversight evaluation. Classification from explicit config, not automated inference. Fundamental rights impact assessment section.

The EU AI Act assessment differs fundamentally from SOC2 and HIPAA: it classifies the AI system itself rather than evaluating control compliance. Article 6 combined with Annex III determines the risk tier — minimal (no obligations), limited (transparency), high (full conformity), or unacceptable (prohibited). The classification comes from explicit configuration in claws.json, not from automated inference — the deployer declares their system's domain and use case, and the assessor validates completeness against the Annex III category list.

Article 13 transparency evaluation checks whether the system provides adequate documentation, explainability, and user notification. Article 14 human oversight evaluation checks whether appropriate human-in-the-loop controls exist for the declared risk tier. Domain markers in governance rules (e.g., healthcare, law enforcement, critical infrastructure) trigger high-risk classification with category-specific obligation checklists. The fundamental rights impact assessment section evaluates potential impacts on rights listed in the EU Charter.

## Deliverables

- [ ] `claws-sdk/src/compliance/eu-ai-act.ts` — Article 6 classifier + Article 13/14 evaluator, Annex III categorization, fundamental rights impact, domain marker analysis
- [ ] `claws-sdk/tests/compliance/eu-ai-act.unit.test.ts` — L0: Article 6 classification from config (1), Article 14 human oversight assessment (1), domain marker → high risk (1)
- [ ] `claws-sdk/tests/compliance/assess.integration.test.ts` — L1: EU AI Act assessment on healthcare fixture workspace
- [ ] `claws-sdk/tests/compliance/assess.e2e.test.ts` — L2: full assess on fixture workspace with domain markers
- [ ] `claws-sdk/tests/compliance/assess.accept.test.ts` — L3: SDK acceptance — EU AI Act assessment API classifies risk tiers and evaluates Article 13/14 from consumer perspective
- [ ] `claws-cli/tests/compliance/assess.accept.test.ts` — L3: CLI acceptance — `claws comply eu-ai-act` command produces correct assessment output with risk classification

## Acceptance Criteria

- [ ] Article 6/Annex III classification produces one of: minimal, limited, high, unacceptable
- [ ] Classification sourced from explicit claws.json config, not automated inference
- [ ] Domain markers in governance rules (healthcare, law enforcement, etc.) trigger high-risk
- [ ] Article 13 transparency evaluation checks documentation, explainability, user notification
- [ ] Article 14 human oversight evaluation checks HITL controls appropriate for risk tier
- [ ] Fundamental rights impact assessment section populated for high-risk systems
- [ ] Unacceptable-risk classification blocks evidence generation with clear explanation
- [ ] EUAIActAssessment JSON includes risk tier, article evaluations, and obligation checklist
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:

- `.craft/roles/claws/founder.md` — product vision for EU AI Act compliance, classification scope
- `.craft/roles/claws/ciso.md` — EU AI Act requirements, Annex III categories, Article 13/14 evaluation criteria

## Dependencies

- Pulse 15 (compliance-soc2) — provides shared compliance types and barrel exports

## Test Gates

- [ ] L0 unit (3 tests): Article 6 classification from config (1), Article 14 human oversight assessment (1), domain marker → high risk (1)
- [ ] L1 integration (1 test): EU AI Act assessment on healthcare fixture workspace (1)
- [ ] L2 e2e (1 test): full assess on fixture workspace with domain markers (1)
- [ ] L3 accept (2 tests): SDK acceptance — EU AI Act assessment API risk classification and Article 13/14 evaluation (1), CLI acceptance — `claws comply eu-ai-act` command end-to-end (1)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
