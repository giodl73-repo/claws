---
pulse: 76
slug: claws-lsp-rename
plan: claws-pre-extraction-packaging
depends_on: [54]
governing_roles: [craft:architect, claws:claws-repo-steward]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 0
  L1_integration: 1
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run:
    - "cd claws-sdk && npx vitest run --coverage"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 11
---

# Pulse 76: claws-lsp → @bic/openclaw-lsp Rename (6-point cascade; P54 split)

## Objective

**Split from P54 per architect M1**. Execute the 6-point rename cascade for the claws-lsp package → `@bic/openclaw-lsp`. This is bic/claws-internal (not upstreamed); it's the workspace LSP server, stays under claws indefinitely. Each of the 6 touch points is enumerated and verified post-pulse.

## Deliverables

- [ ] **Touch point 1**: `claws-lsp/package.json` — `"name": "@bic/openclaw-lsp"` (was `@bic/openclaw-lsp`)
- [ ] **Touch point 2**: `claws-lsp/src/` internal imports — grep for old name in `src/` returns zero; all internal path aliases + self-references updated
- [ ] **Touch point 3**: `claws-lsp/src/*.ts` files referring to an external `@bic/openclaw-lsp` import — update to self-reference or new name
- [ ] **Touch point 4**: `claws-sdk/package.json` devDependencies — rename `@bic/openclaw-lsp` reference to `@bic/openclaw-lsp`
- [ ] **Touch point 5**: `claws-sdk/tsconfig.json` — path-mapping `"@bic/openclaw-lsp/*"` → `"@bic/openclaw-lsp/*"`
- [ ] **Touch point 6**: `claws-sdk/vitest.config.ts` — alias reference updated
- [ ] L1 regression test: claws-lsp server starts + accepts an LSP `initialize` request + responds with expected `capabilities` payload (proves the rename didn't break the server)
- [ ] `grep -r '@bic/openclaw-lsp\|claws-lsp"' claws-sdk/ claws-lsp/` returns zero
- [ ] `grep -r '@bic/openclaw-lsp' claws-sdk/ claws-lsp/` returns expected matches (one per touch point)
- [ ] `npx tsc --noEmit` exits 0 in claws-sdk after rename

## Acceptance Criteria

- All 6 touch points explicitly verified
- Grep gate: zero old-name references; expected new-name references present
- LSP server initialize test passes

## Governing Roles

- `craft:architect` — rename cascade completeness
- `claws:claws-repo-steward` — bic/claws-internal scoping

## Dependencies

P54 (@craftworks sweep done in claws-sdk).

## Test Gates

L1: 1 LSP initialize test. 6-touch-point grep gate.
