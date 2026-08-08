---
pulse: 8
slug: emit-claude-code
plan: claws-sdk-graduation
depends_on: [6, 7]
governing_roles: [craft:codegen, claws:platform-eng]
scenario_codes: [emit-cc/S01, emit-cc/S02, emit-cc/S03, codegen/S01]
stage: implementation
test_tiers:
  L0_unit: 6
  L1_integration: 3
  L2_e2e: 1
  L3_accept: 1
test_scope:
  run:
    - "cd claws-sdk && npx vitest run --project unit --coverage"
    - "cd claws-sdk && npx vitest run --project integration --coverage"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 2
checkpoint_gate: false
---

# Pulse 08: Claude Code Target Emitter

## Objective

Build the Claude Code target emitter -- the second of two free-tier emit targets. The Claude Code emitter takes OCWorkspaceIR + GovAnalysis and produces a Claude Code workspace configuration: CLAUDE.md (project instructions), .claude/settings.json (permissions, hooks, env), and .claude/commands/ (slash command stubs).

This is the target that proves the free-tier value proposition: "compile your governance into a Claude Code workspace." R1 review finding C4 specifically required a 2nd emit target for the free tier to demonstrate real value beyond OC. The emitter extends BaseEmitter from pulse 7 and registers in the emitter registry.

## Deliverables

- [ ] `claws-sdk/src/compiler/emit/cc-emitter.ts` -- ClaudeCodeEmitter extends BaseEmitter: emit(ir: OCWorkspaceIR, analysis: GovAnalysis) → EmitResult. Generates: CLAUDE.md (persona, principles, tools, boundaries from SoulIR + ToolsIR), .claude/settings.json (permissions from ToolsIR, hooks from AgentsIR), .claude/commands/ (skill stubs from SkillsIR). Calls compileGuard before emit. ~350 lines
- [ ] `claws-sdk/src/compiler/emit/cc-templates.ts` -- Template functions for Claude Code output: formatClaudeMd(soul, tools, agents), formatSettingsJson(tools, identity), formatCommandStub(skill). Separates generation logic from template formatting
- [ ] `claws-sdk/src/compiler/emit/registry.ts` (EDIT) -- Register ClaudeCodeEmitter alongside OCEmitter in the emit registry
- [ ] `claws-sdk/tests/compiler/emit/cc-emitter.unit.test.ts` -- L0: CC emit produces CLAUDE.md (1), CC emit produces settings.json (1), CC emit produces command stubs for each skill (1), CC emit calls compileGuard (1), CC emit CLAUDE.md contains persona from SoulIR (1), CC emit settings.json contains permissions from ToolsIR (1)
- [ ] `claws-sdk/tests/compiler/emit/cc-emitter.integration.test.ts` -- L1: full emit from fixture IR produces valid Claude Code workspace (1), emit output contains no @craftworks/ references (1), registry returns CC emitter by target enum (1)
- [ ] `claws-sdk/tests/compiler/emit/cc-emitter.e2e.test.ts` -- L2: end-to-end Claude Code emit from fixture workspace through full pipeline (1)
- [ ] `claws-sdk/tests/compiler/emit/cc-emitter.accept.test.ts` -- L3: scenario acceptance test verifying emit-cc/codegen findings (4)

## Acceptance Criteria

- [ ] Zero imports from `@craftworks/compiler-sdk` -- standalone emitter
- [ ] Claude Code emitter calls compileGuard before generating any files
- [ ] CLAUDE.md output includes persona, principles, tool instructions, and boundaries from governance
- [ ] settings.json output includes permission grants derived from ToolsIR trust levels
- [ ] Command stubs are generated for each skill in SkillsIR
- [ ] Emit output produces a valid Claude Code workspace structure (CLAUDE.md + .claude/)
- [ ] Emit output contains zero references to `@craftworks/` packages
- [ ] Registry lists both OC and Claude Code as available targets
- [ ] `npx vitest run --project unit --coverage` passes 95/90/95/95 per-file thresholds
- [ ] `npx vitest run --project integration --coverage` passes 85/70/80/85 whole-package thresholds
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:

- `.craft/roles/craft/codegen.md` -- code generation patterns, template separation, output validation
- `.craft/roles/claws/platform-eng.md` -- SDK emit conventions, Claude Code workspace structure

## Dependencies

- Pulse 6 (r5-fail-closed) -- compileGuard must be called before generating any output
- Pulse 7 (emit-oc-target) -- uses BaseEmitter, EmitResult types, emitter registry, and compileGuard integration pattern

## Test Gates

- [ ] L0 unit (6 tests): CLAUDE.md output (1), settings.json output (1), command stubs (1), compileGuard call (1), persona in CLAUDE.md (1), permissions in settings.json (1)
- [ ] L1 integration (3 tests): full emit from fixture (1), zero @craftworks/ in output (1), registry lookup (1)
- [ ] L2 e2e (1 test): end-to-end Claude Code emit from fixture workspace (1)
- [ ] L3 acceptance (1 test): emit-cc/codegen scenario findings verified (1)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
