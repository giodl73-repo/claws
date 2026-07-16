## Opportunity

As skills become dependable building blocks, people need a simple answer to two questions: **what did these skill runs cost in tokens, and may I run the next step?** OpenClaw now retains exact usage on each managed run in the preceding PR. This slice turns that native record into a small orchestration primitive without introducing a workflow ledger or a second accounting system.

A support agent, for example, can resolve one customer case through several managed skills, name the completed run ids, and check the accumulated usage before dispatching another step. The same primitive works for finance, inventory, research, or any other skill sequence.

## What this adds

`subagents` gains a `usage` action over explicit managed `runIds`:

```json
{
  "action": "usage",
  "runIds": ["run-classify", "run-refund"],
  "maxTokens": 50000
}
```

It returns the exact cumulative usage buckets already retained for those runs, counts duplicate ids once, and optionally reports `within_limit` or `limit_reached` with the remaining tokens. The retained provider total is preferred; when it is absent, retained input plus output supplies the total while cache buckets remain separate.

The read uses OpenClaw's existing session-tree visibility boundary. A running run, an older run without exact usage, or a run without managed-skill identity returns `accounting_unavailable` instead of silently treating missing spend as zero. It does not open the receipts database.

## Deliberate boundary

This PR does not store budgets, reserve future tokens, estimate USD, stop a model mid-run, or define a workflow engine. A caller or future runner owns the ceiling and checks it between completed skill steps. That is the natural stepping stone from auditable runs toward orchestration while keeping the primitive useful on its own.

This also follows the direction of [OpenTelemetry's GenAI usage conventions](https://github.com/open-telemetry/semantic-conventions/blob/main/docs/gen-ai/gen-ai-metrics.md): use provider-reported billable token counts when available and report accounting as unavailable when it cannot be obtained reliably.

## Stack

- Builds on #109, which retains cumulative usage on the exact native managed run.
- Followed by #114, which extracts one host-owned managed-skill dispatch path for `sessions_spawn` and future core controllers.
- Part of the Auditable Skills RFC: https://github.com/giodl73-repo/rfcs/pull/6
- Fork-only proof of concept; not opened against upstream OpenClaw.

## Verification

- `subagents-tool.test.ts`: aggregation, duplicate suppression, exact ceiling boundary, unavailable accounting, and session-tree isolation
- 24 focused tests pass
- `oxfmt`, `oxlint`, and `git diff --check` pass
- Whole-repo tsgo exceeded the local 60-second validation window; the focused TypeScript/Vitest transform completed successfully
