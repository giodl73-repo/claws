---
pulse: 53
slug: tui-companion
plan: claws-tui
depends_on: [45]
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: [S14]
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

# Pulse 53: Companion Screens — Governance, Audit, Activity, Skills

## Objective

Implement the four Manage experience screens: Governance Dashboard, Audit Trail, Activity Feed, and Skills Store. These preview the Companion App APIs as terminal renderings.

Governance Dashboard renders `GET /api/governance`: compilation status (last compile timestamp + success/failure), risk distribution chart (R1-R5 as horizontal bar chart with colors), gated tool count, deny rule count, budget usage bar (percentage with color), fleet policy status (active/inactive with policy name).

Audit Trail renders `GET /api/audit`: scrollable event timeline with timestamps, filterable by category (admin/data/auth/policy) via tab keys, hash chain integrity indicator at the top (green check if valid, red X if broken), "Export" action (e key) that triggers SARIF/CEF export.

Activity Feed renders `SSE /api/events`: live stream of file changes, compilations, governance warnings. Events appear at the top of the list, scrolling down. New events flash briefly before settling.

Skills Store renders `GET /api/skills`: available skills list with installed indicator, "Install" action (Enter) that shows governance impact preview (what R-levels the skill adds) before confirming.

Validates scenario S14 (companion management).

## Deliverables

- [ ] `claws-cli/src/tui/screens/governance-dashboard.tsx` — Governance Dashboard: compilation status, risk distribution bar chart, gated tool count, deny rule count, budget bar, fleet status
- [ ] `claws-cli/src/tui/screens/audit-trail.tsx` — Audit Trail: scrollable event timeline, category filter (admin/data/auth/policy), hash chain indicator, export action
- [ ] `claws-cli/src/tui/screens/activity-feed.tsx` — Activity Feed: live SSE event stream, auto-scroll, new event flash animation, connection status indicator
- [ ] `claws-cli/src/tui/screens/skills-store.tsx` — Skills Store: skill list with installed badges, "Install" with governance impact preview, R-level impact display
- [ ] `claws-cli/tests/tui/screens/governance-dashboard.unit.test.ts` — L0: Governance Dashboard renders risk distribution chart (1), budget bar shows percentage (1)
- [ ] `claws-cli/tests/tui/screens/companion.unit.test.ts` — L0: Audit Trail renders events with category filter (1), Skills Store renders skill list with installed indicator (1)
- [ ] `claws-cli/tests/tui/screens/companion.integration.test.ts` — L1: Governance Dashboard fetches data from serve (1), Audit Trail category filter queries serve with parameter (1)

## Acceptance Criteria

- [ ] Governance Dashboard renders compilation status with timestamp
- [ ] Risk distribution renders as color-coded horizontal bar chart (R1-R5)
- [ ] Budget usage bar shows percentage with color threshold (green/yellow/red)
- [ ] Audit Trail renders scrollable event timeline
- [ ] Category filter switches between admin/data/auth/policy events
- [ ] Hash chain integrity indicator shows green/red based on chain validity
- [ ] Activity Feed shows live SSE events with auto-scroll
- [ ] Skills Store lists skills with installed/available state
- [ ] "Install" action previews governance impact before confirming
- [ ] Scenario S14 acceptance: companion management works
- [ ] All 4 L0 unit tests pass
- [ ] All 2 L1 integration tests pass

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/architect.md` — dashboard composition, chart rendering patterns
- `.craft/roles/claws/platform-eng.md` — governance rendering, SSE streaming, audit chain display

## Dependencies

- Pulse 45 (TUI scaffold) — app shell, client, SSE client, navigation

## Test Gates

- [ ] L0 unit (4 tests): Governance renders risk distribution chart, budget bar shows percentage, Audit Trail renders with category filter, Skills Store renders skill list with installed indicator
- [ ] L1 integration (2 tests): Governance fetches data from serve, Audit Trail category filter queries serve
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
