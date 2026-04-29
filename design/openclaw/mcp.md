---
name: mcp
description: Model Context Protocol integration — two-sided (server expose + client consume), transports, ACP bridge per-session rejection, boundary vs plugin/ACPX/ClawHub
type: skunkworks-spec
applies_to: openclaw-core
source_version: HEAD 5e8cc1d9c (audit baseline)
authored: 2026-04-28
---

# MCP — Model Context Protocol

## Vision alignment

`VISION.md`: *"OpenClaw supports MCP as both a server and a runtime
integration surface. ... pragmatic MCP support without duplicating
existing agent, tool, ACPX, plugin, or ClawHub paths."*

MCP is a **runtime integration surface**, not a replacement for native
tooling. The integration is deliberately narrow — two well-scoped sides,
not a full MCP-everywhere posture.

## Two sides

### Server side — we expose

`openclaw mcp serve` runs a stdio MCP server that bridges OpenClaw
gateway sessions into a standard MCP interface. The MCP client spawns
and owns the process.

Implementation: `src/mcp/channel-server.ts`, `src/mcp/channel-tools.ts`.

### Client side — we consume

Agents inside OpenClaw connect to external MCP servers configured
**globally** in `~/.openclaw/config.json` under `mcp.servers`. Tools
materialize into the agent's native tool catalog on first use.

Implementation: `src/agents/pi-bundle-mcp-runtime.ts`,
`src/agents/pi-bundle-mcp-materialize.ts`.

## What OpenClaw exposes

Tools served by `openclaw mcp serve`:

| Tool | Purpose |
|---|---|
| `conversations_list` | List recent routed conversations from gateway. |
| `conversation_get` | Fetch one conversation by session key. |
| `messages_read` | Read durable transcript history. |
| `attachments_fetch` | Extract non-text message metadata. |
| `events_poll` | Poll live events since a cursor. |
| `events_wait` | Long-poll for next event. |
| `messages_send` | Reply through stored route. |
| `permissions_list_open` | List in-memory pending approvals. |
| `permissions_respond` | Resolve approval (`allow-once` / `always` / `deny`). |

**Transport**: stdio only. The server connects to the gateway over
WebSocket internally, but its MCP client interface is stdio.

**Claude extension**: `--claude-channel-mode on|auto|off` enables
experimental Claude notifications (`notifications/claude/channel`,
`notifications/claude/channel/permission`).

**Event queue is live-only, in-memory.** Clients must use `messages_read`
for durable backlog.

## What OpenClaw consumes

Configuration shape:

```jsonc
{
  "mcp": {
    "servers": {
      "name1": { "command": "...", "args": [...], "env": { ... } },
      "name2": { "url": "https://...", "transport": "streamable-http", "headers": { ... } }
    },
    "sessionIdleTtlMs": 600000
  }
}
```

**Scope: global** (gateway-level), not per-session. Shared across all
agents and sessions. Critical to understand for the ACP bridge
rejection (below).

Tool flow: MCP tools wrapped as native agent tools with namespaced
names (`server:tool`). Flow through `before_tool_call` and
`after_tool_call` hooks **like native tools — no bypass.**

## Discovery and activation

Lazy on first tool materialization. Tools enumerated via `listTools()`
when an agent requests the catalog.

**Session lifecycle.** Runtimes created per-session-key on first use:

| Event | Behavior |
|---|---|
| First tool materialization in a session | Create session MCP runtime. |
| Idle period > `sessionIdleTtlMs` (default 10 min, `0` = disabled) | Evict. |
| Active leases | Prevent eviction; idle timer resets per tool call. |
| One-shot agent end (e.g., `openclaw agent`) | Clean up MCP runtimes. |

Connection sequence:

1. Agent starts → requests tool catalog.
2. Runtime manager creates session runtime if absent.
3. For each configured server: resolve transport (stdio / SSE / streamable-http).
4. Connect with timeout (default 30s).
5. `listTools()` with pagination.
6. Cache + serve to agent.
7. On invocation: `callTool(name, input)` via MCP client.
8. Normalize result → return as agent tool result.

## ACP per-session rejection

`src/acp/translator.ts` (`assertSupportedSessionSetup`):

> ACP bridge mode does not support per-session MCP servers. Configure
> MCP on the OpenClaw gateway or agent instead.

**Why** — four architectural reasons:

1. **Multi-tenant isolation.** Per-session servers require unique instances per ACP client → resource explosion + cleanup/ownership ambiguity.
2. **Resource limits.** Gateway shouldn't spawn unbounded child processes (one per ACP session). Global pooling is simpler.
3. **Session-key routing.** MCP servers holding session state would compete when multiple ACP clients attach to the same gateway session key.
4. **Simplicity.** Global servers let openclaw manage pooling, idle eviction, and crash recovery as one concern.

User path: configure MCP on the gateway (`~/.openclaw/config.json`) or
use `openclaw mcp set <name> <json>`. ACP clients inherit the gateway's
MCP list.

## Boundary table — when to use what

| Capability | MCP | Native plugin | ACPX bundle | ClawHub | Recommendation |
|---|---|---|---|---|---|
| External REST API | ✓ | — | maybe | **✓** | ClawHub for distribution; ACPX if Codex/Claude format; MCP if tool-only. |
| OS integration (processes, cron, channels) | — | **✓** | — | maybe | Native plugin for handlers + hooks. MCP for read-only wrappers. |
| Stateful layer (memory, vector store) | — | **✓** | — | maybe | Native plugin for hooks + event replay + in-process state. MCP if standalone process. |
| Computer use / screenshot | maybe | **✓** | maybe | maybe | Native plugin for screen polling + hooks. MCP if already an external server. |
| Codex / Claude command pack | — | ACPX | **ACPX** | **ClawHub** | ACPX for format mapping; promote to ClawHub for distribution. |
| Standalone tool catalog | **✓** | — | — | **✓** | MCP if you control the server. ClawHub if published. ACPX if Claude-native. |

**Principle:** MCP for isolated tool catalogs. Native plugins for
stateful / hooked integration. ACPX bundles for format mapping. ClawHub
for distribution.

## Transport modes

| Transport | Config shape | Use case | Notes |
|---|---|---|---|
| **stdio** | `{ "command": "...", "args": [...], "env": {...} }` | Local binaries | Child process. Env safety filter blocks startup-control vars. |
| **SSE** | `{ "url": "https://...", "headers": {...} }` | HTTP servers | Default HTTP. One-way server→client streaming. |
| **Streamable HTTP** | `{ "url": "https://...", "transport": "streamable-http", "headers": {...} }` | Bidirectional HTTP | Preferred for HTTP. Streams both directions. |

Connection timeout default 30s; configurable via
`connectionTimeoutMs`. Implementation:
`src/agents/mcp-transport.ts`.

## Authentication

| Transport | How |
|---|---|
| SSE / Streamable HTTP | Headers: `{ "Authorization": "Bearer …", "X-API-Key": "…" }` |
| stdio | Env: `{ "GITHUB_TOKEN": "…", "API_KEY": "…" }` |

### Env safety

`src/agents/mcp-http.ts` and the stdio launcher block startup-control
vars to prevent injection: `NODE_OPTIONS`, `PYTHONPATH`,
`PYTHONSTARTUP`, `SHELLOPTS`, `PERL5OPT`, `RUBYOPT`, `PS4`. Credential
and proxy vars allowed.

### Redaction

Values in `url` and `headers` redacted in logs (see
[`trust-and-redaction.md`](trust-and-redaction.md)).

### Storage

Config is plain JSON. For production secrets: use SecretInput in ACPX
config or inject via gateway process env. The current MCP config is not
SecretRef-aware (config-contracts could add `mcp.servers.*.headers.*`
to `secretInputs` paths — possible future work).

## Plugin-tools bridge — exposing plugin tools as MCP

`src/mcp/plugin-tools-serve.ts` + `extensions/acpx/src/config.ts`:

ACPX can expose plugin-registered tools via a standalone MCP server
called `openclaw-plugin-tools`. ACP clients (Claude Code, Codex) can
then consume openclaw-native plugin tools through their MCP client
support. This is the bridge from native-plugin-land into the MCP
ecosystem without making the plugin author an MCP-server author.

## MCP-related extensions

Bundle detection: OpenClaw detects Codex / Claude / Cursor bundle MCP
configs and merges them into embedded Pi settings. MCP tools surface
via the standard catalog.

**No dedicated `extensions/mcp-*` plugins.** MCP is core-provided.
Plugins register tools; the bridge optionally exposes them.

## Footguns

1. **Live event queue is ephemeral.** `openclaw mcp serve` disconnect = in-memory queue lost. Use `messages_read` for durable backlog.
2. **Per-session MCP is a hard error.** ACP clients sending `mcpServers` get explicit rejection, not silent fallback.
3. **Stdio env injection blocked.** Can't inject `PYTHONPATH` or `NODE_OPTIONS` into MCP servers via config; set on the gateway process instead.
4. **Idle eviction respects active leases.** Runtimes with tools mid-call don't evict; idle timer resets per call.
5. **Tool-name collisions are deterministic.** Multiple servers exposing the same tool get prefixed (`server:tool`); ordering is stable to avoid surprise.
6. **MCP tools flow through hooks.** `before_tool_call` can intercept, deny, modify MCP tools. No bypass route.
7. **Session reset does not cleanup global servers.** Only session-scoped runtimes are disposed; gateway-level servers persist across resets.

## Files I'd link from any MCP PR

1. `docs/cli/mcp.md` — user reference for `openclaw mcp serve` / `set` / `list`.
2. `src/mcp/channel-server.ts` — MCP server entry (expose).
3. `src/mcp/channel-tools.ts` — tool inventory served.
4. `src/agents/pi-bundle-mcp-runtime.ts` — runtime manager (consume).
5. `src/agents/pi-bundle-mcp-materialize.ts` — tool materialization.
6. `src/acp/translator.ts` (`assertSupportedSessionSetup`) — per-session rejection.
7. `src/config/mcp-config.ts` — config management.
8. `src/agents/mcp-transport.ts` — transport resolution.
9. `src/agents/mcp-http.ts` — HTTP/header redaction.
10. `src/mcp/plugin-tools-serve.ts` — plugin-tools bridge.

## Read next

- [`acp.md`](acp.md) — the per-session rejection rationale lives here.
- [`extension-pattern-tool.md`](extension-pattern-tool.md) — how MCP tools surface alongside native tools.
- [`trust-and-redaction.md`](trust-and-redaction.md) — header/URL redaction policy.
