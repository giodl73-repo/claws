---
pulse: 13
slug: remove-craftworks-deps
plan: claws-sdk-graduation
depends_on: [12]
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 4
  L1_integration: 6
  L2_e2e: 2
  L3_accept: 0
test_scope:
  run:
    - "cd claws-sdk && npx vitest run --project unit --coverage"
    - "cd claws-sdk && npx vitest run --project integration --coverage"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 3
checkpoint_gate: false
---

# Pulse 13: Remove @craftworks/ Dependencies

## Objective

Remove all `@craftworks/` imports from the core compilation path in claws-sdk. After CP-1 (Infrastructure) and CP-2 (Emit + Compile) internalized readers, crypto, audit, emitters, validator, cache, and compile host, the core pipeline should have zero external SDK dependencies. This pulse systematically hunts down every remaining `@craftworks/compiler-sdk` and `@craftworks/agent-sdk` import in `src/compile/`, `src/emit/`, and `src/governance/`, replacing each with the internalized module from CP-1/CP-2.

This is the critical prerequisite for package split: until the compilation path is self-contained, `@claws/compiler` cannot ship standalone.

Validation: `grep -r '@craftworks' src/compile/ src/emit/ src/governance/` returns zero matches.

## Deliverables

- [ ] `claws-sdk/src/compile/**/*.ts` (EDIT) -- Replace every `@craftworks/compiler-sdk` and `@craftworks/agent-sdk` import with the internalized equivalent. Map each import to its CP-1/CP-2 replacement: readers from `../readers/`, crypto from `../crypto/`, audit from `../audit/`, emit from `../emit/`, cache from `../cache/`, host from `../host/`.
- [ ] `claws-sdk/src/emit/**/*.ts` (EDIT) -- Replace all external SDK imports in emitter modules. The OC and Claude Code emitters must import from internalized codegen utilities, not `@craftworks/compiler-sdk/astro/emit`.
- [ ] `claws-sdk/src/governance/**/*.ts` (EDIT) -- Replace external imports in governance modules. GovernanceIR types, rule analysis, and R5 enforcement must use own types from `../types/` and `../enforce/`.
- [ ] `claws-sdk/src/index.ts` (EDIT) -- Remove `@craftworks/compiler-sdk` and `@craftworks/agent-sdk` from re-exports in the main barrel. All public API symbols must come from internalized sources.
- [ ] `claws-sdk/package.json` (EDIT) -- Remove `@craftworks/compiler-sdk` and `@craftworks/agent-sdk` from `dependencies` (keep in `devDependencies` if needed for type comparison tests).
- [ ] `claws-sdk/tests/compile/no-external-deps.unit.test.ts` -- L0: grep source tree for @craftworks/ imports in compile path (1 test), grep emit path (1 test), grep governance path (1 test), verify package.json has zero @craftworks/ in dependencies (1 test)
- [ ] `claws-sdk/tests/compile/internalized-pipeline.integration.test.ts` -- L1: full compile pipeline runs without @craftworks/ packages installed (mock node_modules), OC reader reads 9 files from internalized reader (1 test), emitter produces Gateway plugin from internalized codegen (1 test), audit chain signs with internalized Ed25519 (1 test), R5 enforcement uses internalized enforce module (1 test), cache stores compilation artifacts via internalized cache (1 test), compile host orchestrates full pipeline via internalized host (1 test)
- [ ] `claws-sdk/tests/compile/standalone-compile.e2e.test.ts` -- L2: end-to-end compile with zero @craftworks/ on module resolution path (1 test), npm pack produces tarball with zero @craftworks/ in dependency tree (1 test)

## Acceptance Criteria

- [ ] `grep -r '@craftworks' src/compile/ src/emit/ src/governance/` returns zero matches
- [ ] `grep '@craftworks' package.json` shows zero entries in `dependencies` (may remain in `devDependencies`)
- [ ] Full compilation pipeline (parse, analyze, emit) passes all existing tests
- [ ] No runtime `require('@craftworks/')` calls in production code paths
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/architect.md` -- monorepo structure, dependency management, barrel export conventions
- `.craft/roles/claws/platform-eng.md` -- SDK internalization patterns, import rewiring strategy

## Dependencies

Pulse 12 (CP-2 gate) -- all internalized modules from CP-1 and CP-2 must be complete before deps can be removed.

## Test Gates

- [ ] L0 unit (4 tests): no @craftworks/ in compile path (1), no @craftworks/ in emit path (1), no @craftworks/ in governance path (1), package.json dependencies clean (1)
- [ ] L1 integration (6 tests): OC reader internalized (1), emitter internalized (1), audit chain internalized (1), R5 enforcement internalized (1), cache internalized (1), compile host internalized (1)
- [ ] L2 e2e (2 tests): standalone compile (1), tarball dep tree clean (1)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
