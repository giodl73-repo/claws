# Local OpenClaw PR3: Policy and Session Foundation

PR: https://github.com/giodl_microsoft/m/pull/37
Branch: `user/giodl/local-openclaw-submit-pr3-policy-session-foundation`
Base: PR2

## Goal

Create the shared policy/session substrate needed to bind chats to explicit
runtime providers and later execute Desktop node capabilities safely.

## Code Surfaces

- Add `common/runtime-provider-eligibility.ts`.
- Add `common/session-runtime-binding.ts`.
- Extend `common/ipc-contract.ts` with runtime binding fields.
- Persist runtime binding through `electron/schemas/session-schema.ts` and
  `electron/session-store.ts`.
- Add `electron/desktop-node-capability-bridge.ts` as a no-execute bridge
  contract.
- Update `docs/architecture/35-local-openclaw-runtime.md`.

## Behavioral Contract

Sessions can carry explicit runtime binding metadata without changing legacy
sessions. Runtime eligibility must be pure and deterministic. Desktop node
capability bridge remains declarative and fail-closed.

## Acceptance Tests

Add pure tests for runtime eligibility, session binding creation/clearing,
schema persistence, session-store round-trip, and bridge validation.

## Non-Goals

No local OpenClaw process, transport, chat routing, capability handlers, or user
approval UI.
