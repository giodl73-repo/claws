---
slug: claws-serve
preset: "claws"
plan: "2 headlines: claws serve binds 127.0.0.1:3939 and returns GovernanceIR at /ir in <100ms, WebSocket streams governance events in real-time"
area: claws
status: Draft
phase: thoth
atoms: []
specs: [CL-05, CL-04]
---

# claws-serve — HTTP API Daemon

## Headlines

1. **H1: `claws serve` binds `127.0.0.1:3939` and returns GovernanceIR at `/ir` in <100ms** — The claws-serve package provides an HTTP server that wraps the claws-sdk compilation pipeline for programmatic access. `claws serve` starts a long-lived daemon bound to `127.0.0.1` on port 3939 (configurable via `--port` or `CLAWS_PORT`; `--host 0.0.0.0` required to expose externally). 12 HTTP endpoints expose the compilation pipeline: `POST /compile` triggers recompilation, `GET /ir` returns the cached GovernanceIR, `GET /diagnostics` returns current violations, `GET /tensions` returns cross-file tensions, `GET /classify/:tool` returns R-level classification for a tool, `GET /status` returns workspace health, `POST /snapshot` saves a named governance snapshot, `GET /diff` compares two snapshots, `POST /invalidate` forces cache invalidation, `GET /health` returns daemon health. All responses are JSON. The daemon maintains a CompilationHost (same as claws-lsp) with cached GovernanceIR for sub-100ms response times.
   - Validation: `claws serve` starts and `GET /health` returns `{"status": "ok"}` within 2 seconds
   - Validation: `GET /ir` returns serialized GovernanceIR JSON matching `GovernanceIR` type schema
   - Validation: `POST /compile` on changed workspace returns updated GovernanceIR, `GET /ir` reflects changes

2. **H2: WebSocket streams governance events in real-time for Gateway hot-reload** — The `/ws` endpoint provides a WebSocket event stream that pushes governance events as they occur: `compile:start`, `compile:complete`, `diagnostic:update`, `tension:detected`, `tension:resolved`, `snapshot:saved`, `ir:invalidated`. CI/CD pipelines subscribe to get real-time build status. The OC Gateway subscribes for hot-reload: when a `compile:complete` event fires, the Gateway fetches the updated GovernanceIR and reloads governance rules without restart. Event format follows structured JSON with `type`, `timestamp`, `payload` fields.
   - Validation: WebSocket client connects to `/ws`, triggers `POST /compile`, receives `compile:start` then `compile:complete` events
   - Validation: Diagnostic update after compile pushes `diagnostic:update` event with violation count
   - Validation: WebSocket reconnection after disconnect resumes event stream (no replay, current-state-only)

## Summary

The claws-serve package is the HTTP API daemon that makes the claws compilation pipeline accessible to CI/CD pipelines, OC Gateway hot-reload, custom tooling, and fleet management infrastructure. It shares the CompilationHost pattern with claws-lsp but exposes it over HTTP + WebSocket instead of LSP protocol. The daemon is started via `claws serve` (wired through claws-cli) or directly as a standalone binary. All 12 endpoints return JSON. The WebSocket event stream enables real-time integration without polling.

## Coverage Contract

### Specs
- [ ] CL-05 -- `claws serve` API: 12 HTTP endpoints + WebSocket event stream
- [ ] CL-04 -- GovernanceIR serialization via HTTP, compilation pipeline invocation via POST /compile

### Concept Guides
- [ ] docs/claws/api/serve-endpoints.md -- NEW: all 12 endpoints with request/response schemas
- [ ] docs/claws/api/websocket-events.md -- NEW: event types, payload schemas, reconnection behavior

### Scenario Coverage
- [ ] serve/startup-health -- daemon starts, /health returns ok
- [ ] serve/compile-and-fetch-ir -- POST /compile + GET /ir returns valid GovernanceIR
- [ ] serve/diagnostics-after-violation -- GET /diagnostics returns violations from last compile
- [ ] serve/tensions-cross-file -- GET /tensions returns cross-file tension list
- [ ] serve/classify-tool -- GET /classify/send-email returns R5 classification
- [ ] serve/snapshot-save-diff -- POST /snapshot + modify + POST /snapshot + GET /diff shows delta
- [ ] serve/invalidate-cache -- POST /invalidate forces recompile on next GET /ir
- [ ] serve/websocket-events -- connect /ws, trigger compile, receive event stream
- [ ] serve/gateway-hot-reload -- compile:complete event triggers mock Gateway reload
- [ ] serve/concurrent-requests -- 10 concurrent GET /ir requests return consistent results

### Test Tier Targets
| Tier | Target | Rationale |
|------|--------|-----------|
| L0 unit | 14 | Per-route handler (12), WebSocket event serialization (1), port configuration (1) |
| L1 integration | 6 | HTTP route → CompilationHost wiring (4), WebSocket event pipeline (1), snapshot diff (1) |
| L2 e2e | 3 | Full daemon lifecycle: start → compile → fetch → ws events → shutdown |
| L3 acceptance | 1 | `claws serve` + curl integration test on fixture workspace |

## Scope

- `claws-serve/src/server.ts` (NEW) -- HTTP + WebSocket server entry: Express/Fastify setup, route registration, graceful shutdown
- `claws-serve/src/routes/compile.ts` (NEW) -- POST /compile: trigger recompilation, return GovernanceIR
- `claws-serve/src/routes/status.ts` (NEW) -- GET /status: workspace health (file count, last compile time, violation summary)
- `claws-serve/src/routes/diagnostics.ts` (NEW) -- GET /diagnostics: current violations with file:line, severity, rule ID
- `claws-serve/src/routes/tensions.ts` (NEW) -- GET /tensions: cross-file tension list with cluster, files, resolution
- `claws-serve/src/routes/classify.ts` (NEW) -- GET /classify/:tool: R-level classification, capabilities, OBO status for named tool
- `claws-serve/src/routes/ir.ts` (NEW) -- GET /ir: serialized GovernanceIR JSON (cached, sub-100ms)
- `claws-serve/src/routes/snapshot.ts` (NEW) -- POST /snapshot: save named snapshot; GET /diff: compare two snapshots
- `claws-serve/src/routes/invalidate.ts` (NEW) -- POST /invalidate: force CompilationHost cache invalidation
- `claws-serve/src/routes/health.ts` (NEW) -- GET /health: daemon health (uptime, memory, compile count)
- `claws-serve/src/ws/events.ts` (NEW) -- WebSocket event stream: 7 event types, JSON serialization, client management
- `claws-serve/src/compilation-host.ts` (NEW) -- Shared CompilationHost (same pattern as claws-lsp/src/compilation-host.ts)

## Deliverables

### Specs & Design
- [ ] CL-05 amendment -- `claws serve` endpoint schemas finalized with OpenAPI-compatible definitions

### SDK Logic (claws-serve)
- [ ] claws-serve/src/server.ts -- HTTP + WebSocket server with graceful shutdown
- [ ] claws-serve/src/routes/compile.ts -- POST /compile handler
- [ ] claws-serve/src/routes/status.ts -- GET /status handler
- [ ] claws-serve/src/routes/diagnostics.ts -- GET /diagnostics handler
- [ ] claws-serve/src/routes/tensions.ts -- GET /tensions handler
- [ ] claws-serve/src/routes/classify.ts -- GET /classify/:tool handler
- [ ] claws-serve/src/routes/ir.ts -- GET /ir handler with cache headers
- [ ] claws-serve/src/routes/snapshot.ts -- POST /snapshot + GET /diff handlers
- [ ] claws-serve/src/routes/invalidate.ts -- POST /invalidate handler
- [ ] claws-serve/src/routes/health.ts -- GET /health handler
- [ ] claws-serve/src/ws/events.ts -- WebSocket event stream with 7 event types
- [ ] claws-serve/src/compilation-host.ts -- cached GovernanceIR, same pattern as claws-lsp
- [ ] claws-serve/tests/routes/compile.unit.test.ts -- compile trigger, response schema
- [ ] claws-serve/tests/routes/ir.unit.test.ts -- cache hit, serialization format
- [ ] claws-serve/tests/routes/diagnostics.unit.test.ts -- violation listing, severity filter
- [ ] claws-serve/tests/routes/tensions.unit.test.ts -- tension list, cluster mapping
- [ ] claws-serve/tests/routes/classify.unit.test.ts -- tool classification lookup
- [ ] claws-serve/tests/routes/snapshot.unit.test.ts -- save, diff, restore
- [ ] claws-serve/tests/routes/health.unit.test.ts -- health response schema
- [ ] claws-serve/tests/ws/events.unit.test.ts -- event serialization, client broadcast
- [ ] claws-serve/tests/ws/events.integration.test.ts -- WebSocket lifecycle, reconnection
- [ ] claws-serve/tests/server.e2e.test.ts -- full daemon lifecycle on fixture workspace
- [ ] claws-serve/tests/fixtures/ -- workspace fixtures for HTTP testing
- [ ] claws-serve/package.json -- workspace package with HTTP framework dependency
- [ ] claws-serve/tsconfig.json -- extends monorepo base, imports from claws-sdk + claws-base-cli
- [ ] claws-serve/vitest.config.ts -- test configuration with coverage gating

### CLI Wiring
- [ ] claws-cli/src/commands/live.ts (EDIT) -- add `claws serve` command: --port, --host, --no-ws flags

### Scenario Findings (added during wave)
*(empty -- populated during implementation)*

## Out of Scope

- Authentication / authorization on endpoints (enterprise concern, Phase 4+)
- HTTPS / TLS termination (reverse proxy responsibility)
- claws-lsp integration (LSP uses its own CompilationHost; `claws serve` is a separate daemon)
- Fleet-wide `claws serve` orchestration (fleet commands manage workspaces, not daemons)
- Rate limiting (not needed for local daemon, enterprise proxy handles fleet)
- OpenAPI spec generation (Phase 4+ when API stabilizes)
- GraphQL endpoint (HTTP + WebSocket covers all use cases for v1)

## Notes

- CompilationHost is duplicated between claws-lsp and claws-serve intentionally per ARCHITECTURE.md -- they share the PATTERN but not the code (different lifecycle: LSP is document-driven, serve is request-driven). Extraction to claws-sdk is a Phase 4+ concern if divergence stays below 20%.
- Port 3939 is the default. Configurable via `--port` or `CLAWS_PORT` env var.
- WebSocket events are current-state-only (no replay buffer). Clients that reconnect get the next event, not missed events. This simplifies the implementation and avoids unbounded memory growth.
- claws-serve imports from claws-sdk (all business logic) and claws-base-cli (output formatting for JSON responses) per ARCHITECTURE.md dependency rules.
- The snapshot/diff endpoints reuse GovernanceIR serialization + hash comparison from claws-sdk/src/ir/governance-ir.ts.
- Depends on claws-sdk (Phase 1 plans) and claws-base-cli (Phase 2 -- for response formatting). claws-cli wiring depends on claws-cli-foundation.
