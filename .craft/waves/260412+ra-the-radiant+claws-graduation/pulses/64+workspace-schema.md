---
pulse: 64
slug: workspace-schema
plan: claws-cap-integration
depends_on: [22, 23, 66]
governing_roles: [craft:architect, claws:gateway-eng]
scenario_codes: [S02, S16]
stage: implementation
test_tiers:
  L0_unit: 6
  L1_integration: 3
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

# Pulse 64: Workspace Schema Introspection

## Objective

GET /api/oc/ (Layer 1 root) — the discovery/introspection endpoint that tells partners
and the TUI what's available. The workspace schema IS the root of the generic API.
Returns all 9 OC files with their sections, editability, chunk mappings, session list,
and compilation status.

This is the first endpoint any consumer calls. Partners use it to learn the workspace
structure. The TUI uses it to decide which screens to show (skip Groups if no groups
section exists, skip Schedule if HEARTBEAT.md is missing).

Business logic in claws-sdk (workspace schema builder). Route is thin HTTP adapter.

## Deliverables

- [ ] `claws-sdk/src/workspace/schema-builder.ts` — WorkspaceSchema builder. Reads all 9 file paths, detects which exist, parses section headers, maps to chunk endpoints, includes session list from OC runtime, includes compilation status.
- [ ] `claws-sdk/src/workspace/schema-types.ts` — WorkspaceSchema, FileSchema, SectionSchema types.
- [ ] `claws-serve/src/routes/workspace-schema.ts` — GET /api/oc/ route (Layer 1 root introspection, thin adapter).
- [ ] `claws-sdk/tests/workspace/schema-builder.unit.test.ts` — L0: 6 tests (all files present, some missing, empty workspace, section parsing, session inclusion, compilation status).
- [ ] `claws-serve/tests/routes/workspace-schema.integration.test.ts` — L1: 3 tests (full workspace, partial workspace, workspace with sessions).
- [ ] `claws-serve/tests/e2e/workspace-schema.e2e.test.ts` — L2: 1 test (start serve, call schema endpoint, verify complete response).
- [ ] `claws-serve/tests/e2e/workspace-schema.accept.test.ts` — L3: scenario acceptance test verifying S02/S16 findings (2)

## Acceptance Criteria

- [ ] GET /api/oc/ (Layer 1 root) returns all 9 file entries (exists: true/false)
- [ ] Each file entry includes parsed sections with names and editability
- [ ] Section entries include chunk endpoint mapping where applicable
- [ ] Sessions array populated from OC runtime state
- [ ] Compilation status included (clean/stale/error)
- [ ] Missing files return exists: false with empty sections (not 404)
- [ ] Workspace schema includes `violationState` field at the root level. Per-file entries include `hasViolation: true` for files in `pendingViolations`.

## Test Gates

- [ ] L0 unit (6 tests): schema builder with various workspace states
- [ ] L1 integration (3 tests): full/partial/session-aware schema generation
- [ ] L2 e2e (1 test): live serve endpoint returns valid schema
- [ ] L3 acceptance (1 test): S02/S16 scenario findings verified (1)
