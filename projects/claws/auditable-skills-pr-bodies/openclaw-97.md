## Opportunity

After an agent finishes work, an operator or another agent should be able to find the originating thread, see what outcome was actually recorded, and inspect concrete evidence such as a payment authorization code.

This first slice adds the smallest durable audit fact using OpenClaw's existing tool-result, session, trajectory, and storage primitives.

## What this slice proves

- Successful tools may return sanitized typed evidence such as `case.resolved`, `inventory.sent`, or `payment.authorized`.
- OpenClaw records trusted run, tool, session, model, and time correlation around that evidence.
- `type` is an exact, filterable outcome dimension; optional `subject` identifies the affected object in the producer's vocabulary.
- Existing session identity connects the outcome back to its channel thread.
- Failed tools and malformed evidence do not become successful outcomes.

The producer owns domain fields. OpenClaw owns correlation, durable recording, sanitization, and retrieval.

```json
{
  "type": "payment.authorized",
  "subject": { "type": "invoice", "id": "INV-1042" },
  "data": { "authorizationCode": "AUTH-9482" }
}
```

An operator can find this work by `payment.authorized`, count outcomes by type, inspect `AUTH-9482`, and reopen the session that recorded it. External record IDs can live in producer-owned subjects without adding a CRM schema or second session identity model to OpenClaw core.

## Boundaries

This slice does not add a CRM, payment ledger, workflow engine, model-prose inference, skill metadata, or token attribution to individual outcomes. It establishes the durable evidence and retrieval seam reused by the later managed-skill and workflow slices.

## Auditable Skills series

1. [RFC 0022](https://github.com/giodl73-repo/rfcs/pull/6)
2. **OpenClaw #97 - durable outcomes**
3. [OpenClaw #98 - managed invocation](https://github.com/giodl73-repo/openclaw/pull/98)
4. [OpenClaw #100 - workflow composition](https://github.com/giodl73-repo/openclaw/pull/100)
5. [Lobster #1 - accounting continuity](https://github.com/giodl73-repo/lobster/pull/1)
6. [OpenClaw #109 - workflow spend](https://github.com/giodl73-repo/openclaw/pull/109)

## Validation

- Receipt normalization, persistence, and filtering: 6 passing tests.
- Session-tail retrieval and safe JSON projection: 14 passing tests.
- Automatic fork CI passed at head `3b1511c1` in [run 29453465264](https://github.com/giodl73-repo/openclaw/actions/runs/29453465264).
- `git diff --check` clean.
- Reduced diff: 27 files, 560 additions, 32 deletions.

The branch was rebuilt after prototype learning to remove the separate session-association feature. It now contains only durable outcome recording, session/run correlation, retrieval, and cross-harness observation.

## Real behavior proof

**Behavior:** valid evidence from a successful tool is retained and searchable after the run.

**Observed result:** `payment.authorized` retained its invoice subject and authorization code; exact-type retrieval returned the sanitized receipt; failed and malformed results produced no success receipt.

**Not tested:** no live payment, inventory, CRM, or other external business system was mutated.

Depends on RFC 0022. Fork-only Auditable Skills proof; not proposed upstream.
