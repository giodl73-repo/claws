---
name: acp
description: Agent Client Protocol — the agent ↔ client contract layer above the gateway, with persistent bindings, approval classification, control-plane manager, and event mapping
type: skunkworks-spec
applies_to: openclaw-core
source_version: HEAD 5e8cc1d9c (audit baseline)
authored: 2026-04-28
---

# ACP — Agent Client Protocol

## Mental model

ACP is the **protocol agents speak with their clients**. Where the
[`gateway-protocol.md`](gateway-protocol.md) is the multiplexed dispatcher
between many clients and many sessions, ACP is the **single-session
agent ↔ client contract** with approval gates, tool classification, and
lifecycle state. It sits **above the gateway** in the stack:

```
client (CLI / IDE / mobile / Swabble companion)
    │  ACP (stdio nd-JSON frames)
    ▼
agent-side endpoint
    │  gateway protocol (TypeBox frames over WS)
    ▼
gateway dispatcher
```

Three orthogonal protocol surfaces:

| Surface | Role |
|---|---|
| **Gateway protocol** | dispatcher; multiplexes N client connections to N sessions/agents |
| **ACP** | agent ↔ client contract; one persistent session ↔ client conversation |
| **MCP** | tool/resource integration layer; agents *consume* MCP servers as tool catalogs (orthogonal to client transport) |

ACP is **not WebSocket-only** — it is stdio nd-JSON. That makes it
portable across local spawn, Docker, container runtimes, and SSH tunnels.
Transport abstraction comes from `@agentclientprotocol/sdk` via
`ClientSideConnection` and `AgentSideConnection`.

`ACPX` (covered below) is the *private* extension surface for bundled
internal extensions — distinct from the public ACP SDK surface.

## Protocol surface

The protocol shape is **not hand-rolled TypeBox** in `src/acp/`. It is
defined externally by the `@agentclientprotocol/sdk` package, imported
throughout. `src/acp/` adapts that contract to OpenClaw's gateway events.

### Method groups

| Group | Methods |
|---|---|
| Session lifecycle | `newSession`, `loadSession`, `listSessions`, `initialize` (handshake) |
| Interaction | `prompt` (text + attachments → agent → response) |
| Control | `setSessionMode`, `setSessionConfigOption`, `cancel` |
| Notifications | `sessionUpdate` (pushed: text chunks, tool calls, available commands, mode changes) |
| Permission gating | `requestPermission` (client responds to agent's approval requests) |

### Event tags (`runtime/types.ts:5-16`)

`agent_message_chunk`, `agent_thought_chunk`, `tool_call`,
`tool_call_update`, `usage_update`, `available_commands_update`,
`current_mode_update`, `config_option_update`, `session_info_update`,
`plan` — plus extensible string tags for custom events.

### Session modes / config options (`translator.ts:54-60`)

`thinking`, `fast_mode`, `verbose_level`, `trace_level`, `reasoning_level`,
`response_usage`, `elevated_level`. String IDs mapped to the ACP config
contract — not OpenClaw-specific schemas.

### Mapping happens in `translator.ts`

`src/acp/translator.ts` (~1900 LOC) ingests gateway `EventFrame`s and
converts them to ACP `SessionNotification`s. This is the load-bearing
file in the dir.

## Approval classifier

`src/acp/approval-classifier.ts` (228 LOC) categorizes tool calls into
**approval classes** for permission gating before they reach the user.

### Classes

| Class | Examples | Approval |
|---|---|---|
| `readonly_scoped` | `read` tool + path within CWD | auto-approved |
| `readonly_search` | search, web_search, memory_search | auto-approved (trusted) |
| `mutating` | writes, edits, deletes (per `isMutatingToolCall`) | requires approval |
| `exec_capable` | `exec`, `spawn`, `shell`, `bash`, `process`, `code_execution` | requires approval |
| `control_plane` | `sessions_spawn`, `sessions_send`, `session_status` | requires approval |
| `interactive` | user-facing prompts | requires approval |
| `other` / `unknown` | everything else; `unknown` = no extractable name | requires approval |

### Classification (`:183-227`)

Extract tool name from `_meta`, `rawInput`, or parsed title. Check trust.
Map to class. **Read calls get path-scoped:** if the path normalizes to
outside CWD (using path resolution, `~` expansion, `file://` URLs), the
call **downgrades** `readonly_scoped → other` and demands approval.

Tool paths come from `rawInput.path`, `rawInput.file_path`, or the title
suffix after `:`.

## Persistent bindings

Channel-specific, account-specific ACP session pairings that let multi-
client orchestration (CLI + Slack + web) converge on a *single* agent
session. Four files, four concerns.

### `persistent-bindings.types.ts` (173 LOC)

| Item | Purpose |
|---|---|
| `ConfiguredAcpBindingSpec` | Schema: `channel`, `accountId`, `conversationId`, `parentConversationId`, `agentId`, optional `acpAgentId` override, `mode` (`"persistent"` / `"oneshot"`), `cwd`, `backend`, `label`. |
| `buildConfiguredAcpSessionKey` | Hashes `channel + accountId + conversationId` (first 16 hex chars) into a stable session key. |
| `toConfiguredAcpBindingRecord` | Spec → `SessionBindingRecord` for storage. |
| `resolveConfiguredAcpBindingSpecFromRecord` | Reverse — spec from storage. |

**Key shape:** `agent:{agentId}:acp:binding:slack:account123:abc123…`.

**Mode is sticky.** Switching `persistent ↔ oneshot` requires close + reinit.

### `persistent-bindings.lifecycle.ts` (194 LOC)

| Function | Purpose |
|---|---|
| `ensureConfiguredAcpBindingSession` | Idempotent. Ensure session exists + matches spec; reuse if matching, else close-and-reinit via `acpManager.initializeSession`. |
| `ensureConfiguredAcpBindingReady` | Wrapper: ensure binding ready before dispatch. |
| `resetAcpSessionInPlace` | Close in-place, discard backend state (for `/reset`, `/new`). |

### `persistent-bindings.resolve.ts` (41 LOC)

Three resolvers delegating to `channels/plugins/binding-registry.js`.
Fetch a record by `(channel, accountId, conversationId)`; wrap in
`ResolvedConfiguredAcpBinding`.

### Mode semantics

| Mode | Lifetime |
|---|---|
| `persistent` | Survives client disconnects. Agent maintains state across reconnections. Closed only on explicit reset/delete. |
| `oneshot` | Ephemeral; closed after interaction. Used for **background subtasks spawned by parent sessions** (`session-interaction-mode.ts:14-19`). |

## Control plane

`src/acp/control-plane/` orchestrates session lifecycle and turn dispatch.

| File | Role |
|---|---|
| `manager.core.ts` (~72 KB) | The brain. `AcpSessionManager` singleton: `initializeSession`, `runTurn`, `closeSession`, `resolveSession`, `listSessions`, `startupIdentityReconcile` (restore sessions after restart). Caches active runtimes, tracks turn latency, evicts idle sessions. |
| `manager.types.ts` | Manager input/output type defs. |
| `manager.runtime-controls.ts` | Handles `setMode`, `setConfigOption`. |
| `manager.identity-reconcile.ts` | Startup: walk stored entries, verify agent + backend still valid (credential refresh, agent deletion). |
| `runtime-cache.ts` | In-memory cache of active `AcpRuntime` handles (backend adapters). TTL eviction. |
| `runtime-options.ts` | Resolves runtime initialization options (model selection, thinking, env). |
| `manager.turn-stream.ts` | Stream control for turns. |
| `session-actor-queue.ts` | **Serializes turns on the same session** to avoid race conditions. |

## Event mapper — gateway events → ACP events

`src/acp/event-mapper.ts` (410 LOC). Bridges internal event shapes to the
ACP SDK's `ContentBlock` / `ToolCallLocation` contracts.

| Function | Purpose |
|---|---|
| `extractTextFromPrompt` | Concatenate `ContentBlock[]` (text, resource, resource_link) into a single string with **2 MB max bound**. |
| `extractAttachmentsFromPrompt` | Pull image blocks. |
| `formatToolTitle` | Build human-readable tool names with control-byte escaping (CWE-400 mitigation). |
| `inferToolKind` | Heuristic: tool name → ACP `ToolKind` (read/edit/delete/move/search/execute/fetch/other). |
| `extractToolCallContent` | Parse tool result/error from various shapes (string, `{content}`, `{text}`, `{message}`, `{error}`). |
| `extractToolCallLocations` | Walk tool input/output trees (**bounded depth 4, 100 nodes max**) to extract file/line refs. |

All functions sanitize control bytes and handle null/malformed input.

## Policy

`src/acp/policy.ts` (78 LOC) gates dispatch via config:

| Function | Reads | Effect |
|---|---|---|
| `isAcpEnabledByPolicy` | `cfg.acp?.enabled` (default `true`) | Master switch. |
| `isAcpDispatchEnabledByPolicy` | `cfg.acp?.dispatch?.enabled` | Independent dispatch disable (without disabling ACP). |
| `isAcpAgentAllowedByPolicy` | `cfg.acp?.allowedAgents` | Agent allowlist. |

Errors: `resolveAcpDispatchPolicyError`, `resolveAcpExplicitTurnPolicyError`,
`resolveAcpAgentPolicyError` return `AcpRuntimeError` if checks fail.
Manager calls these before init/turn — **policy errors are terminal**,
no retry.

## SDK side

| File | Surface |
|---|---|
| `src/plugin-sdk/acp-runtime.ts` (59 LOC) | Public SDK. Exports `getAcpSessionManager`, error types, backend registry functions, runtime types, `readAcpSessionEntry`, `tryDispatchAcpReplyHook`. **Lazy-loads test helpers via Proxy** to avoid circular deps on hot path. |
| `src/plugin-sdk/acp-binding-runtime.ts` (6 LOC) | Narrow surface: `ensureConfiguredAcpBindingReady`, `resolveConfiguredAcpBindingRecord`. Used by plugins configuring multi-client bindings (e.g., Slack plugin). |
| `src/plugin-sdk/acp-binding-resolve-runtime.ts` (3 LOC) | **Even narrower**: read-only binding resolution without lifecycle cost. Only `resolveConfiguredAcpBindingRecord`. For "is this conversation bound?" checks. |

**Why three SDK files?** Lifecycle pulls in the full control-plane manager
(heavy). Pure resolution is cheap. Plugins import only what they need.
Same lazy-boundary pattern as `*.runtime.ts` modules elsewhere.

A plugin can:

- call `getAcpSessionManager().runTurn(...)` to invoke an agent turn,
- register a custom `AcpRuntime` backend (e.g., a Docker / Kubernetes scheduler).

## ACPX — extensions for bundled code

`src/plugin-sdk/acpx.ts` (39 LOC) — **private narrow ACP surface for
bundled / internal extensions**. Not for external plugin consumption.

Exports:

- ACP runtime types + error handling.
- Backend registry (register a custom runtime).
- Plugin API + logger types (plugins can be ACP backends).
- Windows spawn utilities (cross-platform process launch in ACP contexts).
- Provider auth env-var helpers (safe removal of secrets before subprocess spawn).

**"X" = Extensions.** Controlled escape hatch. Used by `auto-reply`,
Docker plugin, etc. Equivalent in spirit to `internal-hooks.ts` for the
plugin SDK — bundled code gets more surface than the public SDK exposes.

## ACP ↔ MCP boundary

From `VISION.md`: *"Pragmatic MCP support without duplicating existing
agent, tool, ACPX, plugin, or ClawHub paths."*

| Concern | Use ACP / ACPX | Use MCP |
|---|---|---|
| Client transport (CLI / IDE / Slack) | yes | no |
| Session lifecycle, approval gates | yes | no |
| Tool / resource catalog | no | yes |
| Per-agent tool registry | OpenClaw plugin | MCP server |

**Concrete prohibition:** `translator.ts:14` (test) — bridge mode
**rejects per-session MCP servers**:

```
"bridge mode does not support per-session MCP servers"
```

Configure MCP on the gateway or agent globally, not per-session.

## Footguns

1. **Persistent bindings hash on (channel, accountId, conversationId).** Two users in different Slack channels chatting with the same agent get *different* sessions — by design (multi-tenant isolation). But accidental conversationId collisions = silent session merge.
2. **Mode is sticky.** Once a binding is `oneshot`, switching to `persistent` requires close + reinit. Manager's `sessionMatchesConfiguredBinding` includes `mode` in the equality check.
3. **Approval classification is heuristic.** Parses tool names from weakly-typed `_meta` / `rawInput`. Malformed or missing names → `unknown` class → approval required. Tools must expose extractable names.
4. **Event mapper bounds are hard limits.** 2 MB prompt cap, 100-node tree crawl, depth 4. Overflow silently truncates or throws — can break tool metadata.
5. **Control bytes aggressively escaped.** Custom tool result messages should pre-scrub `\0`, `\n`, `\r`. Unscrubbed bytes get mangled.
6. **Policy errors are terminal — no retry.** Check policy *before* attempting dispatch.
7. **Oneshot sessions can't speak to user-facing channels.** Background tasks spawned by a parent session are parent-owned; they have no direct user surface.
8. **`acpx.ts` is bundled-only.** External plugins must not import from it. Surface stability is not guaranteed.
9. **No per-session MCP.** Configure globally or use ACPX.

## Files I'd link from any ACP-touching PR

1. `src/acp/translator.ts` (~1900 LOC) — central event/method translator.
2. `src/acp/control-plane/manager.core.ts` (~72 KB) — session manager.
3. `src/acp/approval-classifier.ts` (228 LOC) — tool approval gating.
4. `src/acp/persistent-bindings.types.ts` (173 LOC) — binding spec + key derivation.
5. `src/acp/client.ts` (249 LOC) — client-side entry point.
6. `src/acp/event-mapper.ts` (410 LOC) — event transformation + sanitization.
7. `src/plugin-sdk/acp-runtime.ts` (59 LOC) — public SDK surface.
8. `src/acp/runtime/types.ts` (157 LOC) — `AcpRuntime`, capabilities, custom-backend contract.
9. `src/acp/policy.ts` (78 LOC) — enable/disable + agent allowlist.
10. `src/acp/server.ts` (257 LOC) — ACP server bootstrap.

## Read next

- [`gateway.md`](gateway.md) and [`gateway-protocol.md`](gateway-protocol.md) — the protocol layer below ACP.
- [`hook-engine-typed.md`](hook-engine-typed.md) — `before_agent_reply`, `before_dispatch`, `reply_dispatch`, `inbound_claim` are the typed hook touchpoints in the ACP flow.
- B5 in [`TOUR.md`](TOUR.md) — MCP integration; the orthogonal surface ACP carefully does not duplicate.
