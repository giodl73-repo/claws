# Auditable Skills support-case proof

Proved 2026-07-18 against OpenClaw fork PR #97 head `f04293c9153b` on
Windows with Node.js 22.22.3.

## Question

Can an OpenClaw support agent leave durable, searchable business outcomes for
several email threads and recover concrete evidence after the recording process
has exited, without adding a CRM object model?

## Fixture

The source harness passed successful trusted-tool receipt candidates through
`collectToolAuditReceipts` and persisted the accepted batches through
`recordAuditReceiptBatch` into the default database beneath a temporary
`OPENCLAW_STATE_DIR`.

- Alice, `CAS-1042`: `case.opened`, `customer.verified`, `case.resolved`.
- Bob, `CAS-2048`: `case.opened`, `refund.approved`, `customer.notified`,
  `case.resolved`. The refund evidence included authorization code
  `RFND-AUTH-7721`.
- Carol, `CAS-4096`: `case.opened`, `inventory.sent`. The inventory evidence
  included tracking number `TRACK-4096`; no `case.resolved` was recorded.

The fixture recorded nine receipts across three stable email-thread session
keys. The seed process then exited.

## Fresh-process queries

Separate Node processes invoked the real `receiptsCommand` query layer against
the retained `receipts.sqlite`.

```text
case.opened --count   -> 3
case.resolved --count -> 2
```

Listing `case.resolved` returned `CAS-2048` and `CAS-1042` with their exact
agent, session, run, tool, and tool-call correlation. Querying Carol's stable
email-thread session returned:

```text
inventory.sent order:ORD-4096 trackingNumber=TRACK-4096
case.opened    case:CAS-4096
```

Getting Bob's refund receipt by its harness-owned receipt ID returned:

```json
{
  "type": "refund.approved",
  "agentId": "support-east",
  "sessionKey": "agent:support-east:email:thread:bob-2048",
  "runId": "run-bob-refund",
  "toolName": "approve_refund",
  "toolCallId": "call-bob-refund",
  "subject": { "type": "invoice", "id": "INV-2048" },
  "data": {
    "amount": 49.5,
    "authorizationCode": "RFND-AUTH-7721",
    "currency": "USD"
  }
}
```

The retained SQLite file was 45,056 bytes. The proof used deterministic local
business fixtures; it did not call an email provider, CRM, inventory system, or
payment system.

## Boundary learned

Receipt Core answers which outcomes were recorded and preserves the evidence
and originating thread. It does not maintain an authoritative case lifecycle
or expose an `unresolved` query. In this fixture, the operator can see three
opened cases and two resolved outcomes and correlate the remaining case, but a
real unresolved queue still belongs to the source channel or a CRM/workflow
consumer. This is a useful scope boundary, not a reason to add case state to
Receipt Core.
