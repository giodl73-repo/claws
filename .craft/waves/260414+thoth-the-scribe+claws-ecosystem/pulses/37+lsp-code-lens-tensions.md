---
pulse: 37
slug: lsp-code-lens-tensions
plan: claws-lsp
depends_on: [33, 34, 35, 36]
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 3
  L1_integration: 2
  L2_e2e: 2
  L3_accept: 2
test_scope:
  run:
    - "cd claws-lsp && npx vitest run"
  typecheck:
    - "cd claws-lsp && npx tsc --noEmit"
checkpoint: 4
checkpoint_gate: false
---

# Pulse 37: LSP Code Lens and Cross-File Tensions

## Objective

Build the code lens provider for per-section aggregate governance summaries and cross-file tension detection. Code lens annotations appear above each TOOLS.md section showing a summary like "3 tools: 1xR3, 2xR5 | 2 OBO boundaries | 1 tension" — giving developers an at-a-glance governance posture per section. The tension detection module maps 7 conflict clusters (A through G) to file:line diagnostic locations, identifying where governance intent in one file contradicts or creates friction with declarations in another. This pulse also includes the full LSP lifecycle E2E test covering initialize through shutdown, and manual VS Code extension smoke tests documented as L3 acceptance criteria.

## Deliverables

- [ ] `claws-lsp/src/providers/code-lens.ts` — per-section aggregate: tool count, risk breakdown, OBO count, tension count
- [ ] `claws-lsp/src/tension/cross-file.ts` — 7 conflict cluster mapping (A-G) to file:line diagnostics
- [ ] `claws-lsp/tests/providers/code-lens.unit.test.ts` — L0: aggregate calculation correct (1), display format matches spec (1), empty section renders no lens (1)
- [ ] `claws-lsp/tests/tension/cross-file.integration.test.ts` — L1: multi-file tension detection pipeline (1), 7 clusters all mapped (1)
- [ ] `claws-lsp/tests/server.e2e.test.ts` — L2: full LSP lifecycle: initialize, open, edit, diagnostics, shutdown (1), LSP with cross-file tension workspace (1)
- [ ] `claws-lsp/tests/fixtures/tension-workspace/` — workspace with cross-file tensions for testing
- [ ] Manual VS Code extension smoke tests (L3: 2 tests documented as manual)

## Acceptance Criteria

- [ ] Code lens displays per-section aggregate with tool count, risk breakdown, OBO count, and tension count
- [ ] Empty sections render no code lens annotation
- [ ] Display format matches spec: "{N} tools: {risk breakdown} | {OBO count} OBO boundaries | {tension count} tension"
- [ ] All 7 conflict clusters (A-G) map to file:line diagnostic locations
- [ ] Full LSP lifecycle (initialize through shutdown) completes without errors
- [ ] Cross-file tension workspace fixture exercises all conflict clusters
- [ ] All 3 L0 unit tests pass
- [ ] All 2 L1 integration tests pass
- [ ] All 2 L2 E2E tests pass
- [ ] 2 L3 manual smoke tests documented

## Governing Roles

Load these role files before starting:
- `.craft/roles/claws/architect.md` — system-level design authority for claws packages
- `.craft/roles/claws/platform-eng.md` — implementation patterns and tension detection design

## Dependencies

- Pulse 33 (lsp-compilation-host) — CompilationHost provides cached GovernanceIR
- Pulse 34 (lsp-diagnostics) — LSP server and diagnostic infrastructure
- Pulse 35 (lsp-completion-hover) — completion and hover providers registered
- Pulse 36 (lsp-code-actions-tokens) — code actions and semantic tokens registered

## Test Gates

- [ ] L0 unit (3 tests): aggregate calculation correct, display format matches spec, empty section renders no lens
- [ ] L1 integration (2 tests): multi-file tension detection pipeline, 7 clusters all mapped
- [ ] L2 E2E (2 tests): full LSP lifecycle (initialize, open, edit, diagnostics, shutdown), LSP with cross-file tension workspace
- [ ] L3 accept (2 tests): manual VS Code extension smoke tests documented
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
