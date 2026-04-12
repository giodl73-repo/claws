---
slug: claws-sdk-bootstrap
preset: "claws"
plan: "2 headlines: monorepo scaffolding succeeds with zero source, forbidden import lint catches craftworks-sdk"
area: claws
status: Draft
phase: ptah
atoms: [atom:claws-sdk]
specs: [CL-04]
---

# claws-sdk-bootstrap — Package Scaffolding

## Headlines

1. **H1: `npm run build` succeeds for claws-sdk and claws-cli with zero source files** — Both packages are registered in the root `package.json` workspaces, have valid `tsconfig.json` extending the monorepo base, a `vitest.config.ts` with unit/integration/e2e projects, and a `package.json` with correct `@bic/claws-sdk` / `@bic/claws-cli` naming, dependency declarations, and build scripts. The build produces empty `dist/` directories with no errors.
   - Validation: `npm run build` from repo root completes with exit 0 including both claws packages
   - Validation: `cd claws-sdk && npx vitest run` exits 0 (no tests, no failures)
   - Validation: `cd claws-cli && npx vitest run` exits 0 (no tests, no failures)

2. **H2: Forbidden import lint rule catches craftworks-sdk imports at build time** — ESLint `no-restricted-imports` configuration in both claws packages blocks any import from `@craftworks/craftworks-sdk`, `@craftworks/shared-cli`, `@craftworks/craft-cli`, `@craftworks/guard-cli`, `@craftworks/fleet-cli`, and `@craftworks/forge-cli`. A canary test file with a forbidden import triggers the lint rule, proving the boundary is enforced.
   - Validation: ESLint reports error on a test file containing `import { anything } from '@craftworks/craftworks-sdk'`
   - Validation: ESLint reports error on a test file containing `import { anything } from '@craftworks/shared-cli'`
   - Validation: `tsconfig.json` paths do NOT include aliases for any forbidden package

## Summary

Before any business logic can be written, the two Phase 1 packages (claws-sdk and claws-cli) need to exist in the monorepo with correct build tooling, dependency declarations, and boundary enforcement. This plan creates the empty skeleton — package.json, tsconfig.json, vitest.config.ts, directory stubs, ESLint forbidden-import rules — so that all subsequent plans (governance-ir, parse, rules, emit, cli-foundation) can add files into a working build environment. No business logic ships here.

## Coverage Contract

### Specs
- [ ] CL-04 — claws-sdk sibling architecture, dependency rules, package structure

### Concept Guides
- [ ] docs/claws/architecture/packages.md — NEW: package map and dependency rules for claws

### Scenario Coverage
- [ ] bootstrap/build-zero-source — both packages build with no source files
- [ ] bootstrap/forbidden-import-blocked — lint catches craftworks-sdk import
- [ ] bootstrap/vitest-empty-suite — vitest exits 0 with no test files

### Test Tier Targets
| Tier | Target | Rationale |
|------|--------|-----------|
| L0 unit | 0 | No business logic — scaffolding only |
| L1 integration | 0 | No cross-module logic |
| L2 e2e | 0 | No pipeline |
| L3 acceptance | 0 | Build system validation, not test logic |

## Scope

- `claws-sdk/package.json` (NEW) — `@bic/claws-sdk`, dependencies on `@craftworks/compiler-sdk` and `@craftworks/agent-sdk`, build scripts
- `claws-sdk/tsconfig.json` (NEW) — extends monorepo base, strict mode, paths for allowed imports only
- `claws-sdk/vitest.config.ts` (NEW) — unit/integration/e2e projects, coverage thresholds (0% initially)
- `claws-sdk/.eslintrc.cjs` (NEW) — `no-restricted-imports` for forbidden packages
- `claws-sdk/src/index.ts` (NEW) — empty barrel export
- `claws-sdk/src/ir/` (NEW) — empty directory stub
- `claws-sdk/src/compile/` (NEW) — empty directory stub
- `claws-sdk/src/compile/intent/` (NEW) — empty directory stub
- `claws-sdk/src/governance/` (NEW) — empty directory stub
- `claws-sdk/src/governance/rules/` (NEW) — empty directory stub
- `claws-sdk/src/emit/` (NEW) — empty directory stub
- `claws-sdk/src/emit/templates/` (NEW) — empty directory stub
- `claws-sdk/src/adapter/` (NEW) — empty directory stub
- `claws-sdk/src/types/` (NEW) — empty directory stub
- `claws-sdk/tests/` (NEW) — empty directory stub
- `claws-sdk/tests/fixtures/` (NEW) — empty directory stub
- `claws-cli/package.json` (NEW) — `@bic/claws-cli`, dependencies on `@bic/claws-sdk`, bin entry for `claws`
- `claws-cli/tsconfig.json` (NEW) — extends monorepo base, strict mode
- `claws-cli/vitest.config.ts` (NEW) — unit/integration/e2e projects
- `claws-cli/.eslintrc.cjs` (NEW) — `no-restricted-imports` for forbidden packages (craftworks-sdk, shared-cli, all other CLIs)
- `claws-cli/src/index.ts` (NEW) — empty entry point stub
- `claws-cli/src/commands/` (NEW) — empty directory stub
- `claws-cli/bin/claws.js` (NEW) — bin entry stub
- Root `package.json` (EDIT) — add `claws-sdk` and `claws-cli` to workspaces array

## Deliverables

### Package Configuration
- [ ] claws-sdk/package.json — name, version, dependencies, scripts, exports
- [ ] claws-sdk/tsconfig.json — strict, paths restricted to compiler-sdk + agent-sdk
- [ ] claws-sdk/vitest.config.ts — 3-project setup (unit, integration, e2e)
- [ ] claws-sdk/.eslintrc.cjs — forbidden import rules
- [ ] claws-cli/package.json — name, version, dependencies, bin entry, scripts
- [ ] claws-cli/tsconfig.json — strict, paths restricted to claws-sdk
- [ ] claws-cli/vitest.config.ts — 3-project setup
- [ ] claws-cli/.eslintrc.cjs — forbidden import rules

### Directory Structure
- [ ] claws-sdk/src/ — ir/, compile/, compile/intent/, governance/, governance/rules/, emit/, emit/templates/, adapter/, types/
- [ ] claws-sdk/tests/ — fixtures/
- [ ] claws-cli/src/ — commands/
- [ ] claws-cli/bin/ — claws.js

### Monorepo Integration
- [ ] Root package.json — workspaces array includes claws-sdk and claws-cli
- [ ] Root build order — claws-sdk after compiler-sdk, claws-cli after claws-sdk

### Scenario Findings (added during wave)
*(empty — populated during implementation)*

## FORMA Sidecar Registration

The bootstrap plan MUST register `.claws` as a FORMA sidecar target in compiler-sdk's format registry. This is a format registration — not custom path resolution code.

### Deliverables
- [ ] Register `.claws` sidecar format in compiler-sdk format registry (alongside `.craft`)
- [ ] Define layout map: compiled/, staging/, keys/, audit/, cache/, policies/, secrets/, config/, snapshots/, runtime/, fleet/, compliance/, supply/
- [ ] Config file: `claws.json` (NOT `craft.json`)
- [ ] Verify: all compiler-sdk path resolution uses format layout, not hardcoded `.craft`
- [ ] Verify: `.claws` and `.craft` coexist without collision
- [ ] Verify: claws workspace reads 9 OC-native files (SOUL.md, TOOLS.md, AGENTS.md, MEMORY.md, IDENTITY.md, USER.md, HEARTBEAT.md, claws.json, exec-approvals.json) — NO `.claws-*` prefixed files

### Design Rule
No `.craft` path appears in any claws customer workspace. Internal delegation (e.g., `claws publish` → `craft package`) is invisible to the customer. See CL-07 § FORMA Sidecar Registration for the full layout.

## Out of Scope

- GovernanceIR types (that's claws-governance-ir plan)
- OC workspace parsing (that's claws-parse plan)
- Governance rule engine (that's claws-rules plan)
- Code emission (that's claws-emit plan)
- CLI commands and Commander.js setup (that's claws-cli-foundation plan)
- claws-base-cli package (Phase 2)
- claws-skill-kit, claws-test, claws-lsp, claws-serve packages (Phase 2+)

## Notes

- This plan has NO dependencies — it is the first thing to build
- Both packages start at 0.1.0 version
- Coverage thresholds start at 0% and are raised by subsequent plans as code lands
- The forbidden import lint rule is the most critical deliverable — it enforces the sibling boundary between claws-sdk and craftworks-sdk at build time
- Directory stubs use `.gitkeep` or empty `index.ts` files to ensure git tracks them
- Phase 1 inlines minimal output formatting in claws-cli per ARCHITECTURE.md M-01; claws-base-cli is Phase 2
