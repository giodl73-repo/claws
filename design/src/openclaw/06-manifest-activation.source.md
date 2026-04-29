# Manifest Activation

<!-- atom:openclaw-manifest-activation (OC-G06) -->

Activation is stage three of the plugin lifecycle and the load-bearing one.
The activation planner consumes manifest fields and config triggers, then
returns a list of plugin ids with reasons. **Plugins not in the plan never
load their TypeScript.** This is what makes the manifest the registry
rather than just metadata about it.

---

## Six trigger types

| Trigger | Manifest field | Cite |
|---------|----------------|------|
| `command` | `commandAliases[]` (owner) or `activation.onCommands[]` (hint) | `activation-planner.ts:118, :143-159` |
| `provider` | `providers[]` (owner) or `activation.onProviders[]` (hint) | `activation-planner.ts:120, :161-180` |
| `agentHarness` | `activation.onAgentHarnesses[]` | `activation-planner.ts:122, :134-141` |
| `channel` | `channels[]` (owner) or `activation.onChannels[]` (hint) | `activation-planner.ts:124, :182-194` |
| `route` | `activation.onRoutes[]` | `activation-planner.ts:126, :196-203` |
| `capability` | `activation.onCapabilities[]` and inferred contracts | `activation-planner.ts:205-244` |

Plus the always-on case: `activation.onStartup: true`.

---

## Owner vs hint

```proof:tree kind=taxonomy
root: Activation field semantics
- Owner declarations
  - providers: ["openai"]
  - channels: ["telegram"]
  - commandAliases: [{name: dreaming}]
  - kind: "memory"
- Activation hints
  - activation.onProviders: ["openai"]
  - activation.onChannels: ["telegram"]
  - activation.onCommands: ["browser"]
  - activation.onConfigPaths: ["browser"]
- Always
  - activation.onStartup: true
  - enabledByDefault: true
```

Owner declarations say "I own this." Hints say "wake me when this
happens." The planner treats them differently — providers fall back to
*owner* before checking *hint*. Declaring only the hint can hide a plugin
from UI surfaces.

---

## Activation reasons

Every entry in the plan carries a reason. Useful when debugging "why is
this plugin loaded?".

| Reason class | Example |
|--------------|---------|
| `manifest-*-owner` | `manifest-provider-owner`: plugin's `providers[]` matched |
| `activation-*-hint` | `activation-channel-hint`: `activation.onChannels` matched |
| `manifest-capability-inferred` | inferred from `contracts.*` declarations |
| `slot-selected` | `kind: "memory"` selected via `plugins.slots.memory` |
| `startup` | `activation.onStartup: true` |

---

## Worked examples

### Example 1: provider auto-activation

```proof:tree kind=taxonomy
root: User configures plugins.entries.openai
- Trigger: provider, value openai
- Planner walks manifests
- Match: openai plugin declares providers ["openai"]
- Reason: manifest-provider-owner
- Activate: openai plugin loads
```

### Example 2: capability-driven memory embedding

```proof:tree kind=taxonomy
root: LanceDB memory selected with openai embeddings
- plugins.slots.memory = memory-lancedb
- Memory init looks up embedding provider ownership
- Match: openai plugin declares contracts.memoryEmbeddingProviders [openai]
- Reason: manifest-capability-inferred
- Activate: openai plugin loads to provide embeddings
```

### Example 3: command-alias diagnostic

```proof:tree kind=taxonomy
root: User types plugins.allow ["browser"] by mistake
- Browser declares commandAliases [{name: browser}]
- Planner sees browser is a CLI command, not a plugin id
- Doctor reports did you mean to enable the browser plugin
- No activation; plugin stays cold
```

---

## Field constraints + dependencies

| Constraint | Cite |
|------------|------|
| `kind: "memory"` only takes effect when `plugins.slots.memory` references it | `docs/plugins/manifest.md:1138` |
| `channelConfigs.<id>` requires matching `channels[]` entry | `docs/plugins/manifest.md:574` |
| `contracts.tools[]` should match runtime registrations | mismatch yields a diagnostic |
| `activation.onConfigPaths` values must correspond to top-level config blocks | `docs/plugins/manifest.md:299` |
| `configSchema` is required even if empty | `docs/plugins/manifest.md:114` |

---

## Footguns

| Footgun | Symptom |
|---------|---------|
| Implicit startup-sidecar fallback | omitting `activation.onStartup` still loads at startup but warns; will tighten over time |
| `providers[]` vs `activation.onProviders[]` mismatch | provider pickers fall back to owner first; hint-only plugins hide from UI |
| `modelCatalog.discovery` modes are hints | `"static"` does not block runtime load; `"runtime"` does not prevent manifest-row consumption |
| JSON5 syntax permits typos | `{"id": "my plugin"}` parses as a string with a space; invalid id |
| Provider id discovery precedence | `Config-selected > Bundled > Global install > Workspace`; forking a bundled provider in workspace doesn't override; pin via `plugins.entries.<id>` |
| `contracts.tools[]` doesn't auto-register | manifest declares ownership; plugin still must call `api.registerAgentTool(...)` |

---

## Related

- [`design/openclaw/manifest-schema.md`](../../../design/openclaw/manifest-schema.md) — full field-by-field reference
- [`design/openclaw/plugin-loader.md`](../../../design/openclaw/plugin-loader.md) — full activation planner internals
- [`design/openclaw/extension-pattern-provider.md`](../../../design/openclaw/extension-pattern-provider.md) — anthropic exemplar
- [01 Plugin lifecycle](01-plugin-lifecycle.md) — stages 1 to 6 in context
