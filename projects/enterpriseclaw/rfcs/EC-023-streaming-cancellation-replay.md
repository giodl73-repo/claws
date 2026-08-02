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

## Explicit Exclusions

- Cancellation as proof external effects stopped.
- Reconnect as automatic replay authority.

## Required Outcomes

- Duplicate, stale, and late results are fenced.
- Replay requires owner-declared idempotency.
- Disconnect preserves unknown or pending settlement.
- Accepted progress and semantic settlement reconcile across reconnect or
  restart using the same operation identity; lost transport acknowledgements
  never authorize blind replay.

## Dependencies

- EC-022 and owner operation identities.

## Proof and Deletion Gate

- Disconnect and reconnect during one streamed operation.
- Delete transport acknowledgements used as semantic success.
- Disprove the separate contract if the transport has no independent
  ordering, backpressure, reconnect, or cancellation lifecycle beyond the
  invoked owner's operation.
