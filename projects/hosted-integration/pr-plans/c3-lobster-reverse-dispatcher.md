# C3: Lobster Reverse Dispatcher

## Outcome

Implement `lobster/egress` as the Rust peer for the portable dispatcher and
reverse carrier contracts.

## Repository And Dependencies

- Repository: `bic/lobster`
- Depends on: C1, C2, B2, and B3

## Change

- Disable automatic redirects.
- Enforce the supplied guard profile where Lobster resolves DNS and connects.
- Materialize only declared credential slots.
- Implement bounded streams, credit, cancellation, certainty, and incarnation.
- Define startup ordering, health probes, reconnect backoff, drain, and clean
  shutdown behavior.
- Emit redacted conformance and operational evidence.

## Non-Goals

- No provider-specific URL/body/response semantics.
- No semantic retries or weaker direct-network fallback.

## Proof And Exit

- Rust passes the shared guard, credential, and carrier fixtures.
- Rebinding, private-route, overload, disconnect, and cancellation proofs pass.
- Startup time, memory, queue, and reconnect budgets are recorded.
- Capacity and failure status remain separate from workload policy decisions.
