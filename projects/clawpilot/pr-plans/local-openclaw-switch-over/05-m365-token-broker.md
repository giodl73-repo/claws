# Local OpenClaw Switch-Over PR82: M365 Delegated Actions and Token Broker Boundary

PR: [giodl_microsoft/m#82](https://github.com/giodl_microsoft/m/pull/82)
Branch: `user/giodl/local-openclaw-switch-pr82-m365-token-broker`
Base: PR81

## Objective

Prove useful M365 work can be requested by OpenClaw without exposing Graph
tokens, browser cookies, refresh tokens, or local credentials to the runtime.

## Code Surfaces

- Add delegated action contracts for draft-first M365 actions such as
  `m365.mail.createDraft`, `m365.calendar.createDraft`, and
  `m365.teams.createDraft`.
- Add token broker contract that returns scoped action results, redacted status,
  and audit ids, never raw token values.
- Add policy/scope checks for tenant, user, capability, data boundary, and
  send/write confirmation.
- Add approval cards for draft creation and separate user confirmation for send
  or external side effects.

## Acceptance Criteria

- OpenClaw cannot read Graph tokens, cookies, refresh tokens, env secrets, or
  credential material.
- M365 actions are brokered through trusted Desktop/Lobster/Graph paths and
  return bounded result objects.
- Draft-first behavior is default for write/send actions.
- Audit records user, tenant, scope, action, target, approval, and broker result
  without leaking secrets.

## Expected Validation

- Focused broker, redaction, scope, approval, and audit tests.
- Negative tests proving token values cannot appear in runtime result frames,
  logs, diagnostics, or audit payloads.
- Source-harness or live dev proof for one draft M365 action when credentials
  are available.
- `pnpm run typecheck`.
- Focused type-aware `oxlint`.
- Focused `oxfmt --check`.
- `git diff --check`.

## Non-Goals

No token pass-through, no unattended send without policy/user confirmation, and
no broad Graph API surface.
