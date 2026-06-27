# Local OpenClaw PR12: Lobster Package Adapter Dogfood Setup

PR: https://github.com/giodl_microsoft/m/pull/58  
Branch: `user/giodl/local-openclaw-submit-pr12-lobster-package-adapter`  
Base: PR11

## Goal

Add a Scout-owned stdio adapter and documentation that let the Local OpenClaw
dogfood harness talk to a Lobster/Gateway package path.

## Code Surfaces

- Add `scripts/local-openclaw-lobster-stdio-adapter.mjs`.
- Add `scripts/local-openclaw-lobster-stdio-adapter.test.cjs`.
- Update `docs/architecture/36-local-openclaw-dogfood.md`.

## Behavioral Contract

The adapter must expose the same stdio contract Scout's dogfood harness expects
while bridging to the Lobster Gateway websocket. It must handle ready, send,
status/event forwarding, and startup retry/pairing windows in a deterministic
way for dev validation.

## Acceptance Tests

Use `node:test` for fake Gateway behavior, `pnpm run test:scripts`, typecheck,
format, and diff checks. Live Lobster proof is a separate validation layer when
runtime credentials and Docker environment are available.

## Non-Goals

No bundled production Lobster package install, no credential provisioning, and
no guarantee of live LLM completion without local runtime keys/proxy.
