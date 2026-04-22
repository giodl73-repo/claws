---
pulse: 32
slug: scaffold-tiers
plan: claws-scaffold
depends_on: [29, 31]
governing_roles: [claws:skill-author, claws:compliance]
scenario_codes: [a2a-governance/S05, obo-elicitation/S08, emit-artifacts/S04]
stage: implementation
test_tiers:
  L0_unit: 4
  L1_integration: 2
  L2_e2e: 1
  L3_accept: 1
test_scope:
  run:
    - "cd claws-sdk && npx vitest run"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 4
checkpoint_gate: false
---

# Pulse 32: Scaffold Tiers

## Objective

Extend the scaffold system with full tier awareness and OBO auto-suggestion. Each tier produces progressively richer output: DECLARED emits a 3-line YAML frontmatter, TYPED adds @bic/claws-skill-kit decorators and a handler template, and VERIFIED adds a governance test template (GovernanceValidator + SecurityScanner) and supply chain stub.

OBO auto-suggestion reuses the annotate heuristics from Pulse 31 to detect skill names that imply on-behalf-of operations (e.g., "send", "email", "purchase", "schedule") and injects commented OBO hints into the generated skill. A .gitignore with .claws/ entry is also generated.

## Deliverables

- [ ] Extend `claws-sdk/src/scaffold/templates/` — DECLARED tier: 3-line YAML frontmatter only (name, risk, description)
- [ ] Extend `claws-sdk/src/scaffold/templates/` — TYPED tier: full @bic/claws-skill-kit decorators + frontmatter + handler template
- [ ] Extend `claws-sdk/src/scaffold/templates/` — VERIFIED tier: TYPED + test template (GovernanceValidator + SecurityScanner) + supply chain stub
- [ ] Extend `claws-sdk/src/scaffold/scaffold.ts` — OBO auto-suggestion: skill names with "send"/"email"/"purchase"/"schedule" get commented OBO hints (reuses annotate heuristics)
- [ ] Extend `claws-sdk/src/scaffold/scaffold.ts` — .gitignore generation with .claws/ entry

**Note:** Verify directory paths (e.g., `claws-sdk/src/scaffold/`) match authoritative plan before implementation.

## Acceptance Criteria

- [ ] DECLARED tier produces exactly 3-line YAML frontmatter (name, risk, description)
- [ ] TYPED tier produces decorators, frontmatter, and handler template
- [ ] VERIFIED tier includes GovernanceValidator test template and supply chain stub
- [ ] Skill named "send-invoice" triggers OBO hint comment in generated output
- [ ] Skill named "search-docs" does not trigger OBO hint
- [ ] .gitignore is generated with .claws/ entry
- [ ] Generated VERIFIED skill's test template is syntactically valid TypeScript

## Test Gates

- L0 (4 tests): DECLARED tier produces correct 3-line output, TYPED tier includes decorators and handler, VERIFIED tier includes test template and supply chain stub, OBO suggestion triggers on "send-invoice" keyword
- L1 (2 tests): scaffold VERIFIED tier then run generated tests (they compile and pass), scaffold with OBO keyword and verify hint present in output
- L2 (1 test): Scaffold all 3 tiers end-to-end → verify DECLARED produces 3-line YAML → verify TYPED includes decorators + handler → verify VERIFIED includes test template + supply chain stub → verify VERIFIED test template compiles with tsc → verify .gitignore generated
- L3 (1 test): Tier scaffold acceptance: scaffold "send-invoice" skill at VERIFIED tier on T2 workspace → verify OBO hint injected → verify risk capped at R3 → verify GovernanceValidator test template present → verify generated test passes → verify .gitignore → verify `claws check` passes on all output
