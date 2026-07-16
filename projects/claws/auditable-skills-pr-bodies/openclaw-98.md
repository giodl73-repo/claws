## Opportunity

Durable outcomes answer what happened. A complete audit also needs to explain which exact skill ran, who invoked it, which child run performed the work, and what tokens that run consumed.

This slice consumes portable Agent Skills declarations while keeping authority and observed facts with OpenClaw's existing agent, session, subagent, policy, trajectory, usage, and receipt-store primitives.

```yaml
---
name: customer-support
description: Resolve a customer support issue.
metadata:
  outcomes: "case.resolved customer.notified"
  uses-skills: "verify-customer"
  isolation: "required"
---
```

These fields describe capability and composition intent. They are not evidence, installation dependencies, permission grants, model choices, or budgets.

## What this slice proves

- Normalizes `outcomes`, `uses-skills`, and `isolation` from string-valued Agent Skills metadata.
- Records exact executed skill identity and invocation lifecycle.
- Adds an explicit managed child-skill invocation path.
- Preserves parent/child invocation and run lineage across isolation, cleanup, and model fallback.
- Correlates receipts in the shared store with invocation ID, skill name, and exact skill digest.
- Summarizes receipt references, skill lineage, models, and normalized token usage by run.
- Keeps the caller authoritative for allowed children, models, tools, and budgets.

Isolated execution becomes the honest skill-level accounting boundary. No workflow language is added to `SKILL.md`, and full receipt evidence remains owned by the receipt-store contract now being tightened in #97.

## POC evidence series

1. [RFC 0022](https://github.com/giodl73-repo/rfcs/pull/6)
2. [OpenClaw #97 - shared durable outcomes](https://github.com/giodl73-repo/openclaw/pull/97)
3. **OpenClaw #98 - managed invocation**
4. [OpenClaw #100 - workflow composition](https://github.com/giodl73-repo/openclaw/pull/100)
5. [Lobster #1 - accounting continuity](https://github.com/giodl73-repo/lobster/pull/1)
6. [OpenClaw #109 - workflow spend](https://github.com/giodl73-repo/openclaw/pull/109)

These fork drafts preserve the evidence trail. RFC 0022 now places managed invocation in a later landing round after the core receipt boundary settles; this PR is not a request to land the current stack unchanged.

## Validation

- Focused invocation, finalization, receipt correlation, audit-run, and session-query suites: 5 files, 31 tests passed.
- Formatting, lint, and `git diff --check` pass for the updated integration.
- Head `9c7568ad`; slice over #97 is 73 files, 2,631 additions, 451 deletions.

**Real behavior:** an explicit isolated child remains on the current agent and ordinary policy path. Its lifecycle settles once, parent/child identity survives fallback and cleanup, and recorded receipts carry the exact invocation and skill digest needed to join outcome evidence to run-level usage.

No live paid-provider child invocation was performed.

This POC remains based on the archived original receipt prototype so its historical evidence stays reviewable while #97 is rebuilt as the smaller upstream-shaped Round 1. It is not directly stacked on the rewritten #97 and is not proposed upstream.
