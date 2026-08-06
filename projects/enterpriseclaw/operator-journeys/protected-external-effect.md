# Golden Journey: Protected External Effect

## Human Story

An agent proposes sending an outbound message to an external recipient. The
operator needs to understand:

- what will be sent;
- where it will be sent;
- why the agent wants to send it;
- which identity/account will be used;
- whether anything changed after approval;
- whether the provider actually accepted the message; and
- what action is safe when the outcome is uncertain.

The operator should not need to understand owner IDs, generations, operation
envelopes, or evidence schemas to make the decision.

## V1 Boundary

The representative action is one channel-owned outbound message. It may map to
email, WhatsApp, Telegram, Discord, or another channel profile when that owner
can provide the required semantics.

V1 proves:

- exact target and content review;
- allow, deny, or edit;
- edit creates new intent and requires a new decision;
- credential/runtime and approval binding before dispatch;
- provider acceptance as the successful effect boundary;
- stale approval blocked before dispatch;
- timeout after dispatch as `effect_unknown`;
- reconciliation before replay when safe idempotency is unavailable; and
- a durable, redacted evidence reference available in technical details.

V1 does not claim:

- universal delivered/read certainty;
- one idempotency mechanism for every provider;
- one mandatory durable queue for every channel;
- automatic proof that a remote effect stopped after cancellation; or
- cryptographic attestation beyond the current EC-033 evidence baseline.

## Operator Experience

### Review

```text
Approval needed

Send a message to Jordan Lee
Channel: WhatsApp - Work account
Agent: Customer follow-up

Message
"Your replacement has shipped. Tracking: 1234."

Why
The customer asked for a shipping update.

[Deny]  [Edit]  [Send]

Technical details
```

The primary card uses human names and complete decision-relevant content. It
must not hide a dangerous target, attachment, command, URL, or message suffix
behind truncation.

Technical details may show stable account/recipient references, risk class,
policy and approval revision, operation ID, expiry, and redacted credential
binding. They are not the primary decision language.

### Sent

```text
Message sent

Jordan Lee via WhatsApp - Work account
Provider accepted the message at 10:42:17.

[View conversation]  [View details]
```

Provider acceptance is stated precisely. The UI must not claim delivered or
read unless the provider owner supplies those later receipts.

### Changed After Approval

```text
Message not sent

The recipient, message, attachment, account, or governing rule changed after
approval. Review the updated message before sending.

[Review changes]  [Dismiss]
```

The old decision cannot authorize changed intent. No external dispatch occurs.

### Outcome Unknown

```text
Needs attention

The provider may have received this message, but OpenClaw did not receive a
final response. Sending it again could create a duplicate.

[Check provider]  [Reconcile]  [View details]
```

`Retry` is not offered until the channel owner declares replay safe or
reconciliation proves that no provider effect occurred.

## Product State

The product projection uses five human states:

| State | Human meaning | Available action |
| --- | --- | --- |
| Approval needed | No dispatch has occurred | Deny, edit, approve |
| Sending | The accepted operation is in progress | Inspect or request cancellation |
| Sent | Provider acceptance is proven | View conversation/details |
| Not sent | Dispatch was blocked or owner proved no effect | Review, fix, or retry when safe |
| Needs attention | Effect may have occurred and certainty is unavailable | Reconcile; do not blindly retry |

These are presentation states, not a universal owner state machine. Technical
details retain the distinct approval, invocation, delivery, transport, and
effect-owner settlements.

## Contract Composition

| Step | Human/product behavior | Contract owner |
| --- | --- | --- |
| 1. Describe | The action is available and identifies required approval/effect behavior | EC-013 capability surface |
| 2. Prepare | Resolve recipient/account and normalize exact content/attachments | Channel/tool owner with EC-015 identity where applicable |
| 3. Classify | Determine risk and required authority against named generations | EC-004 and EC-014 |
| 4. Review | Present complete decision-relevant intent; allow, deny, or edit | EC-004 approval owner |
| 5. Rebind edit | Editing creates a new intent digest and new review | EC-004 |
| 6. Prepare dispatch | Bind credential/runtime owner and operation/attempt without persisting secrets | EC-003 |
| 7. Revalidate | Confirm target, intent, credential, policy, approval, route, and capability generations | EC-003/004/013/014 |
| 8. Invoke | Create one delivery/effect operation and one native attempt | EC-014 and EC-016 |
| 9. Transport | Preserve deadline, cancellation signal, disconnect, and replay posture | EC-023 |
| 10. Settle | Effect owner reports accepted, not effected, partial, or unknown | EC-014 and EC-016 |
| 11. Evidence | Emit redacted durable correlation and owner result | EC-033 |
| 12. Present | Show sent, not sent, or needs attention without inventing certainty | EC-001 projection |

No step transfers channel retry, receipt, credential, policy, or external-effect
ownership into a central workflow service.

## Identity and Generation Binding

The accepted operation binds:

- stable operation and attempt IDs;
- normalized intent digest;
- exact recipient and account owner references;
- message and attachment digests;
- capability/surface generation;
- credential/profile and runtime owner generation;
- risk-classifier generation;
- policy and approval decision references/generations;
- route/render generation where applicable;
- replay declaration and idempotency scope where supported; and
- requested, accepted, dispatched, observed, and settled chronology.

The recipient, account, message, attachments, and any URLs or file references
are resolved once into the normalized intent. The same resolved values are
used for risk classification, policy, approval display, dispatch, evidence,
and saved-decision lookup. No layer may approve a display value and execute a
different raw, aliased, rerouted, or re-resolved target.

Changing target, content, attachment, account, capability, credential owner,
risk, policy, or approval constraints before dispatch blocks the old operation
or requires a new decision. Ordinary same-principal token refresh may remain
valid when the credential owner proves continuity.

Cancellation or expiry while approval is pending closes the prompt without
recording a fake human denial or approval. Cancellation after dispatch remains
a control request and does not change effect certainty without owner proof.

## Settlement Rules

| Owner result | Product projection | Replay posture |
| --- | --- | --- |
| Rejected or stale before dispatch | Not sent | New intent/decision required |
| Failed before any provider effect | Not sent | Retry only under owner policy |
| Provider accepted | Sent | Do not duplicate; await optional later receipts |
| Partial provider effect | Needs attention | Preserve accepted provider IDs; reconcile remaining parts |
| Timeout/disconnect after dispatch | Needs attention | Reconcile before replay unless owner proves replay-safe idempotency |
| Cancellation requested after dispatch | Sending or needs attention | Never claim remote stop without owner proof |

## Evidence Projection

The ordinary operator sees the human result. Technical details may expose:

```text
Operation: op-message-1042
Approval: approved, decision 8f0e...
Dispatch: attempt 1
Effect: unknown
Replay: reconcile before replay
Evidence: evidence://effects/op-message-1042
```

Evidence contains references and digests, not reusable credentials or
unredacted sensitive content. Telemetry spans may correlate to the operation
but do not replace effect-owner settlement or durable evidence.

Durable evidence publication is outside the Gateway hot path. Protected
dispatch requires the bounded authority and operation binding, but a slow
evidence exporter must not block the event loop or convert an owner-settled
effect into a false failure.

## Fixtures

The contract-shaped fixtures live under:

`../evidence-base/fixtures/protected-external-effect/`

They cover:

1. provider-accepted send;
2. stale approval blocked before dispatch;
3. changed credential generation blocked before dispatch;
4. missing required generation blocked fail-closed;
5. timeout after dispatch with effect unknown and replay withheld.

These fixtures specify target semantics. A dependency-free fork simulation now
executes them at
`C:\src\openclaw-protected-effect-sim\experiments\protected-effect-simulation`.
It does not claim that the current OpenClaw message path emits the complete
envelope.

## Current Evidence and Remaining Slice

Current audited source already proves:

- canonical, expiry-aware approval resolution and fail-closed malformed
  verdicts;
- resolved credential/runtime binding and stale-owner fencing;
- pre-dispatch policy gating and owner-specific message idempotency;
- explicit blocked and unknown audit outcomes;
- durable outbound recovery and provider receipt handling; and
- unknown socket timeout without blind replay.

The fork-only simulation now carries the approval decision reference,
normalized intent digest, non-secret credential/runtime binding, effect
operation ID, native attempt, synthetic provider receipt or unknown
settlement, and redacted evidence through a fake provider/effect owner.
It also fails closed when a required generation is absent and treats attachment
order as part of the approved intent.

This simulation slice is closed. Per operator direction, it remains standalone
and will not be integrated into OpenClaw merely to make the proof look more
realistic. A live send or upstream integration requires separate explicit
authorization.

## Deletion and Disproof

Successful adoption should delete:

- approval decisions discarded before invocation;
- execution-time lookup of an ambient current credential;
- generic tool success projected as message delivery;
- blind retry after an ambiguous provider timeout; and
- log reconstruction needed to correlate approval, dispatch, and provider
  result.

Disprove this composition if an existing owner-native message operation already
provides the complete correlation, restart/replay behavior, truthful effect
settlement, and human projection without a cross-owner relationship.
