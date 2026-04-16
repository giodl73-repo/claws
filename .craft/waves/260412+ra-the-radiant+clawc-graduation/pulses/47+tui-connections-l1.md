---
pulse: 47
slug: tui-connections-l1
plan: claws-tui
depends_on: [45]
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: [S01]
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

# Pulse 47: Connections L1 — Server List

## Objective

Implement the Connections screen Level 1 view: a list of MCP servers with summary badges and an "Allow all" button. Each server row shows the server name, tool count, highest risk level badge (colored R1-R5), and a lock indicator if any tools are fleet-locked.

The screen consumes `GET /api/chunks/connections` which returns all servers. The "Allow all" button sends `PATCH /api/chunks/connections/allow-all` and shows the result -- R1-R4 tools approved, R5 tools reported as `still_gated` with lock icon.

Arrow keys navigate the server list. Enter drills into a server (handled by Pulse 48). The "Allow all" button is a footer action accessible via `a` key.

Validates scenario S01 (Connections overview).

## Deliverables

- [ ] `claws-cli/src/tui/screens/connections.tsx` — Connections L1: server list with summary badges, "Allow all" footer action, drill-in on Enter
- [ ] `claws-cli/src/tui/components/risk-badge.tsx` — `<RiskBadge>` component: R1 green, R2 yellow, R3 orange, R4 red, R5 bright-red, with risk label (READ/COMMUNICATE/TRANSACT)
- [ ] `claws-cli/src/tui/components/lock-icon.tsx` — `<LockIcon>` component: lock symbol with source tooltip (R5/fleet/governance), distinct rendering per lock source
- [ ] `claws-cli/src/tui/components/server-row.tsx` — `<ServerRow>` component: server name, tool count, highest risk badge, lock indicator if applicable
- [ ] `claws-cli/tests/tui/screens/connections.unit.test.ts` — L0: server list renders all servers (1), risk badge shows correct color for R3 (1), lock icon renders for fleet-locked server (1), "Allow all" action accessible via a key (1)
- [ ] `claws-cli/tests/tui/screens/connections.integration.test.ts` — L1: Connections fetches server list from serve (1), "Allow all" PATCH returns R5 still_gated (1)

## Acceptance Criteria

- [ ] Server list renders from `GET /api/chunks/connections`
- [ ] Each server row shows name, tool count, highest risk badge
- [ ] Risk badges are color-coded: R1 green through R5 bright-red
- [ ] Lock icons indicate fleet-locked servers with source attribution
- [ ] "Allow all" button sends PATCH and shows R5 `still_gated` result
- [ ] Enter on a server row drills into L2 view (Pulse 48)
- [ ] Scenario S01 acceptance: connections overview works
- [ ] All 4 L0 unit tests pass
- [ ] All 2 L1 integration tests pass

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/architect.md` — reusable component patterns, shared badge/icon conventions
- `.craft/roles/claws/platform-eng.md` — chunk API consumption, risk rendering rules

## Dependencies

- Pulse 45 (TUI scaffold) — app shell, client, navigation

## Test Gates

- [ ] L0 unit (4 tests): server list renders all servers, risk badge shows correct color for R3, lock icon renders for fleet-locked server, "Allow all" action accessible via a key
- [ ] L1 integration (2 tests): Connections fetches server list from serve, "Allow all" PATCH returns R5 still_gated
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
