---
pulse: 33
slug: lsp-compilation-host
plan: claws-lsp
depends_on: []
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 5
  L1_integration: 2
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run:
    - "cd claws-lsp && npx vitest run --project unit --coverage"
    - "cd claws-lsp && npx vitest run --project integration --coverage"
  typecheck:
    - "cd claws-lsp && npx tsc --noEmit"
checkpoint: 4
checkpoint_gate: false
---

# Pulse 33: LSP Compilation Host

## Objective

Build the CompilationHost with cached GovernanceIR for sub-200ms responses. Implement SHA-256 hash-based invalidation per file so that only changed files trigger recompilation. Add a 300ms batch window that collects rapid saves into a single compile pass, preventing redundant recompiles during burst editing. Follow the compiler-sdk/src/astro/lsp/project-index.ts pattern for cache structure and invalidation logic. Also bootstrap the claws-lsp package with package.json, tsconfig.json, and vitest.config.ts so it integrates into the monorepo workspace.

## Deliverables

- [ ] `claws-lsp/package.json` — workspace package with vscode-languageserver dependency
- [ ] `claws-lsp/tsconfig.json` — extends monorepo base, imports from claws-sdk only
- [ ] `claws-lsp/vitest.config.ts` — test config with coverage gating
- [ ] `claws-lsp/src/compilation-host.ts` — cached GovernanceIR, SHA-256 hash map, 300ms batch timer, incremental recompile
- [ ] `claws-lsp/tests/compilation-host.unit.test.ts` — L0: cache hit returns cached IR (1), cache miss triggers recompile (1), hash invalidation on file change (1), batch window batches rapid saves (1), unchanged file re-save skips recompile (1)
- [ ] `claws-lsp/tests/compilation-host.integration.test.ts` — L1: CompilationHost on fixture workspace (1), incremental recompile on single file change (1)

## Acceptance Criteria

- [ ] CompilationHost returns cached GovernanceIR in under 200ms on cache hit
- [ ] SHA-256 hash map correctly identifies changed vs unchanged files
- [ ] 300ms batch window collapses multiple rapid saves into one compile pass
- [ ] Unchanged file re-save does not trigger recompilation
- [ ] claws-lsp package installs and builds within the monorepo workspace
- [ ] All 5 L0 unit tests pass
- [ ] All 2 L1 integration tests pass

## Governing Roles

Load these role files before starting:

- `.craft/roles/claws/architect.md` — system-level design authority for claws packages
- `.craft/roles/claws/platform-eng.md` — implementation patterns and package scaffolding

## Dependencies

None — this is the foundation pulse for the LSP package.

## Test Gates

- [ ] L0 unit (5 tests): cache hit returns cached IR, cache miss triggers recompile, hash invalidation on file change, batch window batches rapid saves, unchanged file re-save skips recompile
- [ ] L1 integration (2 tests): CompilationHost on fixture workspace, incremental recompile on single file change
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
