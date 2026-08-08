---
pulse: 34
slug: lsp-diagnostics
plan: claws-lsp
depends_on: [33]
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 4
  L1_integration: 3
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run:
    - "cd claws-lsp && npx vitest run"
  typecheck:
    - "cd claws-lsp && npx tsc --noEmit"
checkpoint: 4
checkpoint_gate: false
---

# Pulse 34: LSP Diagnostics

## Objective

Build the LSP server entry point and diagnostic provider. Map 10 governance diagnostic categories to governance rules so that violations surface as real-time editor diagnostics with file:line locations. Implement cross-file tension diagnostics: editing TOOLS.md triggers reanalysis of SOUL.md deny intents, AGENTS.md delegation graphs, and MEMORY.md data labels. The server entry point handles LSP initialize, capabilities negotiation, and document lifecycle handlers (open, change, close, save).

## Deliverables

- [ ] `claws-lsp/src/server.ts` — LSP server: initialize, capabilities, document lifecycle handlers
- [ ] `claws-lsp/src/providers/diagnostic.ts` — 10 diagnostic categories from governance rules, cross-file tension diagnostics with file:line locations
- [ ] `claws-lsp/tests/providers/diagnostic.unit.test.ts` — L0: diagnostic emission for governance violation (1), severity mapping (1), cross-file tension diagnostic location (1), 10 categories all mapped (1)
- [ ] `claws-lsp/tests/providers/diagnostic.integration.test.ts` — L1: edit TOOLS.md triggers diagnostic on SOUL.md (1), edit AGENTS.md triggers delegation graph re-analysis (1), multi-file tension pipeline (1)

## Acceptance Criteria

- [ ] LSP server initializes and negotiates capabilities correctly
- [ ] All 10 governance diagnostic categories produce diagnostics with correct severity
- [ ] Cross-file tension diagnostics emit on the correct file:line when a related file changes
- [ ] Editing TOOLS.md triggers SOUL.md deny intent reanalysis
- [ ] Editing AGENTS.md triggers delegation graph re-analysis
- [ ] Document lifecycle handlers (open, change, close, save) function correctly
- [ ] All 4 L0 unit tests pass
- [ ] All 3 L1 integration tests pass

## Governing Roles

Load these role files before starting:

- `.craft/roles/claws/architect.md` — system-level design authority for claws packages
- `.craft/roles/claws/platform-eng.md` — implementation patterns and diagnostic mapping

## Dependencies

- Pulse 33 (lsp-compilation-host) — CompilationHost provides cached GovernanceIR that diagnostics consume

## Test Gates

- [ ] L0 unit (4 tests): diagnostic emission for governance violation, severity mapping, cross-file tension diagnostic location, 10 categories all mapped
- [ ] L1 integration (3 tests): edit TOOLS.md triggers diagnostic on SOUL.md, edit AGENTS.md triggers delegation graph re-analysis, multi-file tension pipeline
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
