---
pulse: 9
slug: ts-codegen
plan: claws-sdk-graduation
depends_on: [7]
governing_roles: [craft:codegen, craft:type-system, claws:platform-eng]
scenario_codes:
  [
    codegen/S01,
    codegen/S02,
    codegen/S03,
    codegen/S04,
    emit-bedrock/S01,
    emit-copilot/S01,
    emit-crewai/S01,
    emit-cursor/S01,
    emit-langgraph/S01,
  ]
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

# Pulse 09: TypeScript Code Generation

## Objective

Build the simplified TypeScript code generation module for Gateway plugin output. ~500 lines. The current implementation uses compiler-sdk's OperationIR TS emitter. This pulse replaces it with a standalone TS codegen that generates executable TypeScript for Gateway plugin handlers, types, and configuration.

The codegen produces: handler functions (typed request→response), configuration types (derived from GovernanceIR), plugin manifest types, and barrel exports. Output must be valid TypeScript that compiles with `tsc --strict` without errors. This is the "code" in "code generation" -- the moat is that claws emits real, typed, executable code, not just configuration files.

## Deliverables

- [ ] `claws-sdk/src/compiler/codegen/types.ts` -- CodegenResult (files array, diagnostics), CodegenFile (path, content, language: 'typescript'), CodegenOptions (strict mode, module format ESM/CJS, target ES version)
- [ ] `claws-sdk/src/compiler/codegen/ts-emitter.ts` -- TypeScript code emitter: generates handler function signatures, request/response types, configuration interfaces, and barrel exports from GovernanceIR + OCWorkspaceIR. Uses string templates (no AST manipulation). ~250 lines
- [ ] `claws-sdk/src/compiler/codegen/ts-formatter.ts` -- Code formatting utilities: indent, wrap in module, add file header (generated-by comment, timestamp, do-not-edit warning), type import generation. ~100 lines
- [ ] `claws-sdk/src/compiler/codegen/ts-validator.ts` -- Post-generation validation: verify generated files form a valid TypeScript project (barrel exports resolve, no circular imports, all types referenced are defined). Static analysis without running tsc. ~100 lines
- [ ] `claws-sdk/src/compiler/codegen/index.ts` -- Barrel exports for codegen module
- [ ] `claws-sdk/tests/compiler/codegen/ts-emitter.unit.test.ts` -- L0: handler function has correct signature (1), request/response types generated (1), configuration interface includes all governance fields (1), barrel export includes all generated files (1), generated code includes do-not-edit header (1), ESM/CJS module format respected (1)
- [ ] `claws-sdk/tests/compiler/codegen/codegen.integration.test.ts` -- L1: full codegen from fixture IR produces valid TS project structure (1), generated barrel exports resolve all types (1), generated code contains no @craftworks/ imports (1)
- [ ] `claws-sdk/tests/compiler/codegen/codegen.e2e.test.ts` -- L2: generate TS from fixture → write to temp dir → run `tsc --strict --noEmit` on output → verify zero errors (1)
- [ ] `claws-sdk/tests/compiler/codegen/codegen.accept.test.ts` -- L3: scenario acceptance test verifying codegen/emit-platform findings (9)

## Acceptance Criteria

- [ ] Zero imports from `@craftworks/compiler-sdk` -- no OperationIR, no TS emitter patterns
- [ ] Generated TypeScript compiles with `tsc --strict` without errors
- [ ] Generated code includes "do not edit" header with generation timestamp
- [ ] Handler functions have fully typed request→response signatures (no `any`)
- [ ] Configuration interfaces derive from GovernanceIR analysis output
- [ ] Barrel exports resolve correctly (no missing or circular imports)
- [ ] Both ESM and CJS module formats supported via CodegenOptions
- [ ] Generated code contains zero references to `@craftworks/` packages
- [ ] `npx vitest run --project unit --coverage` passes 95/90/95/95 per-file thresholds
- [ ] `npx vitest run --project integration --coverage` passes 85/70/80/85 whole-package thresholds
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:

- `.craft/roles/craft/codegen.md` -- code generation patterns, TS emitter conventions, output validation
- `.craft/roles/craft/type-system.md` -- strict typing in generated code, no `any`, discriminated unions
- `.craft/roles/claws/platform-eng.md` -- SDK codegen module patterns

## Dependencies

- Pulse 7 (emit-oc-target) -- uses EmitResult types, integrates with emitter pipeline

## Test Gates

- [ ] L0 unit (6 tests): handler signature (1), request/response types (1), config interface (1), barrel exports (1), do-not-edit header (1), module format (1)
- [ ] L1 integration (3 tests): full codegen from fixture (1), barrel resolution (1), zero @craftworks/ (1)
- [ ] L2 e2e (1 test): generate → tsc --strict → zero errors (1)
- [ ] L3 acceptance (1 test): codegen/emit-platform scenario findings verified (1)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
