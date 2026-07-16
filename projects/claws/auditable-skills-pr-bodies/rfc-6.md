## Opportunity

Agent Skills describes how to package a reusable capability. Auditable Skills asks what should remain after that capability runs so a person or another agent can find the work, understand the outcome, and account for its cost.

For a customer issue, refund, shipment, invoice, or other durable task, an operator should be able to answer:

- What outcome was actually recorded, and what object did it affect?
- Which session or channel thread did the work happen in?
- Can the outcome be searched by exact type, counted across agents, and revisited later?
- Which exact skill, invocation, child run, tool, and model produced it?
- How many tokens and US dollars did the run and workflow consume?
- Did accounting survive an approval pause or cancellation?

RFC 0022 defines a portable foundation for those answers without turning `SKILL.md` into a workflow language or making a skill its own trusted auditor.

## The core model

The proposal separates three owners:

1. **The skill declares intent.** Portable metadata describes outcomes the skill may produce, skills it may use, and whether managed execution should be isolated.
2. **The caller supplies policy.** A Claw or direct caller decides authority, allowed composition, models, and limits.
3. **The runtime records facts.** OpenClaw records observed outcome evidence, exact execution lineage, normalized usage, and cost.

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

## Durable, searchable outcome evidence

```json
{
  "type": "payment.refunded",
  "subject": { "type": "invoice", "id": "INV-1042" },
  "data": { "authorizationCode": "AUTH-9482" }
}
```

The tool owns these business fields. The harness adds facts it can observe reliably: receipt ID and time, agent, session and run, exact skill revision, invocation lineage, and tool identity.

The full receipt is recorded once in a configurable store shared by the Gateway's agents. OpenClaw's v1 profile is local SQLite, defaulting to `~/.openclaw/state/receipts.sqlite`; deployments may choose another local path. The ordinary session trajectory retains only an `audit.receipt.recorded` reference, so evidence is not duplicated into every session database and can outlive trajectory rotation under its own retention policy.

Stable `type` and optional producer-owned `subject` make this history easy to query. An operator can find every `payment.refunded`, count outcomes across agents, inspect `AUTH-9482`, and return to the originating thread. SQLite is deliberately a single-host profile; a future remote provider can implement the same receipt-store boundary for multi-host deployments.

For a support agent, this is a useful mini-CRM seam: the channel thread remains the work history, typed outcomes make completed work discoverable, and receipt data preserves concrete proof. It does not attempt to replace accounts, queues, ownership, SLA, or authoritative line-of-business systems.

## A natural path to workflows

The RFC deliberately does not add steps, expressions, loops, approvals, model choices, or budgets to `SKILL.md`.

- OpenClaw owns sessions, the shared receipt store, managed skill execution, policy, lineage, and observed child-run usage.
- The selected runner owns ordering, workflow status, aggregation, and limit decisions through one normalized managed-step result.
- A minimal OpenClaw core runner can provide static dependencies, failure, cancellation, receipt gates, and totals without Lobster.
- Lobster can remain the advanced runner for conditions, retries, approvals, structured input, and durable resume.
- TaskFlow owns durable flow identity and linked child lifecycle.
- A Claw or direct caller owns allowed composition and execution policy.

Recorded outcomes can become completion gates. `uses-skills` can inform managed composition. `isolation` creates an honest execution and accounting boundary. The current proof uses Lobster, but the contract is runner-neutral and includes a mechanical path to an optional adapter or small core runner.

## Implementer specifications

Following the sidecar pattern established by RFC 0009, the readable proposal is accompanied by two normative contracts:

- [Auditable Skills v1 core specification](https://github.com/giodl73-repo/rfcs/blob/agent/rfc-0022-skill-invocation-audit/rfcs/0022/auditable-skills-v1-spec.md) defines portable metadata, receipt production and storage, trajectory references, invocation lineage, run usage and cost, queries, retention boundaries, failure behavior, and conformance.
- [Orchestration runner v1 addendum](https://github.com/giodl73-repo/rfcs/blob/agent/rfc-0022-skill-invocation-audit/rfcs/0022/orchestration-runner-v1-spec.md) defines the runner boundary, minimal core profile, Lobster adapter, accounting invariants, capability discovery, and phased removal of a hard Lobster dependency.

This is the same readable-RFC-plus-sidecars pattern now used by RFC 0009. A third sidecar is not needed: storage and queries belong to the core contract; workflow behavior belongs to the runner addendum.

## What changed for the next review round

- Receipts are now a first-class OpenClaw resource with one storage-neutral `get`, `list`, and `count` boundary shared by CLI, Gateway, plugins, UI, exports, and workflow adapters.
- The core spec defines stable pagination, exact filter semantics, harness-owned idempotency, consistent authorization for reads and counts, and explicit no-fallback behavior.
- The SQLite profile now has ordinary production expectations: bounded writes, schema checks and atomic migrations, health diagnostics, private files, consistent snapshot backup/export, and independent retention.
- Workflow receipt gates distinguish an outcome that was never recorded from a trajectory reference whose retained receipt is unavailable.
- One repeatable support-email fixture is the reference success proof: record verification, resolve from another authorized local agent, record resolution, list/count/show the evidence, reopen the thread, and report child-run tokens once.
- The five implementation PRs are explicitly POC evidence, not the proposed landing stack.

## Recommended landing rounds

1. **RFC and core receipts:** land trusted tool receipts, the shared store, trajectory references, and `get/list/count` without skill metadata or a workflow dependency.
2. **Managed invocation:** add the optional Agent Skills declarations, exact skill identity, isolated invocation, lineage, and run-level usage after the receipt boundary settles.
3. **Runner adapters and accounting:** expose the normalized managed-step result to a minimal core runner and optional Lobster adapter; keep Lobster pause/resume accounting in Lobster.

Each round is independently useful and reviewable. The Agent Skills standards opportunity stays smaller still: portable declarations and the rule that declarations are not evidence or authority. Storage, sessions, accounting, and workflows remain harness concerns.

## POC evidence series

1. **[RFC 0022 - Auditable Skills](https://github.com/giodl73-repo/rfcs/pull/6)**
2. [OpenClaw #97 - record and find durable outcomes](https://github.com/giodl73-repo/openclaw/pull/97)
3. [OpenClaw #98 - invoke managed skills with lineage](https://github.com/giodl73-repo/openclaw/pull/98)
4. [OpenClaw #100 - compose evidence-driven workflows](https://github.com/giodl73-repo/openclaw/pull/100)
5. [Lobster #1 - preserve workflow accounting across pauses](https://github.com/giodl73-repo/lobster/pull/1)
6. [OpenClaw #109 - report managed workflow spend](https://github.com/giodl73-repo/openclaw/pull/109)

The implementation slices prove the progression independently: shared durable outcomes and retrieval; exact managed invocation lineage; evidence-driven approved composition; accounting continuity across pauses; and observed child usage rolled into workflow spend.

RFC head `1482d0b7` is based on current upstream RFC `main` and contains the proposal plus two sidecar specifications (3 files, 1,899 additions). Every PR remains draft, fork-only review material. Nothing has been proposed to the upstream OpenClaw, Lobster, or RFC repositories.
