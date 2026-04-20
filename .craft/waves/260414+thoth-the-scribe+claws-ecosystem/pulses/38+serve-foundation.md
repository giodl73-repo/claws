---
pulse: 38
slug: serve-foundation
plan: claws-serve
depends_on: []
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 5
  L1_integration: 1
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run:
    - "cd claws-serve && npx vitest run --project unit --coverage"
    - "cd claws-serve && npx vitest run --project integration --coverage"
  typecheck:
    - "cd claws-serve && npx tsc --noEmit"
checkpoint: 4
checkpoint_gate: false
---

# Pulse 38: Serve Foundation

## Objective

Build the HTTP server foundation with health and status endpoints. The server listens on port 3939 by default, configurable via --port flag or CLAWS_PORT environment variable. Implement graceful shutdown that drains active connections before exiting. GET /health returns daemon health metrics: uptime in seconds, memory usage in bytes, and cumulative compile count. GET /status returns workspace health: governance file count, last compile timestamp, and violation summary (counts by severity). Also bootstrap the claws-serve package with package.json, tsconfig.json, and vitest.config.ts so it integrates into the monorepo workspace.

The server binds to 127.0.0.1 by default. When `--host 0.0.0.0` is used, a WARNING is emitted at startup: 'Server exposed to network without authentication. Use a reverse proxy for production.' All POST routes enforce Content-Type validation and a maximum request body size of 1MB. Rate limiting on POST /compile defaults to 10 requests/minute to prevent DoS from runaway CI scripts.

## Deliverables

- [ ] `claws-serve/package.json` — workspace package with HTTP framework dependency
- [ ] `claws-serve/tsconfig.json` — extends monorepo base, imports from claws-sdk + claws-base-cli
- [ ] `claws-serve/vitest.config.ts` — test config with coverage gating
- [ ] `claws-serve/src/server.ts` — HTTP server entry: Express/Fastify setup, route registration, graceful shutdown, port config
- [ ] `claws-serve/src/routes/health.ts` — GET /health: uptime, memory, compile count
- [ ] `claws-serve/src/routes/status.ts` — GET /status: file count, last compile time, violation summary
- [ ] `claws-serve/tests/routes/health.unit.test.ts` — L0: health response schema correct (1), uptime increases (1)
- [ ] `claws-serve/tests/routes/status.unit.test.ts` — L0: status response includes file count (1)
- [ ] `claws-serve/src/middleware/body-limit.ts` — Request body size limit middleware (1MB default)
- [ ] `claws-serve/src/middleware/content-type.ts` — Content-Type enforcement on all POST routes
- [ ] `claws-serve/src/middleware/rate-limit.ts` — Rate limiting middleware on POST /compile (10 req/min default, configurable via --rate-limit)
- [ ] Startup WARNING when --host 0.0.0.0 is used (in server.ts)
- [ ] `claws-serve/tests/routes/health.unit.test.ts` (UPDATE) — add L0: body size limit rejects oversized POST (1), Content-Type enforcement rejects wrong type (1)
- [ ] `claws-serve/tests/server.integration.test.ts` — L1: server starts on port 3939, /health returns 200 (1)

## Acceptance Criteria

- [ ] Server starts on port 3939 by default
- [ ] Port is configurable via --port flag and CLAWS_PORT environment variable
- [ ] Graceful shutdown drains active connections
- [ ] GET /health returns uptime, memory, and compile count
- [ ] GET /status returns file count, last compile time, and violation summary
- [ ] claws-serve package installs and builds within the monorepo workspace
- [ ] POST request with body > 1MB returns 413 Payload Too Large
- [ ] POST request without correct Content-Type returns 415 Unsupported Media Type
- [ ] Startup with --host 0.0.0.0 logs security warning
- [ ] POST /compile rate limited to 10 req/min by default
- [ ] All 5 L0 unit tests pass
- [ ] All 1 L1 integration tests pass

## Governing Roles

Load these role files before starting:
- `.craft/roles/claws/architect.md` — system-level design authority for claws packages
- `.craft/roles/claws/platform-eng.md` — implementation patterns and package scaffolding

## Dependencies

None — this is the foundation pulse for the serve package.

## Test Gates

- [ ] L0 unit (5 tests): health response schema correct, uptime increases, status response includes file count, body size limit rejects oversized POST, Content-Type enforcement rejects wrong type
- [ ] L1 integration (1 test): server starts on port 3939, /health returns 200
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
