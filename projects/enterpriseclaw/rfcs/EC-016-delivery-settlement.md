# RFC Scope: Delivery Settlement

- ID: EC-016
- Lane: Conversations, channels, and delivery
- Status: Scoped draft
- Initial posture: Fork + focused RFC
- Primary owner: Channel delivery owner

## Scope

- Define the relationship among reply payloads, render generations, durable
  delivery operations, native send attempts, retries, provider acceptance,
  delivery/read receipts, partial effects, failure, suppression, and unknown
  settlement.

## Current Owner Baseline

- Shared reply core owns the semantic reply payload or batch.
- Durable outbound handling may own a persisted queue intent and restart
  recovery.
- Channel plugins own native rendering, send attempts, retry classification,
  provider API use, and receipt interpretation.
- The provider or channel effect owner is authoritative for provider
  acceptance, delivery, read, and externally uncertain outcomes.
- Shared final-visible-delivery accounting is a projection over channel
  results. It is not provider delivery truth.

Current source already distinguishes:

- durable `best_effort` from explicitly required unknown-send
  reconciliation;
- sent, suppressed, failed, and partial-failed results;
- persisted outbound queue intent from provider message receipt;
- multipart provider message IDs, thread/reply targets, and send time;
- retryable pre-acceptance failures from unknown socket timeouts; and
- provider-visible partial effects from failures before any visible send.

No single cross-channel durable native-attempt identity was found.

The shared durable final-delivery path also checks required channel
capabilities, carries a durable queue-intent identity, preserves suppression
and partial-failure visibility, and projects provider receipt fields without
claiming delivery/read truth. The residual target is a common operation and
fenced native-attempt relationship proven across unlike channels, not a second
queue or generic retry engine.

## Contract Objects

| Object | Owner | Identity/lifetime |
| --- | --- | --- |
| Reply payload/batch | Reply core | Semantic response before channel rendering |
| Render generation | Channel renderer | Capability, locale, formatting, and payload generation used |
| Delivery operation | Durable delivery relationship | Stable desired delivery identity surviving retry/restart |
| Queue intent | Durable outbound owner | Persisted handoff identity and queue policy when queued |
| Attempt claim/fence | Durable/channel owner | At most one active native attempt plus worker/lease generation; not a universal lease service |
| Native send attempt | Channel transport | Distinct identity for one provider API attempt |
| Replay declaration | Channel owner | `replay_safe`, `reconcile_before_replay`, or `no_replay` with scope/expiry |
| Reconciliation operation | Channel/effect owner | Owner-native lookup or comparison that can prove accepted, not effected, partial, or still unknown |
| Provider receipt | Channel/provider | Native message IDs, parts, thread/reply correlation, and provider chronology |
| Delivery settlement revision | Channel/effect owner | Immutable known, partial, suppressed, failed, or unknown result; later owner proof may supersede by reference |
| Visible-delivery projection | Shared messaging core | Non-authoritative summary over owner results |

An idempotency key is required only when the channel declares replay-safe
idempotency. Channels that cannot prove safe replay must reconcile first or
retain an unknown/no-replay result.

## State Model

```text
planned
  -> capability_checked
  -> queued | dispatching | suppressed | unsupported

dispatching
  -> provider_accepted
  -> failed_before_effect
  -> partial_effect
  -> unknown_effect

provider_accepted
  -> delivered | read | failed_after_acceptance | externally_retained
```

Not every provider exposes every later state. `provider_accepted` must not be
projected as delivered or read. Timeout, disconnect, cancellation, and
transport settlement under EC-023 do not prove whether a provider effect
occurred. A late owner receipt may supersede an earlier unknown settlement,
but the unknown observation remains in history.

## Explicit Exclusions

- Send acceptance as universal delivery proof.
- One durable queue for every channel.
- Redefining EC-023 transport-level reconnect, replay, and unknown settlement.
- A mandatory universal provider idempotency key.
- Treating drafts, previews, reactions, composing state, or transcript
  mirroring as canonical delivery settlement.

## Required Outcomes

- Retry and deduplication follow channel semantics.
- The product reports `queued` only after durable acceptance. Request receipt,
  in-memory enqueue, or an unproven acceptance reply is not durable queue
  settlement.
- Restart preserves the delivery operation and queue-intent identity.
- Restart does not create replay authority or a new delivery operation.
- At most one native attempt claim is active for an operation. Stale workers
  and stale claim/lease generations cannot dispatch.
- Retries retain the delivery operation while assigning distinct native
  attempt identities.
- Replay occurs only under the channel's declared replay policy. Unknown
  timeout or an accepted/partial receipt never authorizes blind replay.
- Rendering, locale, capability, payload, and route generations used for the
  native attempt are attributable.
- Multipart and partial delivery preserve the provider IDs and parts already
  accepted before failure.
- Multipart replay scope is per unsettled part. An accepted part is never
  replayed by a whole-operation retry.
- The normalized provider target, conversation reference, render generation,
  and route generation accepted by the operation remain frozen across restart.
  A later route change cannot retarget it.
- Suppressed and unsupported are explicit non-send outcomes, not successful
  deliveries.
- Provider acceptance, delivered, read, failed-after-acceptance, and unknown
  remain separate when the channel can observe them.
- Pending/unknown settlement and replay authority are consumed from EC-023;
  this contract adds the channel-native effect and receipt semantics that
  transport cannot infer.
- Shared visible-delivery projections preserve partial and unknown outcomes
  rather than flattening counts or signals into generic success.
- Settlement revisions are immutable. Reconciliation or a late receipt may
  supersede an earlier unknown result by reference without rewriting history.
- Portable conformance promises stable operation identity, fenced attempts,
  and owner-governed replay. External exactly-once delivery is claimed only
  when the channel owner proves provider idempotency or equivalent
  reconciliation.

## Compatibility and Operations

- Channels may support best-effort delivery without durable reconciliation.
  Requiring unknown-send reconciliation is an explicit capability/profile.
- Older channels may return provider IDs without delivered/read states.
- Mixed versions preserve known provider receipts and degrade unsupported
  fields explicitly.
- Queue drain is bounded per channel/account and cannot block unrelated
  channel runtimes.
- Durable persistence, reconciliation, and evidence publication remain off
  unrelated Gateway hot paths.
- Account unavailability, malformed receipt, removed plugin, and incompatible
  queue entry settle as retryable, blocked, unsupported, or unknown according
  to channel authority; they do not become sent.

## Dependencies

- EC-015 and EC-023.

## Proof and Deletion Gate

- Recover one durably accepted pre-dispatch operation after restart without
  creating a second operation or concurrent attempt. External exactly-once is
  not implied.
- Lose or withhold the durable acceptance acknowledgement and prove the
  product does not report `queued` until authoritative lookup resolves it.
- Exercise one unknown socket timeout and prove no blind replay.
- Reconcile one unknown attempt as not effected, then retry under the same
  operation with a new fenced attempt.
- Accept one late provider receipt and supersede unknown settlement without
  deleting the earlier observation or creating a new attempt.
- Exercise one provider-accepted partial delivery and preserve accepted
  provider IDs while reporting partial effect and forbidding whole-batch
  replay.
- Change the current route after durable acceptance and prove restart still
  dispatches to the frozen accepted target.
- Compare a channel with replay-safe idempotency to one requiring
  reconciliation or no replay.
- Delete channel-agnostic success projection and any retry path that treats
  transport failure alone as proof that no external effect occurred.
- Disprove the separate contract if current channel owners already expose
  durable delivery-attempt identity, restart-safe replay, and receipt/unknown
  settlement without a channel-agnostic success projection.
