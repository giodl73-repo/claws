## Opportunity

Agent Skills describes how to package a reusable capability. Auditable Skills asks what should remain after that capability runs so a person or another agent can find the work, understand the outcome, and account for its cost.

For a customer issue, refund, shipment, invoice, or other durable task, an operator should be able to answer:

- What outcome was actually recorded, and what object did it affect?
- Which session or channel thread did the work happen in?
- Can the outcome be searched by exact type, counted across agents, and revisited later?
- Which exact skill, native child run, tool, and model produced it?
- How many tokens and US dollars did the run and workflow consume?

RFC 0022 defines a portable foundation for those answers without turning `SKILL.md` into a workflow language or making a skill its own trusted auditor.

## The core model

The proposal separates three owners:

1. **The skill declares intent.** Portable metadata describes outcomes the skill may produce, skills it may use, and whether managed execution should be isolated.
2. **The caller supplies policy.** A Claw or direct caller decides authority, allowed composition, models, and limits.
3. **The runtime records facts.** OpenClaw records observed outcome evidence and attaches exact skill identity to its existing child-run record. The native `runId` joins that identity to sessions, usage, cost, and receipts.

A package can describe capability, but it cannot prove its own success, grant itself tools, or widen its budget.

## Portable Agent Skills declarations

```yaml
---
name: issue-refund
description: Verify a refund request and issue an approved customer refund.
metadata:
  outcomes: "payment.refunded customer.notified"
  uses-skills: "verify-customer check-refund-policy"
  isolation: "required"
---
```

The values remain strings, matching the Agent Skills metadata contract. Implementations may ignore them. They are declarations, not observed evidence, installation dependencies, permission grants, model selection, or authoritative budgets.

This is deliberately a small standards opportunity: common words that any Agent Skills client can understand, with execution and evidence left to the harness.

## Durable, searchable outcome evidence

```json
{
  "type": "payment.refunded",
  "subject": { "type": "invoice", "id": "INV-1042" },
  "data": { "authorizationCode": "AUTH-9482" }
}
```

The tool owns these business fields. The harness adds facts it can observe reliably: receipt ID and time, agent, session and run, exact skill revision, managed invocation ID, and tool identity.

The full receipt is recorded once in a configurable store shared by the Gateway's agents. OpenClaw's v1 profile is local SQLite, defaulting to `~/.openclaw/state/receipts.sqlite`; deployments may choose another local path. The ordinary session trajectory retains only an `audit.receipt.recorded` reference, so evidence is not duplicated into every session database and can outlive trajectory rotation under its own retention policy.

Stable `type` and optional producer-owned `subject` make this history easy to query. An operator can find every `payment.refunded`, count outcomes across agents, inspect `AUTH-9482`, and return to the originating thread. SQLite is deliberately a single-host profile; a future remote provider can implement the same receipt-store boundary for multi-host deployments.

For a support agent, this is a useful mini-CRM seam: the channel thread remains the work history, typed outcomes make completed work discoverable, and receipt data preserves concrete proof. It does not attempt to replace accounts, queues, ownership, SLA, or authoritative line-of-business systems.

## Exact managed runs without another ledger

An accepted managed call resolves one visible skill, starts one ordinary OpenClaw child run, and stores a small immutable descriptor on the native subagent record:

```json
{
  "runId": "run-123",
  "childSessionKey": "agent:support:subagent:abc",
  "managedSkill": {
    "invocationId": "skill-456",
    "skillName": "issue-refund",
    "skillDigest": "sha256:abc123",
    "parentRunId": "run-100"
  }
}
```

OpenClaw already owns child status, cancellation, cleanup, model selection, session identity, and usage. The proposal does not copy those facts into a second invocation lifecycle. `runId` is the canonical join. A rejected pre-dispatch request creates no managed-run record.

The existing subagent view is the first operator surface for skill identity and the run's current usage/cost projection. Workflow accounting later consumes cumulative observed run usage. It must not treat OpenClaw's context-window `totalTokens` snapshot as spend or turn missing usage into zero.

The retention rule is equally direct: if a product promises skill attribution for as long as receipts are retained, it must retain or export the `runId`-to-skill association for that period. If the association is gone, the answer is unavailable—not inferred from transcript prose.

## A natural path to workflows

The RFC deliberately does not add steps, expressions, loops, approvals, model choices, or budgets to `SKILL.md`.

- OpenClaw owns sessions, the shared receipt store, managed child execution, policy, native run lineage, and observed child-run usage.
- The selected runner owns ordering, workflow status, aggregation, and limit decisions through one normalized managed-step result.
- A minimal OpenClaw core runner can provide static dependencies, failure, cancellation, receipt gates, and totals without Lobster.
- Lobster can remain the advanced runner for conditions, retries, approvals, structured input, and durable resume.
- TaskFlow owns durable flow identity and linked child lifecycle.
- A Claw or direct caller owns allowed composition and execution policy.

Recorded outcomes can become completion gates. `uses-skills` can inform managed composition. `isolation` creates an honest execution and accounting boundary.

The archived proof uses Lobster, but the contract is runner-neutral. The next useful core seam is a read-only managed-step result assembled by `runId` from native child identity, terminal state, cumulative usage, and receipts. Either a small OpenClaw runner or Lobster can consume that result without owning another execution ledger.

## Implementer specifications

Following the sidecar pattern established by RFC 0009, the readable proposal is accompanied by two normative contracts:

- [Auditable Skills v1 core specification](https://github.com/giodl73-repo/rfcs/blob/agent/rfc-0022-skill-invocation-audit/rfcs/0022/auditable-skills-v1-spec.md) defines portable metadata, receipt production and storage, trajectory references, native managed-run identity, run usage and cost, queries, retention boundaries, failure behavior, and conformance.
- [Orchestration runner v1 addendum](https://github.com/giodl73-repo/rfcs/blob/agent/rfc-0022-skill-invocation-audit/rfcs/0022/orchestration-runner-v1-spec.md) defines the runner boundary, minimal core profile, Lobster adapter, accounting invariants, capability discovery, and phased removal of a hard Lobster dependency.

Storage and queries belong to the core contract; workflow behavior belongs to the runner addendum.

## What changed for this review round

- Receipts are a first-class OpenClaw resource with one storage-neutral `get`, `list`, and `count` boundary shared by CLI, Gateway, plugins, UI, exports, and workflow adapters.
- The SQLite profile has bounded writes, schema checks and atomic migrations, health diagnostics, private files, consistent backup/export, and independent retention.
- One repeatable support-email fixture is the reference proof: record verification, resolve from another authorized local agent, record resolution, list/count/show the evidence, reopen the thread, and report child-run tokens once.
- Managed skill identity now lives on OpenClaw's native child-run record. There is no second invocation lifecycle, usage ledger, receipt store, or executor.
- `runId` is the canonical join across skill identity, sessions, usage, cost, and receipts; retention and unavailable-data behavior are explicit.
- OpenClaw #97, #98, and #100 have been rebuilt as compact landing candidates. The Lobster and workflow-spend PRs remain archived POC evidence.

## Recommended landing rounds

1. **Core receipts:** land trusted tool receipts, the shared store, trajectory references, and `get/list/count` without skill metadata or a workflow dependency.
2. **Managed child runs:** add the optional Agent Skills declarations and exact skill identity to the existing native child record, then project existing usage and cost without another lifecycle store.
3. **Normalized managed results:** resolve one run by `runId` into identity, terminal state, and receipts. Add cumulative usage only when the native run can prove it. This is the stable input for either a small core runner or Lobster.
4. **Runner adapters and accounting:** add static dependencies, receipt gates, cancellation, and cumulative limits only after the result and usage boundaries settle; keep advanced pause/resume behavior in Lobster.

Each round is independently useful and reviewable. The Agent Skills standards opportunity stays smaller still: portable declarations and the rule that declarations are not evidence or authority. Storage, sessions, accounting, and workflows remain harness concerns.

## POC evidence series

1. **[RFC 0022 - Auditable Skills](https://github.com/giodl73-repo/rfcs/pull/6)**
2. [OpenClaw #97 - record and find durable outcomes](https://github.com/giodl73-repo/openclaw/pull/97)
3. [OpenClaw #98 - track managed skill runs](https://github.com/giodl73-repo/openclaw/pull/98)
4. [OpenClaw #100 - read managed run results](https://github.com/giodl73-repo/openclaw/pull/100)
5. [Lobster #1 - accounting continuity prototype](https://github.com/giodl73-repo/lobster/pull/1)
6. [OpenClaw #109 - workflow spend prototype](https://github.com/giodl73-repo/openclaw/pull/109)

The series proved the progression independently: shared durable outcomes and retrieval; exact managed child-run identity; runner-neutral managed results; accounting continuity across pauses; and observed child usage rolled into workflow spend. The compact proposal keeps the first three OpenClaw slices and uses the later accounting work as evidence, not as a stack maintainers must accept.

Every PR remains draft, fork-only review material. Nothing has been proposed to the upstream OpenClaw, Lobster, or RFC repositories.
