---
pulse: 37
slug: schedule-calendar
plan: claws-cap-integration
depends_on: [22]
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: [S11]
stage: implementation
test_tiers:
  L0_unit: 6
  L1_integration: 3
  L2_e2e: 0
  L3_accept: 1
test_scope:
  run:
    - "cd claws-serve && npx vitest run --project unit --coverage"
    - "cd claws-serve && npx vitest run --project integration --coverage"
    - "cd claws-sdk && npx vitest run --project unit --coverage"
  typecheck:
    - "cd claws-serve && npx tsc --noEmit"
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 7
checkpoint_gate: false
---

# Pulse 37: Schedule Calendar

## Objective

Implement GET /api/schedule that renders HEARTBEAT.md as calendar-renderable events. The heartbeat parser in claws-sdk extracts recurring and one-off schedule entries from HEARTBEAT.md and converts them to typed CalendarEvent[] with iCalendar RRULE recurrence support. All events require an explicit timezone (P-278 requirement) -- events without timezone information are rejected with a validation error rather than silently defaulting to UTC.

The parser handles HEARTBEAT.md schedule blocks (daily, weekly, monthly, custom RRULE patterns), computes next occurrence timestamps, and exposes duration and category metadata so M365 Calendar can render them correctly.

## Deliverables

- [ ] `claws-sdk/src/workspace/heartbeat-parser.ts` — Parse HEARTBEAT.md schedule blocks into CalendarEvent[]: id, title, description, startTime, endTime, duration, timezone (required), recurrence (iCalendar RRULE string), category. Validates timezone is explicit per P-278. Computes next occurrence from RRULE.
- [ ] `claws-serve/src/routes/schedule.ts` — GET /api/schedule: returns CalendarEvent[] from parsed HEARTBEAT.md. Supports ?from=&to= query params for date range filtering. Returns 400 if HEARTBEAT.md contains events without explicit timezone.
- [ ] `claws-sdk/tests/workspace/heartbeat-parser.unit.test.ts` — L0: parse daily recurring event (1), parse weekly with RRULE (1), reject event without timezone (1), compute next occurrence (1), parse one-off event (1), empty HEARTBEAT.md returns empty array (1)
- [ ] `claws-serve/tests/routes/schedule.integration.test.ts` — L1: GET returns calendar events (1), date range filtering works (1), 400 on missing timezone (1)
- [ ] L3 acceptance: S11 (HEARTBEAT.md renders as calendar events with correct recurrence) (1)

## Acceptance Criteria

- [ ] GET /api/schedule returns typed CalendarEvent[] with recurrence rules
- [ ] All events have explicit timezone -- no silent UTC defaults (P-278)
- [ ] Events without timezone return 400 with descriptive error message
- [ ] iCalendar RRULE strings are valid and parseable by standard iCal libraries
- [ ] Date range filtering via ?from=&to= query params works correctly
- [ ] Next occurrence computation is correct for daily, weekly, monthly patterns
- [ ] S11 acceptance: HEARTBEAT.md renders as calendar events with correct recurrence
- [ ] All 6 L0 unit tests pass
- [ ] All 3 L1 integration tests pass

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/architect.md` — monorepo structure, SDK-owns-logic rule
- `.craft/roles/claws/platform-eng.md` — workspace file parsing, calendar data patterns

## Dependencies

- Pulse 22 (workspace parser) — WorkspaceState containing parsed HEARTBEAT.md

## Test Gates

- [ ] L0 unit (6 tests): parse daily recurring, parse weekly RRULE, reject missing timezone, compute next occurrence, parse one-off event, empty HEARTBEAT.md
- [ ] L1 integration (3 tests): GET returns calendar events, date range filtering, 400 on missing timezone
- [ ] L3 acceptance (1 test): S11 HEARTBEAT.md renders as calendar events
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
