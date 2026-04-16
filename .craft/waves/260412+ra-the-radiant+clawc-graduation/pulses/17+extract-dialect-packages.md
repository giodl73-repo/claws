---
pulse: 17
slug: extract-dialect-packages
plan: craftworks-package-extraction
depends_on: [13]
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 4
  L1_integration: 4
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run:
    - "cd packages/@craftworks/forma && npx vitest run --coverage"
    - "cd packages/@craftworks/workspace && npx vitest run --coverage"
    - "cd packages/@craftworks/crypto && npx vitest run --coverage"
    - "cd packages/@craftworks/governance && npx vitest run --coverage"
    - "cd packages/@craftworks/codegen && npx vitest run --coverage"
    - "cd packages/@craftworks/relax && npx vitest run --coverage"
    - "cd packages/@craftworks/context && npx vitest run --coverage"
    - "cd packages/@craftworks/execution && npx vitest run --coverage"
    - "cd packages/@craftworks/eval && npx vitest run --coverage"
    - "cd packages/@craftworks/input && npx vitest run --coverage"
  typecheck:
    - "cd compiler-sdk && npx tsc --noEmit"
    - "cd agent-sdk && npx tsc --noEmit"
checkpoint: 3
checkpoint_gate: false
---

# Pulse 17: Extract 10 Core Dialect Packages

## Objective

Extract 10 core domain packages from compiler-sdk and agent-sdk into standalone `packages/@craftworks/` packages, following the package map from the craftworks-package-extraction plan. Each of the 12 design/compiler/ dialect areas maps to one npm package. After extraction, compiler-sdk and agent-sdk become thin orchestration layers that re-export from the extracted packages. All existing imports continue working (backward compatible).

The 10 packages: @craftworks/forma (~2000 lines, OC readers + IR), @craftworks/workspace (~1400 lines, platform detection + discovery + normalize), @craftworks/crypto (~800 lines, Ed25519 + HMAC + SHA-256), @craftworks/governance (~2200 lines, policy + gates + runtime + budget), @craftworks/codegen (~1500 lines, emit framework + TS codegen), @craftworks/relax (~2000 lines, expression parser + evaluator), @craftworks/context (~1500 lines, DAG ops + structural sharing), @craftworks/execution (~2800 lines, task graph + quality gates), @craftworks/eval (~1200 lines, rubric + assertions + judge), @craftworks/input (~800 lines, file/package/URL resolution).

## Deliverables

For each of the 10 packages:
- [ ] `packages/@craftworks/{name}/package.json` -- Correct name, version 1.0.0, exports map, dependencies only on other extracted packages (per dependency graph), engines node >=18.
- [ ] `packages/@craftworks/{name}/src/index.ts` -- Barrel re-exports of moved source files.
- [ ] `packages/@craftworks/{name}/tsconfig.json` -- Strict TypeScript, composite project references.
- [ ] `packages/@craftworks/{name}/vitest.config.ts` -- Coverage thresholds appropriate to package.
- [ ] Source files moved from compiler-sdk/agent-sdk `src/` to `packages/@craftworks/{name}/src/`.
- [ ] Tests moved from compiler-sdk/agent-sdk `tests/` to `packages/@craftworks/{name}/tests/`.

SDK thinning:
- [ ] `compiler-sdk/src/index.ts` (EDIT) -- Replace implementations with re-exports from extracted packages. Keep backward-compatible import paths via subpath exports.
- [ ] `agent-sdk/src/index.ts` (EDIT) -- Replace implementations with re-exports from extracted packages.
- [ ] `compiler-sdk/package.json` (EDIT) -- Add extracted packages as dependencies.
- [ ] `agent-sdk/package.json` (EDIT) -- Add extracted packages as dependencies.

Tests:
- [ ] `packages/@craftworks/forma/tests/readers.unit.test.ts` -- L0: OC reader reads workspace file independently (1 test)
- [ ] `packages/@craftworks/crypto/tests/crypto.unit.test.ts` -- L0: Ed25519 sign+verify round-trip (1 test)
- [ ] `packages/@craftworks/governance/tests/governance.unit.test.ts` -- L0: policy walker traverses rule tree (1 test)
- [ ] `packages/@craftworks/codegen/tests/codegen.unit.test.ts` -- L0: TS codegen produces valid output (1 test)
- [ ] `compiler-sdk/tests/backward-compat.integration.test.ts` -- L1: all existing compiler-sdk subpath imports still resolve (1 test), readOCWorkspace via compiler-sdk matches direct @craftworks/forma import (1 test)
- [ ] `agent-sdk/tests/backward-compat.integration.test.ts` -- L1: all existing agent-sdk imports still resolve (1 test)
- [ ] `packages/@craftworks/crypto/tests/cross-package.integration.test.ts` -- L1: forma uses crypto for hashing, audit-chain uses crypto for signing (1 test)

## Acceptance Criteria

- [ ] All 10 packages have valid package.json, src/, tests/, tsconfig.json, vitest.config.ts
- [ ] `npx madge --circular` shows zero circular dependencies between extracted packages
- [ ] All existing `import { ... } from '@craftworks/compiler-sdk'` statements still work
- [ ] All existing `import { ... } from '@craftworks/agent-sdk'` statements still work
- [ ] Each extracted package's tests pass independently
- [ ] compiler-sdk/src/ is thin orchestration (re-exports + wiring only)
- [ ] agent-sdk/src/ is thin orchestration (re-exports + wiring only)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0 for compiler-sdk, agent-sdk, and all extracted packages

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/architect.md` -- monorepo structure, package extraction patterns, backward compatibility
- `.craft/roles/claws/platform-eng.md` -- dependency graph management, workspace wiring, SDK thinning strategy

## Dependencies

Pulse 13 -- @craftworks/ imports removed from claws-sdk core path. The extraction must not reintroduce dependencies that pulse 13 removed.

## Test Gates

- [ ] L0 unit (4 tests): forma reader standalone (1), crypto sign+verify (1), governance policy walker (1), codegen TS output (1)
- [ ] L1 integration (4 tests): compiler-sdk backward compat (1), forma/compiler-sdk parity (1), agent-sdk backward compat (1), cross-package crypto usage (1)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
