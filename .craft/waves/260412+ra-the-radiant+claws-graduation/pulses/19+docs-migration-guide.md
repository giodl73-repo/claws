---
pulse: 19
slug: docs-migration-guide
plan: claws-sdk-graduation
depends_on: [16, 18]
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 2
  L1_integration: 2
  L2_e2e: 1
  L3_accept: 0
test_scope:
  run:
    - "cd packages/@bic/claws-sdk && npx vitest run --project integration --coverage"
  typecheck:
    - "cd packages/@bic/claws-sdk && npx tsc --noEmit"
    - "cd packages/@bic/claws-sdk && npx tsc --noEmit"
checkpoint: 4
checkpoint_gate: false
---

# Pulse 19: Documentation + Migration Guide

## Objective

Write the migration guide for consumers moving from the `@bic/claws-sdk` monolith to the new two-package model: `@bic/claws-sdk` (free, MIT) + `@bic/claws-sdk` (enterprise extension). The guide covers three migration paths: (1) free-tier-only consumers who only need the compiler, (2) enterprise consumers who keep the full extension, and (3) consumers who want to cherry-pick dialect packages. Includes an API mapping table showing every old import path and its new equivalent.

Also update CHANGELOG.md for both packages to document the 1.0.0 launch.

## Deliverables

- [ ] `docs/claws/migration/graduation-guide.md` -- Migration guide with three sections: "Free Tier Only" (uninstall @bic/claws-sdk, install @bic/claws-sdk, update imports), "Enterprise Extension" (install @bic/claws-sdk which pulls @bic/claws-sdk as dependency, no import changes needed), "Cherry-Pick Packages" (install individual @craftworks/ dialect packages for minimal footprint). Step-by-step instructions with before/after code samples.
- [ ] `docs/claws/migration/api-mapping.md` -- Complete API mapping table: every public symbol, its old import path (`@bic/claws-sdk/...`), and its new import path(s) (`@bic/claws-sdk`, `@bic/claws-sdk/governance`, `@bic/claws-sdk`). Organized by module (governance, emit, audit, test, crypto, enforce, etc.). Marks which symbols are free-tier vs enterprise-only.
- [ ] `packages/@bic/claws-sdk/CHANGELOG.md` (EDIT) -- Document 1.0.0 release: standalone compiler extracted from @bic/claws-sdk, MIT license, curated public API with N symbols, 2 emit targets (OC + Claude Code), R5 fail-closed enforcement, Ed25519 audit chain.
- [ ] `packages/@bic/claws-sdk/CHANGELOG.md` -- Document 1.0.0 release: enterprise extension model, depends on @bic/claws-sdk ^1.0.0 with integrity pinning, enterprise modules (fleet, compliance, SIEM, PRESS, RELAX, identity, budget, LSP, snapshots, context, serve).
- [ ] `docs/claws/architecture/packages.md` (EDIT) -- Update architecture docs to describe the two-package model, dependency graph, and freemium boundary.
- [ ] `docs/claws/architecture/graduation.md` -- New guide: internalization strategy, what was internalized and why, the extension-not-fork principle, how bug fixes propagate through semver.
- [ ] `packages/@bic/claws-sdk/tests/migration-docs.unit.test.ts` -- L0: migration guide file exists and contains all three migration path sections (1), API mapping table lists all public symbols from @bic/claws-sdk barrel export (1)
- [ ] `packages/@bic/claws-sdk/tests/migration-paths.integration.test.ts` -- L1: old @bic/claws-sdk import paths still work for enterprise consumers (1 test), @bic/claws-sdk exports match the API mapping table (1 test)
- [ ] `tests/migration-e2e.e2e.test.ts` -- L2: simulate free-tier migration (install @bic/claws-sdk only, run compile+pinch+build, verify success without @craftworks/) (1 test)

## Acceptance Criteria

- [ ] Migration guide covers all three paths with working code examples
- [ ] API mapping table lists every public symbol with old and new import paths
- [ ] CHANGELOG.md exists in both packages with 1.0.0 entries
- [ ] Architecture docs describe the two-package model accurately
- [ ] Graduation guide explains internalization strategy
- [ ] Migration test confirms old import paths work for enterprise consumers
- [ ] E2E test confirms free-tier migration works end-to-end
- [ ] All documentation renders correctly in markdown
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/architect.md` -- documentation structure, migration guide patterns, architecture documentation
- `.craft/roles/claws/platform-eng.md` -- consumer migration paths, API mapping, changelog conventions

## Dependencies

Pulse 16 -- API contract tests establish the public API surface that the migration guide documents. Pulse 18 -- package extraction complete, so all import paths are finalized.

## Test Gates

- [ ] L0 unit (2 tests): migration guide contains all three sections (1), API mapping table lists all public symbols (1)
- [ ] L1 integration (2 tests): old import paths work (1), API mapping table accurate (1)
- [ ] L2 e2e (1 test): free-tier migration end-to-end (1)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
