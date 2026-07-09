# Cloud Agent PR15: Hosted Adapter Composition

PR: https://github.com/giodl_microsoft/m/pull/61
Branch: `user/giodl/cloud-agent-pr15-hosted-adapter-composition`
Base: PR14

## Goal

Compose a hosted OpenClaw chat adapter into the real app `SessionManager`
construction path behind an explicit source-harness flag.

## Code Surfaces

- Add `electron/backend/hosted-openclaw/composition.ts`.
- Add `electron/backend/hosted-openclaw/composition.test.ts`.
- Update `electron/main.ts` to pass the composed adapter into `SessionManager`.
- Extend `electron/sessions.test.ts` to prove hosted assistant completion
  through the real session event pipeline.

## Behavioral Contract

`createHostedOpenClawSessionAdapterFromEnv()` returns `null` unless
`M_HOSTED_OPENCLAW_SOURCE_HARNESS=1`. When enabled, it installs a deterministic
source-harness transport that emits hosted `message.complete` and `idle` events
through the existing hosted adapter. Default production behavior remains
unchanged.

## Acceptance Tests

Cover env gate, deterministic source-harness output, hosted adapter event
normalization, and full `SessionManager` hosted completion without primary
backend `send`.

## Non-Goals

No live hosted allocator, production hosted transport, GUI workflow, Desktop
capability gateway, or local tool execution.
