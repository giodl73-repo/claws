---
pulse: 55
slug: tui-demo
plan: claws-tui
depends_on: [45, 46, 47, 48, 49, 50, 51, 52, 53, 54]
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 2
  L1_integration: 1
  L2_e2e: 1
  L3_accept: 1
test_scope:
  run:
    - "cd claws-cli && npx vitest run --project unit --coverage"
    - "cd claws-cli && npx vitest run --project integration --coverage"
  typecheck:
    - "cd claws-cli && npx tsc --noEmit"
checkpoint: 9
checkpoint_gate: true
---

# Pulse 55: Demo Mode — CP-9 Gate

## Objective

Implement `claws tui --demo` mode: a guided 7-step walkthrough using a fixture workspace, keyboard shortcuts, and a help panel. This is the CP-9 gate pulse -- all TUI screens from pulses 45-54 must work together in a cohesive demo experience.

Demo mode behavior:
1. Copy fixture workspace to tmpdir
2. Start `claws serve --workspace {tmpdir}` in background
3. Wait for /health
4. Connect TUI, render with guided walkthrough overlay
5. On exit: stop serve, clean up tmpdir

Fixture workspace contains:
- 3 MCP servers (Outlook, Planner, Asana) with mixed R1-R5 tools
- Fleet policy locking Planner tools
- R5 send-email with OBO
- SOUL.md with deny rules (user-authored + compiler-injected)
- HEARTBEAT.md with 3 scheduled tasks (with explicit timezones)
- Trust tier at T2 with escalation history
- Seeded audit chain with 10 events

Guided walkthrough (7 steps, shown as overlay):
1. "Welcome to your agent's governance dashboard."
2. "Settings: See your agent's tools and their risk levels."
3. "Try toggling send-email. Watch what happens." (R5 rejection)
4. "Soul Editor: See your agent's boundaries."
5. "Try removing a deny rule. Watch the governance warning."
6. "Trust: See your agent's trust tier and what it unlocks."
7. "Audit: Every governance decision is recorded here."

Keyboard shortcuts: `n` next step, `p` previous step, `s` skip walkthrough, `?` help panel, `q` quit.

## Deliverables

- [ ] `claws-cli/src/tui/demo.ts` — Demo mode orchestrator: fixture workspace copy to tmpdir, `claws serve` background spawn with workspace flag, health check polling, cleanup on exit (stop serve, remove tmpdir)
- [ ] `claws-cli/src/tui/components/walkthrough-overlay.tsx` — `<WalkthroughOverlay>` component: 7-step guided walkthrough, step counter, navigation (n/p/s), highlights relevant screen for each step, semi-transparent overlay
- [ ] `claws-cli/src/tui/components/help-panel.tsx` — `<HelpPanel>` component: keyboard shortcut reference, screen descriptions, toggles on ? key
- [ ] `claws-cli/fixtures/demo-workspace/` — Fixture workspace directory: TOOLS.md (3 servers, mixed R1-R5), SOUL.md (user + compiler deny rules), MEMORY.md (3 sections), HEARTBEAT.md (3 tasks), fleet-policy.yaml (Planner lock), trust-state.json (T2 tier), audit-chain.json (10 seeded events)
- [ ] `claws-cli/tests/tui/demo.unit.test.ts` — L0: demo mode copies fixture to tmpdir (1), walkthrough overlay renders 7 steps with navigation (1)
- [ ] `claws-cli/tests/tui/demo.integration.test.ts` — L1: demo mode starts serve with fixture workspace, connects TUI, walkthrough navigates all 7 steps (1)
- [ ] `claws-cli/tests/tui/demo.e2e.test.ts` — L2: full demo mode lifecycle: start, walkthrough, R5 rejection demo, quit, cleanup (1)
- [ ] `claws-cli/tests/tui/demo.accept.test.ts` — L3: CP-9 gate acceptance — all TUI screens render, PATCH operations work, SSE live updates function, demo walkthrough completes end-to-end (1)

## Acceptance Criteria

- [ ] `claws tui --demo` copies fixture workspace and starts serve in background
- [ ] Walkthrough overlay shows 7 guided steps
- [ ] Step navigation works: n (next), p (previous), s (skip)
- [ ] Step 3 highlights Connections screen and demonstrates R5 rejection
- [ ] Step 5 highlights Soul Editor and demonstrates deny rule warning
- [ ] Help panel toggles on ? key showing all keyboard shortcuts
- [ ] On quit: serve process stopped, tmpdir cleaned up
- [ ] Fixture workspace is fully editable during demo
- [ ] External edits (e.g., vim TOOLS.md) trigger SSE events and TUI refresh
- [ ] **CP-9 GATE**: all TUI screens render correctly, PATCH operations work, SSE live updates function, demo walkthrough completes
- [ ] All 2 L0 unit tests pass
- [ ] All 1 L1 integration tests pass
- [ ] All 1 L2 e2e tests pass
- [ ] All 1 L3 acceptance tests pass

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/architect.md` — demo mode orchestration, fixture design, cleanup patterns
- `.craft/roles/claws/platform-eng.md` — walkthrough UX, serve lifecycle management

## Dependencies

- All prior TUI pulses (45-54) — every screen must be functional for the demo

## Test Gates

- [ ] L0 unit (2 tests): demo copies fixture to tmpdir, walkthrough renders 7 steps with navigation
- [ ] L1 integration (1 test): demo starts serve with fixture, connects TUI, navigates all 7 steps
- [ ] L2 e2e (1 test): full demo lifecycle from start through walkthrough to cleanup
- [ ] L3 acceptance (1 test): CP-9 gate — all TUI screens render, PATCH works, SSE updates, walkthrough completes
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
