---
pulse: 50
slug: tui-memory-groups-entitlements
plan: claws-tui
depends_on: [45]
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: []
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

# Pulse 50: Memory, Groups, Entitlements Screens

## Objective

Implement the remaining three Agent Settings screens: Memory, Groups, and Entitlements. These complete the Settings experience alongside General, Preferences, and Connections.

Memory screen renders `GET /api/chunks/memory/knowledge` -- knowledge source list with toggles and data label badges (CONFIDENTIAL, INTERNAL, PUBLIC). Data labels render as colored badges next to each knowledge source.

Groups screen renders `GET /api/chunks/groups` -- M365, Security, and On-Premise group lists. Read-only display with group membership counts.

Entitlements screen renders `GET /api/chunks/entitlements` -- Core and Governance role lists with expiry dates. Read-only display with role badges and expiry countdown (days remaining).

All three screens use `<ChunkPanel>` from Pulse 46 for consistent layout.

## Deliverables

- [ ] `claws-cli/src/tui/screens/memory.tsx` — Memory screen: knowledge source list with toggles, data label badges (colored: CONFIDENTIAL=red, INTERNAL=yellow, PUBLIC=green)
- [ ] `claws-cli/src/tui/screens/groups.tsx` — Groups screen: M365/Security/On-Premise group lists, membership counts, read-only
- [ ] `claws-cli/src/tui/screens/entitlements.tsx` — Entitlements screen: Core + Governance role lists, expiry dates with countdown, read-only
- [ ] `claws-cli/src/tui/components/data-label-badge.tsx` — `<DataLabelBadge>` component: CONFIDENTIAL (red), INTERNAL (yellow), PUBLIC (green), renders next to knowledge sources and memory items
- [ ] `claws-cli/tests/tui/screens/memory.unit.test.ts` — L0: Memory screen renders knowledge sources with toggles (1), data label badge renders correct color for CONFIDENTIAL (1)
- [ ] `claws-cli/tests/tui/screens/groups-entitlements.unit.test.ts` — L0: Groups screen renders three group categories (1), Entitlements screen renders roles with expiry countdown (1)
- [ ] `claws-cli/tests/tui/screens/memory.integration.test.ts` — L1: Memory screen fetches knowledge chunks from serve (1), Groups screen fetches group data from serve (1)

## Acceptance Criteria

- [ ] Memory screen renders knowledge sources from chunk API
- [ ] Knowledge sources have toggles for enable/disable
- [ ] Data label badges render with correct colors per classification
- [ ] Groups screen renders M365, Security, On-Premise categories
- [ ] Groups are read-only with membership counts
- [ ] Entitlements screen renders Core and Governance roles
- [ ] Entitlements show expiry dates with days-remaining countdown
- [ ] All screens use `<ChunkPanel>` for consistent layout
- [ ] All 4 L0 unit tests pass
- [ ] All 2 L1 integration tests pass

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/architect.md` — component reuse, consistent screen patterns
- `.craft/roles/claws/platform-eng.md` — chunk rendering, data label conventions

## Dependencies

- Pulse 45 (TUI scaffold) — app shell, client, navigation

## Test Gates

- [ ] L0 unit (4 tests): Memory renders knowledge sources with toggles, data label badge correct color for CONFIDENTIAL, Groups renders three group categories, Entitlements renders roles with expiry countdown
- [ ] L1 integration (2 tests): Memory fetches knowledge chunks from serve, Groups fetches group data from serve
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
