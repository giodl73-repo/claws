---
pulse: 7
slug: emit-oc-target
plan: claws-sdk-graduation
depends_on: [1, 3, 6]
governing_roles: [craft:codegen, claws:platform-eng]
scenario_codes: [emit-oc/S01, emit-oc/S02, emit-oc/S03, codegen/S01, codegen/S03]
stage: implementation
test_tiers:
  L0_unit: 6
  L1_integration: 3
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run:
    - "cd claws-sdk && npx vitest run --project unit --coverage"
    - "cd claws-sdk && npx vitest run --project integration --coverage"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 2
checkpoint_gate: false
---

# Pulse 07: OC Gateway Plugin Emitter

## Objective

Build the simplified OC Gateway plugin emitter as the first of two emit targets in the free tier. ~450 lines. The current implementation uses compiler-sdk's platform registry and emitter base class. This pulse replaces that with a standalone emitter that takes OCWorkspaceIR + GovAnalysis and produces an OC Gateway plugin output.

The free tier supports exactly 2 emit targets: OC (this pulse) and Claude Code (pulse 8). Multi-platform emit (Cursor, Copilot, CrewAI, LangGraph, Bedrock) remains in the paid tier. The emitter must call the R5 compileGuard (pulse 6) before generating any output.

## Deliverables

- [ ] `claws-sdk/src/compiler/emit/types.ts` -- EmitTarget (enum: oc, claude-code), EmitResult (target, files array, diagnostics), EmittedFile (path, content, overwrite boolean), EmitterOptions (outputDir, dryRun, verbose)
- [ ] `claws-sdk/src/compiler/emit/base-emitter.ts` -- BaseEmitter abstract class: constructor(options), abstract emit(ir, analysis), shared utilities (writeFile, ensureDir, formatDiagnostic). Thin base -- not a framework, just shared file I/O and diagnostics
- [ ] `claws-sdk/src/compiler/emit/oc-emitter.ts` -- OCEmitter extends BaseEmitter: emit(ir: OCWorkspaceIR, analysis: GovAnalysis) → EmitResult. Generates OC Gateway plugin files: manifest, config, handlers. Calls compileGuard before emit. ~300 lines
- [ ] `claws-sdk/src/compiler/emit/registry.ts` -- Simple emitter registry: register(target, emitter), get(target), list(). Free tier registers OC + Claude Code only. Paid tier extends with additional targets
- [ ] `claws-sdk/src/compiler/emit/index.ts` -- Barrel exports for emit module
- [ ] `claws-sdk/tests/compiler/emit/oc-emitter.unit.test.ts` -- L0: OC emit produces manifest file (1), OC emit produces config file (1), OC emit produces handler files (1), OC emit calls compileGuard (1), OC emit respects dryRun flag (1), OC emit rejects unsupported platform (1)
- [ ] `claws-sdk/tests/compiler/emit/oc-emitter.integration.test.ts` -- L1: full emit from fixture IR produces valid OC plugin directory (1), emit output contains no @craftworks/ references (1), registry returns OC emitter by target enum (1)

## Acceptance Criteria

- [ ] Zero imports from `@craftworks/compiler-sdk` -- no platform registry, no emitter base
- [ ] OC emitter calls compileGuard (pulse 6) before generating any files
- [ ] Emit output is a valid OC Gateway plugin structure (manifest + config + handlers)
- [ ] dryRun mode produces EmitResult without writing files to disk
- [ ] Emitter registry supports only OC and Claude Code in free tier
- [ ] Emit output contains zero references to `@craftworks/` packages
- [ ] Uses OCWorkspaceIR from pulse 3 for input
- [ ] `npx vitest run --project unit --coverage` passes 95/90/95/95 per-file thresholds
- [ ] `npx vitest run --project integration --coverage` passes 85/70/80/85 whole-package thresholds
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/codegen.md` -- code generation patterns, emitter design, output validation
- `.craft/roles/claws/platform-eng.md` -- SDK emit conventions, Gateway plugin structure

## Dependencies

- Pulse 1 (oc-workspace-readers) -- reader output feeds emit input
- Pulse 3 (formir-types) -- OCWorkspaceIR is the emit input type
- Pulse 6 (r5-fail-closed) -- compileGuard must be called before generating any output

## Test Gates

- [ ] L0 unit (6 tests): manifest output (1), config output (1), handler output (1), compileGuard call (1), dryRun (1), unsupported platform (1)
- [ ] L1 integration (3 tests): full emit from fixture (1), zero @craftworks/ in output (1), registry lookup (1)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
