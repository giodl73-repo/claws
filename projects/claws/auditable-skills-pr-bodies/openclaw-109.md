## Opportunity

Auditable Skills should answer both sides of completed work: what outcome was recorded, and what the execution consumed. Once managed skills become workflow steps, operators need one trustworthy view of total tokens and cost across the workflow.

OpenClaw already records actual model usage for each managed child run. Lobster already owns workflow aggregation and `cost_limit`. This final slice connects those native owners instead of introducing another accounting or budget system.

## What this slice proves

- Projects a completed managed skill run's recorded input and output tokens into Lobster's native `usage` result shape.
- Includes the model only when the child audit identifies exactly one model.
- Preserves Lobster's `_meta.cost` envelope through the OpenClaw runner.
- Covers multiple managed children and an approval pause/resume boundary.
- Keeps outcomes separate from accounting: full receipts remain in the shared store, while tokens and cost belong to runs and workflows.

Together, OpenClaw reports observed child usage, Lobster aggregates each contributing run once, and the caller applies `cost_limit`. Receipt types can still be searched and counted independently of workflow accounting.

## Auditable Skills series

1. [RFC 0022](https://github.com/giodl73-repo/rfcs/pull/6)
2. [OpenClaw #97 - shared durable outcomes](https://github.com/giodl73-repo/openclaw/pull/97)
3. [OpenClaw #98 - managed invocation](https://github.com/giodl73-repo/openclaw/pull/98)
4. [OpenClaw #100 - workflow composition](https://github.com/giodl73-repo/openclaw/pull/100)
5. [Lobster #1 - accounting continuity](https://github.com/giodl73-repo/lobster/pull/1)
6. **OpenClaw #109 - workflow spend**

## Validation and dependency boundary

- Projection fixtures cover input/output usage, single-model reporting, multi-model omission, and missing usage.
- The cross-repository proof covers two managed skill steps, approval pause/resume, total token aggregation, per-step attribution, and `_meta.cost`.
- That proof returns 300 input tokens, 75 output tokens, and `$0.00009`, split 100/20 and 200/55 across the two steps.
- The stock Lobster package does not yet preserve workflow cost metadata; Lobster #1 is therefore an explicit dependency and landing-order gate, not a local override hidden in this PR.
- Head `398d65ac`; slice over #100 is 4 files, 154 additions, 2 deletions.

No live model or external channel was used. Pricing and child audit inputs are deterministic fixtures; the OpenClaw adapter, Lobster workflow runtime, persisted approval-resume state, and returned envelope are the real source implementations.

Depends on #100 and Lobster #1. Fork-only Auditable Skills accounting proof; not proposed upstream.
