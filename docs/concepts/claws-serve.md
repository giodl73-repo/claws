# claws serve

<!-- atom:claws-serve (C94) -->

HTTP + WebSocket development server for real-time governance feedback.

> **Reading order**: Standalone guide -- no prerequisites. Part of the [Ecosystem guides](README.md#ecosystem-server--ci).

---

## Quick start

```bash
# Start the dev server
claws serve --port 3939

# In another terminal -- check the server is running
curl http://localhost:3939/health
# {"uptimeSeconds":3,"heapUsedBytes":12345678,"compilationCount":0}

# Trigger a compilation and see the result
curl -X POST http://localhost:3939/compile
# {"ir":{...},"cached":false,"durationMs":142}

# Connect to the WebSocket for real-time events
# (Node.js / browser)
# const ws = new WebSocket('ws://localhost:3939/ws');
# ws.onmessage = (e) => console.log(JSON.parse(e.data));
```

---

## Overview

`claws serve` runs a local Express server that exposes the claws compiler as an HTTP API with optional WebSocket event streaming. Editors, CI tooling, and browser dashboards can trigger compilations, query diagnostics, compare snapshots, and classify tools -- all without invoking the CLI directly.

The server binds to `127.0.0.1:3939` by default. When `--host 0.0.0.0` is used, it warns that no authentication layer is present and recommends a reverse proxy for production.

---

## HTTP endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Uptime (seconds), heap memory (bytes), compilation count |
| `GET` | `/status` | File count, last compile time, violation summary (error/warning/info). Returns 501 when no compile function is configured |
| `POST` | `/compile` | Trigger recompilation. Returns the full GovernanceIR, cache hit flag, and duration in ms |
| `GET` | `/ir` | Return cached GovernanceIR with `ETag` and `Cache-Control: private, no-cache` headers. 404 if no compilation has run |
| `GET` | `/diagnostics` | Flat list of governance violations: ruleId, level, message, target, diagnosticCode |
| `GET` | `/tensions` | Cross-file tension list with cluster mapping (A-G: A = OBO conflicts, B = multi-constraint, C-G reserved) and resolution guidance |
| `POST` | `/snapshot` | Save a named governance snapshot from the current cached IR |
| `GET` | `/diff?from=X&to=Y` | Compare two named snapshots: added/removed/changed violations, tension delta, risk level shifts |
| `POST` | `/invalidate` | Force-clear the compilation cache. Next `GET /ir` returns 404 until recompilation |
| `GET` | `/classify/:tool` | Look up a tool's risk classification: R-level (R1-R5), classification string, OBO flag, description |

---

## WebSocket events

Connect to `ws://localhost:3939/ws` to receive real-time governance events. The server pushes 7 event types:

| Event type | Payload | When emitted |
|------------|---------|--------------|
| `compile:start` | `{}` | Compilation triggered |
| `compile:complete` | `{ cached, durationMs }` | Compilation finished |
| `diagnostic:update` | `{ violationCount, warningCount }` | Violations or warnings detected after compile |
| `tension:detected` | `{ totalConflicts, oboConflicts, multiConstraintConflicts }` | Conflicts found after compile |
| `tension:resolved` | `{ reason }` | Cache invalidated (conflicts cleared) |
| `snapshot:saved` | `{ name, timestamp }` | Named snapshot saved |
| `ir:invalidated` | `{}` | Cache force-cleared |

Wire format: JSON with `type`, `timestamp` (ISO 8601), and `payload` fields.

No replay buffer -- clients that reconnect receive only future events.

---

## CompilationHost

The server's compilation cache uses SHA-256 content hashing to skip recompilation when workspace files haven't changed. The `CompilationHost` class wraps a consumer-supplied `CompileFn` (typically the `claws-sdk` compile pipeline, wired by `claws-cli` at startup) and provides:

- `compile()` -- triggers compilation, returns `{ ir, cached, durationMs }`
- `getCachedIR()` -- synchronous zero-cost lookup of the cached GovernanceIR
- `getHash()` / `getCompiledAt()` -- cache metadata
- `clear()` -- invalidate cache (used by `POST /invalidate`)

```ts
const host = new CompilationHost(compileFn, '/workspace');
const result = await host.compile();
// result.cached === true when IR hash matches previous compilation
```

---

## Middleware stack

| Middleware | Behavior |
|-----------|----------|
| **CORS** | Deny-by-default: no `Access-Control-Allow-Origin` header. Sets `X-Content-Type-Options: nosniff` and `X-Frame-Options: DENY` |
| **Content-Type** | POST routes require `application/json`. Returns 415 otherwise |
| **Body limit** | Rejects payloads over 1 MB via `Content-Length` header. Returns 413 for oversized, 411 when `Content-Length` is missing |
| **Rate limit** | Sliding window: max 10 requests/minute to `POST /compile` (configurable via `rateLimitMax`). Returns 429 when exceeded |

---

## WebSocket origin validation

When bound to localhost (default), the server accepts WebSocket upgrades only from localhost origins. When an explicit `allowedOrigins` list is configured, only those exact origins are accepted regardless of bind address. Connections with invalid origins are closed with code 1008.

---

## Configuration

| Option | Default | Environment variable |
|--------|---------|---------------------|
| Port | `3939` | `CLAWS_PORT` |
| Host | `127.0.0.1` | -- |
| Rate limit | `10/min` | -- |
| WebSocket | enabled | `--no-ws` to disable |
| Allowed origins | localhost-only | `allowedOrigins` in `ServerOptions` |

---

## Key types

| Type | Module |
|------|--------|
| `ServerOptions` | `claws-serve/server` |
| `ServerState` | `claws-serve/server` |
| `CompilationHost` | `claws-serve/compilation-host` |
| `CompileFn` | `claws-serve/compilation-host` |
| `WsEvent` / `WsEventType` | `claws-serve/ws/events` |
| `ClientManager` | `claws-serve/ws/events` |
| `Snapshot` / `SnapshotDiff` | `claws-serve/routes/snapshot` (HTTP-layer types wrapping the SDK-level domain model in `claws-sdk/snapshot/`) |

---

## Related concepts

- [Snapshot Diff](snapshot-diff.md) -- governance snapshot comparison model
- [Tool Classification](tool-classification.md) -- risk levels returned by `/classify`
- [claws LSP](claws-lsp.md) -- editor integration using the same CompilationHost pattern
- [Governance IR](governance-ir.md) -- the IR returned by `/compile` and `/ir`
