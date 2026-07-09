# Cloud Agent PR14: Hosted Runtime Dispatch Seam

PR: https://github.com/giodl_microsoft/m/pull/60
Branch: `user/giodl/cloud-agent-pr14-hosted-dispatch-seam`
Base: PR13

## Goal

Teach `SessionManager` to route send/subscribe/abort/cancel operations based
on persisted hosted runtime binding.

## Code Surfaces

- Add `electron/backend/hosted-openclaw/session-dispatch.ts`.
- Add `electron/backend/hosted-openclaw/session-dispatch.test.ts`.
- Update `electron/sessions.ts`.
- Extend hosted tests in `electron/sessions.test.ts`.

## Behavioral Contract

Non-hosted sessions use the primary backend. Hosted-bound sessions use the
injected hosted adapter when present. Hosted-bound sessions with no adapter fail
closed and must not fall back to local Copilot execution.

## Acceptance Tests

Cover dispatcher routing, hosted detection, fail-closed behavior, and real
`SessionManager` send/subscribe/abort integration using mocked persisted hosted
session metadata.

## Non-Goals

No app composition, hosted allocator, live hosted service, GUI entry point, or
Desktop capability gateway.
