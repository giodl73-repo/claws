## Opportunity

People need to know what skills cost. Skill Memory and managed results identify completed work, but mutable session token snapshots cannot reliably describe one historical run after a retry, steer, or later turn.

This POC retains normalized cumulative usage on the exact native managed run that consumed it.

## What this slice adds

- Captures input, output, cache-read, cache-write, and total tokens at terminal run settlement.
- Carries usage through the existing agent wait and subagent completion paths.
- Persists the final snapshot with the native run record.
- Returns usage in the managed result for that exact `runId`.
- Preserves usage for completed, failed, cancelled, retried, and timed-out work when the provider reported it.

Usage belongs to the run that consumed it. An isolated child run can be attributed exclusively to that skill. A shared model turn is not divided into invented per-skill fractions.

Skill Memory entries do not own spend; they correlate to it through `runId`. This avoids a second accounting ledger and lets historical usage remain stable even after the child session continues.

## What this does not claim

- No pricing catalog or durable USD total is added here.
- Missing usage stays unavailable rather than becoming zero.
- Cache tokens are retained as separate dimensions.
- The session context-window token snapshot is not treated as cumulative spend.
- No caller limit or workflow engine is introduced in this slice.

## Validation

Focused tests cover terminal usage capture, exact historical run reads, restart/steer isolation, timeout and failure settlement, and Gateway wait propagation. The cumulative stack is exercised on Linux with Skill Memory and managed-result coverage.

## POC series

- Design: [RFC 0022 — Skill Memory](https://github.com/giodl73-repo/rfcs/pull/6)
- [#97](https://github.com/giodl73-repo/openclaw/pull/97) — remember completed work
- [#98](https://github.com/giodl73-repo/openclaw/pull/98) — associate an exact managed skill run
- [#100](https://github.com/giodl73-repo/openclaw/pull/100) — recall a managed result
- **#109 — retain exact-run token usage**
- [#113](https://github.com/giodl73-repo/openclaw/pull/113) — check an exact-run token limit
- [#114](https://github.com/giodl73-repo/openclaw/pull/114) — centralize managed dispatch

Fork-only draft POC; not proposed upstream.
