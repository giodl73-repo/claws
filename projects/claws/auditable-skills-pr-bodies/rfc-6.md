## Opportunity

Agent Skills describes how to package a reusable capability. Auditable Skills asks what must remain after that capability runs so a person or another agent can find the work, understand the outcome, and account for its cost.

For a customer issue, refund, shipment, invoice, or other durable task, an operator should be able to answer:

- What outcome was actually recorded, and what object did it affect?
- Which session or channel thread did the work happen in?
- Which exact skill, invocation, child run, tool, and model produced it?
- Can the outcome be searched, counted, grouped, and revisited?
- How many tokens and US dollars did the run and workflow consume?
- Did accounting survive an approval pause or cancellation?

RFC 0022 defines a portable foundation for those answers without turning `SKILL.md` into a workflow language or making a skill its own trusted auditor.

## The core model

The proposal separates three owners:

1. **The skill declares intent.** Portable metadata describes outcomes the skill may produce, skills it may use, and whether managed execution should be isolated.
2. **The caller supplies policy.** A Claw or direct caller decides authority, allowed composition, models, and limits.
3. **The runtime records facts.** OpenClaw records observed outcome evidence, exact execution lineage, normalized usage, and cost inside its existing session/run history.

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

## Durable outcome evidence

```json
{
  "type": "payment.refunded",
  "subject": { "type": "invoice", "id": "INV-1042" },
  "data": { "authorizationCode": "AUTH-9482" }
}
```

The tool owns the business fields. The harness adds facts it can observe reliably: session and run identity, exact skill source and revision, invocation and child-run lineage, tool and model identity, time, normalized token usage, and captured cost.

Existing OpenClaw session identity already retains the channel thread. Stable outcome `type` and optional producer-owned `subject` make the resulting work searchable without adding a second business-object identity model to core. An operator can find every `payment.refunded`, group outcomes by type or skill revision, inspect an authorization code, and return to the originating thread.

## A natural path to workflows

The RFC deliberately does not add steps, expressions, loops, approvals, model choices, or budgets to `SKILL.md`.

- OpenClaw owns sessions, managed skill execution, policy, evidence, lineage, and observed child-run usage.
- Lobster owns deterministic pipelines, conditions, approvals, pause/resume, workflow accounting, and `cost_limit`.
- TaskFlow owns durable flow identity and lifecycle.
- A Claw or direct caller owns allowed composition and execution policy.

Recorded outcomes can become completion gates. `uses-skills` can inform managed composition. `isolation` creates an honest execution and accounting boundary. These are stepping stones to workflows, not a second workflow engine.

## Auditable Skills series

1. [RFC 0022 - Auditable Skills](https://github.com/giodl73-repo/rfcs/pull/6)
2. [OpenClaw #97 - record and find durable outcomes](https://github.com/giodl73-repo/openclaw/pull/97)
3. [OpenClaw #98 - invoke managed skills with lineage](https://github.com/giodl73-repo/openclaw/pull/98)
4. [OpenClaw #100 - compose evidence-driven workflows](https://github.com/giodl73-repo/openclaw/pull/100)
5. [Lobster #1 - preserve workflow accounting across pauses](https://github.com/giodl73-repo/lobster/pull/1)
6. [OpenClaw #109 - report managed workflow spend](https://github.com/giodl73-repo/openclaw/pull/109)

The implementation slices prove the progression independently: durable outcomes and retrieval; exact managed invocation lineage; evidence-driven approved composition; accounting continuity across pauses; and observed child usage rolled into workflow spend.

The stack has been reduced after implementation learning: the separate session business-association concept was removed. The series now relies on native session/thread identity plus receipt type and subject.

Automatic fork CI passed on all four rebuilt OpenClaw heads. Complete fork CI is running on the consolidated [#100 workflow head](https://github.com/giodl73-repo/openclaw/actions/runs/29454546127) and [#109 accounting head](https://github.com/giodl73-repo/openclaw/actions/runs/29454548242).

This RFC and every implementation PR remain draft, fork-only review material. Nothing has been proposed to the upstream OpenClaw, Lobster, or RFC repositories.
