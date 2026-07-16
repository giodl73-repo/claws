## What this prototype explored

Auditable Skills should eventually answer both sides of completed work: what outcome was recorded, and what the execution consumed. This fork prototype tested whether observed managed-child usage could flow through a multi-step Lobster workflow, survive an approval pause, and appear once in workflow totals.

It proved a useful direction:

- project recorded child input/output tokens into Lobster's native `usage` result;
- retain `_meta.cost` through the OpenClaw runner;
- aggregate multiple managed children once across pause and resume;
- keep business receipts separate from run and workflow accounting.

The deterministic proof returned 300 input tokens, 75 output tokens, and `$0.00009`, split 100/20 and 200/55 across two steps.

## Why this remains archived

The compact stack no longer proposes this adapter as the next landing slice. PR #100 now stops at a small runner-neutral result over native managed-run identity, terminal state, and durable receipts.

Before workflow spend can move forward, OpenClaw needs one equally honest cumulative run-usage source. The existing subagent session/context snapshot is useful for inspection but is not sufficient for retry-aware workflow budgets. Missing cumulative usage must remain unavailable, not become zero.

Once that boundary exists, either a small core runner or Lobster can consume it. Advanced Lobster pause/resume accounting remains valid prototype evidence, but it is not a dependency of receipts, managed child runs, or managed result reads.

## Evidence and preservation

- 4 files, 154 additions, 2 deletions over the archived workflow-composition branch.
- Fixtures cover input/output projection, single-model reporting, multi-model omission, and missing usage.
- Cross-repository proof covers two managed skill steps, approval pause/resume, total token aggregation, per-step attribution, and `_meta.cost`.
- No live model or external channel was used.

## POC evidence series

1. [RFC 0022](https://github.com/giodl73-repo/rfcs/pull/6)
2. [OpenClaw #97 - shared durable outcomes](https://github.com/giodl73-repo/openclaw/pull/97)
3. [OpenClaw #98 - managed child runs](https://github.com/giodl73-repo/openclaw/pull/98)
4. [OpenClaw #100 - compact managed run results](https://github.com/giodl73-repo/openclaw/pull/100)
5. [Lobster #1 - accounting continuity prototype](https://github.com/giodl73-repo/lobster/pull/1)
6. **OpenClaw #109 - workflow spend prototype**

This draft is based on the preserved workflow-composition prototype branch. It is fork-only historical evidence, not a proposed upstream or landing dependency.
