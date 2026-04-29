---
name: plugin-model
description: openclaw-core's plugin/extension model end-to-end — manifest contract, SDK API, hook system, lifecycle, sandbox boundary, package contract for external plugins
type: skunkworks-spec
applies_to: openclaw-core
source_version: HEAD 5e8cc1d9c (audit baseline)
authored: 2026-04-28
---

# Plugin model

## What a plugin is in OpenClaw

In-process TypeScript modules **bundled at build time**. Plugins are not
fetched from a remote source at runtime; they are compiled into the
distributable. What runtime *does* do — and the bit worth understanding — is
**manifest-driven discovery followed by lazy code load**: OpenClaw reads
every `openclaw.plugin.json` early in startup, validates it, and uses it to
make control-plane decisions (auth-choice UI, capability ownership, command
routing) *before* executing plugin TypeScript. Plugin code only runs once
something triggers activation.

Each plugin:

- has a canonical `id` (`anthropic`, `diagnostics-otel`, …),
- exports `default definePluginEntry({ id, name, register, … })` from its `index.ts`,
- registers capabilities in its `register(api)` callback through `OpenClawPluginApi`,
- declares its capabilities up front in `openclaw.plugin.json`.

External-vs-internal terminology, from `AGENTS.md`: product/docs/UI/changelog
say **"plugin/plugins"**; the source-tree directory is `extensions/`. Both
words refer to the same thing.

## The manifest

`openclaw.plugin.json` is the **contract OpenClaw inspects before loading
plugin code**. Field reference at `docs/plugins/manifest.md:37-183`. The
shape is far richer than the diagnostics samples suggest.

### Required

| Field | Why |
|---|---|
| `id` | Canonical identifier, must match `definePluginEntry({ id })`. |
| `configSchema` | JSON Schema for plugin config validation. Strict — missing schema blocks load. |

### Common optional

| Field | Used by | Purpose |
|---|---|---|
| `activation.onStartup` | diagnostics-otel (`true`), most others (`false`) | Auto-load at gateway boot vs. lazy. |
| `enabledByDefault` | LLM providers (`true`) | Bundled-plugin activation default. |
| `providers` | LLM providers | List of provider ids owned. |
| `modelSupport.modelPrefixes` | LLM providers | Model id patterns (`["claude-"]`, `["gpt-", "o1", "o3"]`). |
| `modelIdNormalization` | LLM providers | Alias map (e.g., `"opus-4.6": "claude-opus-4-6"`). |
| `providerEndpoints` | LLM providers | Hostname/endpoint-class declarations. |
| `providerAuthEnvVars` | LLM providers | Env var → provider mapping. |
| `providerAuthChoices` | LLM providers | Onboarding/auth choice descriptors (cli, api-key, setup-token, etc.). |
| `cliBackends`, `syntheticAuthRefs` | LLM providers | CLI integration metadata. |
| `channels` | Channel plugins | Channel ids owned. |
| `channelEnvVars` | Channel plugins | Env vars per channel. |
| `kind` | Memory plugins (`"memory"`) | Marks the plugin for the **special memory slot** — only one memory plugin active at a time. |
| `contracts` | Cross-cutting | Static capability ownership: `mediaUnderstandingProviders`, `memoryEmbeddingProviders`, `speechProviders`, etc. |
| `commandAliases` | memory-core | CLI/runtime-slash command bindings. |
| `uiHints` | memory-core | Per-config-key labels, placeholders, help text. |

This is the "manifest IS the registry" property: you can read every manifest
in the tree and reconstruct *what each plugin owns* without executing a
single line of plugin code. Audits depend on this.

### External-plugin extras

External (npm-distributed) plugins must additionally declare in their
`package.json`:

```jsonc
{
  "openclaw": {
    "compat": { "pluginApi": "<semver-range>" },
    "build":  { "openclawVersion": "<exact>" }
  }
}
```

Validation at `packages/plugin-package-contract/src/index.ts:46-100`:
`validateExternalCodePluginPackageJson()` checks the required fields,
returns compatibility metadata + a list of issues. Used by ClawHub before
publishing. Internal `extensions/*/package.json` files don't need this
block — they're bundled at build time.

## SDK API surface

What an extension imports from `@openclaw/plugin-sdk`:

### `definePluginEntry(options)`

Canonical factory at `src/plugin-sdk/plugin-entry.ts:254-279`. Returns a
`DefinedPluginEntry` carrying `id`, `name`, `description`, `configSchema`,
and a `register(api)` callback. Every plugin's `index.ts` exports this as
default.

### `OpenClawPluginApi`

The object passed to `register()`. Defined at `src/plugins/types.ts:2209-2360`.
The relevant methods (10+; the most used):

| Method | Used for |
|---|---|
| `registerProvider(provider)` | LLM provider registration (anthropic, openai, …). |
| `registerSpeechProvider()`, `registerImageGenerationProvider()` | Modality providers. |
| `registerTool(tool, opts)` | Agent tools. |
| `registerService(service)` | Long-running services with `start()`/`stop()`. Used by both diagnostics extensions. |
| `registerHook(events, handler, opts)` | **Legacy** hook registration. |
| `registerCommand()`, `registerCli()` | CLI/command surface. |
| `registerHttpRoute()` | HTTP routes mounted on the gateway (e.g., diagnostics-prometheus' `/api/diagnostics/prometheus`). |
| `registerGatewayMethod()` | New gateway methods. |
| `registerRuntimeLifecycle({ onDispose })` | Cleanup hooks. |
| `runtime` | In-process registry access for trusted native plugins. |
| `logger` | `{ debug?, info, warn, error }`. |

### Typed hook types

33 hook points exported from `src/plugins/hook-types.ts:40-67`. Each has its
own event/result types — `PluginHookBeforePromptBuildEvent`,
`PluginHookBeforePromptBuildResult`, etc.

### Other exports

`PluginLogger`, `OpenClawPluginConfigSchema` (Zod-like; `:278-290`), 50+
context types for provider auth, config normalization, tool execution,
model catalog. The hook runner utilities in
`src/plugins/hook-runner-global.ts`.

## Hooks: the two-tier system

OpenClaw has **two hook systems running side by side**, and conflating them
will mislead any audit.

### Typed system (preferred for new code)

Source: `src/plugins/hook-types.ts`. 33 typed hook names:
`before_model_resolve`, `llm_input`, `message_received`,
`before_prompt_build`, `agent_end`, etc.

Registration shape (`PluginHookRegistration`,
`src/plugins/hook-types.ts:936-942`):

```ts
type PluginHookRegistration<K extends PluginHookName = PluginHookName> = {
  pluginId: string;
  hookName: K;
  handler: PluginHookHandlerMap[K];
  priority?: number;
  source: string;
};
```

Stored as an array of registrations sorted by priority (higher first;
`src/plugins/hook-registry.types.ts:12-15`).

**Per-hook merge semantics matter.** Different hooks combine plugin results
differently, and the rule is hook-specific:

- `before_prompt_build` **concatenates** context from all plugins (left + right).
- `before_model_resolve` takes the **first non-empty override** (priority wins).
- Other hooks have their own merge functions in `src/plugins/hooks.ts:268-299`.

This is load-bearing: plugins ordered "in priority order" still chain
results together for some hooks and short-circuit for others. Treating them
all the same way is a real bug pattern.

Timeouts are hook-specific: 15s default for `before_prompt_build`, 30s for
`agent_end`, etc.

### Legacy / internal system

Source: `src/hooks/` (48 files including `gmail.ts`, `internal-hooks.ts`,
`fire-and-forget.ts`, `frontmatter.ts`). Older string-based registration,
untyped event payloads. Still in use internally but new plugins should not
add to it.

The two systems are not interchangeable. New audit work should distinguish
which one it's reasoning about.

## Activation: how a plugin actually loads

`src/plugins/activation-planner.ts:63-100` walks every manifest at startup
and decides which plugins to activate based on config triggers:

- a **provider** is configured → activate the plugin that owns it,
- a **capability** is requested → activate plugins that declare the contract,
- a **command** is invoked → activate plugins that registered the alias,
- a **channel** is enabled → activate plugins that own it,
- `activation.onStartup: true` → always activate.

Then `ensurePluginRegistryLoaded()` at `src/cli/plugin-registry-loader.ts:18-40`
imports the plugin code, calls `register(api)`, and the plugin's
registrations land in the live registries.

This is the **manifest-first control plane** position from `AGENTS.md`:
declarative metadata first, runtime code load second, guarded by manifest
validation.

## Lifecycle

| Phase | Where | What |
|---|---|---|
| Discovery | `bundled-plugin-scan.ts` | Walk `extensions/`, read manifests. |
| Validation | manifest schema + `plugin-package-contract` for external | Fail closed if schema invalid. |
| Activation planning | `activation-planner.ts:63` | Decide which to load given current config. |
| Registration | `register(api)` callback | Plugins call `registerProvider()`, `registerHook()`, etc. |
| Hook runner build | `createHookRunner(registry, options)` at `src/plugins/hooks.ts:244-248` | Compile registrations into a runner. |
| Runtime use | each request | Hooks fire; tools called; services run. |
| Disposal | `runtimeLifecycle.onDispose` callbacks | Triggered on gateway shutdown or session cleanup (`src/plugins/types.ts:2357`). |

## Sandbox boundary

OpenClaw distinguishes **host-side plugins** (full API access, run in the
gateway process) from **sandboxed workloads** (untrusted code in Docker /
WebVM containers).

| Surface | Mode |
|---|---|
| Most extensions in `extensions/*` (anthropic, openai, diagnostics-otel, diagnostics-prometheus, channels) | host-side |
| Untrusted user code, agent tool execution that writes/executes | sandbox via `Dockerfile.sandbox`, `Dockerfile.sandbox-browser`, `Dockerfile.sandbox-common` |

Sandbox policy is configured via `agents.defaults.sandbox.mode` in OpenClaw
config; plugins read this through the injected `OpenClawConfig`. Diagnostics
plugins are host-side because they need full hook/API access to inspect
LLM calls and system state.

## Surprising / load-bearing details

1. **Manifest validation runs before any plugin code executes.** Auth-choice UI, command discovery, contract resolution — all driven by manifest, no plugin TypeScript needed. A security-first design and the reason audits can be done from manifests alone.
2. **Per-hook merge semantics**. Mentioned above; worth restating because it's the most common place to get plugin ordering wrong.
3. **Two hook systems** — typed (`src/plugins/hooks*`) and legacy (`src/hooks/`). Distinct.
4. **`configSchema` is mandatory**. Both in the manifest and in `definePluginEntry()`. Missing → load blocked.
5. **External plugins need explicit compat fields** (`openclaw.compat.pluginApi`, `openclaw.build.openclawVersion`). Internal plugins don't.
6. **Memory is a special slot**. Only one memory plugin active at a time (`VISION.md`); marker is `kind: "memory"` in manifest.

## Files I'd link from any plugin/extension PR

1. `src/plugin-sdk/plugin-entry.ts:254-279` — `definePluginEntry()` factory.
2. `src/plugins/types.ts:2209-2360` — `OpenClawPluginApi` surface.
3. `src/plugins/hook-types.ts:70-143, 787-934` — hook names + handler map.
4. `src/plugins/hooks.ts:244-350` — runner, merge semantics, timeouts.
5. `src/plugins/activation-planner.ts:63-100` — activation logic.
6. `src/plugins/hook-registry.types.ts` — registry shape.
7. `src/cli/plugin-registry-loader.ts:18-40` — loader entry.
8. `packages/plugin-package-contract/src/index.ts:46-100` — external-plugin contract.
9. `docs/plugins/manifest.md:37-183` — manifest field reference (upstream-canonical).
10. A working exemplar: `extensions/anthropic/index.ts` for providers, `extensions/diagnostics-otel/index.ts` for services.

## Read next

- [`gateway.md`](gateway.md) — how plugins reach the dispatcher (`PluginRuntime`, `subagent.run()`, `AsyncLocalStorage` scope).
- [`diagnostics-otel.md`](diagnostics-otel.md) and [`diagnostics-prometheus.md`](diagnostics-prometheus.md) — concrete plugin walkthroughs.
- A1 + A4 in [`TOUR.md`](TOUR.md) — plugin loader and manifest schema deep dives. Together they finish the picture this spec sketches.
- A2 in [`TOUR.md`](TOUR.md) — full hook-engine deep dive (per-hook merge function inventory).
