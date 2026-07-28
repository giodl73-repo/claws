# Lobster Reverse-Carrier Conformance Review

## Thesis And Deletion Target

OpenClaw's `reverse-provider-dispatch/v1` contract is portable only if a second
language can consume the exact corpus and reach the same outcomes. This slice
deletes the need to trust a TypeScript-only state-machine claim. It does not
attempt to prove a live carrier.

## Source Audit

- Canonical contract: OpenClaw fork PR 179, commit `b155d1797f3`.
- Lobster base: inert host-contribution plugin PR 29, commit `4c3a78987b`.
- Prior Lobster C3 code already contained an inactive Rust peer and an older
  fixture copy. The adopter updates only that dormant contract surface.
- The modern wire uses `timeoutMs`; OpenClaw materializes credentials before
  dispatch, so credential-slot references and Lobster-side materialization no
  longer belong on the carrier.

## Evidence Slice

Lobster fork draft PR 53 (`dd8b3e1e24`) vendors the exact PR 179 fixture bytes,
pins SHA-256 `4aeb54ae0c6261267acfb0a6d19df0e8a6ddc67b1a80b7119f711dfa2f2f7d1b`,
and evaluates all 16 fixture cases through Rust: accepted streaming,
pre-dispatch overload, advisory cancellation, disconnect certainty,
post-half-close rejection, owner-generation fencing, binding fencing,
response-before-dispatch rejection, and late-terminal ignoring.

Review also exposed and fixed production mismatches for stale binding authority,
GET/HEAD request bodies, zero-length chunks, and cumulative response credit.
Verification passed 18 focused tests, deny-warnings Clippy, diff hygiene, and
final Codex review with no actionable findings. The broader workspace test was
blocked only by an unavailable private Cargo registry token.

## Boundary

The PR is stacked directly on Lobster PR 29. It changes
no socket, endpoint, retry/replay loop, plugin manifest, deployment, runtime
registration, or activation authority. No ADO pipeline was manually queued.

## Next Proof

Do not build the live reverse session yet. The next bounded package should be
chosen from the remaining independently useful hosted-integration contracts;
carrier endpoint and reconnect behavior remain a later, explicit decision.
