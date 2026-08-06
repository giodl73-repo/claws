# Agent Execution Facility

## Boundary

Agent Execution owns one admitted turn from idempotent ingress through session
targeting, runtime preparation, provider/model attempts, tool calls, transcript
settlement, and terminal outcome.

It composes message, model, tool, policy, session, and delivery owners without
absorbing their semantics.

## Child Contracts

1. Ingress and idempotent admission.
2. Session targeting and generation.
3. Run and cancellation lifecycle.
4. Prepared runtime and context generation.
5. Provider/model attempt and fallback.
6. Tool invocation and side-effect mediation.
7. Transcript/session settlement.
8. Terminal outcome and evidence.
9. Delegated and subagent execution.

## Core Objects

- session key and session ID;
- run ID and lifecycle generation;
- reply operation;
- prepared model runtime generation;
- provider/model attempt;
- tool call ID;
- transcript events/cursor;
- terminal outcome; and
- child/subagent run and session.

## Current Guarantees

- Idempotency key is the Gateway run ID.
- Session changes/deletion are rechecked before dispatch.
- Heavy work begins only after session persistence and work admission.
- Same-session and global lanes bound concurrency.
- One prepared runtime generation pins config, plugins, models, and hooks.
- Abort/timeout attribution covers queue, provider, compaction, and tool phases.
- Tool lifecycle is correlated by run ID and tool call ID.
- Final status is normalized before Gateway, task, dedupe, and reply projection.

## Open Gaps

- One documented semantic contract shared by Gateway and channel entry paths.
- Durable provider/model attempt identity.
- Clear relationship among run, reply operation, task run, job, and attempt.
- Compatibility rules for alternate runtimes and CLI backends.
- Dedicated delegated-execution spec.

Source audit: `../source-audit-agent-execution-2026-08-01.md`.
