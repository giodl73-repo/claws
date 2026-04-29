---
name: extension-pattern-tool
description: The tool extension pattern — browser as exemplar; action-dispatcher schema, registerTool factory, sandbox/host/node targets, lifecycle, approval interplay
type: skunkworks-spec
applies_to: openclaw-core
source_version: HEAD 5e8cc1d9c (audit baseline)
authored: 2026-04-28
---

# Extension pattern — tool plugins

## Why browser is the exemplar

Computer-use is an explicit "Next priorities" item in `VISION.md`.
Browser is the canonical computer-use tool: rich action surface,
sandbox/host/node targets, profile management, real Playwright runtime.
Pattern transfers to document-extract, exec-process, and other tool
plugins.

## Plugin entry + tool registration

`extensions/browser/index.ts`. Standard `definePluginEntry()` with
metadata + a `register()` that calls `api.registerTool(factory)`. The
factory is **lazy**: it receives an `OpenClawPluginToolContext` and
returns a single `AnyAgentTool`.

```ts
api.registerTool((ctx: OpenClawPluginToolContext) =>
  createLazyBrowserTool({
    sandboxBridgeUrl: ctx.browser?.sandboxBridgeUrl,
    allowHostControl: ctx.browser?.allowHostControl,
    agentSessionKey: ctx.sessionKey,
  })
);
```

**One tool, seventeen actions.** The browser plugin exposes a single
tool named `"browser"` whose schema discriminates on a required
`action` field. Seventeen actions: `doctor`, `status`, `start`, `stop`,
`profiles`, `tabs`, `open`, `focus`, `close`, `snapshot`, `screenshot`,
`navigate`, `console`, `pdf`, `upload`, `dialog`, `act`. The `act`
action itself dispatches to 12 sub-kinds (click, type, press, …).

This is an **action-dispatcher** consolidation pattern, not a
"register one tool per action" approach. Same pattern fits any tool
plugin where actions share configuration / lifecycle.

Naming conventions:

- Tool name lowercase.
- Action names lowercase.
- Parameter schemas camelCase.

## Manifest

`extensions/browser/openclaw.plugin.json`:

```jsonc
{
  "id": "browser",
  "enabledByDefault": true,
  "activation": {
    "onStartup": true,
    "onConfigPaths": ["browser"]
  },
  "commandAliases": [{ "name": "browser" }],
  "configSchema": { "type": "object", "additionalProperties": false, "properties": {} }
}
```

Notes:

- `activation.onStartup: true` — load at harness boot.
- `activation.onConfigPaths: ["browser"]` — also reload on `browser:` config block changes.
- `commandAliases` — exposes the `browser` CLI command for **operator** use (status, management). Not agent-facing.
- `configSchema` — empty at the plugin level; browser config lives at `config.browser.*` in the harness config.
- **No `contracts.tools` declaration.** Unlike document-extract (which declares `"contracts": { "documentExtractors": ["pdf"] }`), the browser plugin omits the contract because it directly exposes via `registerTool()`. Contract declarations are for capabilities others consume; tools registered directly need no contract.

## Tool surface — action dispatcher

| Parameter | Type | Notes |
|---|---|---|
| `action` (req) | one of 17 | discriminator |
| `target` | `"sandbox"` / `"host"` / `"node"` | browser location |
| `profile` | string | `"user"` = existing user session; omit for isolated `"openclaw"` |
| `node` | string | target node id for proxy routing |
| `timeoutMs` | number | per-call timeout. **Rejected for `profile="user"`** |
| action-specific | varies | e.g., `kind`/`ref`/`text`/`x`/`y` for `act`; `selector` for `wait`; `url` for `navigate` |

Actions categorize:

| Category | Actions |
|---|---|
| Browser lifecycle | `doctor`, `status`, `start`, `stop`, `profiles`, `tabs` |
| Tab management | `open`, `focus`, `close` |
| Inspection | `snapshot`, `screenshot`, `console`, `pdf` |
| Navigation | `navigate` |
| UI interaction | `act` (12 sub-kinds), `dialog`, `upload` |

## Sandbox / host / node — three targets

Browser is **hybrid-isolation**: the same tool works against a
sandboxed, host-attached, or remote browser, selected by `target`.

| Target | Browser | Host access | Use case |
|---|---|---|---|
| `sandbox` | Isolated Chromium via CDP | none | safe agent web tasks |
| `host` | Operator's existing Chrome (v144+) | full — cookies, logins, extensions | tasks requiring user login |
| `node` | Remote browser pool node via MCP bridge | network only | scaling / pooled execution |

Implementation uses **Playwright** (`playwright-core` in `package.json`)
which abstracts CDP. Tool calls do **not** launch browsers directly —
they marshal HTTP requests to a separate **browser control service**
spawned at plugin startup by `createBrowserPluginService()`. The
service:

- Manages Chrome/Chromium instances via CDP.
- Enforces CDL (Chrome DevTools Lite) policies — what DOM elements are touchable, what domains are navigable.
- Provides session isolation.
- Is reached via a `bridge-server` (`src/browser/bridge-server.ts`).

This is the "tool plugin spawns a long-running auxiliary service"
pattern. Other plugins that wrap heavy resources (document extractors,
exec sandboxes) follow the same model.

## `before_tool_call` interplay

The browser plugin **does not register hooks**. Approval gating happens
at the **harness layer**, not the plugin layer.

The runtime hook system ([`hook-engine-typed.md`](hook-engine-typed.md))
defines `before_tool_call` as an event plugins *can* register. The hook
returns:

```ts
{
  block?: boolean;
  blockReason?: string;
  requireApproval?: { id, title, description, severity };
}
```

Approval flow:

1. Agent invokes `browser` tool.
2. Harness fires `before_tool_call` hook chain.
3. Plugins may set `requireApproval` — including the `approval-classifier` plugin from ACP, which categorizes browser actions ([`acp.md`](acp.md)).
4. If approval required, ACP routes to user.
5. On approve, harness invokes the actual browser tool.

The browser tool itself is approval-agnostic. It executes whatever it
receives. This is by design — security policy belongs at the harness,
not the tool.

## Lifecycle — per-agent per-session

Lifecycle granularity:

| Resource | Scope |
|---|---|
| Plugin service (`createBrowserPluginService()`) | One per gateway / agent harness. |
| Browser process (sandboxed Chromium) | Per-tab, spawned on demand, cached. |
| Tabs | Tracked per `ctx.sessionKey` (e.g., `"agent:main:main"`). |
| Cleanup | `closeTrackedBrowserTabsForSessions()` on session end. |

Service start (`index.ts`):

```ts
start: async () => {
  handle = await startLazyPluginServiceModule({
    loadDefaultModule: async () => await import("./server.js"),
    startExportNames: ["startBrowserControlServiceFromConfig"],
    stopExportNames: ["stopBrowserControlService"],
  });
}
```

The `startLazyPluginServiceModule` helper is shared across plugins that
need an auxiliary service. Defers heavy imports until activation.

Per-call:

- Each call gets `ctx.sessionKey` + `ctx.sessionId` (ephemeral UUID, regenerated on `/new`).
- Tab tracking via `trackSessionBrowserTab()` / `untrackSessionBrowserTab()`.
- Tab lifecycle respects session boundaries — closing a session closes its tabs.

## Auth surface — browser profiles

No in-tool auth. Identity flows through **browser profiles**:

| Profile | Source | Persistence |
|---|---|---|
| `"openclaw"` (default) | isolated, no user data | cleared on restart |
| `"user"` | existing operator Chrome session | cookies / extensions / logins inherited |
| custom | named profile in persistent config dir | per-profile user-data dir |

Auth mechanism:

1. Operator logs into their browser before calling the tool.
2. Tool connects to that browser instance via CDP.
3. Cookies + auth tokens inherited from operator's session.
4. Profile switching enables multi-account scenarios (test vs prod).

Sensitive operations: tool descriptions warn that `profile="user"`
should only be used "when existing logins/cookies matter and the user
is present." Sensitive profiles **cannot** run in the sandbox; they
require `target="host"` or `target="node"`.

## The pattern, abstracted

A tool plugin:

1. **Single entry point** (`index.ts`, `definePluginEntry()`) with metadata + `register()`.
2. **Registers one or more tools** via `api.registerTool(factory)`. Factory is context-aware, returns a lazy tool.
3. **Implements actions as a discriminator field.** One tool serves many actions; avoids exposing dozens of similarly-named tools.
4. **Optional auxiliary service** via `api.registerService()` for long-lived resources (browser control, document extraction pipeline).
5. **Hook-aware but hook-unaware.** Respects `before_tool_call` / `after_tool_call` from the harness. Does not register hooks.
6. **Owns its schema and lifecycle.** Plugin defines tool schema + manages its own runtime (service, caching, cleanup).
7. **Receives session context.** Uses `ctx.sessionKey`, `ctx.sessionId`, plugin config, auth hints, fs policy to scope behavior.
8. **Composable.** Coexists with other tool plugins; harness multiplexes calls.

## Footguns

1. **Schema complexity.** Flattened action-dispatcher schemas are necessary to avoid nested `anyOf` (some providers reject it; cf. `AGENTS.md` provider-tool-schema rule). Discriminator fields must be runtime-validated.
2. **Lazy load delays discovery.** Slow `registerTool()` → agent doesn't see the tool until registration completes. Use lazy module imports (browser does) to defer heavy deps.
3. **Per-session state leakage.** Caching state by profile name (not session id) cross-pollinates tabs across sessions. Always scope state to `ctx.sessionKey`.
4. **Sandbox vs host confusion.** `target="sandbox"` does not use operator credentials. Omitting `profile="user"` when the user expects it silently uses the isolated profile.
5. **No tool-level approval bypass.** Plugins can't override approval; harness owns the decision. If approval is critical, coordinate with ACP (`approval-classifier.ts`).
6. **Config hot-reload lag.** `onConfigPaths` fires reload on config change, but the plugin must handle in-flight tool calls gracefully across reload boundaries.
7. **Node proxy unavailability.** `target="node"` with no available nodes fails. **No automatic fallback to sandbox** — by design, to prevent silent privilege escalation.
8. **Action timeout interactions.** `timeoutMs` rejected for `profile="user"` because operator-attached browsers shouldn't be killed mid-action. Document the asymmetry on every action that supports timeouts.

## Files I'd link from any tool PR

1. `extensions/browser/index.ts` — entry + `definePluginEntry`.
2. `extensions/browser/plugin-registration.ts` — `api.registerTool` + service registration.
3. `extensions/browser/src/browser-tool.ts` — tool factory + action dispatcher.
4. `extensions/browser/src/browser-tool.schema.ts` — parameter schema + action/target enums.
5. `extensions/browser/openclaw.plugin.json` — manifest.
6. `extensions/document-extract/index.ts` — sibling plugin (contract-based, distinct surface).
7. `src/plugins/hook-types.ts` — `before_tool_call` / `after_tool_call` types.

## Read next

- [`hook-engine-typed.md`](hook-engine-typed.md) — `before_tool_call` mechanics.
- [`acp.md`](acp.md) — approval-classifier categorizes browser actions.
- [`extension-pattern-provider.md`](extension-pattern-provider.md), [`extension-pattern-channel.md`](extension-pattern-channel.md) — sister exemplars.
