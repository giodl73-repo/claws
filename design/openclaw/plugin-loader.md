---
name: plugin-loader
description: openclaw-core's plugin loader — manifest discovery, activation planning, registry shape, OpenClawPluginApi construction, hook runner, lifecycle, external-plugin contract
type: skunkworks-spec
applies_to: openclaw-core
source_version: HEAD 5e8cc1d9c (audit baseline)
authored: 2026-04-28
---

# Plugin loader

## What this covers

The "other side" of the plugin SDK: how OpenClaw turns the static metadata
in every `openclaw.plugin.json` into a *live* registry of tools, providers,
channels, hooks, routes, services, gateway methods, and lifecycle callbacks.
Where [`plugin-model.md`](plugin-model.md) describes the contract, this spec
describes the machine that reads it.

## Boot-time flow

Entry: `src/cli/plugin-registry-loader.ts:18-40` —
`ensureCliPluginRegistryLoaded(scope)`. The `scope` argument controls how
much of the registry to populate: `"all"`, `"channels"`,
`"configured-channels"`, etc. CLI subcommands that don't need every plugin
narrow the scope to keep startup cheap.

The function chains into `ensurePluginRegistryLoaded()` which executes:

1. **Manifest scan + validation** — `loadPluginManifestRegistry()` walks bundled `extensions/` and any installed npm plugins, reads `openclaw.plugin.json` + `package.json` for each, validates them, returns a `ManifestRegistry`.
2. **Activation planning** — `resolveManifestActivationPlan()` at `src/plugins/activation-planner.ts:63-100`. Pure function: takes manifest registry + trigger object, returns the plan (which plugin ids to activate, with reasons).
3. **Code loading + registration** — for each activated plugin: dynamic-import the entry, call `register(api)`, collect everything the plugin registered.
4. **Population** — populate the live `PluginRegistry` (specialized sub-registries; see below).
5. **Publish** — `setActivePluginRegistry(registry)` in `runtime.ts` makes the registry globally readable.

The loader is **fully re-entrant**. Subsequent `loadPlugins()` calls clear
the cache (`clearPluginLoaderCache()` at `src/plugins/loader.ts:279-290`),
fire cleanup callbacks for plugins no longer in the new plan, re-scan, and
re-register. Reload-without-restart is supported in principle, with caveats
(see *Lifecycle* below).

## Bundled-plugin discovery

Bundled plugins live in `extensions/` (or `dist/extensions/` in built
artifacts). Discovery is **runtime, not build-time** — the loader does not
embed an import map at build. This is what lets `extensions/` accept new
plugins without rebuilding.

**Path resolution** (`src/plugins/bundled-dir.ts:111-194`,
`resolveBundledPluginsDir()`):

1. Honor `OPENCLAW_BUNDLED_PLUGINS_DIR` env override.
2. Try multiple candidates: `cwd`, `argv[1]`'s package root, module import root.
3. Prefer `extensions/` in source checkouts, `dist/extensions/` in built artifacts.
4. If `OPENCLAW_DISABLE_BUNDLED_PLUGINS=true`, return an empty temp directory (still typed-correct, zero plugins).

**Metadata collection** (`src/plugins/bundled-plugin-metadata.ts:90-182`,
`collectBundledPluginMetadata()`):

1. `fs.readdirSync` enumerates plugin directories.
2. For each: load `openclaw.plugin.json` manifest + read `package.json`.
3. Resolve entry point (the `extensions` array in package.json), rewrite source `.ts` paths to built `.js` paths.
4. Collect public-surface artifacts (helper sidecars, `runtime-api.ts`, etc.) via `collectBundledPluginPublicSurfaceArtifacts()`.

Results are cached at module scope
(`src/plugins/bundled-plugin-metadata.ts:52, :201-214`). Tests reset via
`clearBundledPluginMetadataCache()`.

## Activation planner

`resolveManifestActivationPlan(manifests, triggers)` at
`src/plugins/activation-planner.ts:63-100` is the gate. Six trigger types,
each with its own match logic:

| Trigger | Cite | Matches against |
|---|---|---|
| **command** | `:118, :143-159` | `activation.onCommands` (hint) or `commandAliases[].cliCommand`/`name` (manifest owner) |
| **provider** | `:120, :161-180` | `activation.onProviders` (hint), `providers` (owner), `setup.providers[].id` (setup owner) |
| **agentHarness** | `:122, :134-141` | `activation.onAgentHarnesses` |
| **channel** | `:124, :182-194` | `activation.onChannels` (hint) or `channels` (owner) |
| **route** | `:126, :196-203` | `activation.onRoutes` |
| **capability** | `:205-244` | `activation.onCapabilities` and inferred from contract declarations (`provider`, `channel`, `tool`, `hook`); delegates to `listCapabilityTriggerReasons()` |

Two patterns worth naming explicitly:

- **Hint vs owner.** `activation.on*` fields are *hints* — the plugin says "wake me when this happens." Top-level fields like `providers`, `channels`, `commandAliases` are *owner* declarations — the plugin says "I own these." The planner treats them differently in match logic.
- **Activation reasons.** The plan carries a reason for each plugin id. Useful for debugging "why is this plugin loaded?" — the answer is in the plan, not buried in code.

Plan output is sorted lexicographically by plugin id (`:96`) and includes
diagnostics for any manifest validation failures.

## Live registry shape

The registry is **not monolithic.** `PluginRegistry` at
`src/plugins/registry-types.ts:372-415` is a record of specialized
sub-registries. The shape, grouped:

**Plugin metadata**: `plugins: PluginRecord[]` — id, name, version, status, error.

**Capability arrays:**

- **Tools / hooks**: `tools`, `hooks`, `typedHooks`.
- **Channels**: `channels`, `channelSetups`.
- **Generic providers**: `providers`.
- **Specialized media providers**: `speechProviders`, `realtimeTranscriptionProviders`, `realtimeVoiceProviders`, `mediaUnderstandingProviders`, `imageGenerationProviders`, `videoGenerationProviders`, `musicGenerationProviders`, `webFetchProviders`, `webSearchProviders`.
- **Data providers**: `migrationProviders`, `memoryEmbeddingProviders`.
- **Agents**: `agentHarnesses`, `agentToolResultMiddlewares`, `codexAppServerExtensionFactories`.

**Extension surfaces:**

- `httpRoutes` — HTTP handlers with auth + path matching.
- `cliRegistrars` — CLI command builders.
- `commands` — declarative command definitions.
- `services` / `gatewayDiscoveryServices` — long-running services.
- `gatewayHandlers` — gateway methods, indexed by method name.

**Lifecycle / extras:**

- `runtimeLifecycles` — cleanup callbacks (`:410`).
- `sessionExtensions`, `trustedToolPolicies`, `toolMetadata`, `controlUiDescriptors`.
- `agentEventSubscriptions`, `sessionSchedulerJobs`.
- `conversationBindingResolvedHandlers`.

**Diagnostics**: `diagnostics: PluginDiagnostic[]` — warnings/errors collected during load. Surfaced at runtime so operators can see what failed.

The registry is **immutable after population.** Reload = clear + repopulate.
Callers query specialized registries by name; there is no master "lookup
anything" API.

## `OpenClawPluginApi` builder

`buildPluginApi()` at `src/plugins/api-builder.ts:152-243` constructs the
api object passed to each plugin's `register(api)` call.

**Inputs:**

- Plugin metadata: id, name, version, description, source, registrationMode (`"bundled"` vs `"installed"`).
- Handler overrides: a partial object mapping the up-to-74 register-style methods to implementations the loader provides.
- Runtime + logger: `PluginRuntime` for host↔plugin communication, plugin-scoped logger.
- Config + `resolveFile`: plugin-scoped config and a path resolver.

**Defaults at `:79-150`:** Every one of the ~74 handlers has a no-op
default. Plugins always see a complete API surface; unimplemented handlers
silently succeed.

**Crucial asymmetry — no trust gating at the API surface.** Bundled and
external plugins receive the *same* api object. Trust boundaries are
enforced elsewhere:

- by **manifest declarations** (e.g., `minHostVersion`, capability ownership),
- at **runtime** in tool/agent execution (`PluginRuntimeContext` capability gates),
- by **sandboxing** at the harness layer (subprocess/worker/VM).

The loader does not narrow the API surface based on trust. This is a
deliberate choice — it means trust enforcement is concentrated in
runtime/manifest checks rather than scattered across loader gates.

## Hook runner construction

`createHookRunner(registry, options)` at `src/plugins/hooks.ts:244-258`.

**Options:**

| Option | Default | Purpose |
|---|---|---|
| `catchErrors` | `true` | When false, hook errors throw. Per-hook controlled via `failurePolicyByHook`: `"fail-open"` or `"fail-closed"`. |
| `voidHookTimeoutMsByHook` | per-hook | Timeouts for observation hooks (e.g., `agent_end: 30_000`). |
| `modifyingHookTimeoutMsByHook` | per-hook | Timeouts for state-mutating hooks (e.g., `before_prompt_build: 15_000`). |
| `logger` | optional | `HookRunnerLogger`. |

**Sorting** (`getHooksForName()` at `:224-230`): registrations filtered by
hook name, sorted descending by priority (higher first).

**Per-hook merge functions** — different hooks combine plugin results
differently. The merger is bespoke per hook:

| Hook | Merger | Behavior |
|---|---|---|
| `before_model_resolve` | `mergeBeforeModelResolve()` `:268-275` | First-defined override wins (highest priority that returns a value). |
| `before_prompt_build` | `mergeBeforePromptBuild()` `:277-299` | System prompt first-wins; context appended/prepended via `concatOptionalTextSegments()`. |
| `agent_turn_prepare` | `mergeAgentTurnPrepare()` `:301-316` | Generic context concatenation. |
| `before_agent_finalize` | `mergeBeforeAgentFinalize()` `:318-344` | Action precedence: `finalize > revise > continue`; reason concatenated. |
| `subagent_spawning` | `mergeSubagentSpawningResult()` `:346+` | Specialized merge for async subagent lifecycle. |

This is the most important table for any contributor wiring a new plugin
that participates in multiple hooks. Treating "priority" as a uniform
concept across hooks is wrong — for some hooks priority decides who wins,
for others it just orders concatenation.

## Lifecycle and disposal

`PluginRuntimeLifecycleRegistration` at `src/plugins/host-hooks.ts:96-104`:

```ts
type PluginRuntimeLifecycleRegistration = {
  id: string;
  description?: string;
  cleanup?: (ctx: {
    reason: PluginHostCleanupReason;  // "disable" | "reset" | "delete" | "restart"
    sessionKey?: string;
    runId?: string;
  }) => void | Promise<void>;
};
```

Plugins call `registerRuntimeLifecycle(lifecycle)` from inside their
`register(api)`. The loader stores it in
`PluginRegistry.runtimeLifecycles` (`:410`) and fires it on:

- explicit disable / reset / delete,
- gateway shutdown,
- reload (for plugins dropping out of the new plan).

`PluginHostCleanupReason` values are defined at `host-hooks.ts:29`.

**Reload semantics.** Calling `loadPlugins()` again:

1. Diff old vs new plan.
2. Fire `cleanup({ reason: "disable" })` for plugins leaving the plan.
3. Clear loader cache.
4. Re-scan, re-register everything in the new plan.

Plugins that need to be reloaded mid-session can be — *except* anything
holding a sandbox/agent harness instance. Sandboxed agent harnesses don't
support live reload because the underlying subprocess/worker would need to
be re-started; the harness ends up in an "error" state until the gateway
restarts.

## External vs bundled — the differences

External (npm-installed, ClawHub) plugins go through `discoverOpenClawPlugins()`
in `discovery.ts` and the contract validator at
`packages/plugin-package-contract/src/index.ts`.

| Aspect | Bundled | External |
|---|---|---|
| Discovery | `extensions/` dir scan | `node_modules/.openclaw-plugins/` (or convention) |
| Manifest validation | Standard | Standard + `openclaw.compat.pluginApi`, `openclaw.build.openclawVersion` checked via `validateExternalCodePluginPackageJson()` |
| Compatibility check | none | `normalizeExternalPluginCompatibility()` reads pluginApi range + `minGatewayVersion` |
| API surface | full | full (same!) |
| Trust posture | host-trusted | host-trusted *if* manifest valid; runtime sandboxing applies as for any plugin |
| Manifest read cadence | once at boot, cached | once at boot, re-read per load call |

The **API surface parity** is the single most surprising bit. ClawHub
publishing layers add review, signing, and provenance — but the *runtime*
loader does not gate api access. The wave's `claws-openclaw-upstream`
plan implicitly relies on this when justifying contributions: trust is
manifest + review, not loader-enforced narrowing.

## Sandbox boundary

**The loader does not enforce sandboxing.** Sandboxing is a runtime concern.

- **Agent harness sandboxing** — when a plugin registers an `AgentHarness`, the harness object defines its own subprocess/worker/VM strategy. The loader merely collects it.
- **Tool sandboxing** — `registerTool(factory)` includes a `PluginRuntimeContext` parameter; capability limits ("can call provider X", "can read file Y") are enforced inside the tool's `execute()`, not by the loader.
- **Manifest declarations** — capability hints (`contracts.tools`, `activation.onProviders`) inform activation planning, not enforcement.

So: the loader is **host-side**. It runs untrusted code's `register()`
function in the gateway process. Untrusted *workloads* (agent execution,
arbitrary tool execution) run in separate processes spawned by the harness.

## Edge cases and footguns

- **Plugin id collisions** (`src/plugins/manifest-registry.ts:703-717`). Duplicate id → warning log, origin precedence (`bundled > installed > external`), loser silently skipped. Subtle: a buggy external plugin reusing a bundled id is silently ignored.
- **Manifest validation failures** (`manifest-registry.ts:688`). Invalid manifests yield `PluginDiagnostic` entries (`error`/`warn`). Plugins with `error`-level diagnostics load with status `"error"` and are skipped from registration. Their `cleanup` callbacks never run because they never registered.
- **Cyclic plugin dependencies** — *not detected*. There is no dependency graph. If A and B both trigger each other, both activate; ordering is whatever activation-plan sort yields. Don't rely on inter-plugin ordering.
- **Missing entry point** — module resolution error → plugin status `"error"`, registry populated without the plugin's contributions.
- **Hook timeout** — runner logs and continues. Underlying work is **not cancelled** (`hooks.ts:170-175`). Long-running hooks block agent turns. Make sure timeouts in `voidHookTimeoutMsByHook` / `modifyingHookTimeoutMsByHook` are set appropriately.
- **Partial registration on `register()` throw** — error caught, plugin status set to `"error"`, *but partial registrations are not rolled back*. The registry can be left holding tools/hooks/channels from a plugin whose `register()` half-succeeded. Rare but worth knowing if debugging "ghost" registrations.

## Files I'd link from any loader-touching PR

1. `src/cli/plugin-registry-loader.ts:18-40` — entry point.
2. `src/plugins/activation-planner.ts:63-100` — `resolveManifestActivationPlan()`.
3. `src/plugins/bundled-plugin-metadata.ts:90-182` — bundled discovery.
4. `src/plugins/bundled-dir.ts:111-194` — path resolution.
5. `src/plugins/api-builder.ts:152-243` — API factory.
6. `src/plugins/hooks.ts:244-350` — hook runner + merge functions.
7. `src/plugins/registry-types.ts:372-415` — `PluginRegistry` shape.
8. `src/plugins/host-hooks.ts:96-104` — lifecycle definitions.
9. `src/plugins/loader.ts:279-290` — disposal cache.
10. `packages/plugin-package-contract/src/index.ts:46-100` — external-plugin validation.

## Read next

- [`plugin-model.md`](plugin-model.md) — the SDK side; pair with this spec for the full picture.
- A4 in [`TOUR.md`](TOUR.md) — manifest schema deep dive (companion piece — what the loader is reading).
- A2 in [`TOUR.md`](TOUR.md) — full hook engine deep dive (this spec covered runner construction; A2 covers the 33 typed hook points and their event/result types).
