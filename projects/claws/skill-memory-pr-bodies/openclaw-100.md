## Opportunity

Once a managed skill run has stable identity, a caller or workflow adapter needs one normal way to revisit what happened. It should not reconstruct state from transcript prose or open Skill Memory SQLite directly.

This POC adds a runner-neutral managed result over OpenClaw's existing native run and Skill Memory records.

## Result shape

Given an exact native `runId`, the `subagents` tool's `result` action returns:

- managed invocation and executed skill identity;
- native running, completed, failed, or cancelled status;
- native timing and sanitized error information;
- full Skill Memory entries correlated to that run.

The read uses the exact retained run rather than “the latest run for this child session,” applies the existing session-tree visibility rule, and resolves full memories through the configured Skill Memory store.

If native managed identity is unavailable, the result returns `managed_identity_unavailable`. If a memory claims a different run or managed invocation, it returns `memory_correlation_mismatch`. It does not infer identity from the task prompt, transcript, model output, or producer data.

## Architecture

- The native subagent run remains the lifecycle owner.
- `skill-memory.sqlite` remains the single owner of full completed-work evidence.
- The trajectory remains a bounded correlation history.
- The result is a projection, not a new database or state machine.
- Skill Memory is loaded lazily only for an explicit result read.

This gives Lobster, a future core runner, or another plugin the same OpenClaw-owned result boundary without selecting a workflow engine in this PR.

## Validation

Focused tests cover exact-run lookup, session-tree authorization, native terminal-state projection, Skill Memory joins, missing identity, correlation mismatch, truncation, and lazy store loading. The cumulative stack is exercised on Linux.

## POC series

- Design: [RFC 0022 — Skill Memory](https://github.com/giodl73-repo/rfcs/pull/6)
- [#97](https://github.com/giodl73-repo/openclaw/pull/97) — remember completed work
- [#98](https://github.com/giodl73-repo/openclaw/pull/98) — associate an exact managed skill run
- **#100 — recall a runner-neutral managed result**
- [#109](https://github.com/giodl73-repo/openclaw/pull/109) — retain exact-run token usage
- [#113](https://github.com/giodl73-repo/openclaw/pull/113) — check an exact-run token limit
- [#114](https://github.com/giodl73-repo/openclaw/pull/114) — centralize managed dispatch

Fork-only draft POC; not proposed upstream.
