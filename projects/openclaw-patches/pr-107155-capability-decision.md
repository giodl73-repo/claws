# PR #107155: keyless web-search startup contract

Status: owner decision needed; no implementation authorized.

## Thesis and deletion target

PR #107155 should keep Lobster's proxy-authenticated WebIQ configuration on the
secrets startup fast path without teaching core that an opaque plugin setting
named `webSearch.omitAuth` has security meaning.

The deletion target is the PR's direct inspection of
`plugins.entries.<provider>.config.webSearch.omitAuth`. The replacement should
be a validated, manifest-owned declaration consumed from the plugin metadata
snapshot that Gateway already loads before secrets activation.

## Current source proof

- Gateway startup already loads `PluginMetadataSnapshot` and passes its
  `manifestRegistry` into `prepareSecretsRuntimeFastPathSnapshot`.
- `prepareSecretsRuntimeFastPathSnapshot` already accepts the manifest registry;
  no plugin runtime import or new startup phase is required.
- `WebSearchProviderPlugin.requiresCredential` already expresses the runtime
  concept, but it is available only after provider runtime loading.
- Plugin manifests statically declare `contracts.webSearchProviders` and already
  carry validated capability/config metadata for other core consumers.
- Lobster's WebIQ provider is conditionally keyless: its normal mode accepts an
  API key, while `webSearch.omitAuth: true` means the runtime proxy injects the
  credential. A single unconditional `requiresCredential: false` manifest bit
  would therefore be inaccurate.
- Current OpenClaw `main` has no installed-plugin manifest field that expresses
  this conditional credential mode. The official external install catalog has
  `requiresCredential`, but that catalog is not the installed manifest registry
  and cannot describe Lobster's config-dependent WebIQ mode.

## Smallest proposed contract

Add web-search provider metadata to the validated plugin manifest, with absence
remaining fail-closed. Illustrative shape only:

```json
{
  "webSearchProviderMetadata": {
    "webiq": {
      "openClawCredential": {
        "notRequiredWhen": [
          { "path": "webSearch.omitAuth", "equals": true }
        ]
      }
    }
  }
}
```

The exact naming belongs to the plugin/secrets owners. The required semantics
are narrower than the spelling:

1. The selected provider must have exactly one enabled, allowed manifest owner
   through `contracts.webSearchProviders`.
2. The condition is a validated relative path plus exact JSON-literal equality;
   core does not infer meaning from the path name.
3. Missing, malformed, ambiguous, disabled, or denied metadata means
   credential-required and uses the conservative resolver path.
4. The existing whole-config/auth-store SecretRef and credential-bearing value
   scans remain mandatory.
5. This declaration only says OpenClaw need not materialize a provider
   credential during startup. It does not grant network access, authorize a
   proxy, or assert that the upstream request is authenticated.

This keeps ownership with the plugin while giving core a generic, static fact
it can safely consume before runtime loading.

## Alternatives considered

- **Keep inspecting `omitAuth` in core:** rejected by the exact-head review;
  it creates an undocumented plugin/core security contract.
- **Use unconditional manifest `requiresCredential: false`:** rejected because
  WebIQ is credential-bearing unless the proxy mode is explicitly selected.
- **Infer keylessness from `setup.providers[].envVars` or JSON Schema:** rejected;
  those describe setup/config shape, not credential semantics.
- **Load the provider runtime to read `requiresCredential`:** correct but
  defeats the startup fast-path objective.
- **Stay on the conservative resolver path:** safe and requires no contract;
  this is the fallback if owners do not want the manifest surface.

## Stakeholder review

- **Gateway owner:** favorable if evaluation is synchronous over the already
  loaded manifest snapshot. No runtime import, I/O, or new activation phase is
  needed. Invalid metadata must fall back instead of failing Gateway startup.
- **Lobster container operator:** favorable because an older or unaware
  OpenClaw build remains correct but slower. The host config and vendored
  manifest can ship together, and the runtime proxy remains the credential
  authority.
- **Security owner:** acceptable only with exact literal matching, unique owner
  resolution, fail-closed defaults, and retention of the global secret scans.
  The field must not be interpreted as egress authorization.
- **Fleet/platform operator:** the declaration is versioned with the plugin;
  mixed-version fleets degrade to the full resolver rather than silently
  broadening access.

## Comparator evidence

The design follows two established patterns rather than making config names
magical:

- [VS Code extension contribution points](https://code.visualstudio.com/api/references/contribution-points)
  are static manifest declarations that let the host discover extension-owned
  capabilities before activation.
- [MCP initialization](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle)
  exchanges explicit capabilities before optional features are used.

Both support the same boundary: the owner declares a typed capability and the
host consumes only that declared contract. They do not justify trusting an
arbitrary plugin config key.

## Owner decision requested

Choose one:

1. Approve a conditional, manifest-owned declaration that an OpenClaw-held web
   search credential is not required, with the fail-closed semantics above.
2. Keep the conservative resolver path and close #107155 without the startup
   optimization.

Do not rebase or rewrite the PR until this decision is made: the branch is now
4,057 commits behind current `main`, and the relevant manifest files have been
substantially refactored. Any accepted implementation should be rebuilt on
current `main`, then rerun the focused tests and exact Lobster-shaped Gateway
startup proof.
