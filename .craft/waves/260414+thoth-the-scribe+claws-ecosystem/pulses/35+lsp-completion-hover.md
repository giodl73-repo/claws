---
pulse: 35
slug: lsp-completion-hover
plan: claws-lsp
depends_on: [33, 34]
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 4
  L1_integration: 2
  L2_e2e: 1
  L3_accept: 1
test_scope:
  run:
    - "cd claws-lsp && npx vitest run"
  typecheck:
    - "cd claws-lsp && npx tsc --noEmit"
checkpoint: 4
checkpoint_gate: false
---

# Pulse 35: LSP Completion and Hover

## Objective

Build the RELAX expression completion provider and risk classification hover provider. Completions trigger in claws.json policy fields for RELAX expressions, policy template snippets, and tool name completion from the workspace manifest. Hover on tool names shows a risk card with R1-R5 classification, OBO status, and capability list. The completion provider uses the CompilationHost's cached GovernanceIR to resolve tool names and RELAX expression context. Policy template snippets offer pre-built governance patterns (e.g., deny-by-default, least-privilege tool set).

## Deliverables

- [ ] `claws-lsp/src/providers/completion.ts` — RELAX completions, policy template snippets, tool name completion
- [ ] `claws-lsp/src/providers/hover.ts` — risk classification (R1-R5), OBO status, capability list on tool hover
- [ ] `claws-lsp/tests/providers/completion.unit.test.ts` — L0: RELAX completion items (1), policy template snippet (1)
- [ ] `claws-lsp/tests/providers/hover.unit.test.ts` — L0: risk card shows R-level (1), OBO status displayed (1)
- [ ] `claws-lsp/tests/providers/completion-hover.integration.test.ts` — L1: completion + hover on fixture workspace (1), RELAX expression completion pipeline (1)
- [ ] `claws-lsp/tests/providers/completion-hover.e2e.test.ts` — L2: completion + hover lifecycle on fixture workspace: request completion at RELAX position, verify items, hover over tool name, verify risk card (1)
- [ ] `claws-sdk/tests/lsp/lsp-completion-hover.accept.test.ts` — L3: SDK acceptance — consumer requests RELAX completions and tool hover via LSP protocol, verifies completion items contain valid policy patterns and hover cards show correct R-level classification

## Acceptance Criteria

- [ ] RELAX expression completions appear in claws.json policy fields
- [ ] Policy template snippets insert valid governance patterns
- [ ] Tool name completion resolves from workspace manifest
- [ ] Hover on tool name displays R1-R5 risk classification
- [ ] Hover shows OBO status and capability list
- [ ] All 4 L0 unit tests pass
- [ ] All 2 L1 integration tests pass

## Governing Roles

Load these role files before starting:

- `.craft/roles/claws/architect.md` — system-level design authority for claws packages
- `.craft/roles/claws/platform-eng.md` — implementation patterns and provider contracts

## Dependencies

- Pulse 33 (lsp-compilation-host) — CompilationHost provides cached GovernanceIR for tool resolution
- Pulse 34 (lsp-diagnostics) — LSP server entry point and document lifecycle

## Test Gates

- [ ] L0 unit (4 tests): RELAX completion items, policy template snippet, risk card shows R-level, OBO status displayed
- [ ] L1 integration (2 tests): completion + hover on fixture workspace, RELAX expression completion pipeline
- [ ] L2 E2E (1 test): completion + hover lifecycle on fixture workspace: request completion at RELAX position, verify items, hover over tool name, verify risk card
- [ ] L3 accept (1 test): SDK acceptance — consumer RELAX completion + tool hover via LSP protocol
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
