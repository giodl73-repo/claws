# Plugin Lifecycle

<!-- atom:openclaw-plugin-lifecycle (OC-G01) -->

OpenClaw runs ~80 bundled extensions plus any external plugins on top of a
single in-proc gateway. Each plugin starts as a JSON manifest and ends as
entries in specialized runtime registries. The lifecycle is six stages, each
with a clear responsibility and a specific source file. Knowing the stages
matters because almost every cold-path lookup in OpenClaw is answered at
stage three (activation planning) — before any plugin TypeScript runs.

---

## The six stages

| Stage                  | File                                       | Output                                        |
| ---------------------- | ------------------------------------------ | --------------------------------------------- |
| 1. Discovery           | `src/plugins/bundled-plugin-scan.ts`       | list of plugin dirs                           |
| 2. Manifest read       | `src/plugins/manifest.ts`                  | parsed `openclaw.plugin.json` per plugin      |
| 3. Activation planning | `src/plugins/activation-planner.ts:63-100` | which plugins to load + reasons               |
| 4. Code load           | plugin's own `index.ts`                    | `definePluginEntry({ register })`             |
| 5. Registration        | inside `register(api)`                     | `api.registerProvider/Tool/Channel/...` calls |
| 6. Live registry       | `src/plugins/registry-types.ts:372-415`    | `PluginRegistry` (frozen, query-only)         |

Stages 1–3 happen on every gateway boot. Stages 4–6 happen only for plugins
the planner decides to activate.

---

## Pipeline shape

<!-- proof:compiled from="proof:tree kind=taxonomy" uri="" -->

```taxonomy
Plugin lifecycle
├── 1 Discovery: scan extensions/ + node_modules/.openclaw-plugins/
├── 2 Manifest read: parse openclaw.plugin.json with JSON5
├── 3 Activation planning: triggers decide which to activate
├── 4 Code load: import plugin index.ts
├── 5 Registration: register(api) callbacks fire
└── 6 Live registry: specialized sub-registries populated
```

<!-- /proof:compiled -->

Stage 3 is the load-bearing one. The planner consumes manifest fields like
`activation.onProviders`, `channels`, `commandAliases`, and `kind: "memory"`
and returns a list of plugin ids with **reasons** (e.g.,
`"manifest-provider-owner"`, `"activation-channel-hint"`). Plugins not in the
plan never load.

See [`design/openclaw/plugin-loader.md`](../../../design/openclaw/plugin-loader.md) for the full
trigger taxonomy.

---

## What `register(api)` registers

The api object passed into the plugin's `register()` callback exposes ~74
register methods. The most common:

| Method                                                | Used by                                              | Cite                               |
| ----------------------------------------------------- | ---------------------------------------------------- | ---------------------------------- |
| `api.registerProvider(provider)`                      | LLM providers (anthropic, openai, …)                 | `src/plugins/types.ts:2209+`       |
| `api.registerChannel()` / `registerChannelSetup()`    | telegram, discord, slack, …                          | `src/plugins/types.ts`             |
| `api.registerTool(factory)`                           | browser, document-extract, …                         | `src/plugins/types.ts`             |
| `api.registerService(service)`                        | diagnostics-otel, diagnostics-prometheus, …          | `src/plugins/types.ts`             |
| `api.registerHttpRoute({path, auth, scope, handler})` | diagnostics-prometheus `/api/diagnostics/prometheus` | gateway-mounted                    |
| `api.registerCli(program, handler)`                   | memory-core `memory` command, …                      | top-level CLI                      |
| `api.registerGatewayMethod(name, handler)`            | new RPC methods on the gateway dispatcher            | runtime registry                   |
| `api.on(<typed-hook>, handler)`                       | 35 typed hook points                                 | `src/plugins/hook-types.ts:70-143` |
| `api.registerRuntimeLifecycle({onDispose})`           | cleanup callbacks                                    | `src/plugins/host-hooks.ts:96-104` |

Every one of these has a no-op default. Plugins always see a complete API
surface; unimplemented register methods silently succeed.

---

## Reload semantics

<!-- proof:compiled from="proof:tree kind=taxonomy" uri="" -->

```taxonomy
Reload via loadPlugins()
├── diff: old plan vs new plan
├── cleanup: fire onDispose for plugins leaving
├── clear: clearPluginLoaderCache()
├── rescan: stages 1 to 3 re-run
└── repopulate: stages 4 to 6 re-run
```

<!-- /proof:compiled -->

Reload is supported in principle. The exception: plugins holding a sandbox
or agent-harness instance can't live-reload because the underlying
subprocess would have to be restarted. They end up in `status: "error"`
until the gateway restarts.

See [`design/openclaw/plugin-loader.md`](../../../design/openclaw/plugin-loader.md) §"Lifecycle and disposal".

---

## Footguns the lifecycle exposes

| Footgun                                    | When it bites                                                                                           |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Plugin id collision                        | Two plugins declare the same id; loser is silently skipped (precedence: bundled > installed > external) |
| Cyclic plugin dependencies                 | Not detected — there's no dependency graph                                                              |
| Partial registration on `register()` throw | Caught + logged, but partial registrations are NOT rolled back                                          |
| Hook timeout doesn't cancel                | Logged + skipped, but underlying work continues                                                         |
| Manifest validation failure                | Plugin loads with `status: "error"`; its registrations are absent                                       |

---

## Related

- [`design/openclaw/plugin-loader.md`](../../../design/openclaw/plugin-loader.md) — full loader internals
- [`design/openclaw/manifest-schema.md`](../../../design/openclaw/manifest-schema.md) — every manifest field
- [`design/openclaw/plugin-model.md`](../../../design/openclaw/plugin-model.md) — SDK side
- [02 Three channels](02-three-channels.md) — what plugins register _into_
- [06 Manifest activation](06-manifest-activation.md) — stage 3 deep dive
