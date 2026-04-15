---
pulse: 11
slug: init-templates
plan: claws-init-uninstall
depends_on: [10]
governing_roles: [claws:compliance, claws:skill-author]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 4
  L1_integration: 4
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run:
    - "cd claws-sdk && npx vitest run"
    - "cd claws-cli && npx vitest run"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
    - "cd claws-cli && npx tsc --noEmit"
checkpoint: 2
checkpoint_gate: false
---

# Pulse 11: Init Templates

## Objective

Add governance template support to `claws init` so that workspaces can be initialized with pre-configured compliance profiles. Each template defines a set of policies appropriate for a specific regulatory or organizational framework, producing both claws.json modifications and .claws/policies/{name}.yaml files.

Four templates ship out of the box: minimal (bare governance with trust tier only), soc2 (section requirements, tool blocklists, trust tier gates, PII detection, budget ceilings), hipaa (mandatory data labeling, PHI detection, mandatory audit, access control), and eu-ai-act (mandatory risk classification, human oversight gates, transparency requirements). The CLI surface is `claws init --template soc2`.

## Deliverables

- [ ] `claws-sdk/src/init/templates/index.ts` — template registry and selection logic
- [ ] `claws-sdk/src/init/templates/minimal.ts` — bare governance: trust tier + 0 policies
- [ ] `claws-sdk/src/init/templates/soc2.ts` — require_section, tool_blocklist, trust_tier_gate, pii_detection, budget_ceiling policies
- [ ] `claws-sdk/src/init/templates/hipaa.ts` — data_labeling_mandatory, phi_detection, audit_mandatory, access_control policies
- [ ] `claws-sdk/src/init/templates/eu-ai-act.ts` — risk_classification_mandatory, human_oversight_gates, transparency policies
- [ ] `claws-cli/src/commands/init.ts` — updated to accept --template flag and pass to SDK orchestrator
- [ ] `claws-sdk/tests/init/templates.unit.test.ts` — L0: 4 unit tests
- [ ] `claws-sdk/tests/init/templates.integration.test.ts` — L1: 4 integration tests

## Acceptance Criteria

- [ ] Each template produces syntactically valid YAML policy files in .claws/policies/
- [ ] `claws init --template soc2` creates claws.json with soc2-specific config and at least 5 policy files
- [ ] `claws init --template hipaa` creates HIPAA-specific policies with mandatory data labeling and PHI detection
- [ ] `claws init --template eu-ai-act` creates EU AI Act-specific policies with risk classification and oversight gates
- [ ] `claws init --template minimal` creates claws.json with trust tier only, no policy files
- [ ] Unknown template name produces a clear error with list of available templates
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:
- `.craft/roles/claws/compliance.md` — regulatory frameworks, policy structure, compliance mapping
- `.craft/roles/claws/skill-author.md` — template authoring patterns, policy YAML schema

## Dependencies

- Pulse 10: init orchestrator must exist to accept template parameter

## Test Gates

- [ ] L0 unit: 4 tests — each template (minimal, soc2, hipaa, eu-ai-act) produces valid policy YAML
- [ ] L1 integration: 4 tests — init --template on empty workspace produces correct file set for each template
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
