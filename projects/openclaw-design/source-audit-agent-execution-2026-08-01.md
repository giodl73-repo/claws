# Agent Execution Source Audit - 2026-08-01

## Source Baseline

- Worktree: `C:\src\openclaw-design-audit`
- Head: `bde1602e6e86fd91dd0bec3aae714e059e556c4d`

## Current Architecture

```text
gateway agent request / channel reply turn
        |
        v
preflight + dedupe + routing + content
        |
        v
canonical session resolution + persistence + work admission
        |
        v
run accepted (runId + lifecycle generation + abort owner)
        |
        v
runtime selection + session/global lanes + prepared model runtime
        |
        v
one or more provider/model attempts
        |
        +--> tools / MCP / approvals / subagents
        +--> streaming events and progress
        +--> transcript persistence
        |
        v
normalized terminal outcome + delivery/accounting/dedupe settlement
```

The architecture is mature but layered. Gateway requests, channel auto-replies,
the reply-operation lifecycle, runtime selection, fallback cycles, embedded
attempts, session managers, tool event handlers, and terminal projections each
own part of the turn.

## Objects and Lifetimes

| Object | Current owner | Lifetime / renewal |
| ------ | ------------- | ------------------ |
| Session key | Routing/session owner | Stable logical address for an agent/channel/conversation scope; can survive session ID rotation. |
| Session ID | Session registry/transcript owner | Current transcript generation; renewed on reset, expiry, missing/terminal recovery, or explicit target change. |
| Run ID | Ingress owner | One admitted agent request/turn; Gateway uses the idempotency key as run ID (`agent-request-preflight.ts:224`). |
| Lifecycle generation | Agent event lifecycle owner | Captured at admission; restart/lifecycle rotation invalidates stale work and event ownership. |
| Reply operation | Auto-reply owner | One admitted visible turn from queue/steer through final settlement. |
| Prepared model runtime generation | Model/runtime owner | Pins config, directories, plugins, model selection, hooks, and fallbacks for one run admission. |
| Provider/model attempt | Fallback/embedded runner | One candidate invocation within a run; currently ordered and observed but lacks one obvious portable attempt ID. |
| Tool call | Session/provider tool owner | One tool invocation with `toolCallId`; run plus tool call ID scopes lifecycle state. |
| Terminal outcome | Agent terminal owner | One normalized final classification: ok/error/timeout plus stop reason, liveness, timeout phase, and provider-started evidence. |
| Transcript cursor/events | Session manager | Append-only durable conversation evidence, flushed during attempt settlement. |
| Subagent run/session | Subagent registry | Child execution with separate session/run lifecycle and parent/requester relationships. |

## Current Contracts

### Gateway admission

`agentRunHandler` is explicitly phased: preflight, routing, content, reset,
session preparation/persistence, delivery resolution, run admission, and
execution (`src/gateway/server-methods/agent-run-handler.ts:29`).

The Gateway uses `request.idempotencyKey` as `runId`, reserves dedupe state, and
captures the current lifecycle generation
(`src/gateway/server-methods/agent-request-preflight.ts:224-294`).

### Session resolution

`prepareAgentSession` resolves the canonical key and agent, rejects changed or
deleted sessions, applies reset/freshness policy, guards cron continuation, and
chooses whether to reuse or rotate `sessionId`
(`src/gateway/server-methods/agent-session-prepare.ts:50-270`).

Session state is persisted before heavy execution so admission, restart
recovery, and transcript ownership have a durable target.

### Dispatch and settlement

`dispatchAgentRunFromGateway` bridges admitted work into the agent command,
tracks abort ownership, normalizes completion/error/timeout, persists dedupe
terminal results, settles continuation ownership, and clears run context
(`src/gateway/server-methods/agent-run-dispatch.ts:80`).

### Runtime generation

`runEmbeddedAgent` resolves a non-null session key, enforces session/global
lanes, waits for deferred maintenance, acquires a prepared model runtime, and
rebinds the run to the generation that owns config, directories, model
selection, hooks, fallbacks, and later projections
(`src/agents/embedded-agent-runner/run-orchestrator.ts:55-230`).

### Attempt

`runEmbeddedAttempt` is a staged attempt owner: setup, skills, tool base,
bootstrap, bundle tools, tool catalog, system prompt, session lock/runtime,
prompt execution, transcript settlement, and cleanup
(`src/agents/embedded-agent-runner/run/attempt.ts:58`).

Abort state distinguishes external abort, prompt timeout, compaction timeout,
and tool-execution timeout (`attempt.ts:133-153`).

### Tool calls

Tool lifecycle is keyed by `runId:toolCallId`; the handler records start state,
progress, structured results, message-send receipts, and exactly-once
`after_tool_call` projection
(`src/agents/embedded-agent-subscribe.handlers.tools.ts:299-303`,
`1041-1203`, `1401-1915`).

### Terminal outcome

`buildAgentRunTerminalOutcome` separates restart cancellation, user/rpc
cancellation, hard timeouts, blocked/abandoned liveness, provider reach, and
ordinary errors (`src/agents/agent-run-terminal-outcome.ts:508-567`).

## Evidence

- Gateway abort before registration, during attachment setup, after accepted
  acknowledgement, and during dispatch:
  `src/gateway/server-methods/agent.abort-integration.test-utils.ts:32-1001`.
- Embedded attempt abort/timeout races:
  `src/agents/embedded-agent-runner/run/attempt.abort-race.test.ts:15-100`.
- Append-only transcript settlement:
  `src/agents/embedded-agent-runner/run/attempt-transcript-persistence.e2e.test.ts:47-70`.
- Closed turn settlement and late completion after accepted user abort:
  `src/auto-reply/reply/agent-runner-execution-contract.test.ts:12-79`.

## What Is Covered Well

- Run ID, session key, session ID, lifecycle generation, and tool call ID have
  distinct jobs.
- Session generation is checked repeatedly before side effects.
- Gateway work admission and session/global execution lanes are explicit.
- Runtime config/model/plugin ownership is pinned for a run.
- Cancellation is tested across pre-admission, queue, attachment, provider, and
  tool phases.
- Terminal outcomes preserve timeout phase and provider-started evidence.
- Transcripts are append-only and have explicit flush/repair behavior.
- Tool hooks and message-tool receipts are tied to concrete tool calls.
- Subagents have a dedicated registry, persistence, recovery, and parent
  lifecycle rather than being hidden recursive calls.

## What Is Weak or Monolithic

- There are two major entry compositions: Gateway `agent` requests and
  channel/auto-reply turns. They converge, but the shared semantic contract is
  not documented in one place.
- "Run", "reply operation", "attempt", "session", "task run", and "job" are
  all real objects; their relationship is discoverable mainly through code.
- Provider/model fallback attempts do not expose one obvious stable attempt
  identity comparable to `runId` or `toolCallId`.
- The auto-reply execution layer combines queue/steer behavior, fallback,
  visible reply settlement, delivery accounting, and runtime dispatch.
- The embedded attempt is well factored into files, but still composes context,
  tools, session locking, provider streaming, transcript mutation, and cleanup
  under one large orchestration contract.
- Terminal status is projected into Gateway responses, task tracking, session
  state, reply settlement, and events; drift is controlled by helpers but
  remains a cross-surface risk.

## Separation Decision

Preserve one **Agent Turn Execution** contract with these child specs:

1. ingress and idempotent admission;
2. session targeting and generation;
3. run and cancellation lifecycle;
4. prepared runtime/context generation;
5. provider/model attempt and fallback;
6. tool invocation and side-effect mediation;
7. transcript and session settlement;
8. terminal outcome and evidence; and
9. delegated/subagent execution.

Do not define one universal `Execution` base object. The run, attempt, tool
call, task, and delivery lifetimes are different.

## Revised Rubric

| Dimension | Score | Reason |
| --------- | ----- | ------ |
| Ownership | 3 | Owners exist, but the end-to-end contract spans Gateway, auto-reply, runner, sessions, and tools. |
| Object model | 4 | Session/run/generation/tool/terminal objects are concrete. |
| Contract completeness | 3 | Strong lifecycle and failure behavior; attempt identity and cross-entry semantics need documentation. |
| Separation/cohesion | 2 | Multiple orchestration layers overlap around turn settlement and delivery. |
| Evidence | 4 | Extensive race, abort, persistence, and lifecycle tests. |
| Evolution/operations | 3 | Restart recovery and stale-session handling are strong; mixed-runtime compatibility is less explicit. |

**Total: 19/24 (B), high confidence for the audited core.**
