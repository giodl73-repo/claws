---
pulse: 52
slug: tui-trust-schedule-queue
plan: claws-tui
depends_on: [45]
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: [S12, S11, S13]
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

# Pulse 52: Trust Dashboard, Schedule, Work Queue

## Objective

Implement the remaining three Lobster experience screens: Trust Dashboard, Schedule, and Work Queue. These preview the Lobster collaboration APIs as terminal renderings of the same JSON that Loop, Calendar, and To Do would consume.

Trust Dashboard renders `GET /api/trust`: current tier badge (T0-T4 with color), escalation history timeline, next-tier requirements progress bar. "Request Escalation" button triggers `PATCH /api/trust/escalate` -- without token: rejection with "requires manager approval"; with token: tier promotes and history updates.

Schedule renders `GET /api/schedule`: calendar-style list of HEARTBEAT.md events, recurrence indicators (daily/weekly/monthly icons), next-run countdown, timezone display.

Work Queue renders `GET /api/workqueue`: task list with status badges (pending/active/complete), source indicators (heartbeat/user/agent), "Add task" action, "Mark complete" action.

Validates scenarios S12 (trust tier), S11 (schedule), S13 (work queue).

## Deliverables

- [ ] `claws-cli/src/tui/screens/trust-dashboard.tsx` — Trust Dashboard: tier badge (T0 grey, T1 blue, T2 green, T3 gold, T4 purple), escalation history as timeline, next-tier progress bar, "Request Escalation" button
- [ ] `claws-cli/src/tui/screens/schedule.tsx` — Schedule: calendar-style event list from HEARTBEAT.md, recurrence icons, next-run countdown timer, timezone display
- [ ] `claws-cli/src/tui/screens/work-queue.tsx` — Work Queue: task list with status badges, source indicators, "Add task" (a key), "Mark complete" (Enter on task)
- [ ] `claws-cli/src/tui/components/trust-badge.tsx` — `<TrustBadge>` component: T0-T4 with tier-specific color and label
- [ ] `claws-cli/tests/tui/screens/trust-dashboard.unit.test.ts` — L0: Trust Dashboard renders current tier badge (1), escalation history renders as timeline (1)
- [ ] `claws-cli/tests/tui/screens/schedule-queue.unit.test.ts` — L0: Schedule renders events with recurrence icons (1), Work Queue renders tasks with status badges (1)
- [ ] `claws-cli/tests/tui/screens/trust-schedule-queue.integration.test.ts` — L1: Trust Dashboard fetches tier from serve (1), Work Queue "Add task" sends POST to serve (1)

## Acceptance Criteria

- [ ] Trust Dashboard renders current tier with color-coded badge
- [ ] Escalation history displays as a timeline of events
- [ ] Next-tier progress bar shows requirements and completion percentage
- [ ] "Request Escalation" sends PATCH and shows approval result
- [ ] Schedule renders HEARTBEAT.md events as calendar list
- [ ] Recurrence indicators distinguish daily/weekly/monthly
- [ ] Next-run countdown updates in real-time
- [ ] Work Queue renders tasks with status and source badges
- [ ] "Add task" creates new task via POST
- [ ] "Mark complete" updates task status
- [ ] Scenario S12 acceptance: trust tier flow works
- [ ] Scenario S11 acceptance: schedule display works
- [ ] Scenario S13 acceptance: work queue interaction works
- [ ] All 4 L0 unit tests pass
- [ ] All 2 L1 integration tests pass

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/architect.md` — dashboard layout, progress bar patterns
- `.craft/roles/claws/platform-eng.md` — trust tier rendering, heartbeat parsing, task management

## Dependencies

- Pulse 45 (TUI scaffold) — app shell, client, navigation

## Test Gates

- [ ] L0 unit (4 tests): Trust renders current tier badge, escalation history as timeline, Schedule renders events with recurrence icons, Work Queue renders tasks with status badges
- [ ] L1 integration (2 tests): Trust fetches tier from serve, Work Queue "Add task" sends POST
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
