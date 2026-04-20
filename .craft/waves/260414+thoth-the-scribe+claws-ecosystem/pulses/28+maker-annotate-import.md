---
pulse: 28
slug: maker-annotate-import
plan: claws-maker-commands
depends_on: [27]
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: [skill-lifecycle/S02]
stage: implementation
test_tiers:
  L0_unit: 6
  L1_integration: 5
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

# Pulse 28: Maker Annotate + Import

## Objective
Implement the governance annotation engine (`annotate`) and legacy skill migration command (`import`). These two commands work together to bring existing, ungoverned skills under claws governance.

**Annotate Command**: Reads an existing skill's `SKILL.md` and `handler.ts`, analyzes the skill's capabilities (tool usage patterns, OBO indicators, data labels), and suggests governance frontmatter additions. The analysis is collect-all-errors — it reports all suggestions at once rather than failing on the first issue.

Capability analysis includes:
- **OBO pattern detection** — identifies capabilities like `send-email`, `post-message`, `submit-form` that indicate the skill acts on behalf of users
- **Risk inference** — determines risk level (R1-R5) from tool usage patterns (browser control = R4, file read = R2, etc.)
- **Data label suggestion** — infers data sensitivity labels from tool capabilities and content patterns
- **Frontmatter-to-decorator propagation** — ensures governance frontmatter in SKILL.md is reflected as decorators in handler.ts (S02-F02)

**Import Command**: Migrates a legacy OC (Original Content) skill by adding a `.claws/` governance directory alongside the original files. Per the lossless architecture principle, the import command NEVER modifies original files — it is strictly add-only. The `.claws/` directory contains governance annotations, manifest stubs, and compilation metadata.

**Integration Coverage Hardening** (THOTH-INTEGRATION-COVERAGE): annotate area at 61% is well below the 90% target. This pulse adds 3 additional L1 integration tests covering multi-skill workspace annotation, cross-capability OBO detection, and import-to-annotate governance verification to close the gap to 90%+.

**Scenario-driven requirements**:
- Prompt-only skills have tier ceiling (S02-F01) — skills without handler code are capped at DECLARED tier
- Frontmatter-to-decorator propagation (S02-F02) — annotations in SKILL.md frontmatter generate corresponding decorators
- Tier detection from workspace state (S02-F05) — import infers appropriate tier from existing workspace governance level

## Deliverables
- [ ] `claws-sdk/src/maker/annotate.ts` — capability analysis: OBO pattern detection, risk inference, data label suggestion, collect-all-errors reporting
- [ ] `claws-sdk/src/maker/import.ts` — legacy migration: .claws/ directory scaffolding, annotation injection, original files untouched (add-only)
- [ ] `claws-sdk/tests/maker/annotate.unit.test.ts` — L0: OBO detection from send-email capability (1), risk inference from tool patterns (1), data label suggestion (1), collect-all-errors for frontmatter (1)
- [ ] `claws-sdk/tests/maker/import.unit.test.ts` — L0: .claws/ structure created (1), original files untouched (1)
- [ ] `claws-sdk/tests/maker/annotate.integration.test.ts` — L1: annotate on fixture skill suggests correct frontmatter (1), annotate → accuracy report → apply suggestions on multi-skill workspace (1), annotate detects OBO patterns across 3 capability types (email, social, transact) (1)
- [ ] `claws-sdk/tests/maker/import.integration.test.ts` — L1: import legacy skill creates complete governance structure (1), import legacy skill → annotate → verify governance structure complete (1)
- [ ] `claws-sdk/tests/maker/annotate-import.e2e.test.ts` — L2: annotate + import on ungoverned fixture skill (1)
- [ ] `claws-sdk/tests/maker/annotate-import.accept.test.ts` — L3: SDK acceptance — consumer annotates an ungoverned skill, verifies OBO detection, risk inference, and data labels; imports legacy skill and verifies .claws/ structure without original file modification
- [ ] `claws-cli/tests/maker/annotate-import.accept.test.ts` — L3: CLI acceptance — `claws maker annotate` and `claws maker import` on ungoverned fixture produce correct governance output with collect-all-errors reporting
- [ ] `claws-sdk/tests/fixtures/ungoverned-skill/` — existing skill without governance metadata (SKILL.md + handler.ts, no .claws/)

## Acceptance Criteria
- [ ] Annotate detects OBO patterns from tool capabilities (send-email, post-message, etc.)
- [ ] Annotate infers correct risk level from tool usage patterns
- [ ] Annotate suggests appropriate data labels
- [ ] Annotate uses collect-all-errors — reports all suggestions, not fail-fast
- [ ] Frontmatter additions propagate to decorator suggestions
- [ ] Import creates .claws/ directory structure without modifying original files
- [ ] Import produces add-only changes (lossless architecture)
- [ ] Prompt-only skills are capped at DECLARED tier
- [ ] All 6 L0 unit tests pass
- [ ] All 5 L1 integration tests pass
- [ ] All 1 L2 e2e tests pass
- [ ] All 2 L3 accept tests pass (SDK + CLI)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles
Load these role files before starting:
- `.craft/roles/craft/architect.md` — overall claws architecture and SDK boundaries
- `.craft/roles/claws/platform-eng.md` — implementation patterns, cross-platform concerns

## Dependencies
- Pulse 27 (maker-scaffold) — types, templates, and barrel exports used by annotate and import

## Test Gates
- [ ] L0 unit (6 tests): OBO detection from send-email capability, risk inference from tool patterns, data label suggestion, collect-all-errors for frontmatter, .claws/ structure created, original files untouched
- [ ] L1 integration (5 tests): annotate on fixture skill suggests correct frontmatter, annotate → accuracy report → apply suggestions on multi-skill workspace, annotate detects OBO patterns across 3 capability types (email, social, transact), import legacy skill creates complete governance structure, import legacy skill → annotate → verify governance structure complete
- [ ] L2 e2e (1 test): annotate + import on ungoverned fixture skill
- [ ] L3 accept (2 tests): SDK — annotate OBO/risk/labels + import lossless; CLI — `claws maker annotate` + `claws maker import` with collect-all-errors
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
