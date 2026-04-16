---
pulse: 59
slug: vscode-webview
plan: claws-tui
depends_on: [56]
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: [S01]
stage: implementation
test_tiers:
  L0_unit: 4
  L1_integration: 2
  L2_e2e: 1
  L3_accept: 1
test_scope:
  run:
    - "cd extensions/vscode-claws && npx vitest run --project unit --coverage"
    - "cd extensions/vscode-claws && npx vitest run --project integration --coverage"
  typecheck:
    - "cd extensions/vscode-claws && npx tsc --noEmit"
checkpoint: 10
checkpoint_gate: true
---

# Pulse 59: VS Code Webview Sidebar — CP-10 Gate

## Objective

Implement the webview sidebar panel for the VS Code claws extension. The sidebar renders the same chunk-based governance data as the TUI, but as HTML inside a VS Code webview. It is the governance dashboard experience inside the editor -- Connections with risk badges, Governance Dashboard with compilation status, and Trust tier display.

The webview consumes `claws serve` endpoints via the LSP's serve client. It refreshes on file save via LSP notifications -- when the user saves TOOLS.md or SOUL.md, the LSP notifies the webview to re-fetch chunk data.

Webview panels:
- **Connections panel**: server list with risk badges (colored HTML badges), lock indicators, tool counts. Same data as TUI Connections L1.
- **Governance panel**: compilation status (success/failure badge), risk distribution (R1-R5 as colored HTML bar chart), gated tool count, deny rule count.
- **Trust panel**: current tier badge (T0-T4 with HTML styling), next-tier progress bar.

The webview uses a simple HTML/CSS rendering approach (no framework) to keep the extension lightweight. Data is passed from the extension host to the webview via VS Code's `postMessage` API.

This is the CP-10 gate pulse -- all VS Code extension features (diagnostics, decorations, code actions, webview) must work together.

Validates scenario S01 (Connections view in VS Code webview).

## Deliverables

- [ ] `extensions/vscode-claws/src/webview/sidebar-provider.ts` — Webview sidebar provider: registers sidebar, manages webview lifecycle, handles postMessage communication with extension host
- [ ] `extensions/vscode-claws/src/webview/panels/connections-panel.ts` — Connections panel: server list with risk badges, lock indicators, tool counts. HTML generation from chunk data.
- [ ] `extensions/vscode-claws/src/webview/panels/governance-panel.ts` — Governance panel: compilation status badge, risk distribution bar chart (HTML/CSS), gated tool count, deny rule count
- [ ] `extensions/vscode-claws/src/webview/panels/trust-panel.ts` — Trust panel: tier badge (T0-T4 styled), progress bar to next tier
- [ ] `extensions/vscode-claws/src/webview/styles.css` — Webview stylesheet: VS Code theme-aware colors, risk badge colors (R1 green through R5 red), progress bars, responsive layout
- [ ] `extensions/vscode-claws/src/webview/refresh-handler.ts` — Refresh handler: listens for LSP save notifications, triggers chunk re-fetch, updates webview panels via postMessage
- [ ] `extensions/vscode-claws/tests/webview/connections-panel.unit.test.ts` — L0: Connections panel renders server list with risk badges (1), lock indicator renders with fleet source (1)
- [ ] `extensions/vscode-claws/tests/webview/governance-panel.unit.test.ts` — L0: Governance panel renders risk distribution chart (1), compilation status shows success/failure badge (1)
- [ ] `extensions/vscode-claws/tests/webview/webview.integration.test.ts` — L1: webview refreshes on file save via LSP notification (1), postMessage delivers chunk data to webview (1)
- [ ] `extensions/vscode-claws/tests/webview/webview.e2e.test.ts` — L2: full webview lifecycle from extension activation through data display and refresh (1)
- [ ] `extensions/vscode-claws/tests/webview/webview.accept.test.ts` — L3: CP-10 gate acceptance — all VS Code extension features (diagnostics, decorations, code actions, webview) work together end-to-end (1)

## Acceptance Criteria

- [ ] Webview sidebar registers and renders in VS Code
- [ ] Connections panel shows servers with color-coded risk badges
- [ ] Lock indicators display with fleet policy source
- [ ] Governance panel shows compilation status and risk distribution chart
- [ ] Trust panel shows current tier with styled badge and progress bar
- [ ] Webview refreshes on file save via LSP notification
- [ ] Webview uses VS Code theme-aware colors
- [ ] postMessage API handles extension host to webview communication
- [ ] Scenario S01 acceptance: Connections view renders correctly in webview
- [ ] **CP-10 GATE**: all VS Code extension features work together -- diagnostics, decorations, code actions, webview sidebar
- [ ] All 4 L0 unit tests pass
- [ ] All 2 L1 integration tests pass
- [ ] All 1 L2 e2e tests pass
- [ ] All 1 L3 acceptance tests pass

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/architect.md` — VS Code extension architecture, webview patterns
- `.craft/roles/claws/platform-eng.md` — chunk rendering in HTML, theme integration, LSP notification handling

## Dependencies

- Pulse 56 (LSP validation) — serve client, LSP notification infrastructure

## Test Gates

- [ ] L0 unit (4 tests): Connections renders server list with risk badges, lock indicator renders with fleet source, Governance renders risk distribution chart, compilation status shows badge
- [ ] L1 integration (2 tests): webview refreshes on save via LSP, postMessage delivers chunk data
- [ ] L2 e2e (1 test): full webview lifecycle from activation through display and refresh
- [ ] L3 acceptance (1 test): CP-10 gate — all VS Code extension features work together
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
