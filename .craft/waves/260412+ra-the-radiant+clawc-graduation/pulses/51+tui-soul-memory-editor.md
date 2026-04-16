---
pulse: 51
slug: tui-soul-memory-editor
plan: claws-tui
depends_on: [45, 49]
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: [S09, S10]
stage: implementation
heavy: true
test_tiers:
  L0_unit: 6
  L1_integration: 3
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

# Pulse 51: Soul Editor + Memory Browser (HEAVY)

## Objective

Implement the Lobster experience's Soul Editor and Memory Browser screens. These are the most complex editing surfaces in the TUI -- they involve section-based editing of SOUL.md and MEMORY.md with live governance feedback.

Soul Editor renders `GET /api/loop/soul` as editable sections. Key rendering rules:
- User-authored deny rules: highlighted with yellow background, editable
- Compiler-injected rules: dimmed/locked, not editable, shows "(compiler-injected)" label
- Editing a section triggers `PATCH /api/loop/soul` with inline governance result
- Removing a deny rule shows governance warning: "2 deny rules removed. R5 deny rules preserved (immutable)."
- R5 deny rules cannot be removed -- they render as locked with "(R5 -- immutable)" label

Memory Browser renders `GET /api/loop/memory` as editable sections: "Things I've Learned", "People Who Matter", "Preferences". Each section is editable with data label indicators showing sensitivity level. Editing triggers `PATCH /api/loop/memory` with governance result.

Both screens depend on the PATCH handler from Pulse 49 for write-time validation.

Validates scenarios S09 (Soul editing flow) and S10 (Memory editing flow).

## Deliverables

- [ ] `claws-cli/src/tui/screens/soul-editor.tsx` — Soul Editor: section list from `/api/loop/soul`, section editing with multiline editor, deny rule highlighting (yellow background), compiler-injected rules dimmed/locked, governance warnings inline after PATCH
- [ ] `claws-cli/src/tui/screens/memory-browser.tsx` — Memory Browser: section list from `/api/loop/memory`, section editing, data label indicators per section, governance result after PATCH
- [ ] `claws-cli/src/tui/components/deny-rule.tsx` — `<DenyRule>` component: user-authored (yellow, editable), compiler-injected (dimmed, locked with label), R5 (locked with "(R5 -- immutable)" label)
- [ ] `claws-cli/src/tui/components/section-editor.tsx` — `<SectionEditor>` component: multiline section editing with Enter to edit, Escape to cancel, Ctrl+S to save, section boundary detection
- [ ] `claws-cli/tests/tui/screens/soul-editor.unit.test.ts` — L0: Soul Editor renders sections from API (1), deny rules highlight yellow (1), compiler-injected rules render dimmed and locked (1), R5 deny rule shows immutable label (1)
- [ ] `claws-cli/tests/tui/screens/memory-browser.unit.test.ts` — L0: Memory Browser renders sections with data labels (1), section edit triggers PATCH (1)
- [ ] `claws-cli/tests/tui/screens/soul-editor.integration.test.ts` — L1: Soul Editor fetches sections from serve (1), deny rule removal triggers governance warning (1), compiler-injected rule rejects edit attempt (1)

## Acceptance Criteria

- [ ] Soul Editor renders SOUL.md sections from `/api/loop/soul`
- [ ] User-authored deny rules render with yellow highlight and are editable
- [ ] Compiler-injected rules render dimmed/locked with "(compiler-injected)" label
- [ ] R5 deny rules render locked with "(R5 -- immutable)" label
- [ ] Editing a section sends PATCH and shows governance result inline
- [ ] Removing deny rules shows governance warning with count
- [ ] Memory Browser renders MEMORY.md sections with data label indicators
- [ ] Memory section edits send PATCH with governance result
- [ ] Scenario S09 acceptance: soul editing flow works end-to-end
- [ ] Scenario S10 acceptance: memory editing flow works end-to-end
- [ ] All 6 L0 unit tests pass
- [ ] All 3 L1 integration tests pass

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/architect.md` — section editing patterns, multiline editor UX
- `.craft/roles/claws/platform-eng.md` — deny rule rendering, governance feedback, compiler-injected rule handling

## Dependencies

- Pulse 45 (TUI scaffold) — app shell, client, navigation
- Pulse 49 (PATCH integration) — PATCH handler, error rendering, governance banners

## Test Gates

- [ ] L0 unit (6 tests): Soul renders sections, deny rules highlight yellow, compiler-injected dimmed/locked, R5 immutable label, Memory renders sections with data labels, section edit triggers PATCH
- [ ] L1 integration (3 tests): Soul fetches sections from serve, deny rule removal triggers governance warning, compiler-injected rule rejects edit
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
