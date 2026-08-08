---
pulse: 20
slug: npm-publish-pipeline
plan: claws-sdk-graduation
depends_on: [19]
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 2
  L1_integration: 2
  L2_e2e: 2
  L3_accept: 2
test_scope:
  run:
    - "cd packages/@bic/claws-sdk && npx vitest run --project unit --coverage"
    - "cd packages/@bic/claws-sdk && npx vitest run --project integration --coverage"
    - "cd packages/@bic/claws-sdk && npx vitest run --project unit --coverage"
  typecheck:
    - "cd packages/@bic/claws-sdk && npx tsc --noEmit"
    - "cd packages/@bic/claws-sdk && npx tsc --noEmit"
checkpoint: 4
checkpoint_gate: true
---

# Pulse 20: npm Publish Pipeline

## Objective

Build the npm publish pipeline for both packages: `@bic/claws-sdk` (MIT) and `@bic/claws-sdk` (proprietary). Both publish to GHE Packages (bic-internal GitHub Enterprise). The pipeline enforces the freemium boundary at publish time: the CI gate verifies that the free-tier tarball contains zero `@craftworks/` references in its dependency tree. Integrity hash generation pins the exact @bic/claws-sdk version in @bic/claws-sdk.

This is the CP-4 gate pulse. Both packages must be publishable with all quality gates passing before the wave can advance to CP-5.

## Deliverables

- [ ] `.github/workflows/publish-claws-compiler.yml` -- GitHub Actions workflow for @bic/claws-sdk: triggers on version tag (`v*`), runs full test suite (L0+L1+L2), runs publint, runs API diff check against baseline, builds package, runs `npm pack` and inspects tarball for zero @craftworks/ references, publishes to GHE Packages with provenance. Manual approval step before actual publish.
- [ ] `.github/workflows/publish-claws-sdk.yml` -- GitHub Actions workflow for @bic/claws-sdk: triggers on version tag, runs full test suite, verifies @bic/claws-sdk dependency is pinned with integrity hash, builds package, publishes to GHE Packages. Must run AFTER @bic/claws-sdk publish completes (sequential dependency).
- [ ] `packages/@bic/claws-sdk/scripts/check-tarball.ts` -- Script that runs `npm pack --dry-run`, inspects the tarball file list, and verifies: (1) zero files import from @craftworks/, (2) package.json has zero @craftworks/ dependencies, (3) license file is MIT, (4) no test files included, (5) no source maps in production build. Exits non-zero on any violation.
- [ ] `packages/@bic/claws-sdk/scripts/pin-integrity.ts` -- Script that generates the SHA-512 integrity hash of the @bic/claws-sdk tarball and updates @bic/claws-sdk's package.json with the pinned version + hash.
- [ ] `packages/@bic/claws-sdk/scripts/publish-preflight.ts` -- Pre-publish checklist script: runs publint, API diff, tarball check, integrity hash generation, CHANGELOG check (current version has entry), and version tag check. All must pass before publish is allowed.
- [ ] `packages/@bic/claws-sdk/tests/publish-pipeline.unit.test.ts` -- L0: tarball check script detects @craftworks/ in dependencies (1 test), integrity hash is deterministic across runs (1 test)
- [ ] `packages/@bic/claws-sdk/tests/publish-gate.integration.test.ts` -- L1: publish-preflight script passes for valid package (1 test), publish-preflight script fails when @craftworks/ dependency is injected (1 test)
- [ ] `tests/publish-e2e.e2e.test.ts` -- L2: full publish dry-run for @bic/claws-sdk (npm pack + all checks pass) (1 test), full publish dry-run for @bic/claws-sdk (npm pack + integrity hash matches) (1 test)
- [ ] `tests/publish-acceptance.accept.test.ts` -- L3: @bic/claws-sdk tarball installs in clean project and runs compile+pinch+build (1 test), @bic/claws-sdk tarball installs with @bic/claws-sdk and enterprise features are accessible (1 test)

## Acceptance Criteria

- [ ] @bic/claws-sdk publish workflow runs successfully in dry-run mode
- [ ] @bic/claws-sdk publish workflow runs successfully in dry-run mode
- [ ] CI gate: `npm pack @bic/claws-sdk` tarball has zero `@craftworks/` in dependency tree
- [ ] CI gate: @bic/claws-sdk tarball has MIT license, no test files, no source maps
- [ ] Integrity hash is generated and pinned in @bic/claws-sdk package.json
- [ ] Publish-preflight checklist passes: publint, API diff, tarball check, integrity, CHANGELOG, version tag
- [ ] Sequential dependency: @bic/claws-sdk publish waits for @bic/claws-sdk publish
- [ ] Manual approval gate before actual GHE Packages publish
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:

- `.craft/roles/craft/architect.md` -- CI/CD pipeline design, publish workflow conventions, quality gates
- `.craft/roles/claws/platform-eng.md` -- npm publishing, integrity hashing, freemium boundary enforcement

## Dependencies

Pulse 19 -- documentation and migration guide complete. All package work from CP-3 finalized. CHANGELOG.md populated.

## Test Gates

- [ ] L0 unit (2 tests): tarball check detects violations (1), integrity hash deterministic (1)
- [ ] L1 integration (2 tests): preflight passes for valid package (1), preflight fails on injected violation (1)
- [ ] L2 e2e (2 tests): compiler dry-run publish (1), extension dry-run publish (1)
- [ ] L3 acceptance (2 tests): compiler tarball installs + runs standalone (1), extension tarball installs with compiler + enterprise features work (1)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
