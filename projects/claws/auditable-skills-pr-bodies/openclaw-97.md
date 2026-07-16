## Opportunity

After an agent finishes work, an operator or another agent should be able to find the originating thread, see what outcome was actually recorded, count similar outcomes, and inspect concrete evidence such as a payment authorization code.

This first slice adds that durable fact using OpenClaw's existing trusted tool-result and session/run boundaries, with one purpose-built receipt store shared across local agents.

## What this slice proves

- Successful tools may return sanitized typed evidence such as `case.resolved`, `inventory.sent`, or `payment.authorized`.
- OpenClaw records the full receipt once in a configurable shared SQLite database.
- The default is `~/.openclaw/state/receipts.sqlite`; another local path can be configured for a team or deployment.
- Exact receipt type, subject, agent, session, run, and skill provenance are indexed for later queries.
- `openclaw sessions tail --receipt-type <type>` retrieves full evidence; `--count` counts exact matches, including across `--all-agents`.
- The ordinary trajectory stores only an `audit.receipt.recorded` reference, so receipt payloads are not duplicated and have an independent lifecycle.
- Failed tools and malformed evidence do not become successful outcomes; recording failure is contained and does not rewrite the tool result.

The producer owns the business fields. OpenClaw owns trusted correlation, durable recording, sanitization, retrieval, and the pointer back to the run.

```json
{
  "type": "payment.authorized",
  "subject": { "type": "invoice", "id": "INV-1042" },
  "data": { "authorizationCode": "AUTH-9482" }
}
```

An operator can search `payment.authorized`, count it across agents, inspect `AUTH-9482`, and reopen the session that recorded it. For a support inbox, the channel thread remains the case history while typed outcomes provide a small CRM-like index over completed work.

## Storage boundary

Version 1 supports local SQLite only. It is intended for agents served by one Gateway host, not direct network-filesystem or multi-host SQLite sharing. The implementation sits behind a receipt-store boundary so a future remote provider can preserve the same producer, query, and workflow contracts.

## Boundaries

This slice does not add a CRM, payment ledger, workflow engine, model-prose inference, skill metadata, or token attribution to individual outcomes. It establishes the evidence and retrieval seam reused by later managed-skill and workflow slices.

## POC evidence series

1. [RFC 0022](https://github.com/giodl73-repo/rfcs/pull/6)
2. **OpenClaw #97 - shared durable outcomes**
3. [OpenClaw #98 - managed invocation](https://github.com/giodl73-repo/openclaw/pull/98)
4. [OpenClaw #100 - workflow composition](https://github.com/giodl73-repo/openclaw/pull/100)
5. [Lobster #1 - accounting continuity](https://github.com/giodl73-repo/lobster/pull/1)
6. [OpenClaw #109 - workflow spend](https://github.com/giodl73-repo/openclaw/pull/109)

These fork drafts preserve the evidence trail. RFC 0022 now recommends a smaller upstream sequence beginning with a rebuilt core-receipts slice; this PR is proof for that slice, not a request to land the current stack unchanged.

## Validation

- Receipt store, multi-agent filtering, idempotency, and configured-path tests pass.
- Session retrieval, safe JSON evidence, and exact count tests pass.
- Harness recording and trajectory-reference tests pass.
- Focused result: 4 files, 26 tests passed.
- Config schema/doc baselines, formatting, lint, LOC ratchet, and `git diff --check` pass.
- Core typecheck reports only pre-existing branch-baseline errors outside the receipt changes.
- Head `1fcf0bf9`; full slice is 40 files, 1,390 additions, 60 deletions.

**Real behavior:** a valid `payment.authorized` receipt retained its invoice subject and authorization code in the configured shared database; exact-type retrieval returned the full sanitized record; a trajectory reference contained no receipt `data`; failed and malformed results produced no success receipt.

No live payment, inventory, CRM, or other external business system was mutated.

Depends on RFC 0022. Fork-only Auditable Skills proof; not proposed upstream.
