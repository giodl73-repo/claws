## What Problem This Solves

As skills take on customer support, finance, operations, and other durable work, people need to answer two simple questions later: what happened, and what did the run consume?

The earlier Auditable Skills slices make outcomes searchable and give managed skill runs stable native identity. PR #100 joins that identity, terminal state, and durable receipts into one result. The remaining accounting gap is that session token fields are mutable snapshots: after a retry, steer, or later turn, they cannot reliably describe one historical run.

That makes honest skill budgets and workflow rollups impossible. A missing measurement must not silently become zero, and a later session total must not be attributed to an earlier run.

## Why This Change Was Made

This PR carries OpenClaw's existing cumulative native-run usage through the existing lifecycle and `agent.wait` paths, then snapshots it on the exact subagent run record before terminal persistence.

The source usage is already accumulated by the embedded runner across model calls and retry attempts. This change does not add another counter, database, polling loop, or workflow engine. It reuses OpenClaw's native run lifecycle and SQLite-backed subagent registry.

The snapshot is optional. When a runner cannot report cumulative usage, the result omits `usage` instead of guessing or reporting zero. Steer/restart successors begin without their predecessor's usage.

## User Impact

Managed skill results can now include billing-oriented token fields for the exact historical run:

```json
{
  "runId": "run-123",
  "status": "completed",
  "usage": {
    "input": 120,
    "output": 30,
    "cacheRead": 80,
    "total": 230
  },
  "receipts": [{ "type": "case.resolved" }]
}
```

This is the natural next stepping stone from auditable skill effects to budgets and workflows. A core runner or a workflow plugin can later sum exact child-run usage, enforce a declared budget, and choose different models without inventing its own accounting source.

This slice deliberately stops at measured token usage. Currency estimates, reservations, policy enforcement, and multi-step workflow orchestration remain follow-ups.

## Evidence

- `agent.wait` returns normalized cumulative usage from both terminal lifecycle events and completed native-run results.
- terminal usage is persisted on the exact subagent registry row;
- the lifecycle fallback retains usage when it completes before `agent.wait`;
- steer/restart replacement clears prior-run usage;
- managed result reads expose the persisted optional usage next to receipts.

Focused validation:

- managed result: 4 tests passed;
- gateway dedupe usage: 6 tests passed across the gateway projects;
- lifecycle usage retention: 1 focused test passed;
- native-run and lifecycle-fallback snapshots plus steer isolation: 6 focused tests passed across the agent projects;
- changed-file formatting, lint, and `git diff --check`: passed.

Repository-wide type checking reached the changed files without errors, then reported existing/shared-worktree dependency failures in Feishu, net-policy, web-push, terminal, and UI packages. No files in those surfaces are changed here.

No live model, external channel, or cost estimate was exercised.

## Auditable Skills POC series

1. [RFC 0022](https://github.com/giodl73-repo/rfcs/pull/6)
2. [OpenClaw #97 - searchable durable outcomes](https://github.com/giodl73-repo/openclaw/pull/97)
3. [OpenClaw #98 - managed skill runs](https://github.com/giodl73-repo/openclaw/pull/98)
4. [OpenClaw #100 - managed run results](https://github.com/giodl73-repo/openclaw/pull/100)
5. **OpenClaw #109 - exact-run token usage**

This remains a fork-only draft for design review. It does not propose an upstream merge yet.

## Current continuation

The compact fork series now continues through [#109](https://github.com/giodl73-repo/openclaw/pull/109), which retains cumulative usage on the exact native managed run, and [#113](https://github.com/giodl73-repo/openclaw/pull/113), which deduplicates explicit completed run IDs and applies an optional caller-owned between-step token ceiling. This PR's scope is unchanged; the later slices build on its native boundary without adding a second execution, usage, or budget ledger.
