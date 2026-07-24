## The opportunity

Skills can complete real business work, but the useful fact often remains only
in a transcript or the external system that performed it. A later agent should
be able to answer a simpler question: what did this skill finish, and what exact
evidence came back?

This draft POC tests **Skill Memory** as an ordinary Lobster-bundled OpenClaw
plugin. It requires no OpenClaw core changes and no workflow engine. A trusted
tool remembers one typed completed-work fact; another process can recall or
count it later.

## What the proof adds

The disabled-by-default `skill-memory` plugin exposes three optional tools:

- `authorize_return` issues a bounded local proof authorization and remembers
  `return.authorized` with its authorization code.
- `skill_memory_recall` recalls entries by exact memory ID, type, subject,
  agent, session, or session key.
- `skill_memory_count` counts exact matches without loading their payloads.

The companion skill declares intent using ordinary string-valued Agent Skills
metadata:

```yaml
---
name: skill-memory
description: Authorize a customer return and recall the authorization later.
metadata:
  remembers: "return.authorized"
---
```

The declaration does not prove anything happened. The trusted tool returns the
fact that OpenClaw may remember:

```json
{
  "type": "return.authorized",
  "version": 1,
  "subject": { "type": "return", "id": "RET-1001" },
  "data": {
    "orderId": "ORD-9001",
    "authorizationCode": "RMA-2C7A27324C"
  }
}
```

The plugin stores entries in configurable, dedicated
`~/.openclaw/state/skill-memory.sqlite`. It retains the agent, session, tool,
tool call, time, and producer data needed to revisit completed work without
rereading conversation prose.

## Why this is useful

This is the smallest useful version of a mini-CRM-like memory: stable types
such as `case.resolved`, `inventory.sent`, `invoice.paid`, or
`return.authorized` can share one envelope and remain easy to filter and count.
The channel thread remains the work history. Skill Memory provides the typed
index and concrete evidence.

It is also a natural stepping stone to workflows. First remember and recall one
completed fact. Later, if useful, a runner can gate another step on observed
Skill Memory, retain exact child-run usage, or apply a caller-owned budget.

## Proof and boundaries

- All 7 plugin behavior and packaging tests pass.
- Lobster's strict code-mode container wiring validator passes.
- `git diff --check` passes.
- The Rust format recipe could not start on this Windows host because the
  repository's `ms-prod-1.93` Cargo component is not installed; this is an
  environment preflight blocker, not a reported formatting failure.

The plugin is bundled and allowlisted but remains disabled by default.
`authorize_return` is a local proof operation, not a production returns-system
integration. The SQLite file survives agent process restarts in one container,
but is not synchronized across replacement containers. This POC does not claim
to be a CRM, compliance ledger, authoritative case state, or multi-host store.

A future OpenClaw core implementation can replace the plugin-owned recorder and
query tools while preserving the `metadata.remembers` declaration and the
typed memory shape. That migration is deletion-friendly: the plugin proves the
experience without making Lobster a required dependency.

Related design: [RFC 0022: Skill Memory](https://github.com/giodl73-repo/rfcs/pull/6).
