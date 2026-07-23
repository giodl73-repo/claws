# Three Channels

<!-- atom:openclaw-three-channels (OC-G02) -->

OpenClaw exposes three distinct channels plugins use to interact with the
runtime. Conflating them is the most common audit mistake. The channels
differ in style (pull vs push), purpose (modify vs observe), and trust
posture. A plugin author who picks the wrong channel either fails to block
something they meant to block, or blocks something they only meant to
observe.

---

## At a glance

| Channel                 | Style                 | Purpose                     | Count                     |
| ----------------------- | --------------------- | --------------------------- | ------------------------- |
| Typed plugin hooks      | pull, runtime-invoked | modify behavior             | 35 named hooks            |
| Legacy / internal hooks | pull, runtime-fired   | react to internal lifecycle | 6 events x 4 source tiers |
| Diagnostic event stream | push, fire-and-forget | observe metrics + outcomes  | ~30 event types           |

All three are global singletons keyed by `Symbol.for("openclaw.x.state.v1")`
so they survive bundle-chunk splitting. None of them speak to the others.

---

## Channel taxonomy

<!-- proof:compiled from="proof:tree kind=taxonomy" uri="" -->

```taxonomy
Plugin runtime channels
├── Typed plugin hooks
│   ├── File: src/plugins/hook-types.ts
│   ├── Style: pull, modify
│   ├── Examples: before_model_resolve, before_prompt_build, before_tool_call
│   └── Failure: mostly fail-open, before_tool_call is fail-closed
├── Legacy internal hooks
│   ├── File: src/hooks/internal-hook-types.ts
│   ├── Style: pull, observe
│   ├── Examples: agent:bootstrap, gateway:startup, message:received
│   └── Source tiers: bundled, plugin, managed, workspace
└── Diagnostic event stream
    ├── File: src/infra/diagnostic-events.ts
    ├── Style: push, observe
    ├── Examples: model.usage, run.completed, tool.execution.error
    └── Trust gate: metadata.trusted plus WeakSet anti-spoof
```

<!-- /proof:compiled -->

---

## Decision rule

<!-- proof:compiled from="proof:tree kind=taxonomy" uri="" -->

```taxonomy
Picking a channel
├── Need to modify behavior? Use typed plugin hooks.
├── Need to react to internal lifecycle (gmail watch, install)? Legacy hooks.
├── Need to observe outcomes (metrics, durations)? Diagnostic events.
├── Need to block a tool call? Typed hooks (before_tool_call, fail-closed).
└── Need to record telemetry? Diagnostic events.
```

<!-- /proof:compiled -->

---

## Failure + timeout policy

| Channel                          | Failure default                                       | Timeout                                               |
| -------------------------------- | ----------------------------------------------------- | ----------------------------------------------------- |
| Typed hooks                      | fail-open (errors logged, execution continues)        | per-hook — `before_prompt_build` 15s, `agent_end` 30s |
| Typed hooks (`before_tool_call`) | **fail-closed** (errors abort the call)               | per-hook                                              |
| Legacy hooks                     | fail-open (caught + logged)                           | none                                                  |
| Diagnostic events                | fire-and-forget; throwing subscribers caught + logged | none — async drain queue with **10K silent drop** cap |

The fail-closed policy on `before_tool_call` is the only asymmetry. Tool
call safety is critical; a malfunctioning approval/block plugin must abort
the call rather than silently allow it through.

---

## Per-hook merge for typed hooks

Different typed hooks combine plugin results differently. Picking the wrong
mental model here is the second-most-common mistake. The merge rule is **per
hook**, not uniform.

| Hook                    | Merger                             | Rule                                                                   |
| ----------------------- | ---------------------------------- | ---------------------------------------------------------------------- |
| `before_model_resolve`  | first-wins                         | higher priority's defined override sticks                              |
| `before_prompt_build`   | concatenate                        | systemPrompt first-wins, contexts appended                             |
| `agent_turn_prepare`    | concatenate                        | prepend + append context summed                                        |
| `before_agent_finalize` | precedence                         | finalize > revise > continue                                           |
| `subagent_spawning`     | error-first                        | merge if no error, return error early                                  |
| `before_install`        | concatenate findings, sticky block | block once = block always                                              |
| `message_sending`       | content last-wins, sticky cancel   | any cancel halts                                                       |
| `before_tool_call`      | params freeze on approval          | once any plugin requests approval, lower-priority can't rewrite params |

See [`design/openclaw/hook-engine-typed.md`](../../../design/openclaw/hook-engine-typed.md) §"Per-hook merge functions".

---

## Diagnostic event types (excerpt)

| Type                            | Producer side                | Carries                                   |
| ------------------------------- | ---------------------------- | ----------------------------------------- |
| `model.usage`                   | LLM call wrapper             | tokens (in/out/cache), cost USD, duration |
| `run.started` / `run.completed` | agent harness                | runId, outcome, duration                  |
| `tool.execution.completed`      | tool runner                  | duration, result classification           |
| `harness.run.error`             | agent harness                | phase, errorCategory                      |
| `diagnostic.memory.sample`      | logging/diagnostic-memory.ts | RSS, heap, uptime                         |
| `context.assembled`             | context engine               | messageCount, tokens, prompt size         |
| `telemetry.exporter`            | diagnostics extensions       | exporter id, status                       |

Full list: [`design/openclaw/diagnostic-event-stream.md`](../../../design/openclaw/diagnostic-event-stream.md).

---

## Related

- [`design/openclaw/hook-engine-typed.md`](../../../design/openclaw/hook-engine-typed.md) — all 35 hooks + merge funcs
- [`design/openclaw/hook-engine-legacy.md`](../../../design/openclaw/hook-engine-legacy.md) — `src/hooks/` system
- [`design/openclaw/diagnostic-event-stream.md`](../../../design/openclaw/diagnostic-event-stream.md) — full event union
- [05 Trust boundary](05-trust-boundary.md) — `metadata.trusted` gate on diagnostic events
- [04 Turn anatomy](04-turn-anatomy.md) — when each channel fires during a request
