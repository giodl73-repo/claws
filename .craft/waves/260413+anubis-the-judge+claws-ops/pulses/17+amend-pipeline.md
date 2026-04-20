---
pulse: 17
slug: amend-pipeline
plan: claws-three-rings
depends_on: [15]
governing_roles: [craft:architect, claws:skill-author]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 4
  L1_integration: 2
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

# Pulse 17: Amend Pipeline

## Objective

Build the amendment pipeline that allows governed modifications to workspace governance state. Amendments are structured changes (add-skill, remove-tool, update-policy, etc.) that go through a validate → preview → apply → re-compile pipeline. This ensures that every workspace modification is checked against GovernanceIR constraints before being applied, and that the compiled artifacts stay in sync. **Lossless OC fidelity: apply.ts writes ONLY to `.claws/` files and `claws.json`, NEVER modifies OC workspace files (SOUL.md, TOOLS.md, AGENTS.md, IDENTITY.md, USER.md, MEMORY.md, HEARTBEAT.md, skills/*/SKILL.md, lobster.yaml).**

The validate step checks the proposed amendment against current GovernanceIR constraints (e.g., can't add an R5 tool if trust tier is T2). The preview step generates a before/after diff showing the governance impact. The apply step writes amendment state to `.claws/` sidecar files and `claws.json` only, then triggers recompilation. The re-compile step verifies the workspace is still valid after the amendment.

## Deliverables

- [ ] `claws-sdk/src/amend/index.ts` — public API barrel export for amend module
- [ ] `claws-sdk/src/amend/amend.ts` — amendment pipeline orchestrator: validate → preview → apply → re-compile
- [ ] `claws-sdk/src/amend/validate.ts` — validate proposed amendment against GovernanceIR constraints, reject if violations
- [ ] `claws-sdk/src/amend/preview.ts` — generate diff preview showing before/after governance impact of amendment
- [ ] `claws-sdk/src/amend/apply.ts` — apply amendment to `.claws/` files and `claws.json` ONLY (never modify OC workspace files), trigger re-compile, verify post-state
- [ ] `claws-cli/src/commands/amend.ts` — `claws amend add-skill`, `claws amend remove-tool`, etc. (thin CLI adapter)
- [ ] `claws-sdk/tests/amend/amend-pipeline.unit.test.ts` — L0: 4 unit tests
- [ ] `claws-sdk/tests/amend/amend-pipeline.integration.test.ts` — L1: 2 integration tests

## Acceptance Criteria

- [ ] Validate rejects amendment that would violate GovernanceIR constraints (e.g., R5 tool at T2 trust)
- [ ] Validate accepts amendment that is consistent with GovernanceIR constraints
- [ ] Preview generates correct before/after diff showing governance impact
- [ ] Apply modifies workspace files and triggers recompilation
- [ ] Re-compile succeeds after valid amendment
- [ ] Pipeline aborts at validate step if amendment is invalid (no files modified)
- [ ] CLI adapter supports add-skill, remove-tool, and update-policy amendment types
- [ ] No OC file is modified by any amend operation (SOUL.md, TOOLS.md, etc. are byte-identical before and after)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/architect.md` — SDK-owns-logic rule, pipeline architecture
- `.craft/roles/claws/skill-author.md` — amendment types, skill/tool modification patterns

## Dependencies

- Pulse 15: doctor checks (amend pipeline uses similar validation infrastructure)

## Test Gates

- [ ] L0 unit: 4 tests — validate rejects invalid amendment, preview shows correct diff, apply modifies file correctly, re-compile succeeds after valid amendment
- [ ] L1 integration: 2 tests — amend add-tool on reference workspace → re-compile → new tool present in GovernanceIR, amend remove-tool → re-compile → tool absent from GovernanceIR
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
