---
pulse: 27
slug: maker-scaffold
plan: claws-maker-commands
depends_on: []
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: [skill-lifecycle/S01, skill-lifecycle/S04]
stage: implementation
test_tiers:
  L0_unit: 5
  L1_integration: 4
  L2_e2e: 1
  L3_accept: 2
test_scope:
  run:
    - "cd claws-sdk && npx vitest run"
    - "cd claws-cli && npx vitest run"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
    - "cd claws-cli && npx tsc --noEmit"
checkpoint: 3
checkpoint_gate: false
---

# Pulse 27: Maker Scaffold

## Objective

Implement the skill scaffolding engine with a template registry. The scaffold command generates a complete, compilable skill project from a template selection. Five templates are provided:

1. **communication** (R3-R5, OBO email/message) — skills that send emails, messages, or notifications on behalf of users. Includes OBO governance frontmatter by default.
2. **data-processing** (R2-R3, no OBO) — skills that transform, aggregate, or analyze data without acting on behalf of users. No OBO governance required.
3. **browser-automation** (R4, OBO social) — skills that control browser sessions for social media, form submission, or web interaction. High-risk with OBO for social actions.
4. **developer-tools** (R2-R4, no OBO) — skills for IDE integration, code generation, CI/CD interaction. Variable risk without OBO delegation.
5. **custom base** (R1, minimal) — minimal template for custom skill types. Lowest risk, minimal governance surface.

Each scaffold produces:

- `SKILL.md` with governance frontmatter (risk level, OBO status, data labels, trust tier)
- `handler.ts` with governance decorators
- `package.json` with claws dependencies
- `vitest.config.ts` for test configuration
- `.claws-manifest` stub for future compilation
- `.gitignore` including `.claws/` directory

**Scenario-driven requirements** (from skill-lifecycle scenarios):

- Trust tier derivation from workspace context (S01-F01)
- Scaffold default governance tier is TYPED (S01-F03)
- Version alignment with workspace claws version (S01-F04)
- `.gitignore` includes `.claws/` directory (S01-F05)
- OBO auto-suggestion from skill name heuristics (S01-F08)
- Pinch-clean output — scaffolded output passes pinch validation (S01-F10)
- Closest-value suggestion for enum validation errors (S04-F01)

**Performance target**: Scaffold completes in < 2 seconds.

**Integration Coverage Hardening** (THOTH-INTEGRATION-COVERAGE): scaffold area at 79% is below the 90% target. This pulse adds 2 additional L1 integration tests covering full scaffold-to-compile-to-pinch round-trips for R1 and R5 tier skills to close the gap to 90%+.

## Deliverables

- [ ] `claws-sdk/src/maker/scaffold.ts` — template selection + file generation engine, < 2s performance target
- [ ] `claws-sdk/src/maker/templates/communication.ts` — email/message skill template (R3-R5, OBO)
- [ ] `claws-sdk/src/maker/templates/data-processing.ts` — data transformation template (R2-R3, no OBO)
- [ ] `claws-sdk/src/maker/templates/browser-automation.ts` — browser control template (R4, OBO social)
- [ ] `claws-sdk/src/maker/templates/developer-tools.ts` — dev tooling template (R2-R4, no OBO)
- [ ] `claws-sdk/src/maker/templates/base.ts` — custom base template (R1, minimal)
- [ ] `claws-sdk/src/maker/types.ts` — SkillTemplate, AnnotationSuggestion, PublishPayload, ManifestEntry types
- [ ] `claws-sdk/src/maker/index.ts` — barrel exports for all maker modules
- [ ] `claws-sdk/tests/maker/scaffold.unit.test.ts` — L0: template selection (1), SKILL.md frontmatter generated (1), handler.ts has decorators (1), .gitignore includes .claws/ (1), OBO auto-suggestion from name (1)
- [ ] `claws-sdk/tests/maker/scaffold.integration.test.ts` — L1: full scaffold + tsc --noEmit on generated output (1), scaffold completes in < 2s (1), full scaffold → compile → pinch round-trip for R1 tier skill (1), full scaffold → compile → pinch round-trip for R5 tier skill (1)
- [ ] `claws-sdk/tests/maker/scaffold.e2e.test.ts` — L2: scaffold communication template, verify all files present, pinch-clean (1)
- [ ] `claws-sdk/tests/maker/scaffold.accept.test.ts` — L3: SDK acceptance — consumer scaffolds all 5 templates, verifies each produces compilable project with correct governance frontmatter and decorators
- [ ] `claws-cli/tests/maker/scaffold.accept.test.ts` — L3: CLI acceptance — `claws maker scaffold` with each template flag produces complete project directory with pinch-clean output

## Acceptance Criteria

- [ ] All 5 templates produce valid, compilable skill projects
- [ ] SKILL.md includes correct governance frontmatter for each template
- [ ] handler.ts includes governance decorators appropriate to template risk level
- [ ] .gitignore includes .claws/ directory
- [ ] OBO is auto-suggested for communication and browser-automation templates
- [ ] Scaffold default tier is TYPED
- [ ] Scaffold completes in < 2 seconds
- [ ] Scaffolded output passes pinch validation (pinch-clean)
- [ ] All 5 L0 unit tests pass
- [ ] All 4 L1 integration tests pass
- [ ] All 1 L2 e2e tests pass
- [ ] All 2 L3 accept tests pass (SDK + CLI)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:

- `.craft/roles/craft/architect.md` — overall claws architecture and SDK boundaries
- `.craft/roles/claws/platform-eng.md` — implementation patterns, cross-platform concerns

## Dependencies

None — this is the foundational maker command that other maker pulses build on.

## Test Gates

- [ ] L0 unit (5 tests): template selection, SKILL.md frontmatter generated, handler.ts has decorators, .gitignore includes .claws/, OBO auto-suggestion from name
- [ ] L1 integration (4 tests): full scaffold + tsc --noEmit on generated output, scaffold completes in < 2s, full scaffold → compile → pinch round-trip for R1 tier skill, full scaffold → compile → pinch round-trip for R5 tier skill
- [ ] L2 e2e (1 test): scaffold communication template, verify all files present, pinch-clean
- [ ] L3 accept (2 tests): SDK — scaffold all 5 templates with governance verification; CLI — `claws maker scaffold` produces pinch-clean projects
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
