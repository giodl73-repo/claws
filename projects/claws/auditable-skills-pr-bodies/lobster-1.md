## Opportunity

An audit is incomplete if workflow spend disappears when execution pauses for a human decision. Auditable Skills needs one trustworthy accounting history across managed steps, approvals, structured input, resume, and cancellation.

Lobster already owns workflow token aggregation, estimated cost, and `cost_limit` through `CostTracker`. This slice preserves that native accounting across suspension instead of introducing another ledger.

## What this slice proves

- Snapshots the current `CostTracker` summary in Lobster's existing resume state.
- Restores the summary when the workflow resumes.
- Returns `_meta.cost` through embedded and CLI workflow envelopes.
- Preserves incurred cost on cancellation when resume state is available.
- Keeps cancellation idempotent after state expires while surfacing real cleanup failures.

OpenClaw records observed usage for each isolated managed child run. Lobster counts those step results once, carries the aggregate across pauses, and applies the caller-provided `cost_limit`. Skills cannot set or widen that limit, and business outcome evidence remains independently searchable in OpenClaw's configured receipt store.

This is the one cross-repository prerequisite for the final accounting proof. It changes Lobster's native resume envelope; it does not teach Lobster about OpenClaw sessions, receipts, or skill metadata.

## Auditable Skills series

1. [RFC 0022](https://github.com/giodl73-repo/rfcs/pull/6)
2. [OpenClaw #97 - shared durable outcomes](https://github.com/giodl73-repo/openclaw/pull/97)
3. [OpenClaw #98 - managed invocation](https://github.com/giodl73-repo/openclaw/pull/98)
4. [OpenClaw #100 - workflow composition](https://github.com/giodl73-repo/openclaw/pull/100)
5. **Lobster #1 - accounting continuity**
6. [OpenClaw #109 - workflow spend](https://github.com/giodl73-repo/openclaw/pull/109)

## Validation

- TypeScript compilation passes.
- Approval and structured-input resume proof covers work before and after the gate.
- Cancellation covers live, deleted-workflow, and expired resume state.
- Public CLI envelope cost metadata is covered.
- Focused `CostTracker` and resume tests pass in the supported POSIX lane.
- Head `0ad538b3`; 6 files, 242 additions, 25 deletions.

The final and cancelled envelopes retain incurred accounting across pauses. No new accounting service, database, pricing model, receipt schema, or per-outcome token attribution is introduced.

Fork-only Auditable Skills prerequisite; nothing is proposed against `openclaw/lobster`.
