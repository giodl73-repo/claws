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
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run:
    - "cd packages/@claws/compiler && npx vitest run --project unit --coverage"
  typecheck:
    - "cd packages/@claws/compiler && npx tsc --noEmit"
checkpoint: 3
checkpoint_gate: false
---

# Pulse 14: Create @claws/compiler Package

## Objective

Create the `packages/@claws/compiler/` package -- the standalone, MIT-licensed free-tier compiler that ships to public npm. This package re-exports the internalized claws-sdk compilation modules (readers, crypto, audit, emit, enforce, cache, host, test, GovernanceIR) through a curated public API surface. NOT `export *` -- supply chain safety requires an explicit, audited re-export list (R1 review C2).

The curated re-export list IS the public API contract. Every symbol in the list is a semver commitment. Symbols not in the list are internal implementation details.

## Deliverables

- [ ] `packages/@claws/compiler/package.json` -- name: `@claws/compiler`, version: `1.0.0`, license: `MIT`, main/module/types entry points, exports map with subpath exports for `./governance`, `./emit`, `./audit`, `./test`. Dependencies: zero `@craftworks/` packages. Engines: `node >=18`. Files whitelist for npm pack.
- [ ] `packages/@claws/compiler/LICENSE` -- MIT license text with correct copyright holder.
- [ ] `packages/@claws/compiler/src/index.ts` -- Curated re-exports from claws-sdk internalized modules. Explicit named exports for every public symbol: GovernanceIR, FailMode, CapabilityManifest, GovAnalysis, ConflictReport, AuditEvent, MechanicalIntent, serialize, deserialize, validateFailModes, Platform, EnforcementModel, PlatformCapability, and all other public types/functions. NO `export *` anywhere.
- [ ] `packages/@claws/compiler/src/governance/index.ts` -- Subpath export for governance types and analysis functions.
- [ ] `packages/@claws/compiler/src/emit/index.ts` -- Subpath export for OC and Claude Code emitters.
- [ ] `packages/@claws/compiler/src/audit/index.ts` -- Subpath export for Ed25519-signed audit chain.
- [ ] `packages/@claws/compiler/src/test/index.ts` -- Subpath export for 12-check validator.
- [ ] `packages/@claws/compiler/tsconfig.json` -- Strict TypeScript config, composite project references to claws-sdk.
- [ ] `packages/@claws/compiler/vitest.config.ts` -- Unit project with 95/90/95/95 per-file coverage thresholds.
- [ ] `packages/@claws/compiler/tests/exports.unit.test.ts` -- L0: every documented public symbol is re-exported (1 test), no undocumented symbols leak through (1 test), subpath exports resolve correctly (1 test), package.json has zero @craftworks/ dependencies (1 test)
- [ ] `packages/@claws/compiler/tests/standalone.integration.test.ts` -- L1: import from @claws/compiler and run compile pipeline (1 test), import from subpaths and verify types match main export (1 test)

## Acceptance Criteria

- [ ] `npm pack` in packages/@claws/compiler produces a tarball with zero `@craftworks/` in dependencies
- [ ] Every public API symbol is individually importable from the main entry point
- [ ] Subpath exports (`@claws/compiler/governance`, `@claws/compiler/emit`, etc.) resolve correctly
- [ ] No `export *` statements anywhere in the package source
- [ ] License file says MIT
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/architect.md` -- monorepo structure, package design, export map conventions
- `.craft/roles/claws/platform-eng.md` -- curated re-exports, supply chain safety, npm packaging

## Dependencies

Pulse 13 -- all @craftworks/ imports removed from core compilation path. Without this, the package would inherit external dependencies.

## Test Gates

- [ ] L0 unit (4 tests): all public symbols exported (1), no undocumented symbols (1), subpath exports resolve (1), zero @craftworks/ deps (1)
- [ ] L1 integration (2 tests): standalone compile pipeline (1), subpath type parity (1)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
