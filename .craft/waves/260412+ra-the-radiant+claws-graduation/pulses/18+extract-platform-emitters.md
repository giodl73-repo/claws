---
pulse: 18
slug: extract-platform-emitters
plan: craftworks-package-extraction
depends_on: [17]
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 4
  L1_integration: 4
  L2_e2e: 2
  L3_accept: 1
test_scope:
  run:
    - "cd packages/@craftworks/emit-oc && npx vitest run --coverage"
    - "cd packages/@craftworks/emit-cc && npx vitest run --coverage"
    - "cd packages/@craftworks/emit-cursor && npx vitest run --coverage"
    - "cd packages/@craftworks/emit-copilot && npx vitest run --coverage"
    - "cd packages/@craftworks/emit-bedrock && npx vitest run --coverage"
    - "cd packages/@craftworks/emit-langgraph && npx vitest run --coverage"
    - "cd packages/@craftworks/emit-crewai && npx vitest run --coverage"
  typecheck:
    - "cd packages/@craftworks/codegen && npx tsc --noEmit"
    - "cd packages/@craftworks/emit-oc && npx tsc --noEmit"
    - "cd packages/@craftworks/emit-cc && npx tsc --noEmit"
checkpoint: 3
checkpoint_gate: true
---

# Pulse 18: Extract 7 Per-Platform Emitter Plugins

## Objective

Extract 7 per-platform emitter plugins from compiler-sdk into standalone `packages/@craftworks/emit-{platform}/` packages. Each emitter depends only on `@craftworks/codegen` (the emit framework extracted in pulse 17) and installs independently. Consumers cherry-pick their platform -- a Bedrock customer installs ~4KB, not the full emit suite.

The 7 emitter plugins: @craftworks/emit-oc (~500 lines, OpenClaw), @craftworks/emit-cc (~400 lines, Claude Code), @craftworks/emit-cursor (~300 lines, Cursor), @craftworks/emit-copilot (~300 lines, GitHub Copilot), @craftworks/emit-bedrock (~400 lines, AWS Bedrock), @craftworks/emit-langgraph (~400 lines, LangGraph/Python), @craftworks/emit-crewai (~400 lines, CrewAI).

This is the CP-3 gate pulse. All package extraction (10 core + 7 emitters = 17 packages) must be complete, tests passing, and backward compatibility verified before advancing to CP-4.

## Deliverables

For each of the 7 emitter plugins:

- [ ] `packages/@craftworks/emit-{platform}/package.json` -- Correct name, version 1.0.0, dependency on `@craftworks/codegen`, exports map, engines node >=18. Small install footprint (~300-500 lines per emitter).
- [ ] `packages/@craftworks/emit-{platform}/src/index.ts` -- Platform emitter implementation moved from compiler-sdk/src/emit/platforms/{platform}/.
- [ ] `packages/@craftworks/emit-{platform}/tsconfig.json` -- Strict TypeScript, project reference to @craftworks/codegen.
- [ ] `packages/@craftworks/emit-{platform}/vitest.config.ts` -- Coverage thresholds.
- [ ] Source + tests moved from compiler-sdk emit/platforms/ to packages.

Integration:

- [ ] `compiler-sdk/package.json` (EDIT) -- Add all 7 emitter packages as dependencies for backward compat.
- [ ] `compiler-sdk/src/emit/index.ts` (EDIT) -- Re-export from emitter packages instead of local implementations.
- [ ] `packages/@craftworks/codegen/src/registry.ts` (EDIT) -- Platform registry accepts dynamically registered emitters from plugins.

Tests:

- [ ] `packages/@craftworks/emit-oc/tests/oc-emitter.unit.test.ts` -- L0: OC emitter produces valid Gateway plugin output (1 test)
- [ ] `packages/@craftworks/emit-cc/tests/cc-emitter.unit.test.ts` -- L0: Claude Code emitter produces valid CLAUDE.md + settings.json (1 test)
- [ ] `packages/@craftworks/emit-cursor/tests/cursor-emitter.unit.test.ts` -- L0: Cursor emitter produces valid .cursorrules (1 test)
- [ ] `packages/@craftworks/emit-copilot/tests/copilot-emitter.unit.test.ts` -- L0: Copilot emitter produces valid .github/copilot-instructions.md (1 test)
- [ ] `packages/@craftworks/emit-oc/tests/standalone-install.integration.test.ts` -- L1: emit-oc installs independently with only codegen as dep (1 test)
- [ ] `packages/@craftworks/emit-cc/tests/standalone-install.integration.test.ts` -- L1: emit-cc installs independently (1 test)
- [ ] `compiler-sdk/tests/emit-backward-compat.integration.test.ts` -- L1: all existing compiler-sdk emit imports still resolve (1 test), platform registry discovers all 7 emitters via re-exports (1 test)
- [ ] `packages/@craftworks/emit-oc/tests/full-pipeline.e2e.test.ts` -- L2: OC workspace -> parse -> analyze -> emit-oc produces complete plugin (1 test)
- [ ] `packages/@craftworks/emit-cc/tests/full-pipeline.e2e.test.ts` -- L2: OC workspace -> parse -> analyze -> emit-cc produces complete CLAUDE.md (1 test)
- [ ] `tests/extraction-complete.accept.test.ts` -- L3: all 17 packages (10 core + 7 emitters) install, zero circular deps, compiler-sdk backward compat, agent-sdk backward compat (1 test)

## Acceptance Criteria

- [ ] All 7 emitter packages have valid package.json, src/, tests/, tsconfig.json, vitest.config.ts
- [ ] Each emitter depends only on `@craftworks/codegen` (no other @craftworks/ package)
- [ ] `npx madge --circular` shows zero circular deps across all 17 extracted packages
- [ ] All existing `import { ... } from '@craftworks/compiler-sdk/astro/emit'` paths still work
- [ ] Platform registry dynamically discovers all 7 emitters
- [ ] Each emitter's tests pass independently
- [ ] Full 17-package extraction complete: 10 core + 7 emitters
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0 for all packages

## Governing Roles

Load these role files before starting:

- `.craft/roles/craft/architect.md` -- monorepo structure, plugin extraction patterns, backward compatibility
- `.craft/roles/claws/platform-eng.md` -- emitter plugin architecture, platform registry, cherry-pick install model

## Dependencies

Pulse 17 -- 10 core packages extracted, including @craftworks/codegen which is the dependency for all emitter plugins.

## Test Gates

- [ ] L0 unit (4 tests): OC emitter output (1), CC emitter output (1), Cursor emitter output (1), Copilot emitter output (1)
- [ ] L1 integration (4 tests): emit-oc standalone install (1), emit-cc standalone install (1), compiler-sdk emit backward compat (1), platform registry discovers all (1)
- [ ] L2 e2e (2 tests): OC full pipeline (1), CC full pipeline (1)
- [ ] L3 acceptance (1 test): 17-package extraction complete, zero circular deps, backward compat
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
