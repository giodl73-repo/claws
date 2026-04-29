# Turn Anatomy

<!-- atom:openclaw-turn-anatomy (OC-G04) -->

A single chat turn touches eleven hook firings, four claiming gates, two
sync-only hot-path guards, one approval flow, and one sandbox boundary
before a reply lands in the user's channel. Knowing the order matters
because every plugin registers somewhere in this flow — and registering at
the wrong point either misses the data you wanted or gets called too late
to act on it.

---

## Phases at a glance

| Phase | Trigger | Output |
|-------|---------|--------|
| 1. Inbound | channel adapter parses | `MessageContext` |
| 2. Claim gates | `inbound_claim`, `before_dispatch` | optional short-circuit |
| 3. Active memory | blocking sub-agent | `NONE` or fact summary |
| 4. Context assembly | `context-engine.assemble()` | `messages[]` + `systemPromptAddition` |
| 5. Prompt build | `before_model_resolve` + `before_prompt_build` | final prompt |
| 6. LLM call | provider plugin `streamFn` | tokens |
| 7. Tool calls | `before_tool_call` + `resolveExecTarget` | host or sandbox exec |
| 8. Finalize | `before_agent_finalize`, `tool_result_persist`, `before_message_write` | session state |
| 9. Outbound | `message_sending`, `reply_dispatch` | channel adapter outbound |

---

## Hook firings in order

```proof:tree kind=taxonomy
root: A chat turn
- 1 Channel inbound: parse, auth, ack reaction
- 2 Claim gates: inbound_claim, message_received, before_dispatch
- 3 Active memory: blocking sub-agent, NONE or compact summary
- 4 Context engine assemble: messages in transcript order, token budget
- 5 Prompt build: before_model_resolve first-wins, before_prompt_build 15s timeout
- 6 Diagnostic event: context.assembled with trusted=true
- 7 LLM call: model_call_started, llm_input, llm_output, model_call_ended
- 8 Tool dispatch: before_tool_call fail-closed, resolveExecTarget
- 9 Tool execute: docker exec stdio or in-process
- 10 Tool observe: after_tool_call, exec.process.completed event trusted=false
- 11 Finalize: before_agent_finalize precedence, tool_result_persist sync hot
- 12 Outbound: message_sending cancel-sticky, reply_dispatch claiming
- 13 Channel outbound: chunk to 4096 chars, render entities, sendMessage
```

---

## Claiming vs modifying vs observing

The eleven firings split into three behavior classes. Knowing which is
which prevents wrong-tool-for-the-job mistakes.

| Class | Hooks | Behavior |
|-------|-------|----------|
| Claiming | `inbound_claim`, `before_dispatch`, `before_agent_reply`, `reply_dispatch` | first plugin returning `handled=true` wins, remaining plugins skipped |
| Modifying | `before_model_resolve`, `before_prompt_build`, `agent_turn_prepare`, `before_agent_finalize`, `before_tool_call`, `message_sending`, `subagent_spawning`, `subagent_delivery_target` | sequential merge with hook-specific rules |
| Observing | `message_received`, `model_call_*`, `llm_input`, `llm_output`, `after_tool_call`, `session_*`, `before/after_compaction`, `agent_end`, `subagent_spawned`, `subagent_ended`, `gateway_*`, `cron_changed`, `message_sent` | parallel fire-and-forget |

---

## Sync-only hot-path guards

Two hooks are **synchronous-only** and run on the JSONL session-write hot
path. They must not return a promise. The runner does not await — a
returned promise is logged (fail-open) or thrown (fail-closed).

| Hook | Where it fires |
|------|----------------|
| `tool_result_persist` | before tool result is written to session JSONL |
| `before_message_write` | before any message is written to session JSONL |

Returning `await ...` from these hooks is the most common audit mistake.
The handler keeps running; the result is lost.

---

## Tool execution decision

```proof:tree kind=taxonomy
root: resolveExecTarget()
- Inputs: configuredTarget, requestedTarget, elevatedRequested, sandboxAvailable
- Step 1: validate requestedTarget against config policy
- Step 2: selectedTarget = requestedTarget or configuredTarget
- Step 3: handle elevation, force gateway or node, never sandbox
- Step 4: if auto, sandbox if available else gateway
- Output: configuredTarget, selectedTarget, effectiveHost
```

Cite: `src/agents/bash-tools.exec-runtime.ts:235-282`. Sandbox vs host vs
node is decided **per invocation**, not per plugin or per session.

---

## Trust transitions

| Where | Trust on emitted events |
|-------|-------------------------|
| Core runtime emitters (harness, model call, run lifecycle) | `metadata.trusted: true` |
| Sandbox-emitted (subprocess output, exec result) | `metadata.trusted: false` |
| Plugin-emitted via `emitDiagnosticEvent()` | `metadata.trusted: false` |

Consumers gate on the boundary. See [05 Trust boundary](05-trust-boundary.md).

---

## Related

- [`design/openclaw/hook-engine-typed.md`](../../../design/openclaw/hook-engine-typed.md) — all 35 hooks + per-hook details
- [`design/openclaw/active-memory-and-context.md`](../../../design/openclaw/active-memory-and-context.md) — phases 3 + 4 + 5
- [`design/openclaw/sandbox.md`](../../../design/openclaw/sandbox.md) — phase 9 deep dive
- [02 Three channels](02-three-channels.md) — pull vs push channels
- [05 Trust boundary](05-trust-boundary.md) — phase-10 trust transitions
