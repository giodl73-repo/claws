# RFC Scope: Delivery Settlement

- ID: EC-016
- Lane: Conversations, channels, and delivery
- Status: Scoped draft
- Initial posture: Fork + focused RFC
- Primary owner: Channel delivery owner

## Scope

- Define render generation, delivery attempts, retries, provider acceptance,
  delivery/read receipts, failure, and unknown settlement.
- Define a durable delivery-attempt identity and channel-declared idempotency
  key that survive restart.

## Explicit Exclusions

- Send acceptance as universal delivery proof.
- One durable queue for every channel.
- Redefining EC-023 transport-level reconnect, replay, and unknown settlement.

## Required Outcomes

- Retry and deduplication follow channel semantics.
- Redelivery reuses the owner-declared idempotency key; no universal key is
  imposed across channels.
- Restart preserves pending delivery identity.
- Rendering and locale generations are attributable.
- Pending/unknown settlement and replay authority are consumed from EC-023;
  this contract adds channel-native receipt semantics.

## Dependencies

- EC-015 and EC-023.

## Proof and Deletion Gate

- Recover one ambiguous send after restart.
- Delete channel-agnostic success projection.
- Disprove the separate contract if current channel owners already expose
  durable delivery-attempt identity, restart-safe replay, and receipt/unknown
  settlement without a channel-agnostic success projection.
