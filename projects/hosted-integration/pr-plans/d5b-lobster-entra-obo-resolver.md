# D5b: Lobster Entra OBO Resolver

## Outcome

Implement the origin- and audience-scoped Entra OBO resolver for ACF.

## Status

Published as fork-only draft PR
[giodl/lobster#11](https://microsoft.ghe.com/giodl/lobster/pull/11),
stacked on D2b PR 6 at commit `681a394bf7`.

## Repository And Dependencies

- Repository: `bic/lobster`
- Depends on: D5a and D2b

## Change

- Acquire and materialize the declared bearer value.
- Bind audit context to trusted runtime and tenant identity.
- Reuse the shared dispatcher without Channel semantics.
- Keep tenant/user identity off `reverse-provider-dispatch/v1`; capture it from
  the validated `SessionBinding` when preparing the per-session resolver.
- Keep process-bootstrap activation out of D5b. The later carrier lifecycle
  owns constructing the prepared dispatcher after trusted session binding.

## Proof And Exit

- Audience, expiry, origin, redaction, and identity-missing cases pass.
- Revocation and fleet disable fail closed.

## Proof

- 46 `lobster-host-provider` tests pass.
- Focused hosted ACF resolver and existing WIF ACF source tests pass.
- Strict Clippy passes for `lobster-host-provider` and `lobster-runtime`.
- Rust formatting, JSON parsing, and `git diff --check` pass.
- Final Codex review has no accepted/actionable findings.
- No matching PR exists in `bic/lobster`; the fork draft has no attached
  checks yet.
