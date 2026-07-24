## Opportunity

Once exact managed runs retain their token usage, a caller should be able to answer a simple between-step question: has this set of completed work reached a token limit?

This POC adds that bounded decision without creating a workflow budget database.

## What this slice adds

The `subagents` tool accepts a `usage` action with explicit managed `runIds` and an optional `maxTokens` ceiling. It:

- applies the existing session-tree visibility rule;
- rejects running, unknown, unmanaged, or usage-less runs;
- deduplicates repeated run IDs;
- sums normalized usage once per exact run;
- reports remaining tokens and `continue`, `limit_reached`, or `limit_exceeded`.

The caller owns the ceiling and the selected contributing runs. Skills cannot declare or widen an authoritative budget. Missing accounting is an error, not zero.

This is deliberately a between-step decision. Provider usage is normally known after work occurs, so the check does not reserve future tokens, stop a model mid-run, or promise that one active step cannot cross a ceiling.

## Why this belongs after exact-run usage

The decision consumes OpenClaw's native retained usage. It does not parse transcripts, reread mutable session totals, duplicate Skill Memory, or persist a second spend ledger. A core runner, Lobster adapter, or direct caller can use the same primitive while owning its own workflow state and resume semantics.

## Validation

Focused tests cover deduplication, exact totals, zero remaining tokens, exceeded limits, session-tree rejection, non-terminal runs, missing usage, and missing managed identity. The cumulative stack is exercised on Linux.

## POC series

- Design: [RFC 0022 — Skill Memory](https://github.com/giodl73-repo/rfcs/pull/6)
- [#97](https://github.com/giodl73-repo/openclaw/pull/97) — remember completed work
- [#98](https://github.com/giodl73-repo/openclaw/pull/98) — associate an exact managed skill run
- [#100](https://github.com/giodl73-repo/openclaw/pull/100) — recall a managed result
- [#109](https://github.com/giodl73-repo/openclaw/pull/109) — retain exact-run token usage
- **#113 — check an exact-run token limit**
- [#114](https://github.com/giodl73-repo/openclaw/pull/114) — centralize managed dispatch

Fork-only draft POC; not proposed upstream.
