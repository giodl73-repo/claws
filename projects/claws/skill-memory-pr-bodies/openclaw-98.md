## Opportunity

Skill Memory makes completed work durable. The next question is: which exact skill revision and native run produced it?

This POC lets a caller start one known skill as an ordinary OpenClaw child run and retain immutable managed-skill identity on that existing run. It does not introduce another executor or lifecycle state machine.

## What this slice adds

- A normalized managed invocation ID and executed skill name, source, and digest.
- Optional portable Agent Skills metadata:

```yaml
metadata:
  remembers: "customer.verified payment.refunded"
  uses-skills: "verify-customer check-refund-policy"
  isolation: "required"
```

- `remembers` declares fact types a skill intends to produce; it is not evidence that they occurred.
- `uses-skills` narrows possible child composition; it cannot grant access.
- `isolation` describes whether honest exclusive run accounting is required.
- Managed identity retained on the existing subagent run and SQLite registry row.
- Existing `sessions_spawn`, child-session visibility, model selection, cleanup, and cancellation behavior remain authoritative.

Skill metadata cannot grant tools, credentials, models, sandbox permissions, child visibility, or budgets. A caller still supplies policy and the harness still records observed facts.

## Why it follows Skill Memory

Entries in `skill-memory.sqlite` already correlate to a native `runId`. This slice makes that run identify the exact skill artifact without copying run state into a parallel invocation table. Later result and accounting views can join through the same run.

This is a natural stepping stone toward workflows, but it is useful by itself for provenance and cost comparison. Nothing here orders steps, retries work, evaluates expressions, or resumes a workflow.

## Validation

Focused tests cover frontmatter normalization, workspace snapshots, invocation identity, native registry persistence, spawn admission, session-tree visibility, and model forwarding. The cumulative Skill Memory stack is also exercised on Linux with the core store and later result/accounting slices.

## POC series

- Design: [RFC 0022 — Skill Memory](https://github.com/giodl73-repo/rfcs/pull/6)
- [#97](https://github.com/giodl73-repo/openclaw/pull/97) — remember completed work
- **#98 — associate an exact managed skill run**
- [#100](https://github.com/giodl73-repo/openclaw/pull/100) — recall a managed result
- [#109](https://github.com/giodl73-repo/openclaw/pull/109) — retain exact-run token usage
- [#113](https://github.com/giodl73-repo/openclaw/pull/113) — check an exact-run token limit
- [#114](https://github.com/giodl73-repo/openclaw/pull/114) — centralize managed dispatch

Fork-only draft POC; not proposed upstream.
