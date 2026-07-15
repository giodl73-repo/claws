## Opportunity

Durable outcomes answer what happened. A complete audit also needs to explain which exact skill ran, who invoked it, which child run performed the work, and what tokens that run consumed.

This slice consumes portable Agent Skills declarations while keeping authority and observed facts with OpenClaw's existing agent, session, subagent, policy, trajectory, and model-usage primitives.

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
- Summarizes receipts, skill lineage, models, and normalized token usage by run.
- Filters audit summaries by exact observed outcome type.
- Keeps the caller authoritative for allowed children, models, tools, and budgets.

Isolated execution becomes the honest skill-level accounting boundary. No workflow language is added to `SKILL.md`.

## Auditable Skills series

1. [RFC 0022](https://github.com/giodl73-repo/rfcs/pull/6)
2. [OpenClaw #97 - durable outcomes](https://github.com/giodl73-repo/openclaw/pull/97)
3. **OpenClaw #98 - managed invocation**
4. [OpenClaw #100 - workflow composition](https://github.com/giodl73-repo/openclaw/pull/100)
5. [Lobster #1 - accounting continuity](https://github.com/giodl73-repo/lobster/pull/1)
6. [OpenClaw #109 - workflow spend](https://github.com/giodl73-repo/openclaw/pull/109)

## Validation

- Audit-run projection: 4 passing tests.
- Session-tail audit summary and outcome filtering: 17 passing tests.
- Automatic fork CI passed at head `432af457` in [run 29453778291](https://github.com/giodl73-repo/openclaw/actions/runs/29453778291).
- `git diff --check` clean and no dependency on a separate session business-association model.

## Real behavior proof

An explicit isolated child remains on the current agent and ordinary policy path. Its lifecycle settles once, parent/child identity survives fallback and cleanup, and the audit projection joins exact skill identity to observed outcomes and run-level usage.

No live paid-provider child invocation was performed.

Depends on #97. Fork-only Auditable Skills proof; not proposed upstream.
