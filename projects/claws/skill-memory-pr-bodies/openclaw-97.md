## Opportunity

Skills increasingly do work that matters after the model turn ends: resolve a customer case, send inventory, pay an invoice, or authorize a refund. Today that completed work is usually recoverable only by reading transcript prose or querying the external system again.

This POC adds **Skill Memory**: a small, typed history of completed work that OpenClaw can recall, filter, and count across agents on one Gateway.

```ts
return {
  content: [{ type: "text", text: "Refund authorized." }],
  details: {},
  memories: [
    {
      type: "payment.refunded",
      subject: { type: "invoice", id: "INV-1042" },
      data: { authorizationCode: "AUTH-9482" },
    },
  ],
};
```

The trusted tool owns the business fact. OpenClaw adds the memory ID, time, agent, session, run, tool, and tool-call correlation it directly observed.

## What this slice adds

- `AgentToolResult.memories` for bounded completed-work facts from successful trusted tools.
- A configurable top-level `skillMemory` store shared by agents on the Gateway.
- A dedicated local SQLite profile at `~/.openclaw/state/skill-memory.sqlite` by default.
- Deterministic `smem_…` IDs and idempotent batch recording.
- A bounded `skill.memory.remembered` trajectory reference; full producer data is stored once.
- Exact get, list, filter, pagination, and count operations.
- A lazy `openclaw skill-memory` operator command:

```bash
openclaw skill-memory --type case.resolved
openclaw skill-memory --count --type invoice.paid
openclaw skill-memory --id <memory-id>
```

The store can retain sensitive evidence such as an authorization code, so it has its own path, permissions, access, backup, and retention boundary. SQLite is deliberately a single-host profile; it is not placed on a network filesystem or shared directly between Gateway hosts.

## Product boundary

Skill Memory is structured history of completed work. It is separate from semantic memory, vector retrieval, workspace memory files, and transcript recollection.

For a support agent, this creates a useful mini-CRM index over the existing channel thread: exact facts such as `customer.verified` and `case.resolved` become searchable and countable, and a later agent can return to the originating session. It does not invent accounts, queues, assignment, SLAs, an unresolved-case state machine, or authoritative payment truth.

Only a successful trusted tool result can contribute memory. Failed tools, malformed entries, skill declarations, model prose, and assistant claims do not become remembered facts. A storage failure remains observable but does not rewrite the completed tool result.

## Why this is a useful first PR

This is independently useful without managed skill execution or a workflow engine. It establishes the stable resource that later slices can consume:

1. `SKILL.md` may declare fact types it intends to remember.
2. A managed child run can retain exact skill identity and token usage.
3. A caller can make an honest between-step budget decision.
4. A workflow runner can gate steps on observed Skill Memory instead of prose.

Those are follow-ons, not prerequisites for this core.

## Validation

Linux proof on Node 22.22.3:

- 21 focused tests passed across memory normalization, SQLite durability/querying, runner correlation, CLI behavior, and config-doc rendering.
- `docs:list` passed with the renamed CLI page.
- The generated config baseline is current.
- `git diff --check` passes.

The existing support fixture behind this POC records typed case, inventory, and refund facts across multiple agents and sessions, exits the writer process, and verifies fresh-process recall and counting—including retrieval of full authorization evidence by memory ID.

## POC series

- Design: [RFC 0022 — Skill Memory](https://github.com/giodl73-repo/rfcs/pull/6)
- **#97 — remember completed work and recall it later**
- [#98](https://github.com/giodl73-repo/openclaw/pull/98) — associate an exact managed skill run
- [#100](https://github.com/giodl73-repo/openclaw/pull/100) — return a runner-neutral managed result
- [#109](https://github.com/giodl73-repo/openclaw/pull/109) — retain exact-run token usage
- [#113](https://github.com/giodl73-repo/openclaw/pull/113) — make an honest token-limit decision
- [#114](https://github.com/giodl73-repo/openclaw/pull/114) — centralize managed dispatch for future runners

This remains a fork-only draft POC. The likely first upstream proposal is this Skill Memory Core slice, not the full six-PR research stack.
