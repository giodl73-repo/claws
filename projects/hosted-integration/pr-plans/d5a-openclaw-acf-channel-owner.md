# D5a: OpenClaw ACF Channel Owner Adoption

## Outcome

Move ACF request preparation and bearer-slot selection to the Channel owner.

## Repository And Dependencies

- Repository: `openclaw/openclaw`
- Depends on: D2a
- Fork draft PR: [giodl73-repo/openclaw#63](https://github.com/giodl73-repo/openclaw/pull/63)
- Commit: `0b8f86844579e0113e01c0760aad9641489aab60`

## Change

- Define Channel-owned request and response preparation.
- Select the typed Entra OBO credential slot.
- Reuse hosted dispatch only where physical host execution is required.
- Keep the binding inactive until D5b supplies trusted Entra OBO resolution and
  managed activation.

## Proof And Exit

- Channel semantics and retries remain owner-local.
- Missing identity fails before dispatch.
- No generic Channel/provider adapter is introduced.
- Exact Bot Connector origins and the `lobster/acf-token` slot fail closed.
- Tenant, conversation, agent, and recipient identities must agree across all
  represented Activity fields.
- ACF redirects are denied before owner-prepared bytes can be replayed.
- 35 focused tests, four TypeScript lanes, plugin SDK boundary/export checks,
  focused lint/format checks, diff hygiene, and final Codex review passed.

## Status

Published as an inactive fork-only draft stacked on D2a. No matching upstream
PR exists. D5b is the next slice.
