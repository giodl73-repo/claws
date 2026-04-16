---
pulse: 58
slug: vscode-code-actions
plan: claws-tui
depends_on: [56, 57]
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
    - "cd claws-lsp && npx vitest run --project unit --coverage"
    - "cd claws-lsp && npx vitest run --project integration --coverage"
  typecheck:
    - "cd claws-lsp && npx tsc --noEmit"
checkpoint: 10
checkpoint_gate: false
---

# Pulse 58: VS Code Code Actions — Governance Quick-Fixes

## Objective

Implement governance-aware code actions for the VS Code extension. Code actions appear as light bulb suggestions on diagnostic squiggly lines. They provide actionable fixes for governance issues, integrating with the write-time validation layer.

Code actions that modify OC files route through claws serve PATCH endpoints, NOT direct file writes. The LSP is a serve client for writes, same as the TUI.

Code actions:
- **"Add elicitation gate for R5 tool"**: appears on R5 tool declarations. Inserts an elicitation gate configuration template. This is the primary fix for R5 violations.
- **"This tool is fleet-locked — contact admin"**: appears on fleet-locked tool diagnostics. Read-only action that opens a notification with fleet admin contact info. No code change -- purely informational.
- **"Add deny rule for {tool}"**: appears on tool declarations. Inserts a deny rule template in SOUL.md for the selected tool. Cross-file edit.
- **"Upgrade trust tier to access {tool}"**: appears on tools gated by trust tier. Links to trust escalation documentation.

Quick-fix integration: code actions that produce edits go through the write-time validation layer. If the edit would create a new governance violation, the code action shows a preview of the violation before applying.

## Deliverables

- [ ] `claws-lsp/src/providers/governance-code-action.ts` — Code action provider: context-aware action generation based on diagnostic kind (R5, fleet lock, trust gate), workspace edit generation for elicitation gates and deny rules, preview validation via serve compile
- [ ] `claws-lsp/src/actions/add-elicitation-gate.ts` — "Add elicitation gate" action: generates gate config template for R5 tool, inserts at correct position in TOOLS.md, validates via serve before applying
- [ ] `claws-lsp/src/actions/add-deny-rule.ts` — "Add deny rule" action: generates deny rule for selected tool in SOUL.md (cross-file edit), positions rule in appropriate section
- [ ] `claws-lsp/src/actions/fleet-lock-info.ts` — "Fleet-locked" action: informational notification with fleet admin contact, no code edit, links to fleet policy documentation
- [ ] `claws-lsp/src/actions/trust-tier-info.ts` — "Upgrade trust tier" action: informational notification with trust escalation docs, links to request escalation flow
- [ ] `claws-lsp/tests/providers/governance-code-action.unit.test.ts` — L0: R5 diagnostic offers "Add elicitation gate" action (1), fleet lock diagnostic offers informational action (1), trust-gated tool offers "Upgrade trust tier" action (1), deny rule action generates SOUL.md edit (1), elicitation gate action generates TOOLS.md edit (1), preview validation checks serve before applying (1)
- [ ] `claws-lsp/tests/providers/governance-code-action.integration.test.ts` — L1: elicitation gate insertion validates via serve compile (1), deny rule cross-file edit positions correctly in SOUL.md (1), code action previews governance impact of edit (1)

## Acceptance Criteria

- [ ] R5 tool declarations offer "Add elicitation gate" code action
- [ ] Elicitation gate action inserts valid configuration template
- [ ] Fleet-locked tools show informational code action with admin contact
- [ ] "Add deny rule" creates cross-file edit in SOUL.md
- [ ] Deny rule positions correctly in the appropriate SOUL.md section
- [ ] "Upgrade trust tier" links to escalation documentation
- [ ] Code action edits validate via serve before applying
- [ ] Preview shows governance impact if edit creates new violations
- [ ] All 6 L0 unit tests pass
- [ ] All 3 L1 integration tests pass

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/architect.md` — code action patterns, cross-file edit conventions
- `.craft/roles/claws/platform-eng.md` — governance quick-fix generation, validation integration

## Dependencies

- Pulse 56 (LSP validation) — diagnostics that code actions attach to, serve client
- Pulse 57 (Decorations) — visual context that code actions complement

## Test Gates

- [ ] L0 unit (6 tests): R5 offers elicitation gate, fleet lock offers info action, trust gate offers upgrade, deny rule generates SOUL.md edit, elicitation gate generates TOOLS.md edit, preview validates via serve
- [ ] L1 integration (3 tests): elicitation gate validates via serve, deny rule cross-file edit positions correctly, code action previews governance impact
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
