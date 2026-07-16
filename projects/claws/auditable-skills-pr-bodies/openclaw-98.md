## Opportunity

#97 gives OpenClaw a durable answer to “what happened?” This slice adds the next useful answer: “which exact skill run did the work, and what did that run consume?”

That is a natural stepping stone from reusable Agent Skills to workflows. A caller can start one known skill as an ordinary OpenClaw child run, choose the model through the existing `sessions_spawn` surface, and later find its identity, outcome receipts, tokens, and estimated cost through existing OpenClaw records.

The skill author experience stays small and portable:

```yaml
---
name: resolve-case
description: Resolve a customer support issue and notify the customer.
metadata:
  outcomes: "case.resolved customer.notified"
  uses-skills: "verify-customer"
  isolation: "preferred"
---
```

These values describe intent. They are not proof that an outcome happened, permission to call another skill, a model choice, or a budget.

## What this slice does

- Reads `outcomes`, `uses-skills`, and `isolation` from string-valued Agent Skills metadata.
- Captures the full SHA-256 identity of the loaded `SKILL.md` without changing the compact prompt version.
- Adds optional `skill` selection to the existing `sessions_spawn` tool.
- Resolves exactly one skill from the caller's current skill snapshot and starts it as a one-shot child run on the current agent.
- Records a small managed-skill descriptor in OpenClaw's existing durable subagent registry: invocation ID, skill name/source/digest, declarations, and parent run ID.
- Returns the invocation ID with the ordinary child session and run IDs.
- Projects the managed identity beside OpenClaw's existing child model, input/output usage, cache snapshot, and estimated cost in `subagents list`.

The shared join key is the native child `runId`. #97 already supports receipt queries by run, so an operator or another agent can move from a managed run to its durable business evidence without a second workflow ledger:

```text
sessions_spawn({ skill: "resolve-case", task: "Resolve CAS-1042", model: "..." })
  -> { runId, childSessionKey, skillInvocationId }

subagents({ action: "list" })
  -> { runId, managedSkill, model, usage }

openclaw receipts --run <runId> --json
  -> case.resolved, customer.notified, authorization codes, and other recorded evidence
```

This is deliberately not a workflow engine. It adds no steps, expressions, retries, approvals, nested-call enforcement, or budget decisions. ACP and persistent/thread-bound sessions are also outside this first managed-run profile. Those belong in later slices once this identity and accounting boundary proves useful.

## Why this is smaller

The original POC threaded invocation state through gateway protocols, every harness runtime, lifecycle finalization, and fallback handling. Current OpenClaw already has the needed primitives:

- the skill snapshot is the authority for what the caller can see;
- `sessions_spawn` owns managed child creation and model selection;
- the subagent registry durably owns child-run identity and lineage;
- session records already own normalized usage and estimated cost;
- receipts already correlate durable outcomes by `runId`.

Reusing those seams reduces this slice from 73 files and 3,082 lines of churn to 24 files and 501 lines of churn, including tests.

## Validation

- 259 focused assertions passed across skill metadata, snapshot identity, invocation creation, managed spawn validation, native spawn registration, SQLite registry persistence, and subagent usage projection.
- Production core typecheck passed with `pnpm tsgo:core`.
- Core-test typecheck passed once; later repeat attempts intermittently stalled in the native TypeScript preview without diagnostics. The focused test files continued to pass.
- Scoped `oxfmt`, `oxlint`, and `git diff --check` pass.
- `pnpm check:changed` is locally blocked by an inherited current-base max-lines ratchet entry for `src/plugins/update.ts`; this PR does not touch that file.
- Codex autoreview could not authenticate from WSL (HTTP 401). Manual source review corrected the run-token total to input plus output and found no further actionable issue.
- Fork CI passes real-behavior proof, runner admission, workflow sanity, and dispatch. Draft/fork admission skips the main test matrix. Auto-response and label jobs lack the fork's GitHub App secret; the Linux companion compiled and bundled successfully, then failed only because the fork lacks `TAURI_SIGNING_PRIVATE_KEY`.

Head `fe043820a78`; incremental diff over #97: 24 files, 488 additions, 13 deletions.

No paid-provider run was performed.

## Auditable Skills series

1. [RFC 0022](https://github.com/giodl73-repo/rfcs/pull/6)
2. [OpenClaw #97 - record durable outcome receipts](https://github.com/giodl73-repo/openclaw/pull/97)
3. **OpenClaw #98 - track managed skill runs**
4. [OpenClaw #100 - managed run results](https://github.com/giodl73-repo/openclaw/pull/100)
5. [OpenClaw #109 - exact-run token usage](https://github.com/giodl73-repo/openclaw/pull/109)
6. [Lobster #1 - accounting continuity prototype](https://github.com/giodl73-repo/lobster/pull/1)

The former large #98 remains available as `prototype/auditable-skills-poc-managed-invocation`. Compact #100 and #109 stack directly on this smaller reviewer-facing slice. Everything remains fork-only and draft; nothing is proposed to upstream OpenClaw.

## Current continuation

The compact fork series now continues through [#109](https://github.com/giodl73-repo/openclaw/pull/109), which retains cumulative usage on the exact native managed run, and [#113](https://github.com/giodl73-repo/openclaw/pull/113), which deduplicates explicit completed run IDs and applies an optional caller-owned between-step token ceiling. This PR's scope is unchanged; the later slices build on its native boundary without adding a second execution, usage, or budget ledger.
