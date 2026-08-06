---
pulse: 3
slug: formir-types
plan: claws-sdk-graduation
depends_on: []
governing_roles: [craft:architect, craft:type-system]
scenario_codes: [forma/S02, cross-package/S03]
stage: implementation
test_tiers:
  L0_unit: 6
  L1_integration: 2
  L2_e2e: 0
  L3_accept: 1
test_scope:
  run:
    - "cd claws-sdk && npx vitest run --project unit --coverage"
    - "cd claws-sdk && npx vitest run --project integration --coverage"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 1
checkpoint_gate: false
---

# Pulse 03: FormaIR Types

## Objective

Copy and simplify the FormaIR types needed for the OC workspace subset into claws-sdk. The current implementation imports `OCWorkspaceIR` and associated field types from compiler-sdk's FormaIR module. This pulse creates an owned copy (~400 lines) that covers only the OC-specific IR types claws needs, stripped of FORMA generics and multi-format abstractions.

This is a type-only pulse -- no runtime logic. The types must be precise enough to drive the reader output (pulse 1), sidecar resolution (pulse 2), and downstream emit (pulse 7). GovernanceIR already exists in claws-sdk -- these types complement it for the workspace/input side of the pipeline.

## Deliverables

- [ ] `claws-sdk/src/compiler/ir/workspace-ir.ts` -- OCWorkspaceIR (top-level workspace intermediate representation), SoulIR (persona, principles, voice, boundaries), ToolsIR (tool declarations, trust annotations), AgentsIR (agent definitions, delegation rules), MemoryIR (entries, retention, index), IdentityIR (config, SSO, RBAC), UserIR (preferences, environment, platform), HeartbeatIR (health, timestamps, status), SkillsIR (skill metadata array), LobsterIR (lobster configuration)
- [ ] `claws-sdk/src/compiler/ir/field-types.ts` -- Shared field types: TrustLevel (T0-T4), Platform (oc, claude-code, cursor, etc.), DiagnosticSeverity (error, warning, info), FileReference (path, hash, size), ParseDiagnostic (severity, message, location, source file)
- [ ] `claws-sdk/src/compiler/ir/serialization.ts` -- `serializeWorkspaceIR(ir: OCWorkspaceIR): string` and `deserializeWorkspaceIR(json: string): OCWorkspaceIR` for snapshot/cache round-tripping. Validates shape on deserialization
- [ ] `claws-sdk/src/compiler/ir/index.ts` -- Barrel exports for workspace IR module (complements existing governance IR exports)
- [ ] `claws-sdk/tests/compiler/ir/workspace-ir.unit.test.ts` -- L0: OCWorkspaceIR constructs with all 9 sub-IRs (1), SoulIR tolerates missing optional fields (1), ToolsIR validates trust level range (1), DiagnosticSeverity enum values are correct (1)
- [ ] `claws-sdk/tests/compiler/ir/serialization.unit.test.ts` -- L0: round-trip serialize→deserialize produces identical IR (1), deserialize rejects malformed JSON with error (1)
- [ ] `claws-sdk/tests/compiler/ir/ir-integration.integration.test.ts` -- L1: reader output (pulse 1 fixture) maps to OCWorkspaceIR (1), IR serialization round-trip preserves all field types including dates and enums (1)
- [ ] `claws-sdk/tests/compiler/ir/ir.accept.test.ts` -- L3: scenario acceptance test verifying forma/cross-package findings (1)

## Acceptance Criteria

- [ ] Zero imports from `@craftworks/compiler-sdk` -- no FormaIR, no FORMA types
- [ ] OCWorkspaceIR contains exactly 9 sub-IR fields matching the 9 readers from pulse 1
- [ ] All field types use strict TypeScript (no `any`, no `unknown` except in deserialization validation)
- [ ] Serialization round-trip is lossless (serialize→deserialize→serialize produces identical JSON)
- [ ] Types are compatible with existing GovernanceIR in claws-sdk (no naming collisions)
- [ ] Platform enum includes at least: oc, claude-code, cursor, copilot, crewai, langgraph, bedrock
- [ ] `npx vitest run --project unit --coverage` passes 95/90/95/95 per-file thresholds
- [ ] `npx vitest run --project integration --coverage` passes 85/70/80/85 whole-package thresholds
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:

- `.craft/roles/craft/architect.md` -- monorepo structure, IR type patterns, barrel export conventions
- `.craft/roles/craft/type-system.md` -- strict typing discipline, discriminated unions, field type design

## Dependencies

None -- this is a type-only pulse with no runtime dependencies. However, the types are designed to align with the reader output from pulse 1.

## Test Gates

- [ ] L0 unit (6 tests): OCWorkspaceIR construction (1), SoulIR optional fields (1), ToolsIR trust validation (1), DiagnosticSeverity enum (1), round-trip serialization (1), malformed JSON rejection (1)
- [ ] L1 integration (2 tests): reader fixture maps to IR (1), round-trip preserves complex types (1)
- [ ] L3 acceptance (1 test): forma/cross-package scenario findings verified (1)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
