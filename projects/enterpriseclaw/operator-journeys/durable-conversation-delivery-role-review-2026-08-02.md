# Durable Conversation and Delivery Role Review - 2026-08-02

## Review Set

- Runtime owner: `gateway-eng`.
- Daily operator: `power-user`.
- Security/evidence: `ciso`.
- Skeptical maintainer: `lorant-reviewer`.
- Simplicity/ecosystem: `founder`.

## Findings

### 1. External exactly-once must not be promised

**Blocking correction.** A persisted queue and one active worker claim can
prevent local duplicate attempts, but they cannot prove a provider applied an
effect exactly once. The contract must promise one stable operation, fenced
attempts, and owner-governed replay. External exactly-once is optional evidence
from provider idempotency or reconciliation.

Applied to EC-016 and the journey.

### 2. `Queued` requires durable acceptance

**Blocking correction.** The product cannot display `queued` merely because a
caller submitted work or an in-memory queue accepted it. Durable acceptance
must precede acknowledgement. A lost or unproven acceptance reply produces an
attention state and authoritative lookup/reconciliation action.

Applied to EC-016 and the simulation.

### 3. Attempt fencing is owner-local, not a new control-plane service

The delivery owner needs at most one active attempt claim for an operation.
The claim carries a generation/incarnation so stale workers cannot dispatch
after restart. This does not justify a universal lease service or transfer
channel retry ownership.

Applied to EC-016. No new RFC scope was added.

### 4. Late receipts refine certainty without rewriting history

An unknown timeout can later receive a provider acceptance receipt. The newer
settlement supersedes the prior uncertainty by reference. The timeout remains
in evidence; it is not mutated into success.

Applied to EC-016, EC-023, and EC-033 usage.

### 5. Multipart replay scope must be per part

A single operation-level `retry` flag is unsafe after partial provider
acceptance. Accepted provider IDs and parts remain settled. Only unsettled
parts may be reconciled or replayed under owner semantics.

Applied to EC-016.

### 6. Accepted delivery freezes the resolved target

A queue recovery path must not consult the latest display label or session
route and silently retarget accepted work. The normalized provider target and
route provenance used at acceptance remain bound to the operation. A new
destination requires new intent.

Applied to EC-015 and EC-016.

### 7. Export production and export delivery are separate operations

EC-017 owns creation of a generation-bound export artifact. If that artifact
is sent through a channel, EC-016 owns a separate delivery operation. Failure
to deliver does not mean export production failed, and deleting the session
does not delete the export.

Clarified in EC-017.

### 8. Delete needs a retained-copy operator projection

The operator needs one direct answer to “what remains?” Local transcript,
exports, provider messages, attachments, archives, and backups settle with
their owners. A local delete may be complete while external copies remain.

Applied to the journey and EC-001 projection requirements.

### 9. Durable recovery must stay off the Gateway hot path

Queue persistence, reconciliation, evidence export, and copy enumeration must
not block unrelated message routing or the event loop. Queue drains are
bounded per channel/account, and optional durable profiles remain removable
for local-simple channels.

Retained as an operational constraint; no mandatory global queue was added.

### 10. Human states must hide attempt plumbing

The operator surface stays at `waiting to send`, `sending`, `sent`, `not
sent`, `needs attention`, and `deleted locally; copies remain`. Operation IDs,
attempts, lease generations, settlement revisions, and evidence references are
technical details.

This preserves all RFC boundaries without turning them into operator jargon.

## Proof Required Beyond This Simulation

- Portable operation/attempt envelope across two unlike channel owners.
- Restart with a real durable store and stale-worker fencing.
- Provider-native reconciliation or replay-safe idempotency proof.
- Mixed-version queue entry compatibility.
- Generation-bound export production plus separate delivery.
- Per-owner deletion settlement over real provider/export copies.

