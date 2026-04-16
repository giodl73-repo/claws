---
pulse: 57
slug: vscode-decorations
plan: claws-tui
depends_on: [56]
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
    - "cd extensions/vscode-claws && npx vitest run --project unit --coverage"
    - "cd extensions/vscode-claws && npx vitest run --project integration --coverage"
  typecheck:
    - "cd extensions/vscode-claws && npx tsc --noEmit"
checkpoint: 10
checkpoint_gate: false
---

# Pulse 57: VS Code Editor Decorations

## Objective

Implement editor decorations for the VS Code claws extension. Decorations provide visual governance indicators directly in the editor -- risk badges as gutter icons, lock indicators, deny rule highlighting, and data label badges. These complement the LSP diagnostics from Pulse 56 by adding visual context that diagnostics alone cannot convey.

Risk badges as gutter icons: tool declarations in TOOLS.md get colored gutter icons matching their risk level (R1 green circle, R2 yellow circle, R3 orange circle, R4 red circle, R5 red filled circle with lock). The gutter icon provides at-a-glance risk assessment without reading the code lens.

Lock indicators: fleet-locked tools get a lock icon in the gutter with hover text showing "Fleet-locked: {policy-name}". Governance-locked tools get a different lock variant.

Deny rule highlighting: deny rules in SOUL.md get background highlighting -- user-authored rules get a subtle yellow background, compiler-injected rules get a grey background with italic text decoration.

Data label badges: MEMORY.md entries with data classifications get inline decorations showing the classification level (CONFIDENTIAL in red, INTERNAL in yellow, PUBLIC in green).

## Deliverables

- [ ] `extensions/vscode-claws/src/decorations/risk-gutter.ts` — Risk gutter icons: R1-R5 as colored circle SVGs, applied to tool declaration lines in TOOLS.md, updated on save via LSP notification
- [ ] `extensions/vscode-claws/src/decorations/lock-indicator.ts` — Lock gutter icons: fleet lock (padlock SVG), governance lock (shield SVG), hover text with lock source
- [ ] `extensions/vscode-claws/src/decorations/deny-rule-highlight.ts` — Deny rule background highlighting: user-authored (yellow background), compiler-injected (grey background + italic), applied to SOUL.md
- [ ] `extensions/vscode-claws/src/decorations/data-label-badge.ts` — Data label inline decorations: CONFIDENTIAL (red), INTERNAL (yellow), PUBLIC (green), applied to MEMORY.md entries
- [ ] `extensions/vscode-claws/src/decorations/index.ts` — Barrel export and decoration manager: registers all decoration types, handles updates on LSP notifications, disposes on deactivation
- [ ] `extensions/vscode-claws/tests/decorations/risk-gutter.unit.test.ts` — L0: R5 tool gets red filled circle gutter icon (1), R1 tool gets green circle gutter icon (1)
- [ ] `extensions/vscode-claws/tests/decorations/deny-rule-highlight.unit.test.ts` — L0: user-authored deny rule gets yellow background (1), compiler-injected deny rule gets grey background + italic (1)
- [ ] `extensions/vscode-claws/tests/decorations/decorations.integration.test.ts` — L1: decorations update on file save via LSP notification (1), lock indicator hover shows fleet policy name (1)

## Acceptance Criteria

- [ ] Risk gutter icons render on tool declarations in TOOLS.md
- [ ] Icons are color-coded: R1 green through R5 red-filled with lock
- [ ] Fleet-locked tools show padlock gutter icon with hover text
- [ ] Governance-locked tools show shield gutter icon
- [ ] User-authored deny rules in SOUL.md have yellow background
- [ ] Compiler-injected deny rules have grey background with italic text
- [ ] Data label badges render inline next to MEMORY.md entries
- [ ] Decorations update on save via LSP notification
- [ ] Decorations dispose cleanly on extension deactivation
- [ ] All 4 L0 unit tests pass
- [ ] All 2 L1 integration tests pass

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/architect.md` — VS Code extension patterns, decoration lifecycle
- `.craft/roles/claws/platform-eng.md` — risk visualization, governance indicator rendering

## Dependencies

- Pulse 56 (LSP validation) — diagnostic data and LSP notifications that trigger decoration updates

## Test Gates

- [ ] L0 unit (4 tests): R5 gets red filled circle, R1 gets green circle, user-authored deny rule gets yellow background, compiler-injected gets grey + italic
- [ ] L1 integration (2 tests): decorations update on save via LSP, lock indicator hover shows fleet policy name
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
