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
  L2_e2e: 1
  L3_accept: 0
test_scope:
  run:
    - "cd packages/@craftworks/crypto && vitest run --coverage"
    - "cd packages/@craftworks/forma && vitest run --coverage"
    - "cd packages/@craftworks/workspace && vitest run --coverage"
    - "cd packages/@craftworks/governance && vitest run --coverage"
    - "cd packages/@craftworks/codegen && vitest run --coverage"
    - "cd packages/@craftworks/execution && vitest run --coverage"
    - "cd packages/@craftworks/relax && vitest run --coverage"
    - "cd packages/@craftworks/context && vitest run --coverage"
    - "cd packages/@craftworks/input && vitest run --coverage"
    - "cd packages/@craftworks/eval && vitest run --coverage"
    - "cd compiler-sdk && vitest run tests/backward-compat.integration.test.ts"
    - "cd agent-sdk && vitest run tests/backward-compat.integration.test.ts"
  typecheck:
    - "cd compiler-sdk && tsc --noEmit"
    - "cd agent-sdk && tsc --noEmit"
checkpoint: 3
checkpoint_gate: false
---

# Pulse 17: Extract 10 Core Dialect Packages

## Objective

Extract 10 core domain packages from compiler-sdk and agent-sdk into standalone `packages/@craftworks/` packages. Each package becomes independently installable and versionable. compiler-sdk and agent-sdk thin down to re-export wrappers so **every existing import path continues to work**.

**Scope reality check (verified by `find … | wc -l`)**: the source directories named in the extraction plan have grown since the plan's original estimates. Actual LOC:

| #   | Package                  | Source dirs                                                                                                            | Actual LOC | Plan estimate |
| --- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------- | ---------: | ------------: |
| 1   | `@craftworks/crypto`     | `agent-sdk/src/hashing/`, `agent-sdk/src/suite/audit/`                                                                 |        659 |          ~800 |
| 2   | `@craftworks/forma`      | `compiler-sdk/src/astro/readers/`, `compiler-sdk/src/astro/ir/`                                                        |    ~50,500 |        ~2,000 |
| 3   | `@craftworks/workspace`  | `compiler-sdk/src/astro/formats/`, `compiler-sdk/src/astro/workspace/`, `agent-sdk/src/discovery/`                     |     ~6,700 |        ~1,400 |
| 4   | `@craftworks/governance` | `compiler-sdk/src/astro/governance/`, `agent-sdk/src/govern/`                                                          |     ~2,600 |        ~2,200 |
| 5   | `@craftworks/codegen`    | `compiler-sdk/src/astro/emit/` (**excluding** `emit/platforms/` — those are pulse 18)                                  |    ~10,200 |        ~1,500 |
| 6   | `@craftworks/execution`  | `compiler-sdk/src/astro/execution/` or equivalent task-graph dirs + `agent-sdk/src/execute/`, `agent-sdk/src/runtime/` |     ~2,800 |        ~2,800 |
| 7   | `@craftworks/relax`      | `compiler-sdk/src/astro/relax/`, `compiler-sdk/src/astro/relax-fill/`                                                  |     ~2,000 |        ~2,000 |
| 8   | `@craftworks/context`    | `compiler-sdk/src/astro/context/`                                                                                      |     ~1,500 |        ~1,500 |
| 9   | `@craftworks/input`      | `compiler-sdk/src/astro/input/`, `compiler-sdk/src/astro/read/` (if present)                                           |       ~800 |          ~800 |
| 10  | `@craftworks/eval`       | `agent-sdk/src/eval/` + `compiler-sdk/src/astro/eval/` if present                                                      |     ~1,200 |        ~1,200 |

**Total: ~79,000 LOC moved.** The forma and codegen estimates in the plan were a pre-growth snapshot. Do not let the delta block execution — the dir boundaries are still correct, only the sizes changed. If you find a sub-directory inside a listed source dir whose target is genuinely ambiguous (e.g., an `emit/` dir that's shared between codegen and a platform), flag and ask — don't invent a rule.

## Extraction Order (strict — follow the dep graph)

The dependency graph from `.craft/plans/craftworks-package-extraction.md` (lines 79-104) dictates extraction order. Complete each tier before starting the next. Within a tier, packages are independent — you may move them in any order.

### Tier 0 (no deps): pilot

1. `@craftworks/crypto` (659 lines — smallest, validates the extraction pattern end-to-end)

### Tier 1 (depend on crypto)

2. `@craftworks/forma`
3. `@craftworks/workspace`
4. `@craftworks/governance`

### Tier 2 (depend on tier 0-1)

5. `@craftworks/codegen` (depends on forma)
6. `@craftworks/execution` (depends on forma, governance)

### Tier 3 (depend on tier 0-2)

7. `@craftworks/relax`
8. `@craftworks/context`
9. `@craftworks/input`

### Independent

10. `@craftworks/eval`

After each tier: run `madge --circular` across the packages extracted so far. Zero cycles is a hard gate. If a cycle appears, stop and revisit the boundary before continuing.

## Per-Package Extraction Protocol

For each of the 10 packages, repeat exactly this sequence. The pilot (`@craftworks/crypto`) establishes the pattern — subsequent packages are mechanical replays.

### Step A — Create the package skeleton

- [ ] `packages/@craftworks/{name}/package.json` — `name: "@craftworks/{name}"`, `version: "1.0.0"`, `type: "module"`, `main/module/types` entries, `exports` map, `engines: { node: ">=18" }`, `files: ["dist/"]` whitelist. Dependencies: list only other `@craftworks/` packages per the dep graph (e.g., forma lists `@craftworks/crypto`; codegen lists `@craftworks/forma`).
- [ ] `packages/@craftworks/{name}/tsconfig.json` — strict mode, composite project, `references` to each dependency package's tsconfig.
- [ ] `packages/@craftworks/{name}/vitest.config.ts` — per-file thresholds matching the bar for its area (95/90/95/95 for claws-touching packages; see existing `compiler-sdk/vitest.config.ts` and `agent-sdk/vitest.config.ts` for the current config to mirror).
- [ ] `packages/@craftworks/{name}/tsup.config.ts` — if the package has `src/*/index.ts` subdir barrels, list each as an entry (avoids `ERR_MODULE_NOT_FOUND`).
- [ ] `packages/@craftworks/{name}/src/` and `packages/@craftworks/{name}/tests/` directories created.

### Step B — Move source files

- [ ] Move every `.ts` file under the source dirs listed in the scope table above into `packages/@craftworks/{name}/src/{mirror-subdir}/`. Preserve relative structure within the package (e.g., `compiler-sdk/src/astro/readers/workspace.ts` → `packages/@craftworks/forma/src/readers/workspace.ts`).
- [ ] Add a barrel `packages/@craftworks/{name}/src/index.ts` that re-exports the public API. Prefer explicit named re-exports; `export *` is only acceptable for leaf sub-barrels that themselves explicitly name everything.

### Step C — Move tests alongside source

- [ ] Move every test file under `compiler-sdk/tests/` or `agent-sdk/tests/` whose imports target the moved source dirs into `packages/@craftworks/{name}/tests/`. **This preserves the existing per-file coverage** — the 95/90/95/95 bar is already met by the existing test suites; co-location keeps it that way.
- [ ] Update relative imports inside the moved tests to point at the package's own `src/`.

### Step D — Rewrite cross-package imports

Moving files breaks two classes of imports. Both must be fixed:

- [ ] **Consumers left behind in compiler-sdk or agent-sdk**: any file in `compiler-sdk/src/` or `agent-sdk/src/` that still imports from a moved dir (e.g., `import { parseReader } from '../readers/…'`) must switch to the new package import (`import { parseReader } from '@craftworks/forma'`). Use `grep -r "from '\.\./\(readers\|ir\|hashing\|suite/audit\|formats\|workspace\|governance\|govern\|emit\|execute\|runtime\|relax\|relax-fill\|context\|input\|read\|eval\|discovery\)" compiler-sdk/src agent-sdk/src` after each package move to find survivors.
- [ ] **Cross-package imports between newly-extracted packages**: e.g., if a file in `@craftworks/codegen` formerly imported from `../ir/…`, it must now import from `@craftworks/forma`. Same grep pattern, run against `packages/@craftworks/*/src/`.
- [ ] Missing even one `../` import = `tsc --noEmit` failure. Do a full `find packages/@craftworks -name "*.ts" | xargs grep -l "from '\.\./\.\./"` sweep before moving on — there should be zero cross-package `../../` imports; those became package imports.

### Step E — Thin the SDKs

After all 10 packages are extracted:

- [ ] `compiler-sdk/src/index.ts` (EDIT) — replace the moved implementations with explicit named re-exports from the new packages. Preserve every existing export so downstream consumers don't break.
- [ ] `compiler-sdk/src/astro/*` sub-path barrels (EDIT) — the subpath exports in compiler-sdk's package.json (e.g., `@craftworks/compiler-sdk/astro/readers`) must continue to resolve. Each subpath barrel becomes a re-export of the new package.
- [ ] `compiler-sdk/package.json` (EDIT) — add all extracted `@craftworks/*` packages as dependencies. Remove no existing subpath exports.
- [ ] `agent-sdk/src/index.ts` (EDIT) — same pattern for crypto, discovery, govern, eval, execute, runtime.
- [ ] `agent-sdk/package.json` (EDIT) — add extracted package deps.

### Step F — Validate

After each tier, and one final time after Tier 3:

- [ ] `tsc --noEmit` passes in every extracted package.
- [ ] `tsc --noEmit` passes in compiler-sdk and agent-sdk.
- [ ] `madge --circular packages/@craftworks compiler-sdk agent-sdk` → zero cycles.
- [ ] `vitest run --coverage` passes in each extracted package with per-file 95/90/95/95.
- [ ] Back-compat integration tests pass (see next section).

## Deliverable Summary

For each of the 10 packages:

- [ ] `package.json`, `tsconfig.json`, `vitest.config.ts`, `tsup.config.ts`, `src/index.ts` barrel
- [ ] All source files moved from their source dirs into the package
- [ ] All corresponding test files moved alongside source
- [ ] Imports rewritten: relative `../../` → `@craftworks/{dep}`

SDK thinning (applies to both compiler-sdk and agent-sdk):

- [ ] `src/index.ts` replaced with re-exports from extracted packages
- [ ] `package.json` lists extracted packages as deps
- [ ] Existing subpath exports continue to resolve via re-export barrels

Cross-cutting:

- [ ] Zero `../../` imports in `packages/@craftworks/*/src/` (they're all package imports now)
- [ ] Zero circular deps across all packages (madge)
- [ ] Every existing consumer import path in the monorepo still resolves (grep for `@craftworks/compiler-sdk` and `@craftworks/agent-sdk` usage; none should break)

New tests (on top of moved tests):

- [ ] `packages/@craftworks/forma/tests/standalone.unit.test.ts` — L0: forma reader reads an OC workspace file without pulling compiler-sdk
- [ ] `packages/@craftworks/crypto/tests/roundtrip.unit.test.ts` — L0: Ed25519 sign → verify round-trip
- [ ] `packages/@craftworks/governance/tests/walker.unit.test.ts` — L0: policy walker traverses a rule tree
- [ ] `packages/@craftworks/codegen/tests/output.unit.test.ts` — L0: TS codegen emits valid TS (parseable)
- [ ] `compiler-sdk/tests/backward-compat.integration.test.ts` — L1: every previously-exported symbol is still exported (1 test); `readOCWorkspace` via compiler-sdk matches direct `@craftworks/forma` import (1 test)
- [ ] `agent-sdk/tests/backward-compat.integration.test.ts` — L1: every previously-exported symbol is still exported (1 test)
- [ ] `packages/@craftworks/crypto/tests/cross-package.integration.test.ts` — L1: forma uses crypto for hashing and produces identical hashes whether invoked directly or through compiler-sdk
- [ ] `packages/@craftworks/forma/tests/extraction.e2e.test.ts` — L2: end-to-end compile through the extracted package graph

## Acceptance Criteria

- [ ] All 10 packages have valid `package.json`, `src/`, `tests/`, `tsconfig.json`, `vitest.config.ts`, `tsup.config.ts`
- [ ] `madge --circular` shows zero circular dependencies across all packages
- [ ] All existing `import … from '@craftworks/compiler-sdk…'` statements resolve unchanged
- [ ] All existing `import … from '@craftworks/agent-sdk…'` statements resolve unchanged
- [ ] Each extracted package's tests pass independently with per-file 95/90/95/95 coverage
- [ ] compiler-sdk/src/ and agent-sdk/src/ are thin re-export layers (no moved implementations left behind)
- [ ] `npm run build` exits 0 from repo root
- [ ] `tsc --noEmit` exits 0 in compiler-sdk, agent-sdk, and all 10 extracted packages

## Governing Roles

Load these role files before starting:

- `.craft/roles/craft/architect.md` — monorepo structure, package extraction patterns, backward compatibility
- `.craft/roles/claws/platform-eng.md` — dependency graph management, workspace wiring, SDK thinning strategy

## Dependencies

- Pulse 13 — `@craftworks/` imports removed from claws-sdk core path (landed at `7d80093c9`). The extraction must not reintroduce dependencies that pulse 13 removed.

## Ambiguity Stop-And-Ask List

Stop and message the team lead if you hit any of these — do not improvise:

1. A file inside a listed source dir whose target package is genuinely ambiguous (not just "which sub-barrel" but "which of two extracted packages owns this").
2. A circular dep that the tier order doesn't resolve (means the boundary is drawn wrong).
3. A consumer import that can't be rewritten without restructuring the consumer (means the boundary needs revisiting).
4. The actual LOC for a package more than 2x the table above (means a sub-directory grew or migrated).

## Test Gates

- [ ] L0 unit (4 tests): forma standalone reader (1), crypto round-trip (1), governance walker (1), codegen valid output (1)
- [ ] L1 integration (4 tests): compiler-sdk backward compat (1), forma/compiler-sdk parity (1), agent-sdk backward compat (1), cross-package crypto use (1)
- [ ] L2 e2e (1 test): end-to-end extracted package compile
- [ ] `madge --circular` clean across all packages
- [ ] `npm run build` exits 0
- [ ] `tsc --noEmit` exits 0 everywhere
