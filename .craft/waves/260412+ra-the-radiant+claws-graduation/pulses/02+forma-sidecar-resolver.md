---
pulse: 2
slug: forma-sidecar-resolver
plan: claws-sdk-graduation
depends_on: [1]
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: [forma/S01, forma/S02, forma/S04]
stage: implementation
test_tiers:
  L0_unit: 4
  L1_integration: 2
  L2_e2e: 1
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

# Pulse 02: FORMA Sidecar Resolver

## Objective

Replace the FORMA format registry dependency with an owned `.claws` sidecar resolver. The current implementation uses `WorkspaceFormatSchema` from compiler-sdk's FORMA subsystem to detect and parse `.claws` sidecar files. This pulse rewrites that as a standalone module (~200 lines) that resolves `.claws` configuration from the workspace root without any FORMA imports.

The sidecar resolver handles: locating `.claws` in the workspace directory, parsing its YAML/JSON content, validating required fields (version, platform targets), providing defaults for optional fields, and surfacing detection heuristics (Architect M-02) that identify workspace type without requiring a sidecar file.

## Deliverables

- [ ] `claws-sdk/src/compiler/sidecar/types.ts` -- ClawsSidecar type (version, targets, options, overrides), SidecarResolveResult (found/not-found discriminated union), DetectionHeuristic (platform, confidence, signals)
- [ ] `claws-sdk/src/compiler/sidecar/resolver.ts` -- `resolveSidecar(workspaceRoot: string)`: locate `.claws` file (YAML or JSON), parse, validate, return ClawsSidecar. Falls back to detection heuristics when no sidecar file exists. Uses normalize.ts from pulse 1 for content normalization
- [ ] `claws-sdk/src/compiler/sidecar/detect.ts` -- Detection heuristics: infer workspace type from file markers (CLAUDE.md → Claude Code, .cursorrules → Cursor, etc.). Returns confidence score. Split from FORMA per Architect M-02
- [ ] `claws-sdk/src/compiler/sidecar/index.ts` -- Barrel exports for sidecar module
- [ ] `claws-sdk/tests/compiler/sidecar/resolver.unit.test.ts` -- L0: valid YAML sidecar parses correctly (1), valid JSON sidecar parses correctly (1), missing sidecar falls back to heuristics (1), invalid sidecar produces error with path (1)
- [ ] `claws-sdk/tests/compiler/sidecar/sidecar.integration.test.ts` -- L1: resolver + heuristics integration with fixture workspace (1), sidecar overrides heuristic defaults when both present (1)
- [ ] `claws-sdk/tests/compiler/sidecar/sidecar.e2e.test.ts` -- L2: end-to-end sidecar resolution from fixture workspace directory (1)
- [ ] `claws-sdk/tests/compiler/sidecar/sidecar.accept.test.ts` -- L3: scenario acceptance test verifying forma findings (3)

## Acceptance Criteria

- [ ] Zero imports from `@craftworks/compiler-sdk` -- no FORMA, no WorkspaceFormatSchema
- [ ] `.claws` files parse from both YAML and JSON formats
- [ ] Missing `.claws` file triggers detection heuristics, not an error
- [ ] Detection heuristics identify at least Claude Code, Cursor, and OC workspace types
- [ ] Sidecar version field is validated (semver format)
- [ ] Uses normalize.ts from pulse 1 for BOM/CRLF handling
- [ ] `npx vitest run --project unit --coverage` passes 95/90/95/95 per-file thresholds
- [ ] `npx vitest run --project integration --coverage` passes 85/70/80/85 whole-package thresholds
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:

- `.craft/roles/craft/architect.md` -- monorepo structure, detection heuristics split from FORMA (M-02)
- `.craft/roles/claws/platform-eng.md` -- SDK sidecar conventions, workspace detection patterns

## Dependencies

- Pulse 1 (oc-workspace-readers) -- uses normalize.ts for content normalization, workspace model types

## Test Gates

- [ ] L0 unit (4 tests): YAML sidecar parse (1), JSON sidecar parse (1), missing sidecar heuristic fallback (1), invalid sidecar error (1)
- [ ] L1 integration (2 tests): resolver + heuristics with fixture workspace (1), sidecar overrides heuristics (1)
- [ ] L2 e2e (1 test): end-to-end sidecar resolution from fixture workspace (1)
- [ ] L3 acceptance (1 test): forma scenario findings verified (1)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
