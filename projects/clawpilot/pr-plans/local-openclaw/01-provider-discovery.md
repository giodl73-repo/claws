# Local OpenClaw PR1: Provider and Discovery Contracts

PR: https://github.com/giodl_microsoft/m/pull/35  
Branch: `user/giodl/local-openclaw-submit-pr1-provider-discovery`  
Base: `user/giodl/scout-cloud-brain-architecture`  
Status: Open

## Goal

Introduce Local OpenClaw as a hidden, feature-gated runtime provider in Scout's
capability model without launching a sidecar or routing chat.

## Code Surfaces

- Extend `common/ipc-contract.ts` with local OpenClaw provider status,
  discovery source, artifact/installation state, and capability metadata.
- Add defaults in `common/default-settings.ts` and persisted settings in
  `electron/settings-store.ts`.
- Add read-only discovery in `electron/local-openclaw-discovery.ts`.
- Surface provider status through `electron/ipc/backend-ipc.ts`.
- Update Copilot/Gateway conformance snapshots and lightweight UI fixtures.

## Behavioral Contract

When the feature flag is off, all existing backend capability responses remain
unchanged. When enabled, the app reports a diagnostic local OpenClaw provider
status derived from read-only discovery. Discovery must not launch, install, or
execute anything.

## Acceptance Tests

Add IPC contract, backend conformance, backend IPC, discovery, settings, and
fixture tests proving disabled defaults, enabled diagnostic status, schema
stability, and no behavior change for normal Copilot/Gateway flows.

## Non-Goals

No sidecar launch, chat routing, local execution, UI control surface, or Lobster
package integration.
