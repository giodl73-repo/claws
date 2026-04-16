---
pulse: 46
slug: tui-general-preferences
plan: claws-tui
depends_on: [45]
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: [S02]
stage: implementation
test_tiers:
  L0_unit: 4
  L1_integration: 2
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run:
    - "cd claws-cli && npx vitest run --project unit --coverage"
    - "cd claws-cli && npx vitest run --project integration --coverage"
  typecheck:
    - "cd claws-cli && npx tsc --noEmit"
checkpoint: 9
checkpoint_gate: false
---

# Pulse 46: General + Preferences Screens

## Objective

Implement the General and Preferences screens for the Settings experience. General renders identity chunks (name, description, language) as editable fields, plus manager display showing cross-file source. Preferences renders instructions as a multiline prompt editor, schedule display, and reviewer list.

Both screens consume `GET /api/chunks/general/identity` and `GET /api/chunks/preferences/instructions` + `/schedule` respectively. Chunk data is rendered via `<ChunkPanel>` -- a generic component that auto-layouts from `data`, `editable`, and `governance` fields. Editable fields use `ink-text-input` for single-line and a custom multiline editor for the prompt.

Validates scenario S02 (Preferences editing flow).

## Deliverables

- [ ] `claws-cli/src/tui/screens/general.tsx` — General screen: name, description, language as editable `<ChunkPanel>` fields, manager as read-only with cross-file source indicator
- [ ] `claws-cli/src/tui/screens/preferences.tsx` — Preferences screen: multiline prompt editor for instructions, schedule display with timezone, reviewer list
- [ ] `claws-cli/src/tui/components/chunk-panel.tsx` — Generic `<ChunkPanel>` component: auto-layout from chunk response shape, renders `data` fields, marks `editable` fields with edit affordance, shows `governance` context (warnings, locks)
- [ ] `claws-cli/src/tui/components/editable-field.tsx` — Single-line and multiline editable field components wrapping `ink-text-input`, with edit/view mode toggle (Enter to edit, Escape to cancel, Enter to save)
- [ ] `claws-cli/tests/tui/screens/general.unit.test.ts` — L0: General screen renders name and description (1), manager field shows cross-file source (1)
- [ ] `claws-cli/tests/tui/screens/preferences.unit.test.ts` — L0: Preferences screen renders prompt editor (1), schedule displays with timezone (1)
- [ ] `claws-cli/tests/tui/screens/general-preferences.integration.test.ts` — L1: General screen fetches chunks from serve and renders (1), Preferences prompt edit round-trips via PATCH (1)

## Acceptance Criteria

- [ ] General screen renders name, description, language from chunk API
- [ ] Manager field displays with cross-file source attribution
- [ ] Preferences screen renders multiline prompt editor
- [ ] Schedule display includes timezone information
- [ ] `<ChunkPanel>` auto-layouts from arbitrary chunk response shapes
- [ ] Editable fields support edit mode toggle (Enter/Escape)
- [ ] Scenario S02 acceptance: preferences editing flow works end-to-end
- [ ] All 4 L0 unit tests pass
- [ ] All 2 L1 integration tests pass

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/architect.md` — component composition patterns, reusable UI conventions
- `.craft/roles/claws/platform-eng.md` — chunk rendering, API consumption patterns

## Dependencies

- Pulse 45 (TUI scaffold) — app shell, client, navigation

## Test Gates

- [ ] L0 unit (4 tests): General renders name and description, manager shows cross-file source, Preferences renders prompt editor, schedule displays with timezone
- [ ] L1 integration (2 tests): General fetches chunks from serve and renders, Preferences prompt edit round-trips via PATCH
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
