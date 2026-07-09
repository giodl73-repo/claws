# Cloud Agent PR4: Session Runtime Binding Contract

PR: https://github.com/giodl_microsoft/m/pull/48
Branch: `user/giodl/cloud-agent-pr4-session-binding`
Base: PR3

## Goal

Persist explicit runtime binding metadata on sessions so later code can know
which runtime owns a chat.

## Code Surfaces

- Extend `common/ipc-contract.ts` with `RuntimeProviderKind` and
  `SessionRuntimeBinding`.
- Update `common/runtime-routing.ts` as binding input.
- Add `common/session-runtime-binding.ts`.
- Update session zod schema in `electron/schemas/session-schema.ts`.

## Behavioral Contract

Bindings must carry mode, provider id/kind, owner runtime, hosted agent/member,
Desktop node endpoint, policy version, routing reason, and timestamp. Legacy
sessions remain valid with no binding.

## Acceptance Tests

Cover binding creation from routing decisions, apply/clear helpers, schema
persistence, and legacy session compatibility.

## Non-Goals

No SessionManager routing, no hosted chat, no UI, and no cloud calls.
