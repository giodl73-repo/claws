---
name: extension-pattern-provider
description: The provider extension pattern — anthropic as canonical exemplar; manifest fields, register flow, auth methods, model-id normalization, fast-path discovery, vertex/bedrock variants
type: skunkworks-spec
applies_to: openclaw-core
source_version: HEAD 5e8cc1d9c (audit baseline)
authored: 2026-04-28
---

# Extension pattern — provider plugins

## Why anthropic is the exemplar

Most field-rich provider manifest in the tree, three auth methods (cli /
setup-token / api-key), CLI-backend reuse, thinking-mode hooks, media
understanding, forward-compat model resolution. If you understand
anthropic, you understand the pattern transferable to openai, google,
mistral, groq, deepseek, deepinfra, fireworks, cerebras, perplexity, etc.

## Plugin entry

`extensions/anthropic/index.ts`:

```ts
export default definePluginEntry({
  id: "anthropic",
  name: "Anthropic Provider",
  description: "Bundled Anthropic provider plugin",
  register(api) {
    return registerAnthropicPlugin(api);
  },
});
```

`registerAnthropicPlugin` lives in `register.runtime.ts:594-598`:

```ts
export function registerAnthropicPlugin(api: OpenClawPluginApi): void {
  api.registerCliBackend(buildAnthropicCliBackend());
  api.registerProvider(buildAnthropicProvider());
  api.registerMediaUnderstandingProvider(anthropicMediaUnderstandingProvider);
}
```

Three SDK calls fire during plugin load:

| Call | Purpose | Required for a provider plugin? |
|---|---|---|
| `api.registerProvider(provider)` | Core provider registration. | **yes** |
| `api.registerCliBackend(backend)` | Local-CLI inference backend (Claude CLI). | optional |
| `api.registerMediaUnderstandingProvider(...)` | Image / audio / PDF understanding. | optional |

The `register()` callback is the entire plugin runtime entry — no other
exports are needed.

## Manifest fields specific to providers

From `extensions/anthropic/openclaw.plugin.json`. Annotated:

| Field | What it does | Cold-path benefit |
|---|---|---|
| `providers: ["anthropic"]` | Names this plugin as the handler for the `"anthropic"` provider id. | Loader matches a configured `providers.anthropic` block to this plugin without code load. |
| `modelSupport.modelPrefixes: ["claude-"]` | Model ids starting with `claude-` belong to anthropic. | Discovery resolves models cold. |
| `modelIdNormalization.providers.anthropic.aliases` | Rewrite shorthand (`opus-4.6`) → canonical (`claude-opus-4-6`) before runtime loads. | Aliases applied via `manifest-model-id-normalization.ts:141-180` pre-runtime. |
| `providerEndpoints[]` | DNS/TLS endpoint classification (`endpointClass: "anthropic-public"`, `hosts: ["api.anthropic.com"]`). | Request routing + redaction policy without runtime. |
| `providerRequest.providers.anthropic.family: "anthropic"` | Request-format family for transport layer. | Request rewriter knows which schema to apply. |
| `providerAuthChoices[]` | Three auth methods declared up front (cli / setup-token / api-key). | Onboarding picker UI rendered from manifest alone. |
| `providerAuthEnvVars: { anthropic: ["ANTHROPIC_OAUTH_TOKEN", "ANTHROPIC_API_KEY"] }` | Env-var detection. | Synthetic auth resolver checks env vars cold. |
| `cliBackends: ["claude-cli"]` | This plugin owns the Claude CLI as a runnable backend. | CLI inference auto-activates without runtime. |
| `syntheticAuthRefs: ["claude-cli"]` | Auth sources inferred from environment, not user-entered. | Lazy auth resolution skips prompts. |
| `contracts.mediaUnderstandingProviders: ["anthropic"]` | Plugin owns the anthropic media-understanding capability. | Capability resolver pre-runtime. |
| `mediaUnderstandingProviderMetadata.anthropic.{capabilities, defaultModels, autoPriority, nativeDocumentInputs}` | Modality matrix (image), default model (`claude-opus-4-7`), priority `20`, native PDF input. | Auto-fallback ranking + media UI cold. |

This is the manifest doing what code used to: every cold-path lookup
(model selector, auth prompt, endpoint classification, capability
matrix) is answered without loading `register.runtime.ts`.

## `provider-discovery.ts` — the fast path

`extensions/anthropic/provider-discovery.ts` exports:

```ts
export const anthropicProviderDiscovery: ProviderPlugin = {
  id: CLAUDE_CLI_BACKEND_ID,
  label: "Claude CLI",
  docsPath: "/providers/models",
  auth: [],
  resolveSyntheticAuth: ({ provider }) =>
    provider === CLAUDE_CLI_BACKEND_ID ? resolveClaudeCliSyntheticAuth() : undefined,
};
```

Manifest field `providerDiscoveryEntry: "./provider-discovery.ts"`
points the loader here. Loaded **before** `register.runtime.ts` by
`provider-discovery.runtime.ts:108-124` (`loadSource(manifest.providerDiscoverySource!)`).

If the discovery entry succeeds without live hooks (`catalog.run`),
static `ProviderPlugin` objects populate the provider catalog instantly.
If it fails or has live hooks, the loader falls back to full plugin
load. **Discovery entries must be stateless** — side effects (network,
file I/O) block plugin activation.

## Runtime layout

| File | Role |
|---|---|
| `register.runtime.ts` | Assembles + exports `buildAnthropicProvider()` and `registerAnthropicPlugin()`. |
| `cli-backend.ts` | `CliBackendPlugin` config (Claude CLI invocation, args, watchdog). |
| `cli-auth-seam.ts` | Bridges to SDK auth reader; reads Claude CLI credentials from disk. |
| `cli-shared.ts` | Constants + Claude-CLI argument normalization. Clears 60+ env vars (`:19-58`) to prevent override leakage. |
| `stream-wrappers.ts` | `wrapAnthropicProviderStream()` — injects beta headers, thinking-mode prefill. |
| `media-understanding-provider.ts` | Image/PDF understanding registration. |
| `config-defaults.ts` | Default config values. |
| `replay-policy.ts` | Streaming replay caching policy. |

`buildAnthropicProvider()` (`register.runtime.ts:473-592`) returns a
`ProviderPlugin` implementing:

- **Auth** — three methods with `run()` and `runNonInteractive()`.
- **`resolveDynamicModel()`** — forward-compat layer (4.6 → 4.5 fallback) + context-window overrides.
- **`wrapStreamFn()`** — beta-header injection.
- **`fetchUsageSnapshot()`** — calls SDK's `fetchClaudeUsage()`.
- **`buildAuthDoctorHint()`** — diagnostics for broken OAuth profiles.

## Auth methods

### `cli` — reuse Claude CLI native auth

| Step | Code | Behavior |
|---|---|---|
| Trigger | user `openclaw models auth login --provider anthropic --method cli` | |
| Migration | `register.runtime.ts:411-422` `runAnthropicCliMigration(ctx)` | |
| Read | `cli-auth-seam.ts` → SDK `readClaudeCliCredentialsCached()` | Pulls OAuth or bearer from Claude CLI keychain. |
| Storage | profiles type `"oauth"` or `"token"` | `$OPENCLAW_DATA_HOME/auth/profiles.json` |
| Runtime resolve | `:572-575` `resolveSyntheticAuth()` | Re-reads Claude CLI; returns synthetic auth with `apiKey`, `source: "Claude CLI native auth"`, optional `expiresAt`. |
| Refresh | none in plugin | Relies on Claude CLI's own refresh. |

### `setup-token` — manual Anthropic bearer

| Step | Cite | Behavior |
|---|---|---|
| Trigger | `--method setup-token` | |
| Validate | `register.runtime.ts:113-149` SDK `validateAnthropicSetupToken()` | |
| Storage | profile type `"token"`; optional expiry from `--token-expires-in` | |
| Refresh | manual | |

### `api-key` — direct key

| Step | Cite | Behavior |
|---|---|---|
| Trigger | `--method api-key --set <key>` or env `ANTHROPIC_API_KEY` | |
| Build | `register.runtime.ts:534-552` SDK `createProviderApiKeyAuthMethod()` | |
| Storage | profile type `"api_key"` | Or read from env directly; not always persisted in secure store. |
| Refresh | none | User re-login required if key revoked. |

**Storage hierarchy.** Profiles in `$OPENCLAW_DATA_HOME/auth/profiles.json`.
API keys can also be read directly from env. Validation happens at login;
runtime errors surface as API failures, not pre-flight.

## Model-id handling

`modelIdNormalization` aliases are applied at runtime by
`manifest-model-id-normalization.ts:141-180`:

```
user types:  "opus-4.6"
            ↓
manifest:    aliases["opus-4.6"] = "claude-opus-4-6"
            ↓
canonical:   "claude-opus-4-6"
            ↓
optionally:  prefixWhenBare → "anthropic/claude-opus-4-6"
            ↓
sent to API
```

Lookups are case-insensitive (`:58` lowercases both side). Forward-compat
beyond aliases lives in `register.runtime.ts:247-276`
`resolveAnthropicForwardCompatModel()` — clones older templates when
new versions aren't available, with context-window overrides via
`applyAnthropicOpus47ContextWindow()` (`:318-349`).

## Variants

### `anthropic-vertex`

`extensions/anthropic-vertex/openclaw.plugin.json`:

- No `modelSupport.modelPrefixes` (discovery implicit from GCP).
- No `providerAuthChoices` — auth synthetic-only via ADC (Application Default Credentials).
- `providerDiscoveryEntry: "./provider-discovery.ts"` — load implicit providers from GCP environment.

Runtime (`index.ts`):
- `catalog: { order: "simple", run: ... }` fetches models from GCP metadata.
- `resolveSyntheticAuth()` returns `{ apiKey: "gcp-vertex-credentials", source: "gcp-vertex-credentials (ADC)", mode: "api-key" }`.
- Reuses `NATIVE_ANTHROPIC_REPLAY_HOOKS` from SDK — inherits streaming policies from base anthropic.

**Difference vs base:** auth-optional (env-resolved), no explicit login.

### `amazon-bedrock-mantle`

Minimal manifest. No `providerAuthChoices`, no discovery entry.

Runtime: `registerBedrockMantlePlugin(api)` registers a single provider
for Bedrock-hosted Anthropic models. Auth is AWS SigV4 (handled by AWS
SDK internally; not exposed as user-facing choices).

**Difference:** Bedrock wraps Anthropic models behind AWS IAM; no direct
Anthropic API key needed.

## The pattern, abstracted

**Required for a provider plugin:**

1. Manifest `id` + `providers: [...]`.
2. `register()` callback that calls `api.registerProvider(provider)` with a `ProviderPlugin` object.
3. At least one auth method — explicit (`providerAuthChoices`) or synthetic (`syntheticAuthRefs` + a resolver).

**Optional:**

- `providerDiscoveryEntry` — fast-path static catalog (load before full plugin).
- `cliBackends`, `mediaUnderstandingProviders`, `videoGenerationProviders`, etc. — capability extensions.
- `modelCatalog`, `modelIdNormalization`, `modelPricing` — manifest-driven model metadata.
- `wrapStreamFn`, `fetchUsageSnapshot`, `buildAuthDoctorHint` — runtime hooks.

**Anthropic-specific (not pattern-required):**

- Claude CLI reuse (`syntheticAuthRefs`, `cliBackends`).
- Thinking-mode (`resolveThinkingProfile`).
- Context-window adjustment.
- Forward-compat model cloning.

## Footguns

1. **Auth resolution ordering.** SDK tries synthetic auth first (env, CLI creds) before prompting. No synthetic resolver → user must explicitly log in. Anthropic's `syntheticAuthRefs: ["claude-cli"]` skips prompts.
2. **Aliases are case-insensitive.** `Opus-4.6` and `opus-4.6` both match.
3. **Provider-discovery must be stateless.** Side effects block plugin load. Use `catalog.run` for dynamic discovery.
4. **CLI backend args must serialize.** Each arg is a string; no objects. Anthropic clears 60+ env vars to prevent override leakage.
5. **Streaming wrappers fire on every response.** Heavy logic in `wrapStreamFn` blocks streaming latency. Anthropic only injects beta headers.
6. **Auth profiles are immutable at runtime.** Tokens cannot be refreshed from the plugin. Anthropic's setup-token auth has no refresh; OAuth (CLI auth) relies on Claude CLI's own refresh.
7. **Forward-compat clones from template.** Mismatch between manifest and runtime model registry causes confusing "model not found" errors.
8. **Media-understanding `defaultModels` must be real model ids.** Manifest typo silently fails.
9. **Endpoint validation uses DNS/TLS hostnames.** Custom endpoints must match `providerEndpoints.hosts` or bypass validation explicitly.
10. **Auth doctor hint is fallback diagnostic.** `buildAuthDoctorHint()` runs only when auth resolution fails. Mirror this pattern in any new provider for debugging affordance.

## Files I'd link from any provider PR

1. `extensions/anthropic/openclaw.plugin.json` — canonical manifest.
2. `extensions/anthropic/register.runtime.ts:473-598` — full registration flow.
3. `extensions/anthropic/index.ts` — entry shape.
4. `extensions/anthropic/provider-discovery.ts` — fast-path discovery.
5. `src/plugins/manifest-model-id-normalization.ts:141-180` — alias application.
6. `src/plugins/provider-discovery.runtime.ts:108-124` — discovery loader.
7. `src/plugins/types.ts` (search `registerProvider`) — `ProviderPlugin` interface.
8. `src/plugin-sdk/provider-auth.ts` — auth SDK exports.
9. `extensions/anthropic-vertex/index.ts` — variant pattern.
10. `extensions/mistral/openclaw.plugin.json` — contrast: simpler 1-auth-method provider.

## Read next

- [`manifest-schema.md`](manifest-schema.md) — every manifest field referenced here.
- [`plugin-loader.md`](plugin-loader.md) — how `register(api)` actually fires.
- [`extension-pattern-channel.md`](extension-pattern-channel.md) — sister exemplar (telegram).
- [`extension-pattern-memory.md`](extension-pattern-memory.md) — the special-slot pattern.
