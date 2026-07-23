# Slice 7: runtime LLM usage attribution

## Candidate

- Evidence: [openclaw/openclaw#98968](https://github.com/openclaw/openclaw/issues/98968)
- Fork PR: [giodl73-repo/openclaw#150](https://github.com/giodl73-repo/openclaw/pull/150)
- Revision: `06ed6cb65ba`
- Owner: plugin/context-engine LLM runtime
- Projection owner: diagnostics

## Owner handoff update

The broader
[openclaw/openclaw#13219](https://github.com/openclaw/openclaw/issues/13219)
asks for a dedicated usage-log product surface. Open upstream PR
[openclaw/openclaw#107937](https://github.com/openclaw/openclaw/pull/107937)
already implements this slice's exact runtime-boundary emission with additional
plugin attribution and exporter schema changes.

This fork revision must not be promoted unchanged: its `durationMs` would be
recorded by the current OTel consumer as `openclaw.run.duration_ms`, although a
plugin completion is not an agent run. See
`owner-handoff-runtime-llm-usage-2026-07-21.md` for the owner choices.

## Authoritative boundary

`api.runtime.llm.complete` already owns the successful host completion. It
normalizes provider usage, resolves explicit or estimated cost, and retains the
authoritative agent, provider, model, and optional session binding before
returning the result to the trusted caller.

The slice emits the existing `model.usage` diagnostic immediately after that
successful accounting boundary. These completions bypass the normal reply,
cron, ingress, and worker usage projections, so the owner-local event does not
duplicate another aggregate.

## Conformance evidence

- Accepted: one successful completion projects the exact normalized input,
  output, cache-read, cache-write, derived prompt, total, and cost values.
- Empty: zero or absent projected usage emits no event.
- Failure: a rejected provider completion emits no success-shaped usage event.
- Activation: `diagnostics.enabled: false` suppresses the projection.
- Exactly once: one event is emitted after one successful host completion; any
  provider-internal retry remains inside that owner result.
- Attribution: session key is included only when supplied by trusted runtime
  authority; agent, provider, and model come from the resolved host completion.
- Privacy: caller identity, purpose, prompts, responses, channel, account,
  session ID, and raw provider data are not added to the diagnostic contract.
- Correlation: trusted dispatch retains any active diagnostic trace context;
  no run, channel, or session identity is fabricated.
- Compatibility: the existing `model.usage` payload and
  `runtime.llm.complete` result contracts remain unchanged.

## Deliberate exclusions

- a standalone usage JSONL ledger or storage policy;
- new source, caller, purpose, or plugin identity fields;
- channel, run, or session identifiers not owned by this boundary;
- pricing availability semantics, budgets, quotas, or enforcement; and
- a new event type, plugin hook, config surface, or shared accounting helper.

## Deletion target

Operators no longer need runtime logs or plugin-specific instrumentation to
observe provider/model/session usage for successful
`api.runtime.llm.complete` calls.

## Proof

- 25 focused runtime LLM tests.
- Exact usage/cost, disabled, empty, failed, and single-emission fixtures.
- Changed-file formatting and lint checks.
- Formal `codex review --uncommitted`: clean with no actionable findings.
