---
pulse: 22
slug: cli-build-autodetect
plan: claws-cli-foundation
depends_on: [21]
governing_roles: [craft:navigator, claws:platform-eng]
scenario_codes:
  [cli/build-openclaw, cli/build-auto-detect, cli/compile-cache-hit, cli/bypass-active]
stage: implementation
test_tiers:
  L0_unit: 4
  L1_integration: 2
  L2_e2e: 1
  L3_accept: 0
test_scope:
  run:
    - "cd claws-cli && npx vitest run tests/commands/build.unit.test.ts"
    - "cd claws-cli && npx vitest run tests/core/platform-detect.unit.test.ts"
    - "cd claws-cli && npx vitest run tests/core/cache.unit.test.ts"
  typecheck:
    - "cd claws-cli && npx tsc --noEmit"
checkpoint: 4
checkpoint_gate: false
---

# Pulse 22: `claws build` + Platform Auto-Detect + Cache

## Objective

Implement `claws build [target]` which runs the full pipeline (parse -> extract -> analyze -> emit) and writes all 4 artifacts to the workspace. Platform auto-detection reads workspace marker files (SOUL.md, .cursorrules, CLAUDE.md) via the detect module from CP-2. Hash-based cache checks file content hashes to skip recompilation when files are unchanged. Progress spinner shows pipeline stage. Build time is printed on completion.

## Deliverables

- [ ] `claws-cli/src/commands/build.ts` -- EDIT: add `claws build [target]` command, full pipeline orchestration, artifact writing, progress spinner
- [ ] `claws-cli/src/core/platform-detect.ts` -- NEW: auto-detect platform from workspace marker files, delegates to claws-sdk detect module
- [ ] `claws-cli/src/core/cache.ts` -- NEW: hash-based cache check for GovernanceIR recompilation, --force flag bypass
- [ ] `claws-cli/tests/commands/build.unit.test.ts` -- NEW: build command artifact paths, pipeline wiring, progress states
- [ ] `claws-cli/tests/core/platform-detect.unit.test.ts` -- NEW: marker file detection, fallback behavior
- [ ] `claws-cli/tests/core/cache.unit.test.ts` -- NEW: hash comparison, cache hit/miss, --force flag
- [ ] `claws-cli/tests/commands/build.integration.test.ts` -- NEW: build on fixture workspace with auto-detect
- [ ] `claws-cli/tests/commands/build.e2e.test.ts` -- NEW: full `claws build openclaw` on fixture workspace
- [ ] `claws-cli/tests/fixtures/` -- NEW: OC workspace fixtures for build testing (SOUL.md, CLAUDE.md, handler.ts, SKILL.md)

## TDD Tests

### L0 Unit (4)

- `claws build openclaw` calls SDK emit with 'openclaw' target and writes 4 artifacts to expected paths -> `claws-cli/tests/commands/build.unit.test.ts`
- `claws build` with no target auto-detects platform from marker files via platform-detect module -> `claws-cli/tests/core/platform-detect.unit.test.ts`
- Cache check returns hit when file hashes match previous compilation -> `claws-cli/tests/core/cache.unit.test.ts`
- `--force` flag bypasses cache check and triggers recompilation -> `claws-cli/tests/core/cache.unit.test.ts`

### L1 Integration (2)

- `claws build openclaw` on fixture workspace creates 4 files (SKILL.md, index.ts, exec-approvals.json, lobster.compiled.yaml) -> `claws-cli/tests/commands/build.integration.test.ts`
- Second `claws build` with unchanged files skips recompilation, prints "up to date" -> `claws-cli/tests/commands/build.integration.test.ts`

### L2 E2E (1)

- Full `claws build openclaw` on fixture workspace produces 4 governance artifacts with correct content and reports build time -> `claws-cli/tests/commands/build.e2e.test.ts`

## Key Constraints

- Platform auto-detection delegates to claws-sdk detect module (implemented in CP-2 pulses 06-08). CLI layer is a thin wrapper.
- 4 artifacts from `claws build openclaw`: skills/claws-governance/SKILL.md, plugins/claws-governance/index.ts, exec-approvals.json, lobster.compiled.yaml
- Build failure renders error contract (WHAT + HOW + WHERE) from pulse 21 output modules
- Progress spinner shows current pipeline stage (parse -> extract -> analyze -> emit)
- Build time printed on completion: "Built in X.XXs"
- Cache stores file content hashes in .claws/cache/hashes.json; compares against workspace files
- `--force` flag bypasses cache entirely (always recompiles)
- CLAWS_BYPASS=1 skips governance evaluation but still emits artifacts with bypass marker

## Governing Roles

Load these role files before starting:

- `.craft/roles/craft/navigator.md` -- CLI command flow, pipeline threading, progress reporting
- `.craft/roles/claws/platform-eng.md` -- platform detection, workspace conventions, build infrastructure

## Dependencies

- Pulse 21 (cli-pinch-output) -- output formatting modules (format-default.ts, color.ts, errors.ts)
- Pulses 06-08 (claws-detect, CP-2) -- platform detection SDK functions

## Verification Gate

```bash
cd claws-cli && npx vitest run tests/commands/build.unit.test.ts
cd claws-cli && npx vitest run tests/core/platform-detect.unit.test.ts
cd claws-cli && npx vitest run tests/core/cache.unit.test.ts
cd claws-cli && npx tsc --noEmit
npm run build
```

## Review Amendments (R1)

### C06: Cache in SDK, Not CLI

- [ ] Cache logic lives in `claws-sdk/src/compile/cache.ts`, not CLI
- [ ] Composite cache key: workspace file hashes + claws-sdk version + claws.json hash + rule registry fingerprint
- [ ] CLI delegates to `CompilationCache.check()` and `CompilationCache.store()`
- [ ] Programmatic SDK consumers (CI, IDE, test) get cache benefit automatically
