Closes #114782

## What Problem This Solves

External host plugins can own several independent OpenClaw contributions, but
the current manifest cannot describe those declarations as one coherent,
deployable inventory. Consumers must reconstruct the relationship from
plugin-specific runtime state or introduce a second registry, losing
manifest-first discovery and deterministic ownership validation.

## Why This Change Was Made

This adds one optional, closed `hostIntegrationBundle` declaration to
`openclaw.plugin.json`. OpenClaw validates and freezes the versioned inventory
without importing plugin runtime, rejects duplicate bundle ownership without
choosing a winner, and carries enabled declarations in the existing registry
snapshot with loader-owned provenance.

The field is deliberately inert: it adds no runtime registration API,
activation, readiness, Status, Doctor, credentials, dispatch, or hosted
execution behavior. Because this is a new plugin-manifest contract, the field
name, versioning boundary, and compatibility posture require confirmation from
the OpenClaw plugin owner before merge.

## User Impact

Ordinary installations see no behavior change and do not need a host bundle.
External plugin authors that package several host-supplied contributions can
publish one deterministic inventory that OpenClaw can inspect before runtime
activation, while every contribution's canonical owner keeps its existing
authority.

## Evidence

- `node scripts/run-vitest.mjs src/plugins/host-integration-bundle.test.ts src/plugins/loader-records.test.ts src/plugins/manifest-registry.test.ts src/plugins/manifest.json5-tolerance.test.ts` — 143 tests passed.
- `pnpm tsgo:core` — passed.
- Type-aware Oxlint on all nine changed TypeScript files — 0 warnings and 0
  errors.
- Oxfmt on all ten changed files — passed.
- `pnpm build` — passed, including all 143 public Plugin SDK subpaths.
- Focused MDX and Markdown lint, the upstream-base i18n glossary check, and
  `pnpm docs:check-links` — passed; 6,239 internal links checked with 0 broken.
- `git diff --check upstream/main...HEAD` — passed.
- `codex review --base upstream/main` — no actionable correctness defects.

## Real behavior proof

Behavior or issue addressed:
A real external Lobster host plugin declares one five-contribution host bundle,
OpenClaw discovers it without importing plugin runtime code, and the enabled
registry snapshot retains loader-owned plugin provenance.

Real environment tested:
Ubuntu 24.04 under WSL2; OpenClaw source checkout at
`dbc74b3c1d2eb3a29f68b97ff4b078d556da7f99`, rebased onto upstream `main` at
`dd248759ef565438fdcd74ec0dd5f5412bd13bb0`; Lobster external-plugin checkout
at `54d133652aa9d2d90083515c549793e3cc2d6188`; production OpenClaw manifest
discovery, loader record construction, and registry snapshot code; no network
services or credentials.

Exact steps or command run after this patch:

1. Point `OPENCLAW_SOURCE_DIR` at the refreshed OpenClaw checkout and
   `LOBSTER_HOST_PLUGIN_DIR` at Lobster's `lobster-host` plugin.
2. Run Lobster's `scripts/validation/openclaw-host-bundle-registry.mjs` through
   the hydrated OpenClaw checkout with `pnpm exec tsx`.

Evidence after fix:

```json
{"proof":"lobster-openclaw-host-bundle","lane":"manifest-discovery","bundleId":"lobster/host","contributionCount":5,"runtimeImported":false}
{"proof":"lobster-openclaw-host-bundle","lane":"registry-snapshot","pluginId":"lobster-host","origin":"workspace","bundleId":"lobster/host"}
{"proof":"lobster-openclaw-host-bundle","result":"pass","openclawHead":"dbc74b3c1d2eb3a29f68b97ff4b078d556da7f99","lobsterHead":"54d133652aa9d2d90083515c549793e3cc2d6188"}
```

Observed result after fix:
OpenClaw accepted the complete immutable bundle, preserved all five
contribution identities, imported no Lobster runtime for discovery, and
exposed exactly one enabled registration bound to the external plugin's source
and workspace origin.

What was not tested:
The five contribution implementations were not activated because this contract
is intentionally inventory-only. No credentials, network service, hosted
dispatch, readiness, Status, or Doctor behavior was exercised.
