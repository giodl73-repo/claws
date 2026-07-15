# D4d: Lobster Direct Anthropic Adoption

## Status

- Published as fork-only draft PR
  [giodl/lobster#10](https://microsoft.ghe.com/giodl/lobster/pull/10).
- Branch: `user/giodl/hosted-integration-d4d-anthropic-adoption`
- Commit: `96d9b358da2c9ccf58301c6ebdd019f85dbe591e`

## Outcome

Implement the Anthropic key resolver and adopt hosted physical dispatch.

## Repository And Dependencies

- Repository: `bic/lobster`
- Depends on: D4c and D2b

## Change

- Materialize only the declared Anthropic key.
- Add inactive deployment, canary authority, rollback, and telemetry.

## Proof And Exit

- Origin, redaction, streaming, and certainty fixtures pass.
- 49 `lobster-host-provider` tests and the targeted runtime key-source test pass.
- Strict Clippy, formatting, diff hygiene, and final Codex review are clean.
- No provider semantics exist in the Rust dispatcher.
- Old-path retirement remains a later deletion PR.
