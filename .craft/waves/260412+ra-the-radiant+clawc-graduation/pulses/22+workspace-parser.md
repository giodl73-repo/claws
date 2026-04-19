---
pulse: 22
slug: workspace-parser
plan: claws-cap-integration
depends_on: [21]
governing_roles: [craft:architect, claws:gateway-eng]
scenario_codes: [S02]
stage: implementation
test_tiers:
  L0_unit: 6
  L1_integration: 2
  L2_e2e: 1
  L3_accept: 1
test_scope:
  run:
    - "cd claws-sdk && npx vitest run --project unit --coverage"
    - "cd claws-serve && npx vitest run"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
    - "cd claws-serve && npx tsc --noEmit"
checkpoint: 5
checkpoint_gate: false
---

# Pulse 22: Workspace Parser

## Objective

Build the workspace parser that reads all 9 OC workspace files (SOUL.md, MEMORY.md, IDENTITY.md, TOOLS.md, AGENTS.md, HEARTBEAT.md, DENY.md, KNOWLEDGE.md, ENTITLEMENTS.md) into a typed `WorkspaceState` object. This is the read-side foundation for chunk assembly -- every chunk route in pulses 24-27 consumes WorkspaceState.

The workspace parser reads the same 9 OC files as the compiler readers (pulse 1). The file list is imported from a shared constant, not duplicated.

The parser must handle missing optional files gracefully (only SOUL.md is required), preserve lossless byte fidelity (P-271 atomic snapshot), and produce per-file typed sections that the chunk assembler can join with compiled GovernanceIR.

All business logic lives in claws-sdk. claws-serve only calls `parseWorkspace(dir)` and passes the result to chunk assembly.

## Deliverables

- [ ] `claws-sdk/src/workspace/types.ts` -- WorkspaceState type with per-file typed sections: `soul: SoulSection`, `memory: MemorySection`, `identity: IdentitySection`, `tools: ToolsSection`, `agents: AgentsSection`, `heartbeat: HeartbeatSection`, `deny: DenySection`, `knowledge: KnowledgeSection`, `entitlements: EntitlementsSection`. Each section includes `raw: string` (lossless original) and parsed typed fields. Optional files are `| null`.
- [ ] `claws-sdk/src/workspace/parser.ts` -- `parseWorkspace(dir: string): Promise<WorkspaceState>` function. Reads all 9 files from the workspace directory. Parses markdown frontmatter + body into typed sections. Returns null for missing optional files. Throws `WorkspaceError` if SOUL.md is missing.
- [ ] `claws-sdk/tests/workspace/parser.unit.test.ts` -- L0: parses minimal workspace with only SOUL.md (1 test), parses full 9-file workspace into all sections (1 test), missing optional file returns null section (1 test), missing SOUL.md throws WorkspaceError (1 test), preserves raw content byte-for-byte (1 test), handles BOM and CRLF in workspace files (1 test)
- [ ] `claws-sdk/tests/workspace/parser.integration.test.ts` -- L1: parses fixture workspace directory with all 9 files and validates cross-file references (1 test), parser output feeds into CompilationHost without errors (1 test)
- [ ] `claws-sdk/tests/workspace/parser.e2e.test.ts` -- L2: end-to-end workspace parse from fixture directory through full pipeline (1)
- [ ] `claws-sdk/tests/workspace/parser.accept.test.ts` -- L3: scenario acceptance test verifying S02 findings (1)

## Acceptance Criteria

- [ ] `parseWorkspace` returns typed WorkspaceState with all 9 sections
- [ ] Missing optional files produce `null` sections, not errors
- [ ] Missing SOUL.md throws `WorkspaceError` with descriptive message
- [ ] `raw` field on each section preserves byte-for-byte original content
- [ ] BOM (byte-order mark) and CRLF line endings are preserved in `raw`
- [ ] Parser handles empty files without crashing
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0 for claws-sdk

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/architect.md` -- SDK-owns-logic rule, type design conventions
- `.craft/roles/claws/gateway-eng.md` -- workspace file structure, lossless parsing requirements

## Dependencies

- Pulse 21 (serve-scaffold) -- parser is consumed by serve routes, requires CompilationHost integration pattern

## Test Gates

- [ ] L0 unit (6 tests): minimal workspace parse (1), full 9-file parse (1), missing optional returns null (1), missing SOUL.md throws (1), raw byte fidelity (1), BOM/CRLF handling (1)
- [ ] L1 integration (2 tests): fixture workspace cross-file validation (1), parser output feeds CompilationHost (1)
- [ ] L2 e2e (1 test): end-to-end workspace parse from fixture directory (1)
- [ ] L3 acceptance (1 test): S02 scenario findings verified (1)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
