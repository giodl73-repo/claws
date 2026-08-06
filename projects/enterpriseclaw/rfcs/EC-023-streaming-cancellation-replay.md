# RFC Scope: Streaming, Cancellation, and Replay

- ID: EC-023
- Lane: Runtime fabric and protocols
- Status: Scoped draft
- Initial posture: Fork + focused RFC
- Primary owner: Protocol/transport stream lifecycle. Semantic operation
  identity, idempotency, and terminal/effect settlement remain with the
  invoked owner.

## Scope

- Define request correlation, ordered progress, backpressure, reconnect,
  replay, deadlines, cancellation signaling, late results, and transport
  settlement without redefining semantic owner settlement.

## Current Owner Baseline

Current ACP transport source proves ordered replay, run-scoped cancellation,
stall/resume signaling, and late or incomplete transport handling.
Cancellation is signaling rather than effect reversal, reconnect is not replay
authority, and transport settlement is not semantic success.

Node invocation provides a second current implementation: ordered
progress/input, hard and idle deadlines, cancellation signaling, disconnect
cleanup, and late-result rejection are bound to invocation and connection
identity. Reverse-provider carrier work is a separate plugin connection-owner
contract and must not be treated as generic node replay authority.

## Implementation Disposition

- Reuse ACP and node invocation as owner-specific conformance sources.
- Publish transport lifecycle fixtures without creating a universal semantic
  replay layer.
- Keep replay, idempotency, and effect certainty with the invoked owner.
- Keep reverse-carrier work separately gated on a bounded plugin connection
  owner and host-bundle acceptance.

## Explicit Exclusions

- Cancellation as proof external effects stopped.
- Reconnect as automatic replay authority.

## Required Outcomes

- Duplicate, stale, and late results are fenced.
- Replay requires owner-declared idempotency.
- Disconnect preserves unknown or pending settlement.
- Reconnect or restart does not create a new semantic operation or native
  attempt unless the invoked owner authorizes replay.
- A late owner result may supersede an earlier unknown observation by
  reference; prior transport and settlement history remains immutable.
- Accepted progress and semantic settlement reconcile across reconnect or
  restart using the same operation identity; lost transport acknowledgements
  never authorize blind replay.

## Dependencies

- EC-022 and owner operation identities.

## Proof and Deletion Gate

- Disconnect and reconnect during one streamed operation.
- Receive one late owner result after an unknown disconnect and preserve both
  the earlier unknown observation and the superseding settlement.
- Delete transport acknowledgements used as semantic success.
- Disprove the separate contract if the transport has no independent
  ordering, backpressure, reconnect, or cancellation lifecycle beyond the
  invoked owner's operation.
