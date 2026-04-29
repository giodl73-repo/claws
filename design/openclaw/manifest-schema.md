---
name: manifest-schema
description: openclaw.plugin.json — the field-by-field contract OpenClaw inspects before loading any plugin code; identity, activation, providers, channels, memory slot, contracts, auth, config, setup, plus external-plugin extras
type: skunkworks-spec
applies_to: openclaw-core
source_version: HEAD 5e8cc1d9c (audit baseline)
authored: 2026-04-28
---

# Manifest schema

## Why this spec exists

`openclaw.plugin.json` is **the** load-bearing artifact in OpenClaw's
"manifest-first control plane" position. The runtime reads every manifest
at boot, validates it, and uses it to drive activation, capability
ownership, auth-choice UI, command routing, model catalog, endpoint
classification, embedding-provider resolution, and onboarding — *before*
any plugin TypeScript executes. The manifest is not "metadata about a
plugin." The manifest **is** the plugin's promise to the host.

[`plugin-model.md`](plugin-model.md) sketched the manifest at a high level.
[`plugin-loader.md`](plugin-loader.md) covered who reads it. This spec is
the field reference.

Authoritative upstream doc: `docs/plugins/manifest.md` (~1100+ lines).
This spec is our distilled version — read it first to orient, fall back
to upstream for edge cases.

## Field inventory

### Identity

| Field | Type | Required? | Cite | Purpose |
|---|---|---|---|---|
| `id` | string | required | `src/plugins/manifest.ts:252` | Canonical plugin identifier; key in `plugins.entries.<id>`. |
| `legacyPluginIds` | string[] | optional | `src/plugins/manifest.ts:256` | Previous ids that normalize to this canonical id. Backwards-compatible renaming. |
| `version` | string | optional | `src/plugins/manifest.ts:328` | Informational only. |
| `name` | string | optional | `src/plugins/manifest.ts:326` | Human-readable display name. |
| `description` | string | optional | `src/plugins/manifest.ts:327` | Short summary for UI. |

### Activation hints

`activation.*` fields are **hints** — "wake me when this happens." Distinct
from the *owner* declarations below.

| Field | Type | Cite |
|---|---|---|
| `activation.onStartup` | boolean | `docs/plugins/manifest.md:293` |
| `activation.onProviders` | string[] | `src/plugins/activation-planner.ts:120` |
| `activation.onChannels` | string[] | activation-planner |
| `activation.onCommands` | string[] | activation-planner |
| `activation.onAgentHarnesses` | string[] | activation-planner |
| `activation.onRoutes` | string[] | activation-planner (e.g., `"gateway-webhook"`) |
| `activation.onConfigPaths` | string[] | top-level config keys (e.g., `"browser"`) |
| `activation.onCapabilities` | `("provider"|"channel"|"tool"|"hook")[]` | `docs/plugins/manifest.md:300` — broad fallback hint |
| `enabledByDefault` | boolean | `src/plugins/manifest.ts:254` — for bundled plugins; absence ≠ default-on |

**Set `activation.onStartup` intentionally on every plugin.** Omission
triggers the deprecated implicit-startup-sidecar fallback (warns in
Doctor). Recent commits `d48c3e12a`, `d062f8130` are gating the legacy
behavior out.

### Provider declarations

The richest area of the manifest. These let core do model selection,
endpoint routing, pricing lookup, and request rewriting **without loading
provider plugin runtime**.

| Field | Type | Purpose | Cite |
|---|---|---|---|
| `providers` | string[] | Provider ids this plugin owns. | `src/plugins/manifest.ts:261` |
| `providerDiscoveryEntry` | string | Module path (relative to plugin) exporting catalog/auth metadata for cold lookup without full runtime. Consumed by `provider-catalog.ts`, `provider-wizard.ts`. | `src/plugins/manifest.ts:266` |
| `modelSupport.modelPrefixes` | string[] | `startsWith()` match against shorthand model ids (`["claude-"]`, `["gpt-"]`). | `src/plugins/manifest.ts:271` |
| `modelSupport.modelPatterns` | string[] | Regex sources matched after profile-suffix removal; **wins over** `modelPrefixes` when both match. | `docs/plugins/manifest.md:674` |
| `modelIdNormalization` | object | Alias/prefix cleanup *before* provider runtime. Lets `"sonnet-4.6"` → `"claude-sonnet-4-6"`. | `src/plugins/manifest.ts:280` |
| `modelCatalog.providers` | record | Manifest model rows: `baseUrl`, `api`, `models[]`. | `src/plugins/manifest.ts:276` |
| `modelCatalog.aliases` | record | Provider aliases (e.g., `"azure-openai-responses" → "openai"` with api override). | same |
| `modelCatalog.suppressions` | record | Hide deprecated/region-unavailable models. | same |
| `modelCatalog.discovery` | record | Per-provider mode: `"static"` (manifest only) / `"refreshable"` (seeds + cache) / `"runtime"` (must load plugin). **Hints, not directives** — see footguns. | `docs/plugins/manifest.md:689-809` |
| `modelPricing` | object | External pricing lookup policy. Opts local providers out of remote catalogs; maps to OpenRouter/LiteLLM. | `src/plugins/manifest.ts:278` |
| `providerEndpoints` | object[] | Endpoint classification for request routing pre-runtime. Each entry: `endpointClass` (`"openrouter"`, `"anthropic-public"`, `"azure-openai"`, …), `hosts`, `hostSuffixes`, `baseUrls`. | `src/plugins/manifest.ts:282` |
| `providerRequest.providers.<id>.family` | string | Request family label (`"openai-family"`, `"anthropic"`, `"google"`) for request rewriting and diagnostics. | `src/plugins/manifest.ts:284` |
| `providerRequest.providers.<id>.openAICompletions.supportsStreamingUsage` | boolean | Feature flag. | same |
| `cliBackends` | string[] | CLI inference backend ids owned (e.g., `"claude-cli"`). | `src/plugins/manifest.ts:286` |
| `syntheticAuthRefs` | string[] | Provider/CLI refs whose synthetic-auth hook is probed during cold model discovery before runtime registry exists. | `src/plugins/manifest.ts:291` |

### Channel declarations

| Field | Type | Cite |
|---|---|---|
| `channels` | string[] | `src/plugins/manifest.ts:260` |
| `channelEnvVars` | record<string, string[]> | `docs/plugins/manifest.md:171` — env-var lookup without channel runtime |
| `channelConfigs.<id>.schema` | JSON Schema | `src/plugins/manifest.ts:342` |
| `channelConfigs.<id>.uiHints` | record | per-field labels, placeholders, sensitivity flags |
| `channelConfigs.<id>.label` / `description` | string | UI text |
| `channelConfigs.<id>.commands.{nativeCommandsAutoEnabled, nativeSkillsAutoEnabled}` | boolean | per-channel command flags |
| `channelConfigs.<id>.preferOver` | string[] | plugin ids this channel outranks |

`channelConfigs.<id>` keys must mirror entries in `channels[]` —
`docs/plugins/manifest.md:574`.

### Memory and exclusive plugin kinds

| Field | Type | Cite | Purpose |
|---|---|---|---|
| `kind` | `"memory" \| "context-engine"` | `src/plugins/manifest.ts:259` | Slot-based selection via `plugins.slots.*`. **Only one** `kind: "memory"` plugin can be active at a time (`VISION.md`). |
| `contracts.memoryEmbeddingProviders` | string[] | `docs/plugins/manifest.md:489` | Adapter ids this plugin owns (`"local"`, `"openai"`). Standalone CLI paths load only the owning plugin before full Gateway runtime. |

### Capability ownership — `contracts`

Static capability snapshot for manifest-driven discovery. Every key here
maps to a corresponding registration call in plugin runtime; declaring
without registering yields a runtime diagnostic.

`contracts` (`src/plugins/manifest.ts:334`) keys:

- `externalAuthProviders` — provider ids whose external-auth hook this plugin owns. Skips slower compat fallback (`docs/plugins/manifest.md:485`).
- `speechProviders` — TTS provider ids.
- `realtimeTranscriptionProviders` — STT adapter ids.
- `realtimeVoiceProviders` — bidirectional audio adapter ids.
- `mediaUnderstandingProviders` — vision/audio/video understanding.
- `imageGenerationProviders` — image-gen.
- `videoGenerationProviders`, `musicGenerationProviders`.
- `webFetchProviders`, `webSearchProviders`.
- `documentExtractors` — e.g., `"pdf"`.
- `migrationProviders` — `openclaw migrate` import provider ids.
- `tools` — agent tool names this plugin owns.
- `agentToolResultMiddleware` — bundled-only.
- `embeddedExtensionFactories` — bundled Codex only.
- `memoryEmbeddingProviders` — see above.

`mediaUnderstandingProviderMetadata` (`:336-339`) carries defaults:
`capabilities` (modalities), `defaultModels` (per-capability override),
`autoPriority` (lower number sorts first; OpenAI=10, Anthropic=20,
local=40), `nativeDocumentInputs` (e.g., `["pdf"]`).

### Auth and onboarding

| Field | Type | Cite | Notes |
|---|---|---|---|
| `providerAuthChoices` | object[] | `src/plugins/manifest.ts:318` | Auth-choice metadata for onboarding and CLI flags. |
| `providerAuthChoices[].method` | `"api-key"\|"oauth"\|"cli"\|"setup-token"\|…` | per row | |
| `providerAuthChoices[].assistantPriority` | number | per row | Lower = earlier in interactive pickers. |
| `providerAuthChoices[].assistantVisibility` | `"visible"\|"manual-only"` | per row | |
| `providerAuthChoices[].onboardingScopes` | `("text-inference"\|"image-generation")[]` | per row | |
| `providerAuthChoices[].deprecatedChoiceIds` | string[] | per row | Legacy ids that should redirect to this. |
| `providerAuthChoices[].cliFlag`, `cliOption`, `cliDescription`, `optionKey`, `groupId`, `groupLabel`, `choiceLabel`, `choiceHint`, `choiceId` | strings | per row | UI/CLI wiring. |
| `providerAuthEnvVars` | record<string, string[]> | `:309` | **Deprecated.** Replaced by `setup.providers[].envVars`. Compat adapter still reads. (`docs/plugins/manifest.md:169`) |
| `providerAuthAliases` | record<string, string> | `:311` | Provider ids that reuse another's auth (e.g., `"openrouter-coding" → "openrouter"`). |
| `nonSecretAuthMarkers` | string[] | `:296` | Bundled-plugin placeholder API key values for local/OAuth/ambient credentials. |
| `autoEnableWhenConfiguredProviders` | string[] | `:258` | Provider ids that auto-enable this plugin when mentioned in auth/config/models. |

### Command and CLI

| Field | Cite | Purpose |
|---|---|---|
| `commandAliases[]` | `:301` | Each: `name`, `kind` (`"runtime-slash"` for chat commands), `cliCommand` (root suggestion). Consumed by `manifest-command-aliases.ts` pre-runtime. |
| `cliBackends` | `:286` | CLI inference backends (e.g., `"claude-cli"`, `"codex-cli"`). |

### Config and validation

| Field | Required? | Cite |
|---|---|---|
| `configSchema` | **required** | `docs/plugins/manifest.md:114` — even empty plugins must ship `{"type":"object","additionalProperties":false}`. Validated via `src/plugins/schema-validator.ts` (AJV, `allErrors:true, strict:false, removeAdditional:false`, custom URI format `URL.canParse()`). |
| `uiHints.<field>` | optional | `:329` — per-field `label`, `help`, `tags`, `advanced` (bool), `sensitive` (bool — secret), `placeholder`. |
| `configContracts.compatibilityMigrationPaths` | optional | `:341` — config paths indicating setup-time migrations. |
| `configContracts.compatibilityRuntimePaths` | optional | same — paths this plugin services at runtime (e.g., `"tools.web.search.apiKey"`). |
| `configContracts.dangerousFlags` | optional | paths/values that mark config dangerous. |
| `configContracts.secretInputs` | optional | paths to wrap in SecretRef; `bundledDefaultEnabled` override. |

### Setup and onboarding

`setup` (`src/plugins/manifest.ts:322`):

- `setup.providers[]` — `id`, `authMethods`, `envVars`. Replacement for legacy `providerAuthEnvVars`.
- `setup.cliBackends[]` — backend ids for descriptor-first lookup.
- `setup.configMigrations[]` — migration ids owned by this plugin's setup surface.
- `setup.requiresRuntime` — boolean. Whether setup-api still needs execution after descriptor lookup. Defaults to legacy fallback when omitted (`docs/plugins/manifest.md:395-397`).

### QA and skills

| Field | Cite |
|---|---|
| `qaRunners[]` | `:324` — each: `commandName` (e.g., `"matrix"`), `description`. Runtime still owns actual registration via `qaRunnerCliRegistrations`. |
| `skills` | `:325` — skill directories, relative to plugin root. |

## Validation pipeline

`loadPluginManifest(rootDir)` in `src/plugins/manifest.ts` returns a
`PluginManifestLoadResult { ok: boolean, … }`.

| Stage | Cite | Behavior |
|---|---|---|
| File read | `src/utils/parse-json-compat.ts` | **JSON5 parser** (`parseJsonWithJson5Fallback()`) — comments, unquoted keys, trailing commas all permitted. Footgun-rich; see surprises. |
| Size cap | `src/plugins/manifest.ts:35` | `MAX_PLUGIN_MANIFEST_BYTES = 256 * 1024` (256 KB). |
| Parse failure | manifest.ts | Diagnostic added; plugin blocks config validation downstream. |
| `configSchema` validation | `src/plugins/schema-validator.ts:32-45` | AJV with custom URI format (`URL.canParse()`); errors mapped to readable `JsonSchemaValidationError[]` (`:64-70`). |
| Field normalization | `src/plugins/manifest.ts:417-500+` | Helpers `normalizeStringListRecord()`, `normalizeStringRecord()`, `normalizeMediaUnderstandingCapabilityRecord()`, `normalizeMediaUnderstandingPriorityRecord()`. |
| Prototype-pollution guard | `src/infra/prototype-keys.js` | `isBlockedObjectKey()` filters `__proto__`, `constructor`, etc. |
| Discovery + dedup | `src/plugins/manifest-registry.ts:95-100` | Order (highest precedence wins): **Config-selected → Bundled → Global install → Workspace**. Path canonicalization via `resolveComparablePath()` (`manifest-metadata-scan.ts:135-141`) catches hardlinks/symlinks. |
| Activation planning | `src/plugins/activation-planner.ts` | Reasons tagged as `"activation-*-hint"` (from `activation.*`) or `"manifest-*-owner"` (from top-level fields). Falls back to legacy ownership when hints missing. |

## How fields drive activation — six worked examples

| # | Field | Manifest entry | Reader | Decision |
|---|---|---|---|---|
| 1 | `providers` (owner) | `"providers": ["openai"]` | `activation-planner.ts:161-180` `listProviderTriggerReasons()` | When `trigger.kind === "provider"`, `trigger.provider === "openai"`, planner finds plugin via owner list → reason `"manifest-provider-owner"`. |
| 2 | `activation.onStartup` | `"activation": {"onStartup": true, "onConfigPaths": ["browser"]}` | `manifest-registry.ts` + `config-activation-shared.ts` | `true` → load at gateway boot. `onConfigPaths` adds: also load when `browser:` block present in config. |
| 3 | `channels` (owner) | `"channels": ["discord"]` | `activation-planner.ts:180-190` | Trigger `{kind:"channel",channel:"discord"}` matches → reason `"manifest-channel-owner"`. Also requires `channelConfigs.discord.schema` to validate the cold config. |
| 4 | `contracts.memoryEmbeddingProviders` | `"contracts":{"memoryEmbeddingProviders":["openai"]}` | `memory-embedding-providers.test.ts`, `memory-state.test.ts` | When LanceDB memory selected and `embedding.provider="openai"` configured, planner activates the OpenAI plugin to provide the capability. |
| 5 | `commandAliases` | `"commandAliases":[{"name":"browser"}]` | `manifest-command-aliases.ts` (no runtime import) | Doctor/CLI surfaces know `"browser"` is a chat command owned by browser plugin. Misuse (e.g., `plugins.allow: ["browser"]`) yields a "did you mean to enable the browser plugin?" diagnostic. |
| 6 | `autoEnableWhenConfiguredProviders` | `"autoEnableWhenConfiguredProviders": ["google-gemini-cli"]` | `config-policy.ts` | If config mentions `"google-gemini-cli"` provider anywhere, plugin auto-enables without explicit `plugins.allow` entry. |

## Field evolution

### Recently added (last ~6 months)

- **Detailed `activation.*` hints** — commits `d48c3e12a` (gate legacy startup sidecar fallback), `d062f8130` (warn on implicit startup).
- **`modelCatalog`** with discovery modes — commit `947aae5a9` (refreshable manifest rows). Replaces old `provider.listModels()` runtime hook.
- **`modelIdNormalization`, `providerEndpoints`, `providerRequest`** — commit `b74f35ee6` (move provider routing metadata to manifests).
- **`modelPricing`** — commit `1fc5b2b70` (move pricing policy to manifests).

### Deprecated

- `providerAuthEnvVars` — superseded by `setup.providers[].envVars`. Compat adapter still reads during deprecation window.
- Legacy top-level capability keys (e.g., top-level `speechProviders`) — moved under `contracts.*`. `openclaw doctor --fix` migrates (`docs/plugins/manifest.md:966-970`).
- Implicit startup-sidecar fallback — when `activation.onStartup` is omitted, plugin still loads at startup but with a compat warning (`docs/plugins/manifest.md:265`).

### Field constraints / dependencies

- `kind: "memory"` only takes effect when `plugins.slots.memory` references it (`docs/plugins/manifest.md:1138`).
- `channelConfigs.<id>` requires matching `channels[]` entry (`:574`).
- `contracts.tools[]` should match runtime registrations; mismatch is diagnosed.
- `activation.onConfigPaths` values must correspond to top-level config blocks (`:299`).

## External-plugin extras (`package.json.openclaw`)

External (npm-installed, ClawHub) plugins must ship in `package.json`:

```jsonc
{
  "openclaw": {
    "compat": { "pluginApi": "^0.4.0" },          // required, semver range
    "build":   { "openclawVersion": "2026.3.22" } // required
  }
}
```

Plus optional install metadata:

| Field | Purpose | Cite |
|---|---|---|
| `openclaw.install.minHostVersion` | Semver floor for gateway version. Skips on older hosts. | `docs/plugins/manifest.md:1005` |
| `openclaw.install.npmSpec` / `localPath` | Install hints. | `:1003` |
| `openclaw.install.defaultChoice` | Preferred path when multiple sources exist. | `:1004` |
| `openclaw.install.expectedIntegrity` | npm dist integrity (`sha512-…`). Verified at fetch. Optional. | `:1006` |
| `openclaw.setupEntry` (source) / `runtimeSetupEntry` (built) | Lightweight setup-only entry. Channel metadata + setup-safe adapters; transports stay in main. | `:997-998` |
| `openclaw.extensions` (source) / `runtimeExtensions` (built) | Native plugin entrypoints. Must stay inside package directory; `runtimeExtensions` cannot override package boundary. | `:995-996, :1038-1040` |
| `openclaw.channel.persistedAuthState` / `configuredState` | Tiny checker modules answering "is anything signed in / configured?" without channel runtime. | `:1049-1088` |

External validation: `validateExternalCodePluginPackageJson()` at
`packages/plugin-package-contract/src/index.ts:89-100` enforces the
required fields; bundled plugins have relaxed requirements.

## "Manifest replaces code" — concrete examples

The whole point of manifest-first is *metadata not code*. Three exemplars
demonstrating what the manifest absorbs:

### Provider — `extensions/openai/openclaw.plugin.json`

| Manifest declares | What core can do without loading runtime |
|---|---|
| `modelCatalog` (rows for gpt-5.4, o3, o4, …) | Show model picker, validate `agents.defaults.model`, route requests by model id. |
| `modelIdNormalization` | Accept shorthand `"gpt-5.4"` → `"gpt-5.4-2026-04-01"`. |
| `providerEndpoints` | Classify hosts (`api.openai.com` → `openai-public`) for retry/redaction policy. |
| `providerRequest.family` | Apply OpenAI-family request rewriting. |
| `providerAuthChoices` | Render onboarding picker (api-key / oauth / cli) with priorities. |

Result: cold paths (model listing, auth setup, endpoint classification)
never load `extensions/openai/src/*`.

### Channel — `extensions/discord/openclaw.plugin.json`

| Manifest declares | Cold-path benefit |
|---|---|
| `channels: ["discord"]` | Channel-catalog UI lists Discord without loading plugin. |
| `channelEnvVars: {"discord":["DISCORD_BOT_TOKEN"]}` | `openclaw channel list` answers "is Discord env-configured?" from manifest alone. |
| `configSchema` | Validate `channels.discord.*` config block before runtime. |

### Memory — `extensions/memory-lancedb/openclaw.plugin.json`

| Manifest declares | Cold-path benefit |
|---|---|
| `kind: "memory"` | Slot picker offers LanceDB; `plugins.slots.memory` selection logic in `src/plugins/plugin-kind.types.ts` reads `kind` only. |
| Rich `uiHints` for every field | Settings UI renders form pre-runtime. |
| Detailed `configSchema` | Validate user-provided memory config without loading vector backend. |

## Surprises and footguns

1. **Implicit startup-sidecar fallback.** Omitting `activation.onStartup` still loads at startup (legacy) but with a warning. Set this field intentionally on every plugin or you slow gateway boot for plugins that should be lazy.
2. **`providers[]` (owner) ≠ `activation.onProviders[]` (hint).** Different code paths, subtly different meanings. Provider pickers fall back to *owner* before checking *hint*. Declaring only the hint can hide the plugin from UI surfaces.
3. **`modelCatalog.discovery` modes are hints, not directives.** `"static"` does not block runtime load. `"runtime"` doesn't prevent manifest-row consumption. Use `"refreshable"` (safe default) when unsure.
4. **`configSchema` is mandatory even when empty.** Always ship `{"type":"object","additionalProperties":false}`. Omitting it blocks all config validation.
5. **JSON5 syntax permits typos.** `{"id": "my plugin"}` parses (string with space) but the id is invalid. Editor JSON-schema validation may reject valid JSON5. Use `.json5` extension or configure editor; rely on the loader's normalization to catch problems.
6. **`channels[]` and `channelConfigs.<id>.schema` must match.** Adding a channel id without the corresponding schema entry forces full-runtime config validation, defeating manifest-first.
7. **Provider id discovery precedence.** Two plugins declaring the same provider id: `Config-selected > Bundled > Global install > Workspace`. Forking a bundled provider in workspace doesn't override; pin via `plugins.entries.<id>` to win.
8. **`contracts.tools[]` doesn't auto-register.** It declares ownership; the plugin still must call `api.registerAgentTool(...)` at runtime. Mismatch yields a diagnostic: *"tool X declared but not registered."*

## Minimum useful manifest templates

### Code-plugin provider (API-key)

```json
{
  "id": "my-provider",
  "version": "1.0.0",
  "name": "My Provider",
  "description": "Integration with my-provider.com",
  "providers": ["my-provider"],
  "activation": { "onStartup": false },
  "providerAuthChoices": [
    {
      "provider": "my-provider",
      "method": "api-key",
      "choiceId": "my-provider-api-key",
      "choiceLabel": "My Provider API Key",
      "optionKey": "myProviderApiKey",
      "cliFlag": "--my-provider-api-key",
      "cliOption": "--my-provider-api-key <key>",
      "cliDescription": "My Provider API key"
    }
  ],
  "providerAuthEnvVars": { "my-provider": ["MY_PROVIDER_API_KEY"] },
  "providerEndpoints": [{ "endpointClass": "my-provider", "hosts": ["api.my-provider.com"] }],
  "providerRequest": { "providers": { "my-provider": { "family": "my-provider" } } },
  "modelSupport": { "modelPrefixes": ["my-"] },
  "uiHints": { "apiKey": { "label": "API Key", "placeholder": "mp-...", "sensitive": true } },
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": { "apiKey": { "type": "string" } }
  }
}
```

### Code-plugin channel

```json
{
  "id": "my-channel",
  "name": "My Channel",
  "description": "My Platform channel integration",
  "activation": { "onStartup": false },
  "channels": ["my-channel"],
  "channelEnvVars": { "my-channel": ["MY_CHANNEL_BOT_TOKEN", "MY_CHANNEL_WEBHOOK_URL"] },
  "channelConfigs": {
    "my-channel": {
      "label": "My Channel",
      "description": "Connect to My Platform workspace",
      "schema": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "botToken": { "type": "string" },
          "webhookUrl": { "type": "string" }
        },
        "required": ["botToken"]
      },
      "uiHints": {
        "botToken": { "label": "Bot Token", "sensitive": true },
        "webhookUrl": { "label": "Webhook URL" }
      }
    }
  },
  "configSchema": { "type": "object", "additionalProperties": false, "properties": {} }
}
```

### Code-plugin tool (web fetch)

```json
{
  "id": "my-fetch-tool",
  "name": "My Fetch Tool",
  "description": "Fetch and process web content",
  "activation": { "onStartup": false },
  "contracts": { "tools": ["my_fetch_search", "my_fetch_scrape"] },
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": { "apiKey": { "type": "string" } }
  }
}
```

## Files I'd link from any manifest-touching PR

1. `docs/plugins/manifest.md` — canonical upstream reference (~1100 lines).
2. `src/plugins/manifest.ts` — type definitions + normalization helpers.
3. `src/plugins/manifest-registry.ts` — discovery, dedup, registry assembly.
4. `src/plugins/activation-planner.ts` — how fields drive activation.
5. `src/plugins/schema-validator.ts` — AJV pipeline + custom URI format.
6. `packages/plugin-package-contract/src/index.ts:46-100` — external-plugin validation.
7. `extensions/openai/openclaw.plugin.json` — full-fat provider exemplar.
8. `extensions/discord/openclaw.plugin.json` — minimal channel exemplar.
9. `extensions/memory-lancedb/openclaw.plugin.json` — memory-slot exemplar.
10. `src/plugins/bundled-plugin-scan.ts` — how manifests get found.

## Read next

- [`plugin-loader.md`](plugin-loader.md) — what consumes this schema.
- [`plugin-model.md`](plugin-model.md) — the SDK side of the contract.
- A2 in [`TOUR.md`](TOUR.md) — typed hook engine deep dive (33 hook points; manifest doesn't enumerate them but plugin code uses them).
- B1/B2/B3 in [`TOUR.md`](TOUR.md) — exemplar reads for provider/channel/memory plugins; this schema is the lens to read them through.
