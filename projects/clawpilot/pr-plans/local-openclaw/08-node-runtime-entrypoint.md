# Local OpenClaw PR8: Node-Mode Runtime Entrypoint

PR: https://github.com/giodl_microsoft/m/pull/42  
Branch: `user/giodl/local-openclaw-submit-pr8-node-runtime-entrypoint`  
Base: PR7

## Goal

Wire a runtime entrypoint that allows local OpenClaw sidecar traffic to request
Desktop node capabilities through the policy/executor framework.

## Code Surfaces

- Add `electron/local-openclaw-node-capability-entrypoint.ts`.
- Update lifecycle and stdio transport to pass node capability requests.
- Extend `electron/main.ts` and `electron/sessions.ts` with entrypoint
  composition.
- Extend evals and IPC contract where needed.

## Behavioral Contract

Requests from local OpenClaw must go through the same policy/executor path and
must return structured results/errors. If no handler is registered, the request
must produce a fail-closed result rather than throwing or hanging.

## Acceptance Tests

Cover entrypoint request/response handling, lifecycle/transport integration,
eval scenarios, and no-regression session behavior.

## Non-Goals

No concrete filesystem/shell handlers, no cloud-hosted request gateway, and no
production package install.
