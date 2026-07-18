# Auditable Skills: maintainer brief

## The short version

Agents increasingly complete real business work: resolve a customer issue,
send replacement inventory, authorize a refund, or pay an invoice. The durable
fact that the work completed often remains buried in transcript prose or a
tool-specific system.

Auditable Skills proposes one small OpenClaw primitive: a trusted tool can
attach a typed outcome receipt to a successful result. OpenClaw records the
execution facts it already knows and lets an authorized operator or later agent
get, list, and count the retained outcomes.

```ts
return {
  content: [{ type: "text", text: "Refund approved." }],
  details: {},
  receipts: [
    {
      type: "refund.approved",
      subject: { type: "invoice", id: "INV-2048" },
      data: { authorizationCode: "RFND-AUTH-7721" },
    },
  ],
};
```

This is useful before workflows, budgets, or managed skill invocation exist.

## Why OpenClaw is the natural owner

OpenClaw already observes the trusted tool result, agent, session, run, tool,
tool call, and time. The tool owns the business fact; OpenClaw adds only the
execution facts it can verify. That produces a useful boundary:

> Tools state what happened. OpenClaw records where and when it happened.

The prototype reuses the existing sanitized tool-result observer, session and
run identity, trajectory references, configuration, CLI registration, and
SQLite conventions. It does not introduce a workflow engine or a generic
storage framework.

## What we proved

The fork prototype recorded nine outcomes across three customer email threads
and two agents. After the recording process exited, fresh processes:

- counted three `case.opened` and two `case.resolved` outcomes;
- listed both resolved cases with exact agent, session, run, tool, and tool-call
  correlation;
- recovered an `inventory.sent` tracking number from the originating thread;
- retrieved a full `refund.approved` receipt by ID, including authorization
  code `RFND-AUTH-7721` from the deterministic fixture.

Receipt recording is bounded to 16 candidates per tool result, prepared before
the SQLite write lock, committed as one atomic batch, and contained so a receipt
store failure cannot rewrite a completed tool result.

## What it deliberately is not

Receipt Core is not a CRM, payment ledger, workflow engine, compliance
attestation, or authoritative case-state machine. It does not infer an
unresolved queue from a missing `case.resolved` receipt. The channel, CRM, or a
future workflow consumer still owns that projection.

The initial implementation is single-host SQLite. Multi-host storage,
automated retention, backup/export, and store health are production follow-ups,
not hidden claims in the first proposal.

## Natural path forward

If Receipt Core proves useful, it creates clean stepping stones:

1. portable `SKILL.md` declarations for intended outcomes;
2. exact managed skill and child-run identity;
3. honest run-level token and cost accounting;
4. caller-owned budget decisions;
5. workflow orchestration for a concrete consumer.

None of those later steps is required to adopt receipts, and lack of demand is
a valid stopping point.

## Review material

- [RFC 0022: Auditable Skills](https://github.com/giodl73-repo/rfcs/pull/6)
- [OpenClaw Receipt Core prototype](https://github.com/giodl73-repo/openclaw/pull/97)

Both are draft, mergeable, fork-only proposals. Nothing has been opened or
merged upstream.

## The decision

The first question is intentionally narrow:

> Should a durable, typed outcome from a successful trusted tool be a core
> OpenClaw resource that later agents and operators can retrieve and count?

If yes, the next conversation is the Receipt Core contract and landing shape.
Managed skills, token budgets, and orchestration can remain later decisions.
