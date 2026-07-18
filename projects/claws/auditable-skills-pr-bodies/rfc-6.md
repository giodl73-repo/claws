## Opportunity

Agent Skills describes reusable capability. Auditable Skills asks what should remain after that capability runs.

For a customer issue, shipment, invoice, refund, or other durable task, an operator or later agent should first be able to answer four ordinary questions:

- What outcome was recorded, and what object did it affect?
- Which agent, session, run, and tool recorded it?
- Can it be searched by exact type, counted, and revisited later?
- What concrete evidence, such as an authorization code, came back?

RFC 0022 starts with a typed receipt resource that answers those questions. It does not require a workflow engine, managed skill execution, or new CRM object model.

## The first product round: durable receipts

```json
{
  "type": "payment.refunded",
  "subject": { "type": "invoice", "id": "INV-1042" },
  "data": { "authorizationCode": "AUTH-9482" }
}
```

The trusted tool owns the business fields. OpenClaw adds facts it can observe: receipt ID and time, agent, session and run, and tool identity. The full receipt is stored once; the ordinary trajectory keeps only a bounded reference.

Stable `type` and optional producer-owned `subject` make completed work easy to find and count. For a support agent, the channel thread remains the work history while typed outcomes provide a useful mini-CRM index over facts such as `customer.verified` and `case.resolved`. This does not replace accounts, queues, ownership, SLAs, or authoritative line-of-business systems.

The fork proof exercised that boundary with nine receipts across three stable email-thread sessions. After the recording process exited, fresh processes counted three opened cases and two resolved outcomes, recovered inventory tracking evidence by session, and retrieved a refund authorization code by receipt ID. Receipt Core did not invent an authoritative unresolved queue from the remaining opened case.

OpenClaw's proof profile uses configurable single-host SQLite, defaulting to `~/.openclaw/state/receipts.sqlite`. The producer and `get/list/count` semantics are portable, but Round 1 deliberately implements them directly in the SQLite module. A provider interface should be extracted only when a second store exists.

## Later evidence, not Round 1 dependencies

The broader POC tested three possible consumers of receipts:

1. portable `SKILL.md` declarations for intended outcomes, possible child skills, and isolation intent;
2. exact managed child-run identity and honest run-level token usage;
3. caller-owned budget decisions and workflow adapters that consume observed receipts.

Those ideas preserve a useful ownership rule:

> `SKILL.md` declares intent. A caller supplies policy. The OpenClaw runtime records facts.

But they do not need to land together. Receipt adoption should determine whether managed skill identity and usage are worth a second round. Workflow execution should wait for a concrete consumer rather than become part of the receipt pitch.

## Portable Agent Skills opportunity

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

These string values fit the existing Agent Skills metadata contract and may be ignored by implementations. They are declarations—not evidence, dependencies, permission grants, model choices, or budgets. Community vocabulary should be proposed only after at least two harnesses or compatibility fixtures prove the same words useful.

## Implementer specifications

Following the sidecar pattern established by RFC 0009, the readable proposal has two implementer references:

- [Receipt Core and later extension profiles](https://github.com/giodl73-repo/rfcs/blob/agent/rfc-0022-skill-invocation-audit/rfcs/0022/auditable-skills-v1-spec.md) makes Receipt Core the only Round 1 conformance profile. Skill declarations, managed identity, and run accounting are explicitly later profiles with separate test vectors.
- [Future orchestration runner addendum](https://github.com/giodl73-repo/rfcs/blob/agent/rfc-0022-skill-invocation-audit/rfcs/0022/orchestration-runner-v1-spec.md) preserves the runner research for a concrete future consumer. It is non-normative for Receipt Core and does not select Lobster, TaskFlow, or a built-in OpenClaw engine.

Receipt admission is bounded per tool result. The SQLite profile must prepare payloads before acquiring its write lock, commit one bounded batch, initialize or migrate schema transactionally, and keep sensitive evidence under an explicit access, backup, export, and retention boundary.

## Recommended landing rule

1. **Core receipts:** evaluate trusted tool receipts, the shared store, trajectory references, and `get/list/count` as a standalone OpenClaw product.
2. **Managed identity and usage, only after adoption:** retain exact skill identity and cumulative observed usage on the native child run without adding another lifecycle or ledger.
3. **Caller-owned token decisions, only if operators need them:** deduplicate explicit completed run IDs and compare exact usage with an optional ceiling.
4. **Orchestration, only for a concrete consumer:** reuse OpenClaw-owned receipt, result, usage, and dispatch APIs. Require restart-safe attempt idempotency before automatic replay. Do not select a new core engine in this RFC.

Lack of demand for a later round is a valid stopping point.

## POC evidence series

- **[RFC 0022 - Auditable Skills](https://github.com/giodl73-repo/rfcs/pull/6)**
- [OpenClaw #97 - standalone durable outcome receipts](https://github.com/giodl73-repo/openclaw/pull/97)
- [OpenClaw #98 - managed skill identity](https://github.com/giodl73-repo/openclaw/pull/98)
- [OpenClaw #100 - managed result](https://github.com/giodl73-repo/openclaw/pull/100)
- [OpenClaw #109 - exact-run usage](https://github.com/giodl73-repo/openclaw/pull/109)
- [OpenClaw #113 - between-step token decision](https://github.com/giodl73-repo/openclaw/pull/113)
- [OpenClaw #114 - canonical managed dispatch](https://github.com/giodl73-repo/openclaw/pull/114)
- [Lobster #1 - accounting continuity experiment](https://github.com/giodl73-repo/lobster/pull/1)

The POC series proves compatibility and exposes architectural limits. It is not the proposed landing stack. Every PR remains draft and fork-only; nothing has been proposed to the upstream OpenClaw, Lobster, or RFC repositories.
