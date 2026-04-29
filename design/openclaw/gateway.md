---
name: gateway
description: The openclaw-core gateway — in-process RPC dispatcher and WebSocket broker, frame envelope, dispatch + auth model, plugin seam, Swift codegen surface
type: skunkworks-spec
applies_to: openclaw-core
source_version: HEAD 5e8cc1d9c (audit baseline)
authored: 2026-04-28
---

# Gateway

## What the gateway is

The Gateway is OpenClaw's **in-process RPC dispatcher and WebSocket broker**.
It runs inside the main Node.js process, accepts long-lived WS connections
from CLI clients and the macOS/iOS/Android companion apps, falls back to
HTTP-style entry points for non-WS adapters (Telegram pollers, etc.), and
routes every method call to one of ~50 named handlers spread across 26+
domain modules. It is **not** a separate microservice and does **not** speak
generic JSON-RPC; it speaks a TypeBox-validated frame protocol whose schema
is the source of truth for the Swift code generated into the companion apps.

Entry: `src/gateway/server.ts:24` re-exports `startGatewayServer()`, lazy-
loaded from `src/gateway/server.impl.ts:150-400+` so plugin loading and
model-catalog priming don't run until the gateway actually starts.

## The frame envelope

Every wire message is one of three discriminated frames. Definitions at
`src/gateway/protocol/schema/frames.ts:137-175`:

| Frame | Discriminator | Shape |
|---|---|---|
| Request | `type: "req"` | `{ id, method, params? }` |
| Response | `type: "res"` | `{ id, ok, payload?, error? }` |
| Event | `type: "event"` | `{ event, payload?, seq?, stateVersion? }` |

`method` is a dotted string (`sessions.send`, `config.patch`, `chat`). There
is **no method-name TypeScript union** — routing is a runtime string lookup.
That choice keeps the dispatch table extensible without per-method codegen
churn but means the type system can't enforce method names at the call site.

The error envelope (`ErrorShape` at `src/gateway/protocol/schema/frames.ts:126-135`):

```ts
{ code: string, message: string, details?: unknown, retryable?: boolean, retryAfterMs?: number }
```

Initial handshake is the `HelloOk` frame at
`src/gateway/protocol/schema/frames.ts:72-124` — carries protocol version,
server info, available methods/events, and auth tokens.

## Dispatch model

The handler registry (`GatewayRequestHandlers`,
`src/gateway/server-methods/shared-types.ts:138`) is a flat object keyed by
method name. Domain modules under `src/gateway/server-methods/*.ts` each
export a partial map; they merge into one registry at startup.

`handleGatewayRequest()` (`src/gateway/server-methods.ts:112-182`) is the
entry point. Per request:

1. **Auth + scope checks**. Role gating via `isRoleAuthorizedForMethod(role, method)` from `src/gateway/role-policy.ts`; scope gating via `authorizeOperatorScopesForMethod(method, scopes)` from `src/gateway/method-scopes.ts`. Roles are `operator` and `node`; scopes include `admin` and `write`.
2. **Lookup** in `coreGatewayHandlers[req.method]` or `extraHandlers[req.method]` (`server-methods.ts:159`). Miss → `INVALID_REQUEST` 404-style error.
3. **Rate-limit budget** for control-plane writes. `config.apply`, `config.patch`, `update.run` consume from a 3-per-60s budget keyed by `{deviceId, role}` or `{clientId}` (`src/gateway/control-plane-rate-limit.ts`). Per-actor, not per-session, so a misconfigured client cannot thrash config writes across sessions.
4. **Wrap in plugin scope**. `withPluginRuntimeGatewayRequestScope()` (`server-methods.ts:180`) puts the request into an `AsyncLocalStorage` so plugin subagent runtimes can re-enter the gateway without threading context through call chains.

## Plugin → gateway seam

Plugins reach the gateway through the `PluginRuntime` object injected at
load time (`src/plugins/runtime/types.ts:78-94`). The relevant surface:

| API | What it does |
|---|---|
| `subagent.run(params)` / `subagent.waitForRun(params)` | Re-dispatch into the gateway as a child request. Bound to the current `GatewayRequestContext` via `AsyncLocalStorage`, so nested agent calls preserve scope. |
| `nodes.list()` / `nodes.invoke(nodeId, command, params)` | Reach paired mobile/CLI nodes. |
| `channel.*` | Channel plugin runtime API. |

Plugins also register lifecycle hooks via the typed hook system. The
gateway-relevant ones (full list in `src/plugins/hook-types.ts:70-105`):

- `gateway_start` / `gateway_stop` — invoked by `runGlobalGatewayStopSafely()` and friends in `src/plugins/hook-runner-global.ts`.
- `before_dispatch` / `reply_dispatch` — wrap individual request handling.

### Fallback context for non-WS adapters

Channel adapters that don't flow through `handleGatewayRequest` (Telegram
poll loops, WhatsApp, etc.) still need access to config, logging, and
broadcast functions. They get it through a process-global fallback
context at `src/gateway/server-plugins.ts:32-87`:
`setFallbackGatewayContextResolver()` and `setFallbackGatewayContext()`
wire a `GatewayRequestContext` into module scope so adapters can read it
without a real WS request frame.

This is one of the gateway's more surprising bits — module-global state
that mostly stays inert but is load-bearing for poll-loop channels.

## Swift codegen surface

The wave's `claws-openclaw-upstream` plan calls out: *"Public API additions
require Swift protocol model regen for gateway changes."* This is that surface.

- **Schema source of truth**: TypeBox schemas at `src/gateway/protocol/schema/protocol-schemas.ts` (aggregator at `src/gateway/protocol/schema.ts`).
- **Codegen script**: `scripts/protocol-gen-swift.ts:1-200` — self-contained ~200-LOC TypeScript transformer. Reads the TypeBox JSON Schemas at runtime, emits Swift `Codable` structs with helper enums for error codes, camelCase conversion, and reserved-word safe naming, and stable JSON canonicalization (`:89-100`).
- **Outputs (two files)**:
  - `apps/macos/Sources/OpenClawProtocol/GatewayModels.swift`
  - `apps/shared/OpenClawKit/Sources/OpenClawProtocol/GatewayModels.swift`
- **No external toolchain** — no quicktype, no protobuf, no codegen framework. Just `tsx` + the script.

When we land any change that touches the protocol schemas, the regen script
must run and both Swift files must be committed. The pre-commit hook does
not enforce this; it's a humans-and-CI gate.

## Other notable seams

| Seam | Location | Note |
|---|---|---|
| `AuthRateLimiter` — per-scope rate limit (default, shared-secret, device-token, hook-auth) | `src/gateway/auth-rate-limit.ts:60-73` | Distinct from the control-plane budget. |
| Auth resolver | `src/gateway/auth.ts` | Token + scope resolution. |
| WS runtime — connection lifecycle, framing, reconnect gating | `src/gateway/server-ws-runtime.ts` | |
| Live-state diagnostics — event-loop health, presence versioning, model catalog cache | `src/gateway/server-live-state.ts` + `src/gateway/server/health-state.js` | |
| Broadcast / presence | `src/gateway/server-methods/shared-types.ts:57-58` (`GatewayBroadcastFn`, `GatewayBroadcastToConnIdsFn`) | Multicast to connected clients. |
| `before_dispatch`/`reply_dispatch` plugin hooks | `src/plugins/hook-types.ts:70-105` | |

## Architecturally surprising bits

A reader who skims the directory name expects an HTTP server. Things that
are easy to miss:

1. **Subagent re-entry through the gateway.** When a plugin tool spawns a subagent it dispatches *back* through the gateway as a child request. The child inherits the parent's `GatewayRequestContext` via `AsyncLocalStorage`. This is what makes nested agent calls work without context threading.
2. **Process-global fallback context** for non-WS channel adapters (above). Sharp-edged but load-bearing.
3. **Lazy entry point**. `server.ts` is a 24-line re-export; the real surface is dynamically imported from `server.impl.ts` so module load doesn't pay the gateway's startup cost.
4. **Self-contained Swift codegen**. The 200-line transformer is the *entire* codegen pipeline. There is no schema-language indirection.
5. **Per-actor control-plane budget**. Rate limiting is keyed by actor identity, not by session, so spawning sessions to evade the budget doesn't work.
6. **No method-name TypeScript union**. Methods live in a runtime registry; type system can't catch typos at call sites. Means new methods are cheap to add but PR review must verify the wiring.

## Files I'd link from any gateway-touching PR

1. `src/gateway/server.ts` — public entry point
2. `src/gateway/server.impl.ts` — startup orchestration
3. `src/gateway/protocol/schema/frames.ts` — frame definitions (`RequestFrame`, `ResponseFrame`, `EventFrame`, `ErrorShape`, `HelloOk`)
4. `src/gateway/server-methods.ts` — `handleGatewayRequest()` dispatch
5. `src/gateway/server-methods/shared-types.ts` — `GatewayClient`, `GatewayRequestContext`, handler types
6. `src/gateway/auth.ts`
7. `src/gateway/auth-rate-limit.ts`
8. `src/gateway/role-policy.ts` + `src/gateway/method-scopes.ts`
9. `src/gateway/control-plane-rate-limit.ts`
10. `scripts/protocol-gen-swift.ts`
11. `src/plugins/runtime/types.ts` — `PluginRuntime` interface

## Read next

- [`plugin-model.md`](plugin-model.md) — the other half of the plugin/gateway seam.
- A7 in [`TOUR.md`](TOUR.md) — the protocol surface deserves its own deeper dive than this section gives it; that page would walk every TypeBox schema and the full Swift codegen pipeline.
- A8 in [`TOUR.md`](TOUR.md) — ACP. Adjacent to but distinct from the gateway protocol.
