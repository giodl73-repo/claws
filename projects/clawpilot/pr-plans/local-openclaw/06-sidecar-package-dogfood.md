# Local OpenClaw PR6: Sidecar Stdio Dogfood and Package Alignment

PR: https://github.com/giodl_microsoft/m/pull/40  
Branch: `user/giodl/local-openclaw-submit-pr6-sidecar-package-dogfood`  
Base: PR5

## Goal

Align Scout's local OpenClaw dogfood path with the package/runtime metadata
needed by a future Lobster-installed sidecar.

## Code Surfaces

- Extend local runtime compatibility and discovery contracts.
- Update `electron/local-openclaw-client.ts`, discovery, lifecycle, and sidecar
  manager for package metadata.
- Update `docs/architecture/35-local-openclaw-runtime.md` and
  `docs/architecture/36-local-openclaw-dogfood.md`.
- Update Agents panel and session manager shell integration.

## Behavioral Contract

Scout can describe and validate the sidecar package source, command shape, and
runtime compatibility without assuming Scout owns installation. The dogfood path
remains explicit and diagnostics-first.

## Acceptance Tests

Cover compatibility, discovery, lifecycle, client, Agents panel, and shell
session-manager integration. Documentation must explain manual dogfood setup.

## Non-Goals

No real Lobster package invocation, no auto-install, no production updater path,
and no Desktop node capability handler.
