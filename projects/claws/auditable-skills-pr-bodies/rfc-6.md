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

The compact accounting slice now carries OpenClaw's cumulative native-run usage through its existing terminal lifecycle and `agent.wait` result, then snapshots it on the exact subagent record. A later session turn cannot rewrite that historical run, and a steer replacement starts without inherited usage. Exact historical USD remains optional until OpenClaw can capture the amount and pricing basis with the run; a mutable session estimate is not a durable cost receipt.

A second compact slice lets a caller name completed managed run IDs, count each once, and optionally compare their exact token total with a caller-owned ceiling. It returns `within_limit`, `limit_reached`, or explicit unavailable accounting. The ceiling is not stored and the check does not reserve future tokens; it is the smallest useful between-step decision primitive.

The retention rule is equally direct: if a product promises skill attribution for as long as receipts are retained, it must retain or export the `runId`-to-skill association for that period. If the association is gone, the answer is unavailable—not inferred from transcript prose.

## A natural path to workflows

The RFC deliberately does not add steps, expressions, loops, approvals, model choices, or budgets to `SKILL.md`.

- OpenClaw owns sessions, the shared receipt store, managed child execution, policy, native run lineage, and observed child-run usage.
- A parent OpenClaw agent can already provide the smallest useful sequence: invoke one managed skill, inspect its native result and receipts, check exact accumulated usage, and decide whether to invoke the next skill.
- The selected durable runner owns ordering, workflow status, aggregation, and limit decisions through one normalized managed-step result.
- OpenClaw #114 extracts the trusted host dispatch function and routes `sessions_spawn` through it. Once that boundary also has host-derived step-attempt idempotency, a minimal TaskFlow-backed core runner can provide static dependencies, failure, cancellation, receipt gates, and totals without Lobster.
- Lobster can remain the advanced runner for conditions, retries, approvals, structured input, and durable resume.
- TaskFlow owns durable flow identity and linked child lifecycle.
- A Claw or direct caller owns allowed composition and execution policy.

Recorded outcomes can become completion gates. `uses-skills` can inform managed composition. `isolation` creates an honest execution and accounting boundary.

The agent-driven profile also permits an allowed model choice on each direct managed spawn. It proves useful sequential composition, receipt gates, and token limits now, without claiming a separate workflow ID, automatic replay, or restart-safe next-step dispatch.

The archived proof uses Lobster, but the contract is runner-neutral. OpenClaw #100 supplies the read-only managed result, #109 adds exact-run cumulative usage, #113 provides a bounded between-step token decision over explicit run IDs, and #114 extracts one host-owned managed-skill dispatch path shared by `sessions_spawn` and future core controllers. A runner must use that path rather than reproduce visibility, policy, isolation, sandbox, model, tool, or depth checks in a plugin or controller. #114 deliberately stops before durable step-attempt idempotency.

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
- The first composition profile needs no new executor: a parent agent can sequence native managed runs using result, receipt, and exact-token decisions. Durable TaskFlow orchestration waits for a trusted non-model managed dispatch seam.
- OpenClaw #97, #98, #100, #109, #113, and #114 are compact, independently reviewable evidence slices. The earlier Lobster workflow experiments remain archived POC evidence.

## Recommended landing rounds

1. **Core receipts:** land trusted tool receipts, the shared store, trajectory references, and `get/list/count` without skill metadata or a workflow dependency.
2. **Managed child runs and results:** add the optional Agent Skills declarations and exact skill identity to the existing native child record, then resolve one run by `runId` into identity, terminal state, and receipts.
3. **Exact-run accounting:** carry cumulative observed usage through native completion, retain it with the exact run, and expose it as an optional result field. Capture cost and basis with the run before claiming historical USD or enforcing USD limits.
4. **Between-step token budgets:** deduplicate explicit completed managed runs and apply an optional caller-owned token ceiling without adding a ledger or claiming reservation.
5. **Agent-driven sequence proof:** use the parent agent, managed `sessions_spawn`, native result and receipt queries, and exact usage checks to demonstrate one-step-at-a-time composition with optional allowed model selection.
6. **Managed dispatch seam:** extract one host-owned managed-skill dispatch function and make `sessions_spawn` use it, keeping trusted resolution, managed identity, and native child admission in one path without adding workflow state or plugin authority.
7. **Idempotent runners:** add host-derived workflow/step/attempt idempotency to that boundary; then add a deterministic TaskFlow controller. Keep advanced pause/resume behavior in Lobster.

Each round is independently useful and reviewable. The Agent Skills standards opportunity stays smaller still: portable declarations and the rule that declarations are not evidence or authority. Storage, sessions, accounting, and workflows remain harness concerns.

## POC evidence series

1. **[RFC 0022 - Auditable Skills](https://github.com/giodl73-repo/rfcs/pull/6)**
2. [OpenClaw #97 - record and find durable outcomes](https://github.com/giodl73-repo/openclaw/pull/97)
3. [OpenClaw #98 - track managed skill runs](https://github.com/giodl73-repo/openclaw/pull/98)
4. [OpenClaw #100 - read managed run results](https://github.com/giodl73-repo/openclaw/pull/100)
5. [OpenClaw #109 - retain exact-run token usage](https://github.com/giodl73-repo/openclaw/pull/109)
6. [OpenClaw #113 - check exact-run token budgets](https://github.com/giodl73-repo/openclaw/pull/113)
7. [OpenClaw #114 - centralize managed skill dispatch](https://github.com/giodl73-repo/openclaw/pull/114)
8. [Lobster #1 - accounting continuity prototype](https://github.com/giodl73-repo/lobster/pull/1)

The series proves the progression independently: shared durable outcomes and retrieval; exact managed child-run identity; runner-neutral managed results; cumulative retry-aware token usage retained by exact run; an optional caller-owned between-step token decision; one canonical host-managed dispatch path; and accounting continuity across pauses. Agent-driven sequential composition is possible over those facts now. Host-derived step-attempt idempotency is the remaining prerequisite before a durable TaskFlow controller.

Every PR remains draft, fork-only review material. Nothing has been proposed to the upstream OpenClaw, Lobster, or RFC repositories.
