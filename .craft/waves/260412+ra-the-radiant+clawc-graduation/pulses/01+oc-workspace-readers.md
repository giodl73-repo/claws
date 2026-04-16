---
pulse: 1
slug: oc-workspace-readers
plan: claws-sdk-graduation
depends_on: []
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: [workspace/S01, workspace/S03, workspace/S04, forma/S03, forma/S04, input/S01]
stage: implementation
test_tiers:
  L0_unit: 8
  L1_integration: 4
  L2_e2e: 1
  L3_accept: 0
test_scope:
  run:
    - "cd claws-sdk && npx vitest run --project unit --coverage"
    - "cd claws-sdk && npx vitest run --project integration --coverage"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 1
checkpoint_gate: false
---

# Pulse 01: OC Workspace Readers

## Objective

Rewrite the 9-file OC workspace reader as a standalone module in claws-sdk with zero @craftworks/compiler-sdk imports. The current implementation delegates to FORMA's `readOCWorkspaceViaFORMA()` and individual reader files (`oc-soul.ts`..`oc-lobster.ts`). This pulse replaces that with a simplified `WorkspaceReader` interface and 9 concrete readers: SOUL.md, TOOLS.md, AGENTS.md, MEMORY.md, IDENTITY.md, USER.md, HEARTBEAT.md, skills/, and lobster.yaml.

Each reader handles its own parsing, BOM stripping, and CRLF normalization (Architect M-03). The top-level `readOCWorkspace()` function discovers files, dispatches to readers, and returns a unified workspace model. ~800 lines total. This is the HEAVY pulse of CP-1 -- every other pulse in the checkpoint depends on the workspace model or the reader patterns established here.

## Deliverables

- [ ] `claws-sdk/src/compiler/readers/types.ts` -- WorkspaceReader interface (read method signature, file path, parse result), WorkspaceFile (path, raw content, normalized content), WorkspaceReadResult (success/failure discriminated union with diagnostics)
- [ ] `claws-sdk/src/compiler/readers/normalize.ts` -- BOM stripping (UTF-8 BOM 0xEF 0xBB 0xBF, UTF-16 LE/BE), CRLF→LF normalization, trailing-newline enforcement. Shared by all 9 readers. ~100 lines (Architect M-03)
- [ ] `claws-sdk/src/compiler/readers/soul-reader.ts` -- Parse SOUL.md: extract persona, principles, voice, boundaries. Tolerant of missing sections (warning, not error)
- [ ] `claws-sdk/src/compiler/readers/tools-reader.ts` -- Parse TOOLS.md: extract tool declarations, trust annotations, usage constraints
- [ ] `claws-sdk/src/compiler/readers/agents-reader.ts` -- Parse AGENTS.md: extract agent definitions, delegation rules, capability grants
- [ ] `claws-sdk/src/compiler/readers/memory-reader.ts` -- Parse MEMORY.md: extract memory entries, retention policies, index structure
- [ ] `claws-sdk/src/compiler/readers/identity-reader.ts` -- Parse IDENTITY.md: extract identity config, SSO references, RBAC hints
- [ ] `claws-sdk/src/compiler/readers/user-reader.ts` -- Parse USER.md: extract user preferences, environment, platform
- [ ] `claws-sdk/src/compiler/readers/heartbeat-reader.ts` -- Parse HEARTBEAT.md: extract health signals, last-modified timestamps, status
- [ ] `claws-sdk/src/compiler/readers/skills-reader.ts` -- Parse skills/ directory: enumerate skill files, extract metadata from each, return skill manifest array
- [ ] `claws-sdk/src/compiler/readers/lobster-reader.ts` -- Parse lobster.yaml: YAML parse, extract lobster configuration, validate required fields
- [ ] `claws-sdk/src/compiler/readers/workspace-reader.ts` -- Top-level orchestrator: discover 9 files/dirs, dispatch to readers, collect diagnostics, return OCWorkspaceModel. Handles missing files gracefully (optional files produce warnings, required files produce errors)
- [ ] `claws-sdk/src/compiler/readers/index.ts` -- Barrel exports for all readers
- [ ] `claws-sdk/tests/compiler/readers/normalize.unit.test.ts` -- L0: BOM stripping for UTF-8 (1), BOM stripping for UTF-16 LE (1), CRLF→LF normalization (1), trailing newline enforcement (1)
- [ ] `claws-sdk/tests/compiler/readers/soul-reader.unit.test.ts` -- L0: valid SOUL.md parses all sections (1), missing optional section produces warning not error (1)
- [ ] `claws-sdk/tests/compiler/readers/lobster-reader.unit.test.ts` -- L0: valid lobster.yaml parses (1), missing required field produces error (1)
- [ ] `claws-sdk/tests/compiler/readers/workspace-reader.integration.test.ts` -- L1: full 9-file workspace reads successfully (1), missing optional file produces warning (1), missing required file produces error (1), cross-platform path normalization (1)
- [ ] `claws-sdk/tests/compiler/readers/workspace-reader.e2e.test.ts` -- L2: end-to-end read from fixture directory with all 9 files, verify OCWorkspaceModel shape (1)

## Acceptance Criteria

- [ ] Zero imports from `@craftworks/compiler-sdk` or `@craftworks/agent-sdk` in any reader file
- [ ] All 9 file types parse correctly from fixture data
- [ ] BOM stripping handles UTF-8, UTF-16 LE, and UTF-16 BE
- [ ] CRLF normalization produces LF-only output
- [ ] Missing optional files produce warnings, not errors
- [ ] Missing required files produce errors with file path in diagnostic
- [ ] WorkspaceReader interface is stable enough for pulse 2 (sidecar) and pulse 3 (IR types) to build on
- [ ] `npx vitest run --project unit --coverage` passes 95/90/95/95 per-file thresholds
- [ ] `npx vitest run --project integration --coverage` passes 85/70/80/85 whole-package thresholds
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/architect.md` -- monorepo structure, WorkspaceReader interface contract (M-01), BOM/CRLF normalization (M-03)
- `.craft/roles/claws/platform-eng.md` -- SDK reader patterns, cross-module integration

## Dependencies

None -- this is the first pulse in CP-1.

## Test Gates

- [ ] L0 unit (8 tests): BOM stripping UTF-8 (1), BOM stripping UTF-16 LE (1), CRLF→LF (1), trailing newline (1), SOUL.md valid parse (1), SOUL.md missing section warning (1), lobster.yaml valid parse (1), lobster.yaml missing field error (1)
- [ ] L1 integration (4 tests): full 9-file workspace read (1), missing optional file warning (1), missing required file error (1), cross-platform paths (1)
- [ ] L2 e2e (1 test): end-to-end fixture read with OCWorkspaceModel shape verification (1)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
