---
pulse: 15
slug: create-craftworks-extension
plan: claws-sdk-graduation
depends_on: [14]
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 4
  L1_integration: 3
  L2_e2e: 1
  L3_accept: 0
test_scope:
  run:
    - "cd packages/@bic/claws-sdk && npx vitest run --project unit --coverage"
    - "cd packages/@bic/claws-sdk && npx vitest run --project integration --coverage"
  typecheck:
    - "cd packages/@bic/claws-sdk && npx tsc --noEmit"
checkpoint: 3
checkpoint_gate: false
---

# Pulse 15: Create @bic/claws-sdk Extension Package

## Objective

Create `packages/@bic/claws-sdk/` -- the proprietary enterprise extension that imports `@bic/claws-sdk` and adds fleet, compliance, SIEM, PRESS, RELAX, identity, budget, LSP, snapshots, context, and serve modules. This package is the paid tier: it extends the free compiler, never forks it. `@bic/claws-sdk` is listed as a dependency with exact version + integrity hash pinning (R1 review C5).

The extension re-exports all free-tier symbols (curated, not `export *`) so enterprise consumers can use a single import for everything. Enterprise-only modules are exported alongside the free-tier symbols.

## Deliverables

- [x] `packages/@bic/claws-sdk/package.json` -- name: `@bic/claws-sdk`, version: `1.0.0`, license: `UNLICENSED` (proprietary), dependency on `@bic/claws-sdk` with exact version + integrity hash. Dependencies include `@craftworks/compiler-sdk` and `@craftworks/agent-sdk` for enterprise modules. Engines: `node >=18`.
- [x] `packages/@bic/claws-sdk/LICENSE` -- Proprietary license (all rights reserved, enterprise customers only).
- [x] `packages/@bic/claws-sdk/src/index.ts` -- Curated re-exports from `@bic/claws-sdk` (explicit named exports matching the free tier's public API) PLUS enterprise module exports: FleetScanner, FleetBroadcaster, DriftDetector from `./fleet/`, SOC2Evidence, HIPAAEvidence, EUAIActEvidence from `./compliance/`, CEFEmitter, SyslogEmitter, NDJSONEmitter from `./siem/`, PRESSCompressor from `./press/`, RELAXEvaluator from `./relax/`, IdentityBridge, RBACResolver from `./identity/`, BudgetTracker, FleetBudgetAggregator from `./budget/`, ClawsLanguageServer from `./lsp/`, SnapshotManager from `./snapshot/`, ContextDAG from `./context/`, ClawsServer from `./serve/`. NO `export *`.
- [x] `packages/@bic/claws-sdk/src/fleet/index.ts` -- Fleet module barrel: re-exports fleet ops from existing claws-sdk fleet implementation.
- [x] `packages/@bic/claws-sdk/src/compliance/index.ts` -- Compliance module barrel: re-exports SOC2/HIPAA/EU AI Act evidence generators.
- [x] `packages/@bic/claws-sdk/src/siem/index.ts` -- SIEM module barrel: re-exports CEF, syslog, NDJSON emitters.
- [x] `packages/@bic/claws-sdk/tsconfig.json` -- Strict TypeScript config, project references to @bic/claws-sdk.
- [x] `packages/@bic/claws-sdk/vitest.config.ts` -- Dual-project config: unit (95/90/95/95 per-file), integration (85/70/80/85 whole-package).
- [x] `packages/@bic/claws-sdk/tests/extension.unit.test.ts` -- L0: all free-tier symbols re-exported (1 test), all enterprise symbols exported (1 test), no export * in source (1 test), @bic/claws-sdk is pinned with exact version (1 test)
- [x] `packages/@bic/claws-sdk/tests/extends-free.integration.test.ts` -- L1: enterprise module imports resolve alongside free-tier imports (1 test), free-tier types from extension match types from @bic/claws-sdk directly (1 test), pinch output is identical whether imported from free or enterprise package (1 test)
- [x] `packages/@bic/claws-sdk/tests/extends-free.e2e.test.ts` -- L2: end-to-end enterprise extension compile with fleet + compliance modules (1)

## Acceptance Criteria

- [x] `@bic/claws-sdk` appears in dependencies with exact version (no caret, no tilde)
- [x] Free-tier symbols are importable from `@bic/claws-sdk` with identical types
- [x] Enterprise modules (fleet, compliance, SIEM, PRESS, RELAX, identity, budget) are importable
- [x] No `export *` statements anywhere in the package source
- [x] License file says proprietary / UNLICENSED
- [x] `npm run build` exits 0
- [x] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:

- `.craft/roles/craft/architect.md` -- monorepo structure, extension pattern, curated re-export conventions
- `.craft/roles/claws/platform-eng.md` -- freemium boundary, enterprise module wiring, integrity hash pinning

## Dependencies

Pulse 14 -- @bic/claws-sdk package must exist before the extension can import from it.

## Test Gates

- [x] L0 unit (4 tests): free-tier re-exports complete (1), enterprise exports complete (1), no export * (1), exact version pinning (1)
- [x] L1 integration (3 tests): enterprise + free imports coexist (1), type parity (1), identical pinch output (1)
- [x] L2 e2e (1 test): end-to-end enterprise extension compile (1)
- [x] `npm run build` exits 0
- [x] `npx tsc --noEmit` exits 0
