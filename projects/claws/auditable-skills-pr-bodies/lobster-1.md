## What this prototype explored

Workflow accounting should not disappear when execution pauses for a human decision. Lobster already owns token aggregation, estimated cost, and `cost_limit` through `CostTracker`, so this fork prototype tested preserving that native accounting across suspension instead of adding another ledger.

It proved that Lobster can:

- snapshot the current `CostTracker` summary in existing resume state;
- restore the summary when a workflow resumes;
- return `_meta.cost` through embedded and CLI envelopes;
- retain incurred cost on cancellation when resume state is available;
- keep cancellation idempotent after state expires while surfacing real cleanup failures.

This changes only Lobster's own resume envelope. It does not teach Lobster about OpenClaw sessions, receipts, skills, or models.

## Why this remains archived

The compact Auditable Skills stack no longer requires Lobster for core receipts, managed child identity, managed result reads, or exact-run token usage. A future Lobster adapter can consume OpenClaw #109's optional cumulative usage and reuse this pause/resume accounting behavior, but this PR is prototype evidence rather than a current landing prerequisite.

Skills still cannot set or widen caller-owned limits. Business outcome receipts remain independently searchable in OpenClaw's configured receipt store.

## Evidence and preservation

- 6 files, 242 additions, 25 deletions.
- Approval and structured-input proof covers work before and after the gate.
- Cancellation covers live, deleted-workflow, and expired resume state.
- Public CLI envelope cost metadata is covered.
- Focused `CostTracker` and resume tests passed in the supported POSIX lane.
- No accounting service, database, pricing model, receipt schema, or per-outcome token attribution was added.

## POC evidence series

1. [RFC 0022](https://github.com/giodl73-repo/rfcs/pull/6)
2. [OpenClaw #97 - shared durable outcomes](https://github.com/giodl73-repo/openclaw/pull/97)
3. [OpenClaw #98 - managed child runs](https://github.com/giodl73-repo/openclaw/pull/98)
4. [OpenClaw #100 - compact managed run results](https://github.com/giodl73-repo/openclaw/pull/100)
5. [OpenClaw #109 - exact-run token usage](https://github.com/giodl73-repo/openclaw/pull/109)
6. **Lobster #1 - accounting continuity prototype**

Fork-only historical evidence; nothing is proposed against `openclaw/lobster`.

## Relationship to the core proof

This remains optional advanced-runner evidence. [OpenClaw #113](https://github.com/giodl73-repo/openclaw/pull/113) demonstrates the core alternative: a caller can aggregate explicit completed managed runs and make a between-step token decision without Lobster. Lobster is still useful when accounting must survive its existing approval, input, and resume lifecycle; it is not a hard dependency for Auditable Skills.
