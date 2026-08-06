---
pulse: 21
slug: serve-scaffold
plan: claws-cap-integration
depends_on: []
governing_roles: [craft:architect, claws:gateway-eng]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 4
  L1_integration: 2
  L2_e2e: 0
  L3_accept: 0
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

# Pulse 21: Serve Scaffold

## Objective

Stand up the `claws serve` HTTP scaffold in claws-serve. This pulse wires Fastify server creation, route registration infrastructure, CompilationHost integration (so routes can access compiled governance data), centralized error handling middleware, and a health endpoint. All subsequent CP-5 pulses (22-28) build on this scaffold -- it must be stable, testable, and extensible from day one.

Business logic (CompilationHost, workspace parsing, chunk assembly) lives in claws-sdk. claws-serve is the thin HTTP adapter that calls SDK functions and serializes responses.

## Deliverables

- [ ] `claws-serve/src/routes/index.ts` -- route registration module: exports a `registerRoutes(app: FastifyInstance, host: CompilationHost)` function that mounts all route prefixes (`/api/oc/*` (Layer 1 generic), `/api/chunks/*` (Layer 2), `/api/governance`, `/api/status`, `/api/events` (Layer 3)). Includes `GET /api/health` returning `{ status: 'ok', version: string, uptime: number }`. Health endpoint checks fleet policy availability. Missing fleet policy = `{ status: 'degraded', reason: 'fleet_policy_missing' }`.
- [ ] `claws-serve/src/middleware/error-handler.ts` -- centralized Fastify error handler: maps SDK errors to HTTP status codes (400 for validation, 404 for missing workspace, 500 for internal). Structured JSON error responses with `code`, `message`, `details` fields. Never leaks stack traces in production.
- [ ] `claws-serve/src/server.ts` (EDIT) -- wire `registerRoutes` and `errorHandler` into the existing Fastify instance. Pass CompilationHost from the existing `claws serve` command wiring (commit 788fa0fd7).
- [ ] `claws-serve/tests/routes/health.unit.test.ts` -- L0: health endpoint returns 200 with expected shape (1 test), health response includes version string (1 test), error handler maps SDK ValidationError to 400 (1 test), error handler maps unknown errors to 500 without stack trace (1 test)
- [ ] `claws-serve/tests/routes/registration.integration.test.ts` -- L1: all route prefixes are registered on Fastify instance (1 test), unknown routes return 404 via error handler (1 test)

## Acceptance Criteria

- [ ] `GET /api/health` returns 200 with `{ status: 'ok', version, uptime }`
- [ ] Unknown routes return `404` with structured JSON error
- [ ] SDK errors are mapped to appropriate HTTP status codes
- [ ] Error responses never include stack traces when `NODE_ENV=production`
- [ ] CompilationHost is accessible to all route handlers via Fastify decoration
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0 for both claws-sdk and claws-serve

## Governing Roles

Load these role files before starting:

- `.craft/roles/craft/architect.md` -- monorepo structure, SDK-owns-logic rule, thin HTTP adapter pattern
- `.craft/roles/claws/gateway-eng.md` -- serve API design, CompilationHost integration, route conventions

## Dependencies

None -- this is the first pulse in CP-5.

## Test Gates

- [ ] L0 unit (4 tests): health endpoint shape (1), version string present (1), ValidationError maps to 400 (1), unknown error maps to 500 without stack trace (1)
- [ ] L1 integration (2 tests): all route prefixes registered (1), unknown routes return 404 (1)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
