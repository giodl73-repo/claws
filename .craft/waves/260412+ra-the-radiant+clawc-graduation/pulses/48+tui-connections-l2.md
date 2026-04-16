---
pulse: 48
slug: tui-connections-l2
plan: claws-tui
depends_on: [47]
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: [S01]
stage: implementation
test_tiers:
  L0_unit: 6
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

# Pulse 48: Connections L2 — Tool Drill-In

## Objective

Implement the Connections screen Level 2 drill-in view. When a user selects a server from the L1 list, L2 shows the full tool list for that server. Each tool row renders with a toggle, risk badge, and lock indicator. The critical UX rule: R5 tools render with **no toggle** -- just a lock icon and tool name. This is defense-in-depth: even if someone patches the Ink component, the server rejects the PATCH. Fleet-locked tools render with a disabled toggle (visually distinct from R5 absent toggle) with source attribution ("Fleet: {policy-name}").

```
  [checkmark] read-email         R1 READ        [toggle]
  [checkmark] create-task        R3 COMMUNICATE  [toggle]  lock Fleet
  lock send-email                R5 TRANSACT     (locked -- acts on your behalf)
```

Back navigation (Escape or Backspace) returns to L1. Arrow keys navigate tools. Space toggles non-locked tools (sends PATCH in Pulse 49).

Validates scenario S01 (Connections drill-in with risk badges).

## Deliverables

- [ ] `claws-cli/src/tui/screens/connections-detail.tsx` — Connections L2: tool list for selected server, back navigation, tool row rendering with risk/lock differentiation
- [ ] `claws-cli/src/tui/components/tool-row.tsx` — `<ToolRow>` component: tool name, risk badge, toggle (present/disabled/absent based on lock type), lock source attribution
- [ ] `claws-cli/src/tui/components/governance-banner.tsx` — `<GovernanceBanner>` component: renders warnings/errors from governance context as colored banners (yellow warning, red error)
- [ ] `claws-cli/tests/tui/screens/connections-detail.unit.test.ts` — L0: tool list renders all tools for a server (1), R5 tool renders without toggle (absent) (1), fleet-locked tool renders with disabled toggle (1), back navigation returns to L1 (1), risk badge matches tool risk level (1), lock source attribution displays fleet policy name (1)
- [ ] `claws-cli/tests/tui/screens/connections-detail.integration.test.ts` — L1: L2 fetches tool list for selected server from serve (1), R5 tool rendering matches governance state (1)

## Acceptance Criteria

- [ ] L2 shows full tool list for selected server
- [ ] R5 tools render with no toggle -- lock icon only, "(locked -- acts on your behalf)"
- [ ] Fleet-locked tools render with disabled toggle and source attribution
- [ ] Non-locked tools render with functional toggle
- [ ] Risk badges are color-coded per tool risk level
- [ ] Back navigation (Escape/Backspace) returns to L1 server list
- [ ] Governance banner renders warnings/errors from chunk response
- [ ] Scenario S01 acceptance: drill-in with risk differentiation works
- [ ] All 6 L0 unit tests pass
- [ ] All 2 L1 integration tests pass

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/architect.md` — component composition, defense-in-depth rendering
- `.craft/roles/claws/platform-eng.md` — R5 lock rendering rules, fleet lock attribution

## Dependencies

- Pulse 47 (Connections L1) — server list, shared components (RiskBadge, LockIcon)

## Test Gates

- [ ] L0 unit (6 tests): tool list renders all tools, R5 tool renders without toggle, fleet-locked tool renders with disabled toggle, back navigation returns to L1, risk badge matches tool risk level, lock source attribution displays fleet policy name
- [ ] L1 integration (2 tests): L2 fetches tool list for selected server from serve, R5 tool rendering matches governance state
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
