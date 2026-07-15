# C1: Reverse Carrier Contract And Conformance

## Outcome

Publish the provider-dispatch-only stream state machine and portable fixtures.

## Repository And Dependencies

- Repository: `openclaw/openclaw`
- Depends on: B1, B2, and B3

## Change

- Define operation identity and config, owner, and bundle generations.
- Define bounded request and response chunks, credit, and half-close.
- Define advisory cancellation, terminal outcomes, and dispatch certainty.
- Define connection incarnation and no-reconnect-replay behavior.

## Non-Goals

- No generic host bus or multipurpose carrier catalog.
- No provider status, redirect, retry, credential, or body interpretation.

## Proof And Exit

- Fixtures cover accepted streams, overload, cancellation, disconnect,
  half-close, stale generation, protocol violation, and late terminal frames.
- TypeScript and Rust can consume the same canonical fixture corpus.

## Implementation Status

- Published as fork-only draft PR
  [giodl73-repo/openclaw#48](https://github.com/giodl73-repo/openclaw/pull/48).
- Branch: `user/giodl/hosted-integration-c1-reverse-carrier`
- Base: `user/giodl/hosted-integration-b6b-doctor`
- Head: `b5554acab291922eaa87523065d20bc17fb67293`
- Contract: `reverse-provider-dispatch/v1`
- The parser rejects unknown fields, malformed Base64, impossible limits,
  incomplete network guards, mismatched DNS-rebinding enforcement, and TLS
  posture that contradicts the target protocol.
- The trace evaluator enforces byte credit, sequence, half-close, cancellation,
  terminal authority, dispatch certainty, generation/incarnation fencing,
  disconnect synthesis, and no reconnect replay.
- Maximum chunk compatibility reserves the largest legal sequence-number width
  for both streams, so an advertised chunk cannot outgrow the frame limit later
  in the operation.
- Proof: 39 focused C1/B1/B2/B3 tests, focused formatting and lint, core source
  TypeScript, file-mode and diff checks.
- Final Codex review: clean, with no accepted or rejected findings.
- Fork CI: real behavior proof, workflow sanity, and admission checks passed;
  the expected fork-only `label` and `auto-response` checks failed.
