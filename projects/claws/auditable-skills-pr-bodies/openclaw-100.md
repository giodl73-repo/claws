## What Problem This Solves

After OpenClaw records a durable outcome and tracks the exact skill on a native child run, the next useful question is simple: given the `runId`, what happened?

Operators and future workflow runners need one reliable answer containing:

- the exact retained managed-skill identity;
- the native child session and terminal state;
- the durable business receipts recorded for that run.

Without this seam, every runner or plugin would have to rediscover how to join subagent state and receipt storage. The previous POC proved that composition works, but it did so through 41 files and an embedded Lobster bridge. This revision keeps the useful contract and removes the workflow engine from the slice.

## Why This Change Was Made

This PR adds a runner-neutral managed-run result built entirely from existing OpenClaw primitives:

```json
{
  "runId": "run-123",
  "childSessionKey": "agent:support:subagent:abc",
  "managedSkill": {
    "invocationId": "skill-456",
    "skillName": "resolve-case",
    "skillDigest": "sha256:abc123"
  },
  "status": "completed",
  "receipts": [
    {
      "type": "case.resolved",
      "data": { "authorizationCode": "AUTH-9482" }
    }
  ]
}
```

The new `subagents` `result` action accepts the native `runId`. It resolves the exact retained run—not merely the latest run for a child session—applies the existing session-tree visibility rule, and joins receipts through the configured receipt-store API.

The result reuses native state rather than inventing another ledger:

- subagent registry owns skill identity, child session, status, timing, and errors;
- `receipts.sqlite` owns durable business evidence;
- `runId` is the canonical join;
- receipt SQLite is loaded only for an explicit result read, keeping ordinary list/cancel paths lightweight.

If managed identity has expired, the result reports `managed_identity_unavailable`. If a receipt contradicts the retained run, it reports `receipt_correlation_mismatch`. It never infers identity from task text, transcript prose, or receipt data.

## User Impact

This is the first small composition primitive after receipts and managed runs. A support agent can start a skill, retain the returned `runId`, and later retrieve the concrete `case.resolved`, `payment.refunded`, or other outcome—including producer evidence such as an authorization code—without depending on Lobster.

It is also a natural input to later workflow work: a minimal core runner or Lobster adapter can consume the same result for receipt gates and step completion.

Usage and cost are intentionally absent from this slice. OpenClaw's current subagent view exposes a useful session snapshot, but workflow budgets need cumulative observed run usage. This PR does not mislabel a context-window token snapshot as spend; cumulative accounting remains the next bounded slice.

No workflow DSL, step state machine, approval engine, TaskFlow layer, Lobster dependency, usage ledger, or new database is added.

## Evidence

- Focused managed-result and tool tests: 22 assertions passed.
- Native control coverage: all 35 assertions passed, including exact historical `runId` lookup and session visibility. The Windows test process then hit its existing SQLite teardown `EBUSY` while deleting a temporary database.
- Scoped formatting, lint, and `git diff --check` pass.
- Native preview `tsgo` reproduced the branch's known intermittent no-diagnostic hang. Stable `tsc` reached only unrelated dependency/worktree errors in `net-policy` and `web-push`; it reported no changed-file error.
- 6 files, 339 additions, 6 deletions, compared with the archived POC's 41 files, 1,843 additions, and 152 deletions.
- Automated Codex review could not complete: sandbox mode lacked `codex-windows-sandbox-setup.exe`, and the full-access retry timed out without findings. Manual review caught and fixed lazy receipt-store loading and exact historical run lookup.

## POC evidence series

1. [RFC 0022](https://github.com/giodl73-repo/rfcs/pull/6)
2. [OpenClaw #97 - shared durable outcomes](https://github.com/giodl73-repo/openclaw/pull/97)
3. [OpenClaw #98 - managed child runs](https://github.com/giodl73-repo/openclaw/pull/98)
4. **OpenClaw #100 - read managed run results**
5. [OpenClaw #109 - exact-run token usage](https://github.com/giodl73-repo/openclaw/pull/109)
6. [Lobster #1 - archived accounting continuity proof](https://github.com/giodl73-repo/lobster/pull/1)

The old workflow-composition head remains preserved on a prototype branch as evidence. Compact #109 adds optional cumulative usage to this result without reviving that workflow bridge. This PR depends only on #98 and remains draft, fork-only review material; it is not proposed upstream.
