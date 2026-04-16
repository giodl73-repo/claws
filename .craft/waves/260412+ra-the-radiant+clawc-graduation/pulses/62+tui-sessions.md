---
pulse: 62
slug: tui-sessions
plan: claws-tui
depends_on: [45, 61]
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: []
stage: implementation
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

# Pulse 62: TUI Sessions

## Objective

Build the TUI sessions screen emulating the ClawPilot session management experience. The sessions screen is a first-class view within the Manage experience: a session list showing all active and recent sessions with type badges (main/cron/channel/agent) and status indicators (active/idle/error), plus drill-down into session detail showing the session's available tools, run history, and errors.

Target wireframe for the sessions screen:

```
Sessions (12 active, 1 errored)
├── ● main              running    2m ago
├── ✗ cron:daily-triage  error     Apr 15 06:00 (timeout)
│   └── Runs: ✓✓✗ (last 3)
├── ○ cron:weekly-report scheduled  Mon 7:00 AM
├── ○ channel:design     idle      Apr 14
├── ● agent:scout        running    5m ago
└── ... 7 more
```

Cron sessions get special treatment: their detail view includes a run history timeline with visual status indicators (success/error/timeout) showing the cadence and health of scheduled runs. This gives operators at-a-glance visibility into whether their cron jobs are healthy or failing silently.

All data comes from the session HTTP routes (pulse 61) via the TUI HTTP client (pulse 45). The TUI is a consumer of `claws serve` -- no direct SDK imports for runtime data.

## Deliverables

- [ ] `claws-cli/src/tui/screens/sessions.tsx` — Sessions screen component: fetches `GET /api/sessions` via TUI client, renders session list with type/status badges, supports arrow-key navigation, Enter drills into session detail, Back returns to list. Session detail fetches `/api/sessions/:id`, `/api/sessions/:id/runs`, `/api/sessions/:id/tools` and renders three tabbed panels (Overview, Runs, Tools).
- [ ] `claws-cli/src/tui/components/SessionRow.tsx` — Session list row component: renders session name/ID, type badge (color-coded: main=blue, cron=yellow, channel=green, agent=purple), status indicator (active=green dot, idle=gray, error=red), run count, last active timestamp. Highlights on selection.
- [ ] `claws-cli/src/tui/components/RunHistoryTimeline.tsx` — Run history timeline component for cron session detail: horizontal timeline of recent runs with status markers (checkmark for success, X for error, clock for timeout), timestamps below, duration above. Scrollable for sessions with long history. Summary line: "23/25 successful, 1 error, 1 timeout (last 7 days)".
- [ ] `claws-cli/tests/tui/screens/sessions.unit.test.ts` — L0: sessions screen renders session list (1), session row shows type badge and status (1), arrow keys navigate session list (1), Enter drills into session detail (1), session detail renders three tabs (1), RunHistoryTimeline renders status markers (1)
- [ ] `claws-cli/tests/tui/screens/sessions.integration.test.ts` — L1: sessions screen fetches from /api/sessions (1), session detail fetches runs and tools (1), cron session detail renders timeline (1)

## Acceptance Criteria

- [ ] Sessions screen lists all workspace sessions with type and status badges
- [ ] Type badges are color-coded: main=blue, cron=yellow, channel=green, agent=purple
- [ ] Status indicators: active=green dot, idle=gray, error=red
- [ ] Arrow keys navigate the session list
- [ ] Enter opens session detail with Overview, Runs, Tools tabs
- [ ] Cron session detail shows RunHistoryTimeline with success/error/timeout markers
- [ ] Timeline shows summary line with success/error/timeout counts
- [ ] Back navigation returns to session list
- [ ] All data fetched via TUI HTTP client (no direct SDK runtime imports)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0 for claws-cli

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/architect.md` — monorepo structure, thin UI adapter pattern, lazy-load conventions
- `.craft/roles/claws/platform-eng.md` — CLI patterns, Ink component conventions, TUI screen architecture

## Dependencies

- Pulse 45 (tui-scaffold) — Ink app scaffold, HTTP client, SSE client, experience selector, screen routing
- Pulse 61 (session-routes) — Session HTTP endpoints that the TUI consumes (/api/sessions, /api/sessions/:id, etc.)

## Test Gates

- [ ] L0 unit (6 tests): sessions screen renders session list (1), session row shows type badge and status (1), arrow keys navigate session list (1), Enter drills into session detail (1), session detail renders three tabs (1), RunHistoryTimeline renders status markers (1)
- [ ] L1 integration (3 tests): sessions screen fetches from /api/sessions (1), session detail fetches runs and tools (1), cron session detail renders timeline (1)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
