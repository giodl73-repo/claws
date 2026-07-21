# Slice 4: outbound run correlation

## Candidate

- Evidence: [openclaw/openclaw#50291](https://github.com/openclaw/openclaw/issues/50291)
- Fork PR: [giodl73-repo/openclaw#148](https://github.com/giodl73-repo/openclaw/pull/148)
- Revision: `2347e079e43`
- Owner: routed outbound delivery and Plugin SDK message hooks
- Supporting owner: agent run lifecycle

## Authoritative boundary

`routeReply` already receives the agent turn's generated `runId`. It is
authoritative only for delivery produced by that routed turn.

The slice carries that ID through `OutboundSessionContext` into
`message_sending` and `message_sent`. Standalone sends, recovered delivery, and
paths without proven run ownership leave it absent.

## Conformance evidence

- Accepted: routed reply preserves one `runId` from agent dispatch through both
  outbound hook contexts and the `message_sent` event.
- Unknown: delivery without an authoritative run omits `runId`; no session,
  ordering, timestamp, or content-derived substitute is fabricated.
- Concurrency: two turns with the same session key retain distinct run IDs.
- Compatibility: the existing optional `PluginHookMessageContext.runId` field
  and existing hook surfaces are reused.
- Privacy: no message, sender, content, span, or metric-label identity is added.
- Exactly once: existing per-payload hook dispatch is unchanged; the slice adds
  context only.
- Projection: Plugin SDK message hooks only.

## Deliberate exclusions

- inbound `message_received` run identity;
- `messageId` or sender propagation;
- span aliases, parent spans, or call depth;
- subagent requester-run hierarchy; and
- a new trace carrier or correlation registry.

## Deletion target

For routed replies, plugins no longer need session-key plus ordering,
timestamp, or content joins to connect outbound delivery with the owning agent
turn.

## Proof

- 230 focused tests across outbound delivery, session context, routed replies,
  and message-hook mapping.
- Plugin SDK API baseline check.
- Repository formatting and diff checks.
- Formal Codex review: no actionable regression.
