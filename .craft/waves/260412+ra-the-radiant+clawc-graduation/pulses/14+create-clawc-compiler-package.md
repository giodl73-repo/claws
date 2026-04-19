---
pulse: 14
slug: create-claws-compiler-package
plan: claws-sdk-graduation
depends_on: [13]
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 4
  L1_integration: 2
  L2_e2e: 1
  L3_accept: 0
test_scope:
  run:
    - "cd packages/@bic/claws-sdk && npx vitest run --project unit --coverage"
  typecheck:
    - "cd packages/@bic/claws-sdk && npx tsc --noEmit"
checkpoint: 3
checkpoint_gate: false
---

# Pulse 14: Create @bic/claws-sdk Package

## Objective

Create the `packages/@bic/claws-sdk/` package -- the standalone, MIT-licensed internal compiler package that publishes to GHE Packages (bic-internal). This package re-exports the internalized claws-sdk compilation modules (readers, crypto, audit, emit, enforce, cache, host, test, GovernanceIR) through a curated public API surface. NOT `export *` -- supply chain safety requires an explicit, audited re-export list (R1 review C2).

The curated re-export list IS the public API contract. Every symbol in the list is a semver commitment. Symbols not in the list are internal implementation details.

## Deliverables

- [x] `packages/@bic/claws-sdk/package.json` -- name: `@bic/claws-sdk`, version: `1.0.0`, license: `MIT`, main/module/types entry points, exports map with subpath exports for `./governance`, `./emit`, `./audit`, `./test`. Dependencies: zero `@craftworks/` packages. Engines: `node >=18`. Files whitelist for npm pack.
- [x] `packages/@bic/claws-sdk/LICENSE` -- MIT license text with correct copyright holder.
- [x] `packages/@bic/claws-sdk/src/index.ts` -- Curated re-exports from claws-sdk internalized modules. Explicit named exports for every public symbol: GovernanceIR, FailMode, CapabilityManifest, GovAnalysis, ConflictReport, AuditEvent, MechanicalIntent, serialize, deserialize, validateFailModes, Platform, EnforcementModel, PlatformCapability, and all other public types/functions. NO `export *` anywhere.
- [x] `packages/@bic/claws-sdk/src/governance/index.ts` -- Subpath export for governance types and analysis functions.
- [x] `packages/@bic/claws-sdk/src/emit/index.ts` -- Subpath export for OC and Claude Code emitters.
- [x] `packages/@bic/claws-sdk/src/audit/index.ts` -- Subpath export for Ed25519-signed audit chain.
- [x] `packages/@bic/claws-sdk/src/test/index.ts` -- Subpath export for 12-check validator.
- [x] `packages/@bic/claws-sdk/tsconfig.json` -- Strict TypeScript config, composite project references to claws-sdk.
- [x] `packages/@bic/claws-sdk/vitest.config.ts` -- Unit project with 95/90/95/95 per-file coverage thresholds.
- [x] `packages/@bic/claws-sdk/tests/exports.unit.test.ts` -- L0: every documented public symbol is re-exported (1 test), no undocumented symbols leak through (1 test), subpath exports resolve correctly (1 test), package.json has zero @craftworks/ dependencies (1 test)
- [x] `packages/@bic/claws-sdk/tests/standalone.integration.test.ts` -- L1: import from @bic/claws-sdk and run compile pipeline (1 test), import from subpaths and verify types match main export (1 test)
- [x] `packages/@bic/claws-sdk/tests/standalone.e2e.test.ts` -- L2: end-to-end compile pipeline from standalone @bic/claws-sdk package (1)

## Acceptance Criteria

- [x] `npm pack` in packages/@bic/claws-sdk produces a tarball with zero `@craftworks/` in dependencies
- [x] Every public API symbol is individually importable from the main entry point
- [x] Subpath exports (`@bic/claws-sdk/governance`, `@bic/claws-sdk/emit`, etc.) resolve correctly
- [x] No `export *` statements anywhere in the package source
- [x] License file says MIT
- [x] `npm run build` exits 0
- [x] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/architect.md` -- monorepo structure, package design, export map conventions
- `.craft/roles/claws/platform-eng.md` -- curated re-exports, supply chain safety, npm packaging

## Dependencies

Pulse 13 -- all @craftworks/ imports removed from core compilation path. Without this, the package would inherit external dependencies.

## Test Gates

- [x] L0 unit (4 tests): all public symbols exported (1), no undocumented symbols (1), subpath exports resolve (1), zero @craftworks/ deps (1)
- [x] L1 integration (2 tests): standalone compile pipeline (1), subpath type parity (1)
- [x] L2 e2e (1 test): end-to-end compile pipeline from standalone package (1)
- [x] `npm run build` exits 0
- [x] `npx tsc --noEmit` exits 0
