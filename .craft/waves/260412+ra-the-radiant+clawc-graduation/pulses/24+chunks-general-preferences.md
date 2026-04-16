---
pulse: 24
slug: chunks-general-preferences
plan: claws-cap-integration
depends_on: [23]
governing_roles: [craft:architect, claws:gateway-eng]
scenario_codes: [S02]
stage: implementation
test_tiers:
  L0_unit: 4
  L1_integration: 2
  L2_e2e: 0
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

# Pulse 24: Chunks General & Preferences

## Objective

Wire the first two chunk GET endpoints: `GET /api/chunks/general/identity` (General tab -- agent name, description, language, managed-by) and `GET /api/chunks/preferences/*` (Preferences tab -- instructions, reviewers, schedule). These are the simplest chunk routes and establish the pattern that pulses 25-27 follow: route handler calls `assembleChunks`, extracts the relevant Chunk<K>, and serializes as JSON.

Routes are thin adapters in claws-serve. All chunk assembly logic is in claws-sdk (pulse 23). The route handler pattern: get CompilationHost from Fastify decoration, call `assembleChunks(workspace, governanceIR)`, return `Chunk<'general'>` or `Chunk<'preferences'>`.

## Deliverables

- [ ] `claws-serve/src/routes/chunks-general.ts` -- `GET /api/chunks/general/identity` route. Returns `Chunk<'general'>` with GeneralData (name, description, language, managedBy), field editability, governance context, and writeBack URL. Handles missing IDENTITY.md gracefully (404 with structured error).
- [ ] `claws-serve/src/routes/chunks-preferences.ts` -- `GET /api/chunks/preferences/instructions` and `GET /api/chunks/preferences/schedule` routes. Returns `Chunk<'preferences'>` with PreferencesData (instructions, reviewers, schedule). Schedule section is optional -- returns null schedule field if HEARTBEAT.md is missing.
- [ ] `claws-serve/tests/routes/chunks-general.unit.test.ts` -- L0: general/identity returns 200 with Chunk shape (1 test), general/identity includes editable fields with correct types (1 test)
- [ ] `claws-serve/tests/routes/chunks-preferences.unit.test.ts` -- L0: preferences/instructions returns 200 with instructions text (1 test), preferences/schedule returns null schedule when HEARTBEAT.md missing (1 test)
- [ ] `claws-serve/tests/routes/chunks-general.integration.test.ts` -- L1: general chunk data matches parsed IDENTITY.md + AGENTS.md fields (1 test), preferences chunk includes writeBack URLs for editable sections (1 test)
- [ ] `claws-serve/tests/routes/chunks-general-preferences.accept.test.ts` -- L3: S02 acceptance -- full workspace parse through general + preferences chunk endpoints returns valid Chunk JSON matching CL-10 spec examples (1 test)

## Acceptance Criteria

- [ ] `GET /api/chunks/general/identity` returns 200 with valid `Chunk<'general'>` JSON
- [ ] GeneralData includes `name`, `description`, `language`, `managedBy` from IDENTITY.md + AGENTS.md
- [ ] `editable` record has correct types: name=string, description=text, language=enum, managedBy=object
- [ ] `writeBack.url` is `/api/chunks/general/identity` with method PATCH
- [ ] `GET /api/chunks/preferences/instructions` returns 200 with instructions text
- [ ] `GET /api/chunks/preferences/schedule` returns null schedule when HEARTBEAT.md is absent
- [ ] Missing IDENTITY.md returns 404 with structured JSON error
- [ ] Response JSON matches CL-10 spec Chunk Format examples
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0 for both claws-sdk and claws-serve

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/architect.md` -- thin HTTP adapter pattern, SDK-owns-logic rule
- `.craft/roles/claws/gateway-eng.md` -- chunk route conventions, response shape alignment with CL-10 spec

## Dependencies

- Pulse 23 (chunk-assembler) -- provides `assembleChunks` which produces the Chunk<K> objects these routes serve

## Test Gates

- [ ] L0 unit (4 tests): general/identity shape (1), general/identity editable types (1), preferences/instructions 200 (1), preferences/schedule null handling (1)
- [ ] L1 integration (2 tests): general chunk matches parsed workspace (1), preferences writeBack URLs present (1)
- [ ] L3 acceptance (1 test): S02 -- full workspace through general + preferences endpoints matches CL-10 spec (1)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
