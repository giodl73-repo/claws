---
pulse: 9
slug: workspace-file-reading
plan: claws-parse
depends_on: [1]
governing_roles: [craft:dragon, claws:gateway-eng]
scenario_codes: [parse/minimal-workspace, parse/full-workspace, parse/missing-files]
stage: implementation
test_tiers:
  L0_unit: 8
  L1_integration: 3
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run:
    - "cd claws-sdk && npx vitest run tests/compile/parse.unit.test.ts"
    - "cd claws-sdk && npx vitest run tests/compile/parse.integration.test.ts"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 2
checkpoint_gate: false
---

# Pulse 09: Workspace File Reading via InputResolver

## Objective

Implement the first stage of `parse()` -- reading 9 OC workspace files through
InputResolver. The 9 default file sources are: SOUL.md, TOOLS.md, AGENTS.md,
IDENTITY.md, USER.md, MEMORY.md, HEARTBEAT.md, skills/ directory, and
lobster.yaml. InputResolver handles default file sources (filesystem read),
package sources (npm), and URL sources (from claws.json `inputs`). Each file
read records CGR provenance (Spec 89) with content hash.

Missing files are tolerated -- they produce empty entries (marked absent, not
errored). Malformed files produce diagnostics with file:line locations. The
collect-all-errors strategy parses ALL files before halting (P-060): failure
in one file does not corrupt parser state for other files (P-108).

This pulse imports `readOCWorkspaceViaFORMA()` from compiler-sdk and wraps it
with InputResolver for source resolution and CGR provenance tracking.

## Deliverables

- [ ] `claws-sdk/src/compile/parse.ts` -- NEW: `parse(workspaceRoot: string, config?: ClawsConfig): Promise<ParseResult>` -- resolve sources via InputResolver, dispatch to compiler-sdk readers, collect results
- [ ] `claws-sdk/src/compile/input-resolver.ts` -- NEW: InputResolver that resolves 9 default files + package/URL sources from claws.json inputs, records CGR provenance
- [ ] `claws-sdk/src/compile/types.ts` -- NEW: ParseResult, FileEntry (present/absent), ParseDiagnostic with file:line, CGRProvenance record
- [ ] `claws-sdk/src/compile/index.ts` -- NEW: barrel exports for compile module
- [ ] `claws-sdk/tests/compile/parse.unit.test.ts` -- NEW: 8 L0 tests
- [ ] `claws-sdk/tests/compile/parse.integration.test.ts` -- NEW: 3 L1 tests
- [ ] `claws-sdk/tests/fixtures/minimal/` -- MODIFY: add SOUL.md + TOOLS.md with intent-bearing content
- [ ] `claws-sdk/tests/fixtures/full-workspace/` -- NEW: all 9 files with realistic content
- [ ] `claws-sdk/tests/fixtures/missing-files/` -- NEW: workspace with only SOUL.md + TOOLS.md (7 files absent)

## TDD Tests

### L0 Unit (8)

- `parse()` on minimal fixture (SOUL.md + TOOLS.md) returns ParseResult with 2 present + 7 absent entries -> `tests/compile/parse.unit.test.ts`
- `parse()` on full fixture (all 9 files) returns ParseResult with 9 present entries -> `tests/compile/parse.unit.test.ts`
- Missing HEARTBEAT.md produces absent entry, not error -> `tests/compile/parse.unit.test.ts`
- Malformed TOOLS.md produces ParseDiagnostic with file:line location -> `tests/compile/parse.unit.test.ts`
- InputResolver resolves default file source (filesystem path) -> `tests/compile/parse.unit.test.ts`
- InputResolver records CGR provenance with content hash for each file -> `tests/compile/parse.unit.test.ts`
- Collect-all-errors: 2 malformed files produce 2 diagnostics (not halt on first) -> `tests/compile/parse.unit.test.ts`
- Per-file parser isolation: failure in AGENTS.md does not affect SOUL.md parsing -> `tests/compile/parse.unit.test.ts`

### L1 Integration (3)

- Full `parse()` on minimal fixture through InputResolver -> compiler-sdk readers -> ParseResult -> `tests/compile/parse.integration.test.ts`
- Full `parse()` on full-workspace fixture with all 9 files -> `tests/compile/parse.integration.test.ts`
- Full `parse()` on missing-files fixture (graceful degradation) -> `tests/compile/parse.integration.test.ts`

## HC-BLOCK Findings Addressed

- CP-S04-F04 / P-060: Collect-all-errors strategy -- parse ALL files before halting
- PC1-S09-F01 / P-108: Per-file parser isolation -- failure in one file does not corrupt parser state
- PC1-S09-F03: Phase-gating -- halt after PARSE with "N errors found" if all files fail
- CP-S03-F06: Per-file absence warnings with specific defaults

## Acceptance Criteria

1. `parse()` reads all 9 OC workspace file types through InputResolver
2. Missing files produce absent entries with default descriptions (e.g., "IDENTITY.md not found -- defaults to L0")
3. Malformed files produce ParseDiagnostic with file:line:column locations
4. Collect-all-errors: all files are parsed even when some fail; complete diagnostic list returned
5. Per-file parser isolation: parser state is independent per file
6. CGR provenance recorded for every source with content hash
7. InputResolver supports default (filesystem), package (npm), and URL source types

## Governing Roles

| Role              | File                                | Focus                                                                   |
| ----------------- | ----------------------------------- | ----------------------------------------------------------------------- |
| craft:dragon      | `.craft/roles/craft/dragon.md`      | SDK architecture, compiler-sdk import boundary, error collection design |
| claws:gateway-eng | `.craft/roles/claws/gateway-eng.md` | InputResolver source resolution, CGR provenance, 9-file coverage        |

## Dependencies

- **CP-1 Pulse 01** (claws-sdk-bootstrap): claws-sdk package must exist
- **CP-1 Pulse 03** (claws-governance-ir): ParseResult, ParseDiagnostic types from GovernanceIR
- **compiler-sdk**: `readOCWorkspaceViaFORMA()` and per-file readers (oc-soul.ts through oc-lobster.ts) must exist

## Verification Gate

```bash
cd claws-sdk && npx vitest run tests/compile/parse.unit.test.ts
cd claws-sdk && npx vitest run tests/compile/parse.integration.test.ts
cd claws-sdk && npx tsc --noEmit
npm run build
```

## Key Constraints

- This pulse does NOT write OC parsers -- the 9-file readers exist in compiler-sdk. This pulse imports them.
- The import path is `readOCWorkspaceViaFORMA()` from compiler-sdk -- NOT direct file reads
- InputResolver abstracts source type: filesystem reads use `fs.readFile`, package/URL sources deferred to future pulses
- BOM stripping: uniform BOM strip on ALL 9 files before any parsing (P-100, PF1-S01-F01)
- Line ending normalization: BOM strip first, then CRLF->LF, before any keyword extraction (PF1-S02-F01)
- skills/ directory: enumerate all SKILL.md files in subdirectories (CP-S02-F01)
- Parse ordering is declaration-order-independent: two-pass or deferred resolution (CP-S02-F02, P-053)

## Review Amendments (R1)

### Architect: Compiler-SDK Reader Canary

- [ ] Add canary import test: `import { readOCWorkspaceViaFORMA } from '@craftworks/compiler-sdk/astro/workspace'`
- [ ] If compiler-sdk changes the reader interface, this test breaks immediately
