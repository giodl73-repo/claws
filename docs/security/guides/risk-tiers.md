---
covers: [atom:SM/r5-classification, atom:SM/obo-boundary]
---

# Risk tiers + OBO boundary

Narrative walkthrough of the R1-R5 tier classification and the
On-Behalf-Of (OBO) boundary — the two rules that determine which
tool calls require which approvals.

## Deciding a tool's tier

Ask three questions, in order:

1. **Does this tool read PUBLIC data only?** → R1.
2. **Does this tool read or write TENANT-SCOPED data (same user's inbox, own files)?** → R2 (read) or R3 (write).
3. **Does this tool act OUTSIDE the tenant (send email, post to external API, pay money, access secrets)?** → R4 or R5.

Then ask one more:

4. **Is the external action IRREVERSIBLE (can't be un-done in one click)?** → R5.

Send-email is R5. A posted Slack message is R4 (can be edited/deleted
within a window). Paying money is R5. Fetching a public weather API
is R1.

## Inherited tier (G-CHAIN)

Tier isn't only what you declare. It's `max(declared, ...args_from
propagated)`. If your R1 tool reads from an R3 source, G-CHAIN
compiles its effective tier to R3.

Example:

```markdown
## summarize-private-messages
<!-- risk:R1 -->

### args_from
- source: read-private-messages   # declared R3
```

Compile-time effective tier: R3. The runtime treats every call as R3
— review required, R3 fail-mode applied.

## OBO boundary

Every tool call carries `caller: Principal`. Three forms:

### End-user OBO (interactive)

The user is online, acting right now. `caller = { kind: 'user',
principalId: 'alice@example.com' }`. R4 and R5 calls are fine as
long as the user can respond to the review request.

### Service OBO

A service account acts on behalf of a user when the user is offline
(nightly batch jobs, webhook-triggered flows). `caller = { kind:
'service', principalId: 'batch-job@example.com', onBehalfOf:
'alice@example.com' }`.

Service OBO still allows R4/R5 calls, but the review channel must be
pre-configured (asynchronous approval from a supervisor pool, or
pre-approved scope tokens).

### Agent (autonomous)

The agent has no user attestation for the call — it's acting on its
own initiative. `caller = { kind: 'agent', agentId: '...' }`.

**R4 and R5 calls are REJECTED at compile time** when the caller is
a pure agent. The G-24 rule enforces this: no agent-only OBO on
external-write tools. The runtime also enforces it as a backstop.

## Why this matters

- **R5 is never allowed without review** — no exceptions, regardless
  of caller
- **Agent OBO is capped at R3** — agents can read tenant data and
  write to their own scratch, but nothing external
- **Service OBO unlocks R4/R5 batch paths** — with pre-configured
  async approval

See [../specs/SM-security.md § Risk tiers](../specs/SM-security.md)
and [../specs/SM-security.md § OBO boundary](../specs/SM-security.md)
for the formal rules.
