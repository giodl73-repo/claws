## Opportunity

Skills can do real work, but today the most durable record is often a transcript. That is enough to reconstruct a conversation, but not enough to answer ordinary operational questions reliably:

- Did the case get resolved?
- Which invoice was paid?
- What authorization code did the payment service return?
- Which agent, session, run, and tool did the work?
- How many times did this happen across a team of agents?

RFC 0022 proposes **Skill Memory**: a small, typed history of completed work that an authorized operator or later agent can recall, filter, and count without searching prose.

This is intentionally a natural extension of OpenClaw. The trusted tool already knows the business fact. OpenClaw already knows the agent, session, run, tool call, and time. Skill Memory joins those facts once and retains them in a shared store.

## What a skill remembers

A successful trusted tool may return:

```json
{
  "memories": [
    {
      "type": "payment.refunded",
      "subject": { "type": "invoice", "id": "INV-1042" },
      "data": { "authorizationCode": "AUTH-9482" }
    }
  ]
}
```

The producer owns `type`, optional `subject`, and optional `data`. OpenClaw adds a Skill Memory ID and the execution correlation it directly observed. The full entry is stored once; the ordinary trajectory keeps only a bounded `skill.memory.remembered` reference.

The result is deliberately generic. `case.resolved`, `inventory.sent`, `invoice.paid`, and `payment.authorized` can all use the same envelope while keeping their own producer-defined evidence. Exact types and subjects make the history easy to search and count.

For a customer-support agent, this creates a useful mini-CRM index over the existing channel thread: the conversation remains the work history, while Skill Memory makes completed facts easy to revisit. It does not invent accounts, queues, assignment, SLAs, payment truth, or another line-of-business system.

## Not semantic memory

Skill Memory is structured history of completed work. It is separate from semantic memory, vector retrieval, workspace memory files, and transcript recollection. Those systems help an agent find relevant information; Skill Memory lets an agent recall an exact fact and its provenance.

The operator surface is correspondingly simple:

```bash
openclaw skill-memory --type case.resolved
openclaw skill-memory --count --type invoice.paid
openclaw skill-memory --id <memory-id>
```

OpenClaw's first profile uses configurable single-host SQLite at `~/.openclaw/state/skill-memory.sqlite`. All agents on that Gateway can share it, or an operator can choose another local path for a particular team. The store has its own access, retention, and backup boundary because `data` may contain sensitive evidence.

## A natural path to richer skills

The first useful product does not require a workflow engine. It remembers one completed-work fact, recalls it by ID, filters and counts it, and returns to the originating session.

That stable boundary is also a natural stepping stone:

1. A skill may declare the fact types it intends to remember.
2. A managed child run can retain exact skill identity and token usage.
3. A caller can make honest between-step budget decisions from exact run usage.
4. A workflow runner can gate later steps on observed Skill Memory instead of model prose.

The ownership rule stays simple:

> `SKILL.md` declares intent. A caller supplies policy. OpenClaw remembers facts it observed.

Example portable Agent Skills metadata:

```yaml
---
name: issue-refund
description: Verify a refund request and issue an approved customer refund.
metadata:
  remembers: "payment.refunded customer.notified"
  uses-skills: "verify-customer check-refund-policy"
  isolation: "required"
---
```

These remain string-valued hints under the existing Agent Skills metadata contract. They do not prove work happened, grant permissions, select credentials or models, or set an authoritative budget. A harness may ignore them. Observed `memories` still come only from successful trusted tool results.

## Implementer specifications

Following the RFC sidecar-spec pattern:

- [Skill Memory v1 Core and Extension Profiles](https://github.com/giodl73-repo/rfcs/blob/agent/rfc-0022-skill-invocation-audit/rfcs/0022/skill-memory-v1-spec.md) defines the independently useful core contract plus optional later declaration, managed-identity, and accounting profiles.
- [Future Orchestration Runner Addendum](https://github.com/giodl73-repo/rfcs/blob/agent/rfc-0022-skill-invocation-audit/rfcs/0022/orchestration-runner-v1-spec.md) shows how a runner could consume the same memory and run facts later. It is not required for Skill Memory and does not select Lobster, TaskFlow, or a new built-in workflow engine.

The core implementation stays bounded: a maximum number of entries per tool result, prevalidated payloads, one short SQLite batch transaction, deterministic idempotency, exact filtering and counting, and no reconstruction from transcript prose.

## POC series

The six OpenClaw slices test the path without proposing a six-PR landing stack:

- [#97](https://github.com/giodl73-repo/openclaw/pull/97) — remember completed work and recall it later
- [#98](https://github.com/giodl73-repo/openclaw/pull/98) — associate an exact managed skill run
- [#100](https://github.com/giodl73-repo/openclaw/pull/100) — return one runner-neutral managed result
- [#109](https://github.com/giodl73-repo/openclaw/pull/109) — retain exact-run token usage
- [#113](https://github.com/giodl73-repo/openclaw/pull/113) — make an honest token-limit decision
- [#114](https://github.com/giodl73-repo/openclaw/pull/114) — centralize managed dispatch for future runners

The intended first proposal is much smaller: Skill Memory Core. Managed execution, spend, and orchestration are evidence-backed follow-ons if the core proves useful. Every item remains fork-only and draft; nothing has been opened against upstream OpenClaw or RFC repositories.
