---
pulse: 1
slug: package-scaffolding
plan: claws-sdk-bootstrap
depends_on: []
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 2
  L1_integration: 0
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run:
    - "cd claws-sdk && npx vitest run"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 1
checkpoint_gate: false
---

# Pulse 01: Package Scaffolding + FORMA Sidecar

## Objective

Create `claws-sdk` and `claws-cli` packages in the monorepo with correct package.json, tsconfig.json, vitest.config.ts, and directory stubs. Register both packages in the root workspace. Register `.claws` as a FORMA sidecar format in the compiler-sdk format registry with the full layout map (compiled/, staging/, keys/, audit/, cache/, policies/, secrets/, config/, snapshots/, runtime/, fleet/, compliance/, supply/).

## Deliverables

- [ ] `claws-sdk/package.json` — `@bic/claws-sdk`, dependencies on `@craftworks/compiler-sdk` and `@craftworks/agent-sdk`, build scripts
- [ ] `claws-sdk/tsconfig.json` — extends monorepo base, strict mode, paths restricted to compiler-sdk + agent-sdk
- [ ] `claws-sdk/vitest.config.ts` — unit/integration/e2e projects, 0% coverage thresholds initially
- [ ] `claws-sdk/src/index.ts` — empty barrel export
- [ ] `claws-sdk/src/ir/` — directory stub
- [ ] `claws-sdk/src/compile/` — directory stub
- [ ] `claws-sdk/src/compile/intent/` — directory stub
- [ ] `claws-sdk/src/governance/` — directory stub
- [ ] `claws-sdk/src/governance/rules/` — directory stub
- [ ] `claws-sdk/src/emit/` — directory stub
- [ ] `claws-sdk/src/emit/templates/` — directory stub
- [ ] `claws-sdk/src/adapter/` — directory stub
- [ ] `claws-sdk/src/types/` — directory stub
- [ ] `claws-sdk/tests/` — directory stub
- [ ] `claws-sdk/tests/fixtures/` — directory stub
- [ ] `claws-cli/package.json` — `@bic/claws-cli`, dependency on `@bic/claws-sdk`, bin entry for `claws`
- [ ] `claws-cli/tsconfig.json` — extends monorepo base, strict mode
- [ ] `claws-cli/vitest.config.ts` — unit/integration/e2e projects
- [ ] `claws-cli/src/index.ts` — empty entry point stub
- [ ] `claws-cli/src/commands/` — directory stub
- [ ] `claws-cli/bin/claws.js` — bin entry stub
- [ ] Root `package.json` — add `claws-sdk` and `claws-cli` to workspaces array
- [ ] `.claws` FORMA sidecar registered in compiler-sdk format registry with layout map
- [ ] `claws-sdk/tests/sidecar/forma-sidecar.unit.test.ts` — L0: .claws sidecar resolves expected layout paths
- [ ] `claws-sdk/tests/sidecar/forma-coexist.unit.test.ts` — L0: .claws and .craft coexist without collision

## Acceptance Criteria

- [ ] `npm run build` from repo root completes exit 0 including both claws packages
- [ ] `cd claws-sdk && npx vitest run` exits 0
- [ ] `cd claws-cli && npx vitest run` exits 0
- [ ] `.claws` sidecar layout resolves all 13 subdirectories correctly
- [ ] `.claws` and `.craft` sidecars coexist without path collision
- [ ] claws.json is the config file (NOT craft.json) in .claws sidecar

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/architect.md` — monorepo structure, package boundaries, build system integration
- `.craft/roles/claws/platform-eng.md` — claws platform conventions, FORMA sidecar layout, workspace structure

## Dependencies

None — this is the first pulse in the wave.

## Review Amendments (R1)

### C07: Windows Path Normalization
- [ ] Add `claws-sdk/src/util/path.ts` with `normalizePath()` converting backslashes to forward slashes
- [ ] All file path operations in claws-sdk use normalizePath() — never raw path.join()
- [ ] L0 test: Windows-style `C:\src\workspace\SOUL.md` normalizes to `C:/src/workspace/SOUL.md`
