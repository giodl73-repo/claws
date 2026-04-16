---
pulse: 56
slug: vscode-lsp-validation
plan: claws-tui
depends_on: [30]
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
checkpoint: 7
checkpoint_gate: false
---

# Pulse 56: VS Code LSP — Governance Diagnostics + Code Lens

## Objective

Wire the existing claws-lsp providers to CL-10 write-time validation. The LSP already has 6 provider stubs (diagnostics, hover, code actions, code lens, completions, semantic tokens). This pulse activates the diagnostics and code lens providers with GovernanceIR data.

Moved to CP-7 so developers have governance diagnostics while building CP-7/CP-8 pulses.

Diagnostics: when editing TOOLS.md or SOUL.md, the LSP compiles via `claws serve` and maps GovernanceIR violations to LSP diagnostics. Risk violations appear as squiggly lines (warning for R3-R4, error for R5). Missing elicitation gates appear as information diagnostics. Deny rule warnings in SOUL.md appear as warning diagnostics.

Code Lens: each tool declaration in TOOLS.md gets a code lens showing its R-level: "R1 READ", "R3 COMMUNICATE", "R5 TRANSACT (locked)". Code lens for deny rules in SOUL.md shows: "Deny Rule (user-authored)" or "Deny Rule (compiler-injected)".

The LSP connects to `claws serve` the same way the TUI does -- HTTP client to the chunk and compile APIs. This makes the VS Code extension the fourth consumer of `claws serve`.

## Deliverables

- [ ] `claws-lsp/src/providers/governance-diagnostic.ts` — Diagnostics provider: compiles workspace via serve, maps GovernanceIR violations to LSP Diagnostic objects (severity from risk level), ranges from tool/rule positions in source files
- [ ] `claws-lsp/src/providers/governance-code-lens.ts` — Code lens provider: R-level lens per tool declaration in TOOLS.md, deny rule classification lens in SOUL.md, fleet lock lens on locked tools
- [ ] `claws-lsp/src/serve-client.ts` — HTTP client for `claws serve` from LSP context: compile endpoint, chunk endpoints, health check, connection state management
- [ ] `claws-lsp/src/providers/governance-diagnostic.ts` (EDIT) — Map risk levels to diagnostic severity: R1-R2 = Information, R3-R4 = Warning, R5 = Error
- [ ] `claws-lsp/tests/providers/governance-diagnostic.unit.test.ts` — L0: R5 violation maps to Error diagnostic (1), R3 violation maps to Warning diagnostic (1), missing elicitation gate maps to Information diagnostic (1), deny rule warning in SOUL.md maps to Warning diagnostic (1)
- [ ] `claws-lsp/tests/providers/governance-code-lens.unit.test.ts` — L0: tool declaration gets R-level code lens (1), deny rule gets classification code lens (1)
- [ ] `claws-lsp/tests/providers/governance-diagnostic.integration.test.ts` — L1: diagnostics refresh on save via serve compile (1), code lens renders for multi-server TOOLS.md (1), diagnostic ranges map to correct source positions (1)

## Acceptance Criteria

- [ ] R5 violations appear as Error diagnostics (red squiggly) on tool declarations
- [ ] R3-R4 violations appear as Warning diagnostics (yellow squiggly)
- [ ] Missing elicitation gates appear as Information diagnostics
- [ ] Deny rule warnings appear on SOUL.md edits
- [ ] Code lens shows R-level per tool declaration ("R1 READ", "R5 TRANSACT (locked)")
- [ ] Code lens shows deny rule classification in SOUL.md
- [ ] LSP connects to `claws serve` via HTTP client
- [ ] Diagnostics refresh on file save
- [ ] All 6 L0 unit tests pass
- [ ] All 3 L1 integration tests pass

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/architect.md` — LSP provider patterns, diagnostic mapping
- `.craft/roles/claws/platform-eng.md` — GovernanceIR to LSP translation, serve client integration

## Dependencies

- Pulse 30 (claws-cap-integration: write-time validation layer) — CL-10 validation endpoints

## Test Gates

- [ ] L0 unit (6 tests): R5 maps to Error, R3 maps to Warning, missing elicitation gate maps to Information, deny rule maps to Warning, tool gets R-level code lens, deny rule gets classification code lens
- [ ] L1 integration (3 tests): diagnostics refresh on save, code lens renders for multi-server TOOLS.md, diagnostic ranges map correctly
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
