---
pulse: 20
slug: fleet-scan
plan: claws-fleet-ops
depends_on: []
governing_roles: [claws:platform-eng, claws:ciso]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 6
  L1_integration: 3
  L2_e2e: 1
  L3_accept: 1
test_scope:
  run:
    - "cd claws-sdk && npx vitest run"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 3
checkpoint_gate: false
---

# Pulse 20: Fleet Scan

## Objective

Implement the fleet workspace discovery and classification engine. Fleet scan traverses a directory tree looking for marker files (SOUL.md, CLAUDE.md, .cursorrules, etc.) that identify OC workspaces, then classifies each into one of three governance states: GOVERNED (valid .claws/ directory), UNGOVERNED (OC workspace without claws), or MISCONFIGURED (.claws/ exists but is invalid or incomplete).

This scanner is the entry point for all fleet operations — drift detection, broadcast, kill, and reporting all depend on accurate workspace discovery and classification. The parallel execution engine supports concurrent scanning with configurable concurrency and progress callbacks for large fleets.

## Deliverables

- [ ] `claws-sdk/src/fleet/types.ts` — WorkspaceInfo (path, markers, classification, metadata), FleetConfig (concurrency, recursive depth, exclusion patterns), ScanResult (workspaces[], stats), ClassificationState enum (GOVERNED, UNGOVERNED, MISCONFIGURED)
- [ ] `claws-sdk/src/fleet/scan.ts` — Discover workspaces via marker files (SOUL.md, CLAUDE.md, .cursorrules, .cursor/rules, AGENTS.md, TOOLS.md) in directory tree; respects .gitignore and node_modules exclusion
- [ ] `claws-sdk/src/fleet/classify.ts` — 3-state classification: GOVERNED requires .claws/ + valid claws.json + at least one policy; UNGOVERNED has OC markers but no .claws/; MISCONFIGURED has .claws/ but missing or invalid claws.json
- [ ] `claws-sdk/src/fleet/runner.ts` — Parallel execution engine: default 8 concurrent operations, progress callback (started/completed/failed per workspace), partial failure handling (collect errors, continue scanning)
- [ ] `claws-cli/src/commands/scan.ts` — CLI command: `claws scan [dir] [--recursive] [--json]`
- [ ] `claws-sdk/tests/fixtures/fleet/governed-workspace/` — Fixture: OC workspace with valid .claws/ directory
- [ ] `claws-sdk/tests/fixtures/fleet/ungoverned-workspace/` — Fixture: Cursor workspace with .cursorrules, no .claws/
- [ ] `claws-sdk/tests/fixtures/fleet/misconfigured-workspace/` — Fixture: Claude Code workspace with .claws/ but invalid claws.json
- [ ] `claws-sdk/tests/fleet/scan.unit.test.ts` — L0 unit tests (6 tests)
- [ ] `claws-sdk/tests/fleet/scan.integration.test.ts` — L1 integration tests (3 tests)
- [ ] `claws-sdk/tests/fleet/scan.e2e.test.ts` — L2 e2e: create 3 temp workspace dirs from fixtures → scan → verify all 3 discovered with correct classification + stats + progress callbacks fired
- [ ] `claws-sdk/tests/accept/e2e/fleet-scan.accept.test.ts` — L3 acceptance: classification accuracy contract — GOVERNED/UNGOVERNED/MISCONFIGURED all correctly identified, node_modules excluded, nested workspaces found

## Acceptance Criteria

- [ ] `claws scan .` discovers all OC workspaces in directory tree via marker files
- [ ] Each workspace is classified as GOVERNED, UNGOVERNED, or MISCONFIGURED with correct rationale
- [ ] Parallel runner processes up to 8 workspaces concurrently
- [ ] Progress callback fires for each workspace (started, completed, or failed)
- [ ] Partial failures are collected and reported, not fatal to the scan
- [ ] `--json` flag outputs structured ScanResult
- [ ] node_modules and .git directories are excluded from scanning
- [ ] 3 fixture workspace directories exist with correct content for testing
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:
- `.craft/roles/claws/platform-eng.md` — workspace layout, fleet architecture, .claws/ conventions
- `.craft/roles/claws/ciso.md` — governance classification, compliance requirements

## Dependencies

None — this is the first pulse in CP-3, depends on CP-2 completion.

## Test Gates

- [ ] L0 unit (6 tests): marker file discovery finds SOUL.md and CLAUDE.md, classify returns GOVERNED for valid .claws/, classify returns UNGOVERNED for workspace without .claws/, classify returns MISCONFIGURED for invalid claws.json, parallel runner respects concurrency limit, progress callback fires for each workspace
- [ ] L1 integration (3 tests): scan discovers all 3 fixture workspaces with correct classifications, node_modules directories are excluded, recursive scan finds nested workspaces
- [ ] L2 e2e (1 test): create 3 temp workspace dirs from fixtures → scan → verify all 3 discovered with correct classification, stats, and progress callbacks
- [ ] L3 acceptance (1 test): classification accuracy contract — GOVERNED/UNGOVERNED/MISCONFIGURED correctly identified, exclusions respected, nested workspaces found
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
