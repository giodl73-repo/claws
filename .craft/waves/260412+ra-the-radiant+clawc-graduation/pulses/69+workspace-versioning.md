---
pulse: 69
slug: workspace-versioning
plan: claws-cap-integration
depends_on: [31, 32]
governing_roles: [craft:architect, claws:gateway-eng]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 6
  L1_integration: 4
  L2_e2e: 2
  L3_accept: 1
test_scope:
  run:
    - "cd claws-sdk && npx vitest run --project unit --coverage"
    - "cd claws-serve && npx vitest run --coverage"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
    - "cd claws-serve && npx tsc --noEmit"
checkpoint: 6
checkpoint_gate: false
---

# Pulse 69: Workspace Versioning

## Objective

ETag-based optimistic concurrency for the workspace. A monotonic version counter stored
in `.claws/cache/version.json` tracks every write. GET responses include an `ETag` header
with the current version. PATCH requests require an `If-Match` header — if the version
does not match, the server returns 409 Conflict with a `VERSION_CONFLICT` error code.
SSE events include the version number so live clients can detect staleness.

Business logic (version counter, conflict detection, persistence) lives in claws-sdk.
The ETag middleware in claws-serve reads/writes the header and delegates to the SDK.

## Deliverables

- [ ] `claws-sdk/src/workspace-edit/versioning.ts` — VersionManager: monotonic counter, getVersion, incrementVersion, checkVersion (returns match/conflict), persistVersion (writes to .claws/cache/version.json), loadVersion (reads on startup). Exported types: WorkspaceVersion, VersionConflictError.
- [ ] `claws-serve/src/middleware/etag.ts` — Express middleware: injects ETag header on GET responses, validates If-Match on PATCH requests, returns 409 on mismatch with VERSION_CONFLICT error body.
- [ ] `claws-sdk/tests/workspace-edit/versioning.unit.test.ts` — L0: 6 tests for version manager logic.
- [ ] `claws-serve/tests/middleware/etag.integration.test.ts` — L1: 4 tests for ETag middleware with real routes.
- [ ] `claws-serve/tests/e2e/versioning.e2e.test.ts` — L2: 2 tests for live versioning round-trips.

## Acceptance Criteria

- [ ] GET responses include `ETag` header with current version string
- [ ] PATCH with correct `If-Match` ETag succeeds and returns new ETag in response
- [ ] PATCH with stale `If-Match` ETag returns 409 with `VERSION_CONFLICT` error code
- [ ] PATCH without `If-Match` header returns 428 Precondition Required
- [ ] Version counter is monotonically increasing (never decreases or resets during runtime)
- [ ] Version persists to `.claws/cache/version.json` and survives server restart
- [ ] SSE events include version number in event payload
- [ ] Concurrent PATCHes: one succeeds, the other gets 409

## Test Gates

- [ ] L0 unit (6 tests): getVersion returns current, incrementVersion advances monotonically, checkVersion matches correctly, checkVersion detects stale, persistVersion writes to disk, loadVersion reads from disk
- [ ] L1 integration (4 tests): PATCH with correct ETag succeeds + new ETag returned, PATCH with stale ETag returns 409, GET includes ETag header, version survives VersionManager reload
- [ ] L2 e2e (2 tests): start serve + GET + PATCH with ETag + verify new ETag, start serve + two concurrent PATCHes + one succeeds + one gets 409
- [ ] L3 accept (1 test): concurrent edit scenario — two clients read same version, both PATCH, first succeeds, second gets 409, second re-reads and retries successfully
