# Golden Journey: Durable Conversation and Delivery

## Human Story

An agent queues a message while its channel runtime is unavailable. The
operator needs to know:

- whether the message was durably accepted or merely requested;
- whether restart lost, duplicated, or changed it;
- whether a provider attempt is active;
- whether any part was accepted;
- whether retry is safe;
- whether a later receipt changed an uncertain outcome; and
- what copies remain after export or local deletion.

The operator should not need to understand queue leases, attempt generations,
receipt revisions, or copy graphs unless technical detail is required.

## Frame

```text
working channel, session, export, and durable-queue owners
+ one stable delivery relationship across restart and receipts
-> truthful recovery, replay, and retained-copy actions
```

The delivery relationship contributes stable operation correlation. Channel
owners retain rendering, native attempts, provider receipts, replay safety,
and external-copy semantics. Session continuity retains transcript/export
semantics. Lifecycle owners retain deletion obligations.

Disprove the relationship if current owners already preserve stable operation,
attempt, receipt-revision, route, and copy identity across restart without
generic success, blind replay, or retained-copy inference.

## V1 Boundary

V1 proves:

- durable acceptance before the product says `queued`;
- one stable delivery operation across restart;
- a frozen normalized target and route resolution;
- at most one active fenced native attempt;
- distinct attempt identities for authorized replay;
- unknown effect blocking blind replay;
- owner reconciliation before retry when idempotency is unavailable;
- late provider receipt superseding uncertainty without rewriting history;
- multipart partial effect with accepted parts preserved;
- incompatible required queue semantics failing before dispatch;
- export identity bound to one transcript generation; and
- local deletion reporting retained export and provider copies.

V1 does not claim:

- universal external exactly-once delivery;
- delivered or read receipts for every provider;
- one mandatory durable queue for every channel;
- automatic deletion of provider-native or exported copies;
- replay safety inferred from reconnect or restart; or
- one universal conversation, transcript, delivery, or copy object.

## Operator Experience

### Durably Queued

```text
Message queued

To: Jordan Lee via WhatsApp - Work account
The message is safely queued and will resume when the account is available.

[Cancel]  [View details]
```

The product uses `queued` only after durable acceptance. If persistence or the
acceptance reply is uncertain, it instead shows:

```text
Needs attention

OpenClaw could not prove whether this message was queued.
Check the operation record before submitting it again.

[Reconcile queue]  [View details]
```

### Recovered After Restart

```text
Message queued

The message is still queued after restart.
No second delivery operation was created.

[Cancel]  [View details]
```

Restart preserves the operation and frozen target. A changed current route
does not retarget already accepted delivery.

### Outcome Unknown

```text
Needs attention

The provider may have received this message.
Sending it again could create a duplicate.

[Reconcile]  [View receipts]  [View details]
```

Retry is absent until the channel owner proves replay safe or reconciliation
proves that no effect occurred.

### Partial Delivery

```text
Needs attention

Part 1 of 2 was accepted by the provider.
The accepted part will not be sent again.

[Reconcile remaining part]  [View receipts]  [View details]
```

A batch-level retry is not offered. Replay scope is per unsettled part under
the channel owner's semantics.

### Late Receipt

```text
Message sent

The provider later confirmed acceptance.
The earlier uncertain result remains in the history.

[View conversation]  [View receipts]  [View details]
```

The late receipt creates a newer settlement revision. It does not erase the
timeout or create a second attempt.

### Local Delete with Retained Copies

```text
Deleted locally; other copies remain

Local session: deleted
Export copies: 1 retained
Provider copies: 1 retained

[Review copies]  [Request provider deletion]  [View details]
```

Delete never implies purge of independently owned copies.

## Product States

| State | Human meaning | Available action |
| --- | --- | --- |
| Planned | No durable acceptance | Queue or cancel |
| Waiting to send | Durably accepted, no active attempt | Cancel or inspect |
| Sending | One fenced native attempt is active | Inspect or request cancellation |
| Sent | Provider acceptance is proven | View conversation/receipts |
| Not sent | Owner proved no effect or blocked before dispatch | Retry only when authorized |
| Needs attention | Acceptance/effect is unknown or partial | Reconcile; do not blindly replay |
| Deleted locally; copies remain | Local source is gone but independent copies remain | Review or request owner deletion |

These are product projections, not one universal owner state machine.

## Contract Composition

| Step | Human/product behavior | Contract owner |
| --- | --- | --- |
| 1. Resolve | Freeze provider conversation, target, account, and route provenance | EC-015 |
| 2. Prepare | Bind transcript, render, route, capability, and payload generations | EC-015/016/017 |
| 3. Accept | Persist operation and queue identity before acknowledging `queued` | EC-016 |
| 4. Recover | Restore the same operation after restart | EC-016 |
| 5. Claim | Fence one active native attempt with a claim/lease generation | EC-016 owner-local mechanics |
| 6. Dispatch | Send only unsettled parts using the frozen target | EC-016 |
| 7. Transport | Preserve timeout, disconnect, cancellation, and late results | EC-023 |
| 8. Settle | Record provider acceptance, no effect, partial effect, or unknown | EC-016 |
| 9. Reconcile | Determine replay posture using owner-native provider knowledge | EC-016/023 |
| 10. Export | Produce a generation-bound export copy separately from delivery | EC-017 |
| 11. Delete | Settle local, export, and provider copies independently | EC-017/030 |
| 12. Present | Project the next safe human action without inventing certainty | EC-001 |
| 13. Evidence | Preserve operation, attempt, receipt, supersession, and copy facts | EC-033 |

## Corrected Invariants

- `requested != durably accepted`;
- `queued != dispatching`;
- `restart != replay authority`;
- `one operation != one native attempt`;
- `at most one active attempt != external exactly once`;
- `timeout != not effected`;
- `unknown can be superseded by later owner proof, but history is immutable`;
- `partial effect requires per-part settlement and replay scope`;
- `current route change != permission to retarget accepted delivery`;
- `export produced != export delivered`;
- `local delete != provider/export deletion`; and
- `provider accepted != delivered or read`.

## Evidence and Fixtures

The dependency-free simulation lives at:

`C:\src\openclaw-protected-effect-sim\experiments\durable-delivery-simulation`

It uses Node.js built-ins only and performs no provider or network I/O.

The fixtures cover:

1. durable acceptance, restart, and provider acceptance;
2. unknown effect, reconciliation, and authorized retry;
3. blind-replay rejection;
4. concurrent/stale attempt fencing;
5. late receipt superseding unknown;
6. multipart partial effect;
7. local deletion with retained provider/export copies;
8. incompatible required queue semantics;
9. uncertain queue acceptance; and
10. route change after queue acceptance.

## Deletion and Migration Targets

Successful adoption should delete:

- `queued` projections emitted before durable acceptance;
- new delivery identities created merely because a runtime restarted;
- retry paths that treat disconnect as proof of no effect;
- whole-batch replay after any part was accepted;
- mutation of old settlement history when a late receipt arrives;
- dispatch-time re-resolution that retargets an accepted operation;
- export delivery conflated with export production; and
- local-delete success that omits retained external copies.

