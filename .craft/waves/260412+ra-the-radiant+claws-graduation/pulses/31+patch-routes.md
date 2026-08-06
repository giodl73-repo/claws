---
pulse: 31
slug: patch-routes
plan: claws-cap-integration
depends_on: [29, 30]
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: [cap-integration/S03, cap-integration/S04, cap-integration/S05, S31]
stage: implementation
test_tiers:
  L0_unit: 6
  L1_integration: 4
  L2_e2e: 2
  L3_accept: 2
test_scope:
  run:
    - "cd claws-serve && npx vitest run --project unit --coverage"
    - "cd claws-serve && npx vitest run --project integration --coverage"
  typecheck:
    - "cd claws-serve && npx tsc --noEmit"
checkpoint: 6
checkpoint_gate: false
---

# Pulse 31: PATCH Chunk Routes

## Objective

Wire the PATCH /api/chunks/* routes through the full write pipeline: request parsing → validation layer → workspace-edit → incremental recompile → response. These routes are the primary write path for CAP settings partners — each PATCH represents a user editing an agent setting in the UI.

The route handler is a thin HTTP adapter (claws-serve is never where business logic lives). It deserializes the request body into an EditOperation, passes it to the ValidationPipeline from claws-sdk, then to the StructuredEditor for the lossless write, then triggers incremental recompilation, and returns the updated chunk or a typed PatchError response.

Validation middleware runs before the route handler: Content-Type enforcement, body size limit, and request schema validation. The middleware rejects malformed requests with 400 before they reach the validation pipeline.

Response format: success returns 200 with the updated chunk JSON. Validation failure returns 422 with the PatchError body. Compilation failure returns 500 with COMPILATION_FAILED PatchError. All error responses include the PatchError type, human-readable message, and structured context.

## Deliverables

- [ ] `claws-serve/src/routes/patch-chunks.ts` — PATCH /api/chunks/:tab route handler: deserialize EditOperation from body, call ValidationPipeline.validate(), call StructuredEditor.apply(), trigger incremental recompile via CompilationHost, return updated chunk or PatchError. Routes: PATCH /api/chunks/general, /api/chunks/preferences, /api/chunks/connections, /api/chunks/memory, /api/chunks/groups, /api/chunks/entitlements
- [ ] `claws-serve/src/middleware/validation-middleware.ts` — Request validation middleware: Content-Type must be application/json, body must parse as valid EditOperation schema (Zod or equivalent), body size within 1MB limit. Returns 400 with descriptive error on failure.
- [ ] `claws-serve/src/routes/patch-chunks.ts` (response mapping) — Map PatchError variants to HTTP status codes: R5_LOCKED → 403, FLEET_LOCKED → 403, GOVERNANCE_DENIED → 403, VALIDATION_FAILED → 422, FILE_NOT_EDITABLE → 403, COMPILATION_FAILED → 500, ROLLBACK_FAILED → 500, UNKNOWN_ERROR → 500
- [ ] `claws-serve/tests/routes/patch-chunks.unit.test.ts` — L0: valid PATCH returns 200 with updated chunk (1), R5_LOCKED returns 403 with PatchError body (1), FLEET_LOCKED returns 403 with PatchError body (1), malformed body returns 400 (1), missing Content-Type returns 415 (1), oversized body returns 413 (1)
- [ ] `claws-serve/tests/routes/patch-chunks.integration.test.ts` — L1: PATCH connections tool toggle → validate → write → recompile → updated chunk returned (1), PATCH with governance deny → 403 with provenance (1), sequential PATCHes to different tabs compose correctly (1), PATCH → GET returns updated chunk (1)
- [ ] `claws-serve/tests/routes/patch-chunks.e2e.test.ts` — L2: full PATCH → validate → write → compile → GET cycle on reference workspace (1), PATCH with R5 tool → 403 → GET returns unchanged chunk (1)
- [ ] `claws-serve/tests/routes/patch-chunks.accept.test.ts` — L3: S03 acceptance — PATCH to toggle R5 tool returns 403 R5_LOCKED with correct provenance (1), S05 acceptance — PATCH connections toggle → updated chunk reflects change (1)

## Acceptance Criteria

- [ ] PATCH /api/chunks/:tab accepts EditOperation and returns updated chunk on success (S05)
- [ ] R5 tool toggle returns 403 R5_LOCKED with structured PatchError (S03)
- [ ] Fleet lock violation returns 403 FLEET_LOCKED (S04)
- [ ] Governance deny returns 403 GOVERNANCE_DENIED with provenance
- [ ] Malformed request body returns 400 before reaching validation pipeline
- [ ] Missing Content-Type returns 415
- [ ] Oversized body returns 413
- [ ] Successful PATCH triggers incremental recompile — subsequent GET reflects changes
- [ ] PatchError response includes type, message, and structured context
- [ ] claws-serve contains no business logic — all validation and edit logic in claws-sdk
- [ ] `npx vitest run --project unit --coverage` passes coverage thresholds
- [ ] `npx vitest run --project integration --coverage` passes coverage thresholds
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:

- `.craft/roles/craft/architect.md` — SDK-owns-logic rule, thin HTTP adapter pattern, error mapping conventions
- `.craft/roles/claws/platform-eng.md` — route handler patterns, middleware composition, response format

## Dependencies

- Pulse 29 (workspace-edit) — StructuredEditor, EditOperation types, lossless write engine
- Pulse 30 (validation-layer) — ValidationPipeline, PatchError union, R5/fleet/governance validators

## Test Gates

- [ ] L0 unit (6 tests): valid PATCH returns 200 (1), R5_LOCKED returns 403 (1), FLEET_LOCKED returns 403 (1), malformed body returns 400 (1), missing Content-Type returns 415 (1), oversized body returns 413 (1)
- [ ] L1 integration (4 tests): PATCH toggle → validate → write → recompile → chunk returned (1), governance deny → 403 with provenance (1), sequential PATCHes compose (1), PATCH → GET consistency (1)
- [ ] L2 e2e (2 tests): full PATCH → validate → write → compile → GET cycle (1), R5 PATCH → 403 → unchanged chunk (1)
- [ ] L3 accept (2 tests): S03 R5 PATCH acceptance (1), S05 connections toggle acceptance (1)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
