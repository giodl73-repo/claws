---
pulse: 36
slug: lsp-code-actions-tokens
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

# Pulse 36: LSP Code Actions and Semantic Tokens

## Objective

Build auto-fix code actions for governance violations (6 fix types) and a semantic token provider with risk-level coloring. The 6 code action types are: add missing frontmatter, fix risk level, add elicitation gate, add OBO declaration, add data label, and add deny intent. Each code action generates a workspace edit that resolves the corresponding diagnostic. The semantic token provider registers token types governance.risk.r1 through governance.risk.r5 (green/blue/yellow/orange/red color mapping) and governance.obo (underline modifier) so editors can visually distinguish risk levels at a glance.

## Deliverables

- [ ] `claws-lsp/src/providers/code-action.ts` — 6 auto-fix types: add frontmatter, fix risk level, add elicitation, add OBO declaration, add data label, add deny intent
- [ ] `claws-lsp/src/providers/semantic-tokens.ts` — token legend with governance.risk.r1-r5, governance.obo token types, risk-level color mapping
- [ ] `claws-lsp/tests/providers/code-action.unit.test.ts` — L0: fix action generation from diagnostic (1), edit application correct (1)
- [ ] `claws-lsp/tests/providers/semantic-tokens.unit.test.ts` — L0: R5 tool gets governance.risk.r5 token (1), OBO declaration gets underline modifier (1)
- [ ] `claws-lsp/tests/providers/code-action-tokens.integration.test.ts` — L1: code action applied fixes violation (1), semantic tokens correct across workspace (1)
- [ ] `claws-lsp/tests/providers/code-action-tokens.e2e.test.ts` — L2: code action + semantic tokens lifecycle: open file with violation, verify diagnostic, apply code action, verify fix, check semantic tokens colored correctly (1)
- [ ] `claws-sdk/tests/lsp/lsp-code-actions-tokens.accept.test.ts` — L3: SDK acceptance — consumer triggers code action on governance violation via LSP protocol, verifies workspace edit resolves diagnostic and semantic tokens apply correct risk-level coloring

## Acceptance Criteria

- [ ] All 6 code action types generate correct workspace edits
- [ ] Code actions resolve the corresponding governance diagnostic
- [ ] Semantic tokens register all 5 risk-level token types (r1-r5)
- [ ] governance.obo token type uses underline modifier
- [ ] Risk-level color mapping follows green/blue/yellow/orange/red progression
- [ ] All 4 L0 unit tests pass
- [ ] All 2 L1 integration tests pass

## Governing Roles

Load these role files before starting:
- `.craft/roles/claws/architect.md` — system-level design authority for claws packages
- `.craft/roles/claws/platform-eng.md` — implementation patterns and LSP provider contracts

## Dependencies

- Pulse 33 (lsp-compilation-host) — CompilationHost provides GovernanceIR for code action context
- Pulse 34 (lsp-diagnostics) — diagnostics that code actions resolve

## Test Gates

- [ ] L0 unit (4 tests): fix action generation from diagnostic, edit application correct, R5 tool gets governance.risk.r5 token, OBO declaration gets underline modifier
- [ ] L1 integration (2 tests): code action applied fixes violation, semantic tokens correct across workspace
- [ ] L2 E2E (1 test): code action + semantic tokens lifecycle: open file with violation, verify diagnostic, apply code action, verify fix, check semantic tokens colored correctly
- [ ] L3 accept (1 test): SDK acceptance — consumer code action + semantic tokens via LSP protocol
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
