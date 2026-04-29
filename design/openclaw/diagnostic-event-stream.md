---
name: diagnostic-event-stream
description: The runtime substrate both diagnostics extensions consume — in-process pub/sub bus, full event-type union, trust gate, W3C trace propagation, sync/async dispatch
type: skunkworks-spec
applies_to: openclaw-core
source_version: HEAD 5e8cc1d9c (audit baseline)
authored: 2026-04-28
---

# Diagnostic event stream

## What this is

An **in-process pub/sub bus** that fires `DiagnosticEventPayload` records
to any registered subscriber. It is the substrate both
[`diagnostics-otel.md`](diagnostics-otel.md) and
[`diagnostics-prometheus.md`](diagnostics-prometheus.md) drink from. It is
*not* a plugin — it is part of the runtime that plugins observe.

The bus state is stored on `globalThis` behind a versioned symbol
(`Symbol.for("openclaw.diagnosticEvents.state.v1")`) so multiple bundles in
the same process share one stream. Subscriber set is **unbounded** (no
per-listener limits). Dispatch fires synchronously by default; high-
frequency event types are routed through a bounded async queue (see
*Dispatch model* below).

Code: `src/infra/diagnostic-events.ts:504-512` (state),
`:723-725` (`emitTrustedDiagnosticEvent`), `:719-721`
(`emitDiagnosticEvent`), `:727-733` (`onInternalDiagnosticEvent`),
`:735-741` (`onDiagnosticEvent`).

Plugin-SDK re-exports: `src/plugin-sdk/diagnostic-runtime.ts` (1–26 lines).
Trace context: `src/infra/diagnostic-trace-context.ts:1-243`.

## Dispatch model

```
producer ──(emit*)──► dispatchDiagnosticEvent()
                           │
                           ├── sync types: invoke listeners now
                           │
                           └── async types: enqueue → setImmediate drain
                                       │ (cap 10_000; oldest dropped)
                                       └── invoke listeners next tick
```

### Sync default

For most events, `dispatchDiagnosticEvent()` (`:605-622`) iterates the
listener set and invokes each subscriber synchronously, in registration
order. Each call is wrapped in try/catch (`:606-622`); a throwing
subscriber doesn't break the bus — exceptions go to stderr, the next
listener runs.

A recursion guard at `:596-601` aborts dispatch if depth > 100. Useful
because subscribers can themselves emit events.

### Async drain queue

`ASYNC_DIAGNOSTIC_EVENT_TYPES` at `:517-533` — high-frequency event types
that get queued instead of inlined:

- `tool.execution.*`
- `exec.process.completed`
- `message.delivery.*`
- `model.call.*`
- `harness.run.*`
- `context.assembled`
- `log.record`

The queue cap is `MAX_ASYNC_DIAGNOSTIC_EVENTS = 10_000` (`:514`).
**When full, new async events are silently dropped** — no backpressure
signal to producers. `scheduleAsyncDiagnosticDrain()` (`:663-678`) batches
delivery via `setImmediate`.

Lesson: the bus is fire-and-forget. Don't put backpressure-sensitive logic
in subscribers.

## Full event-type union

The discriminated union of `DiagnosticEventPayload`. Cites are line numbers
in `src/infra/diagnostic-events.ts`.

### Model lifecycle

| Type | Cite | Carries |
|---|---|---|
| `model.usage` | `:17-46` | aggregated tokens (input/output/cache-read/cache-write/prompt/total), USD cost, duration, context window usage; provider/model/channel/agent/session scope |
| `model.call.started` | `:338-340` | callId, provider, model, API mode, transport, upstreamRequestIdHash, runId, trace |
| `model.call.completed` | `:342-348` | duration, request/response byte counts, time-to-first-byte |
| `model.call.error` | `:350-359` | duration, error category, failure kind (aborted, connection, timeout), memory snapshot |

### Run lifecycle

| Type | Cite | Carries |
|---|---|---|
| `run.started` | `:273-275` (emit at `attempt.ts:675`) | runId, provider, model, trigger, channel, sessionKey, sessionId, trace |
| `run.completed` | `:277-282` | duration, outcome (`completed`/`aborted`/`error`), error category |
| `run.attempt` | `:149-155` | attempt number for retry tracking |

### Harness lifecycle

| Type | Cite | Carries |
|---|---|---|
| `harness.run.started` | `:300-301` (emit at `harness/v2.ts:143`) | harnessId, pluginId, provider, model, channel, trigger, trace |
| `harness.run.completed` | `:304-315` | duration, outcome, result classification (empty / reasoning-only / planning-only), yield detection, item lifecycle counts |
| `harness.run.error` | `:317-323` | phase (`prepare`/`start`/`send`/`resolve`/`cleanup`), errorCategory, cleanup-failure flag |

### Tool execution

| Type | Cite | Carries |
|---|---|---|
| `tool.execution.started` | `:220-221` | toolName, toolCallId, paramsSummary (shape descriptor) |
| `tool.execution.completed` | `:224-227` | duration |
| `tool.execution.error` | `:229-234` | duration, errorCategory, errorCode |
| `tool.execution.blocked` | `:236-240` | deniedReason, reason (policy gate) |
| `tool.loop` | `:187-203` | loop trigger (`generic_repeat`, `unknown_tool_repeat`, `known_poll_no_progress`, `global_circuit_breaker`, `ping_pong`), count, detector, level (warning/critical), tool name |

### Session state

| Type | Cite | Carries |
|---|---|---|
| `session.state` | `:117-125` | state machine observation (`idle`/`processing`/`waiting`), reason, queueDepth |
| `session.stuck` | `:127-134` | state-age ms, queueDepth (liveness concern) |

### Message processing

| Type | Cite | Carries |
|---|---|---|
| `message.queued` | `:71-78` | source, queueDepth, channel |
| `message.processed` | `:80-91` | outcome (`completed`/`skipped`/`error`), reason, duration, error details, channel/session scope |
| `message.delivery.started` | `:101-102` | delivery kind (`text`/`media`/`edit`/`reaction`/`other`) |
| `message.delivery.completed` | `:105-109` | duration, result count |
| `message.delivery.error` | `:111-115` | duration, error category |

### Queue / lane

| Type | Cite | Carries |
|---|---|---|
| `queue.lane.enqueue` | `:136-140` | lane id, queue size snapshot |
| `queue.lane.dequeue` | `:142-147` | lane id, queue size, wait time |

### Diagnostic / liveness

| Type | Cite | Carries |
|---|---|---|
| `diagnostic.heartbeat` | `:157-167` | webhook counters (received/processed/errors), session counts (active/waiting/queued) |
| `diagnostic.liveness.warning` | `:171-185` | reason flags (event-loop delay, ELU, CPU), interval, P99/max delay, ELU ratio, CPU user/sys/total/core-ratio, session counts |
| `diagnostic.memory.sample` | `:389-393` (emit at `logging/diagnostic-memory.ts:173`) | RSS/heapTotal/heapUsed/external/arrayBuffer bytes, uptime |
| `diagnostic.memory.pressure` | `:395-403` | level (`warning`/`critical`), reason (`rss_threshold`/`heap_threshold`/`rss_growth`), memory snapshot, threshold bytes, growth window |

### Context assembly

| Type | Cite | Carries |
|---|---|---|
| `context.assembled` | `:361-379` (emit at `attempt.ts:2537`) | messageCount, historyTextChars, historyImageBlocks, maxMessageTextChars, systemPromptChars, promptChars, promptImages, contextTokenBudget, reserveTokens |

### Webhook

| Type | Cite | Carries |
|---|---|---|
| `webhook.received` | `:48-53` | channel, update type, chat id |
| `webhook.processed` | `:55-61` | duration |
| `webhook.error` | `:63-69` | error message |

### Process exec

| Type | Cite | Carries |
|---|---|---|
| `exec.process.completed` | `:242-261` | target (`host`/`sandbox`), mode (`child`/`pty`), outcome, duration, command length, exit code/signal, timeout flag, failure kind (`shell-command-not-found`, `shell-not-executable`, `overall-timeout`, `no-output-timeout`, `signal`, `aborted`, `runtime-error`) |

### Telemetry / infrastructure

| Type | Cite | Carries |
|---|---|---|
| `log.record` | `:417-428` | level, message, logger name + parents, attributes dict, code location |
| `telemetry.exporter` | `:430-444` (self-emit at `diagnostics-prometheus/src/service.ts:661`) | exporter id, signal (`traces`/`metrics`/`logs`), status (`started`/`failure`/`dropped`), reason (configured/emit_failed/handler_failed/queue_full/shutdown_failed/start_failed/unsupported_protocol), error category |
| `payload.large` | `:405-415` | surface, action (`rejected`/`truncated`/`chunked`), bytes, limit bytes, count, channel, pluginId, reason |

This list is the single most useful reference for anyone consuming the
stream — keep it close.

## `DiagnosticEventMetadata` shape

`:490-492`:

```ts
type DiagnosticEventMetadata = Readonly<{
  trusted: boolean;
}>;
```

That is the entire metadata. The framework enriches events at emission
with `ts` (timestamp) and `seq` (sequence number) at `:693-694`, and with
`trace: DiagnosticTraceContext` (when an active scope exists) via
`getActiveDiagnosticTraceContext()` at `:691`.

## Trust model

Two emit functions, two subscribe functions, one boundary.

### Emission

| Function | Cite | `metadata.trusted` | Used by |
|---|---|---|---|
| `emitTrustedDiagnosticEvent()` | `:723-725` | `true` | core runtime infrastructure: model-call lifecycle (`attempt.model-diagnostic-events.ts:9`), harness (`harness/v2.ts:142-184`), run (`attempt.ts:674-677`), context assembly (`attempt.ts:2536-2553`), memory sampling (`logging/diagnostic-memory.ts:173-177`) |
| `emitDiagnosticEvent()` | `:719-721` | `false` | plugins and untrusted sources |

### Subscription

| Function | Cite | What it sees |
|---|---|---|
| `onInternalDiagnosticEvent(listener)` | `:727-733` | **Everything.** Used by the diagnostics extensions registered through the plugin loader. |
| `onDiagnosticEvent(listener)` | `:735-741` | Only **untrusted** events + `log.record`. Designed for third-party plugins so they cannot observe core trusted telemetry. |

Both return an unsubscribe function that removes the listener from the
global Set.

### Anti-spoof — the WeakSet

`dispatchedTrustedDiagnosticMetadata` WeakSet at `:516` tracks which
metadata objects were marked trusted **during dispatch**. When a consumer
calls `formatDiagnosticTraceparentForPropagation()` (`:744-752`), the
function checks **both** `metadata.trusted === true` *and*
`dispatchedTrustedDiagnosticMetadata.has(metadata)` (`:748`). A plugin
can't fabricate a metadata object claiming `trusted: true` and have it
bypass the gate — it has to come from the runtime itself.

This is a small but important pattern. Replicate it if we ever ship a
similar trust gate on the claws side.

### Consumer gating in practice

Both diagnostics extensions enforce the same line at the top of their
event handlers:

```ts
if (!metadata.trusted) return;
```

(See `extensions/diagnostics-prometheus/src/service.ts:420` and the OTel
sibling.) Untrusted events are dropped at the consumer boundary.

## Trace context propagation

`DiagnosticTraceContext` shape (`diagnostic-trace-context.ts:13-22`):

```ts
type DiagnosticTraceContext = {
  readonly traceId: string;         // W3C, 32 hex chars
  readonly spanId?: string;         // W3C, 16 hex chars
  readonly parentSpanId?: string;   // W3C, 16 hex chars
  readonly traceFlags?: string;     // W3C, 2 hex chars (default "01" = sampled)
};
```

### W3C traceparent compliance

| Function | Cite | Purpose |
|---|---|---|
| `parseDiagnosticTraceparent()` | `:127-156` | Parse `version-traceId-spanId-traceFlags`. Validate version != `ff`, hex patterns, non-zero IDs (validators at `:91-97`). |
| `formatDiagnosticTraceparent()` | `:158-171` | Emit `00-{traceId}-{spanId}-{traceFlags}` if `spanId` exists. |
| `isValidDiagnosticTraceId()` | `:91-93` | 32 lowercase hex, non-zero. |
| `isValidDiagnosticSpanId()` | `:95-97` | 16 lowercase hex, non-zero. |
| `isValidDiagnosticTraceFlags()` | `:99-101` | 2 lowercase hex. |

### `createChildDiagnosticTraceContext` semantics

`:188-199`. New span under a parent:

- preserves parent `traceId` (all spans in a trace share it),
- assigns new `spanId` (random 16 hex),
- sets parent's current `spanId` as `parentSpanId` (parent link),
- optionally overrides `spanId` / `parentSpanId` / `traceFlags` from input.

"Child" = same trace, fresh span, explicit parent-link.

### Active scope — `AsyncLocalStorage`

`storage = new AsyncLocalStorage<DiagnosticTraceContext>()` at `:30`.

| Function | Cite | Purpose |
|---|---|---|
| `getActiveDiagnosticTraceContext()` | `:222-224` | Read current scope. |
| `runWithDiagnosticTraceContext(ctx, fn)` | `:226-231` | Install scope for `fn`'s duration. |

Automatic propagation across async boundaries — events emitted inside `fn`
inherit the trace context without explicit threading.

## Producer side — representative emission sites

### `harness.run.completed` — `src/agents/harness/v2.ts:148-166`

```ts
function emitAgentHarnessRunCompleted(params: { ... }) {
  emitTrustedDiagnosticEvent({
    type: "harness.run.completed",
    ...agentHarnessDiagnosticBase(harness, attemptParams, result.diagnosticTrace),
    durationMs: Date.now() - startedAt,
    outcome: agentHarnessRunOutcome(result),
    // …
  });
}
```

Trusted emission. Carries trace context computed during the run.

### `diagnostic.memory.sample` — `src/logging/diagnostic-memory.ts:172-178`

```ts
emitDiagnosticEvent({
  type: "diagnostic.memory.sample",
  memory,
  uptimeMs: options?.uptimeMs ?? Math.round(process.uptime() * 1000),
});
```

Untrusted (default `emitDiagnosticEvent`). Periodic sample.

### `context.assembled` — `src/agents/pi-embedded-runner/run/attempt.ts:2536-2553`

```ts
emitTrustedDiagnosticEvent({
  type: "context.assembled",
  runId: params.runId,
  ...(params.sessionKey && { sessionKey: params.sessionKey }),
  ...(params.sessionId && { sessionId: params.sessionId }),
  // …
  historyTextChars: assembledHistory.text.length,
  historyImageBlocks: assembledHistory.images.length,
});
```

Trusted. Captures final prompt-assembly metrics post-build.

### `run.started` — `src/agents/pi-embedded-runner/run/attempt.ts:674-677`

```ts
const diagnosticRunBase = { trace: runTrace };
emitTrustedDiagnosticEvent({
  type: "run.started",
  // …
});
```

Trusted. Entry point of an embedded agent run.

### `telemetry.exporter` — self-emitted by exporters

Diagnostics extensions self-emit a `telemetry.exporter` event when they
start, signaling lifecycle status. Cite:
`extensions/diagnostics-prometheus/src/service.ts:661`.

## Why events instead of typed hooks

Both diagnostics extensions explicitly *don't* use the typed hook system
(33 hook points at `src/plugins/hook-types.ts`). Why:

1. **Decoupling from lifecycle.** Events fire deep in runtime infrastructure (model calls, memory samples, exec processes) where hook runners aren't in scope or would add overhead.
2. **Push vs pull.** Hooks are *pull-based* — the runtime invokes them at specific gates and waits for the merge result. Events are *push-based* — the runtime fires-and-forgets, subscribers do their own filtering.
3. **Performance.** High-frequency event types (`tool.execution.*`, `model.call.*`, `message.delivery.*`, `harness.run.*`, `log.record`) go through the async drain queue. Hooks are synchronous and block the operation they hook.
4. **Trust isolation.** The `metadata.trusted` gate lets the same channel serve both core (trusted) and plugins (untrusted) without splitting the stream.

**Use hooks when:** a plugin needs to *modify* behavior at a specific
lifecycle gate (`before_prompt_build`, `before_model_resolve`,
`agent_end`) and the timing must be synchronous.

**Use events when:** a plugin *observes* runtime activity, collects
metrics, or reacts to scattered events without coupling to specific
lifecycle phases. Both diagnostics extensions are "use events."

If we ever add a claws-side diagnostics plugin, the choice is obvious:
events.

## PII and redaction

`redactSensitiveText()` lives at `src/logging/redact.ts:146-158`,
re-exported via `src/plugin-sdk/security-runtime.ts:33`. Default patterns
strip API keys, tokens, passwords, Bearer auth, PEM blocks, common
prefixes (`sk-`, `ghp_`, `gsk_`, `xox`, …). Replaces with
`{first6}…{last4}` for long values, `***` for short ones. Configurable
via `logging.redactSensitive: "tools" | "off"`.

### Producer side

The runtime emits low-cardinality semantic fields (toolName,
errorCategory, provider, model). HTTP request bodies, response streams,
and SQL queries are **not** included in events — by construction, not by
filtering.

### Consumer side

Both diagnostics extensions apply redaction defensively:

- Prometheus: `lowCardinalityLabel()` (`service.ts:53-59`) and `safeErrorMessage()` (`:210-216`) call `redactSensitiveText` before storing labels/error messages.
- OTel: `redactOtelAttributes()` (`service.ts:164-173`) and `lowCardinalityAttr()` (`:175-181`) strip sensitive substrings before assigning OTel attributes.

### Opting out

A plugin cannot opt out globally — redaction is a logging config setting.
But extensions can choose not to include certain fields in their export,
which is what diagnostics-otel does for high-cardinality identifiers via
its `DROPPED_OTEL_ATTRIBUTE_KEYS` set.

## Future direction

Evidence the stream is being expanded, not phased out:

- **New event types appear without corresponding hooks.** `payload.large` (`:405-415`) and `telemetry.exporter` (`:430-444`) read like recent additions; no equivalents in `hook-types.ts`. Suggests the team is preferring events for new infrastructure observables.
- **Async drain infrastructure already exists.** The 10K queue + `setImmediate` batching at `:514, :517-533` is engineered for throughput. The cap is high because the team expects volume.
- **Full W3C traceparent machinery.** `:173-199` is more than the diagnostics extensions strictly need today. Suggests planned integration with external tracing backends (cross-service correlation, distributed tracing).
- **Forward-compat metadata gate.** `DiagnosticEventMetadata` is just `{trusted}` today, but adding fields is non-breaking. New gates (per-tenant, per-region, per-operator-policy) could land here without consumer churn.

In the manifest-first direction (`AGENTS.md ## Architecture`), the natural
evolution is **declarative diagnostics policy**: a manifest declares which
event types its consumer wants, the loader installs filtered subscriptions.
The infrastructure is already in place; what's missing is the manifest
schema. We could prototype this on the claws side first.

## Files I'd link from any event-stream-touching PR

1. `src/infra/diagnostic-events.ts:504-512, :514, :517-533, :605-622, :693-741` — bus core.
2. `src/infra/diagnostic-trace-context.ts:13-22, :91-101, :127-199, :222-231` — trace context.
3. `src/plugin-sdk/diagnostic-runtime.ts` — public re-exports.
4. `extensions/diagnostics-prometheus/src/service.ts:420, :644-674` — consumer integration.
5. `extensions/diagnostics-otel/src/service.ts` (the `internalDiagnostics.onEvent` block) — same.
6. `src/logging/diagnostic-memory.ts:159-191` — memory-sample emitter.
7. `src/agents/harness/v2.ts:138-185` — harness emitters.
8. `src/agents/pi-embedded-runner/run/attempt.ts:674-678, :2536-2553` — run + context emitters.
9. `src/agents/pi-embedded-runner/run/attempt.model-diagnostic-events.ts` — model-call emitters.
10. `src/logging/redact.ts:146-158` — redaction engine.

## Read next

- [`diagnostics-otel.md`](diagnostics-otel.md) — push-based consumer (OTLP).
- [`diagnostics-prometheus.md`](diagnostics-prometheus.md) — pull-based consumer (scrape).
- A6 in [`TOUR.md`](TOUR.md) — trust model + redaction surface; this spec touches both but a focused spec would catalogue every redaction pattern in the codebase.
- A2 in [`TOUR.md`](TOUR.md) — typed-hook engine; counterpart to the event stream. Knowing both lets you pick the right tool.
