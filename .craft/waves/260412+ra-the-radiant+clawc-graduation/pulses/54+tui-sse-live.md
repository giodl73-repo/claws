---
pulse: 54
slug: tui-sse-live
plan: claws-tui
depends_on: [45, 49]
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: [S08, S33]
stage: implementation
test_tiers:
  L0_unit: 4
  L1_integration: 2
  L2_e2e: 1
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

# Pulse 54: SSE Live Updates

## Objective

Wire SSE live updates across all TUI screens. When a file changes externally (e.g., editing TOOLS.md in another terminal), `claws serve` emits SSE events via `/api/events`. The TUI must detect these changes and auto-refresh the affected screens.

Key behaviors:
- External edit detection: file change SSE events trigger screen refresh for affected chunks
- Auto-refresh: screens re-fetch their chunk data when they receive a relevant SSE event
- Governance warnings: if an external edit creates a governance violation, a banner appears on the current screen
- Sequence gap detection: SSE events carry sequence numbers; if a gap is detected (missed events due to reconnect), the TUI does a full refresh of all screens rather than incremental update

The SSE client (from Pulse 45) provides the event stream. This pulse wires the event dispatch to screen state management so each screen knows when to refresh.

Validates scenarios S08 (external edit detection) and S33 (sequence gap handling).

## Deliverables

- [ ] `claws-cli/src/tui/sse-dispatch.ts` — SSE event dispatcher: maps event types to affected screens, triggers selective refresh, handles sequence gap detection (full refresh on gap), debounces rapid file changes (100ms window)
- [ ] `claws-cli/src/tui/hooks/use-sse-refresh.ts` — React hook `useSSERefresh(screenId)`: subscribes to SSE dispatcher for relevant events, triggers data re-fetch, shows "Refreshing..." indicator during fetch
- [ ] `claws-cli/src/tui/components/governance-banner.tsx` (EDIT) — Add external-edit governance warning banner: shows when an SSE event reports a new governance violation, auto-dismisses after 5 seconds or on keypress
- [ ] `claws-cli/src/tui/screens/connections.tsx` (EDIT) — Wire `useSSERefresh` for connection-related events
- [ ] `claws-cli/src/tui/screens/soul-editor.tsx` (EDIT) — Wire `useSSERefresh` for soul-related events
- [ ] `claws-cli/src/tui/screens/governance-dashboard.tsx` (EDIT) — Wire `useSSERefresh` for governance events
- [ ] `claws-cli/tests/tui/sse-dispatch.unit.test.ts` — L0: dispatcher maps file-change event to Connections screen (1), sequence gap triggers full refresh (1), debounce coalesces rapid events within 100ms (1), governance violation event triggers banner (1)
- [ ] `claws-cli/tests/tui/sse-dispatch.integration.test.ts` — L1: external file edit triggers screen refresh via SSE (1), sequence gap recovery does full refresh (1)
- [ ] `claws-cli/tests/tui/sse-dispatch.e2e.test.ts` — L2: edit TOOLS.md externally, verify TUI Connections screen updates (1)

## Acceptance Criteria

- [ ] External file edits trigger SSE events that refresh affected screens
- [ ] Auto-refresh shows "Refreshing..." indicator during data fetch
- [ ] Governance violations from external edits display as banner warnings
- [ ] Sequence gap detection triggers full refresh of all screens
- [ ] Rapid file changes are debounced within 100ms window
- [ ] SSE reconnection maintains sequence tracking
- [ ] Scenario S08 acceptance: external edit detection works
- [ ] Scenario S33 acceptance: sequence gap handling works
- [ ] All 4 L0 unit tests pass
- [ ] All 2 L1 integration tests pass
- [ ] All 1 L2 e2e tests pass

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/architect.md` — event-driven state management, debounce patterns
- `.craft/roles/claws/platform-eng.md` — SSE dispatch, sequence tracking, incremental refresh

## Dependencies

- Pulse 45 (TUI scaffold) — SSE client, app shell
- Pulse 49 (PATCH integration) — governance banner component, screen state patterns

## Test Gates

- [ ] L0 unit (4 tests): dispatcher maps file-change to Connections screen, sequence gap triggers full refresh, debounce coalesces rapid events, governance violation triggers banner
- [ ] L1 integration (2 tests): external file edit triggers screen refresh via SSE, sequence gap recovery does full refresh
- [ ] L2 e2e (1 test): edit TOOLS.md externally, verify TUI Connections screen updates
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
