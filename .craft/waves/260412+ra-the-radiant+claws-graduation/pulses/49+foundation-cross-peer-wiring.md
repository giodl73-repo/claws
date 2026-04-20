---
pulse: 49
slug: foundation-cross-peer-wiring
plan: claws-pre-extraction-packaging
depends_on: [47, 48]
governing_roles: [craft:architect]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 0
  L1_integration: 6
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run:
    - "cd claws-sdk/packages/workspace && npx vitest run --coverage"
    - "cd claws-sdk/packages/guardrails && npx vitest run --coverage"
  typecheck:
    - "cd claws-sdk/packages/workspace && npx tsc --noEmit"
    - "cd claws-sdk/packages/guardrails && npx tsc --noEmit"
checkpoint: 10
---

# Pulse 49: Foundation Cross-Peer-Dep Wiring

## Objective

Wire peer-dep graph between foundation packages. Guardrails root `package.json` declares `@bic/openclaw-workspace` as peer (subpaths /audit + /approvals consume /canonicalize). workspace/ast imports nothing external. workspace/path imports `WorkspaceFileKind` from workspace/ast type-only. Verify cross-package imports resolve; TypeScript build green; 6 integration tests exercise the seams (conformance M13 closure: single root package.json with `exports` field, NOT per-subpath package.json files).

## Deliverables

- [ ] `claws-sdk/packages/guardrails/package.json` declares `peerDependencies: { "@bic/openclaw-workspace": "^0.1.0" }` at root (conformance M13 — Node uses root package.json with exports, NOT per-subpath package.json)
- [ ] `claws-sdk/packages/workspace/src/path/index.ts` imports `WorkspaceFileKind` from `../ast` type-only (verified via `grep 'import type'`)
- [ ] Integration test: guardrails/audit → workspace/canonicalize chain (canonicalize audit entry, hash-chain verify)
- [ ] Integration test: guardrails/approvals → workspace/canonicalize for HandleBinding canonicalization (canonicalize binding, signer produces same bytes)
- [ ] Integration test: workspace/path + workspace/ast classify agreement (classify('SOUL.md') → 'SOUL'; parse('SOUL', content) returns non-null ast)
- [ ] Integration test: guardrails default export — HostContext with auditSink: AuditSink resolves (type-level check)
- [ ] Integration test: peer-dep resolution — guardrails/audit can `import { canonicalize } from '@bic/openclaw-workspace/canonicalize'`
- [ ] Integration test: peer-dep version compatibility (pin `^0.1.0` resolves to workspace pkg)
- [ ] = 6 L1 tests total
- [ ] `npm run build` from repo root exits 0 with both foundation packages compiling
- [ ] `npx tsc --noEmit` green in both packages

## Acceptance Criteria

- Single root package.json per package with `exports` field (no per-subpath pkg.json)
- 6 L1 integration tests pass
- Cross-package imports resolve without errors
- `npm run build` exits 0

## Governing Roles

- `craft:architect` — peer-dep honesty + type-level one-directional imports

## Dependencies

P47 (workspace) + P48 (guardrails) both committed with their respective packages.

## Test Gates

6 L1 integration tests named above. Build + typecheck green in both packages.
