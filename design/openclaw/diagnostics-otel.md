---
name: diagnostics-otel
description: The diagnostics-otel extension — three-signal (spans/metrics/logs) OTLP/HTTP exporter, OpenTelemetry SDK integration, content-capture policy, semantic-convention opt-in
type: skunkworks-spec
applies_to: openclaw-core
source_version: HEAD 5e8cc1d9c (audit baseline)
authored: 2026-04-28
---

# diagnostics-otel

## What it is

A three-signal exporter that bridges OpenClaw's internal diagnostic event
stream to **OpenTelemetry-compliant backends** over OTLP/HTTP-Protobuf. It
captures the runtime's lifecycle events (model calls, harness execution,
message queuing, tool usage, session state, memory pressure, liveness
warnings, telemetry exporter status) and emits them as:

- **Traces** — spans with custom `openclaw.*` and `gen_ai.*` attributes, parent/child relationships, redacted content,
- **Metrics** — counters and histograms (~25 + ~15 respectively) with hardcoded bucket boundaries,
- **Logs** — structured records with severity levels and trace context propagation.

Path: `extensions/diagnostics-otel/`. Small enough to read end-to-end —
~2300 LOC across `index.ts`, `service.ts`, `api.ts`.

## Manifest

`extensions/diagnostics-otel/openclaw.plugin.json`:

```jsonc
{
  "id": "diagnostics-otel",
  "activation": { "onStartup": true },
  "configSchema": { "type": "object", "additionalProperties": false, "properties": {} }
}
```

- `activation.onStartup: true` — auto-activates at gateway boot. No manual registration.
- `configSchema` is empty in the manifest *but* the plugin reads rich config at runtime from `ctx.config.diagnostics.otel`. The manifest schema is intentionally lax; the runtime config object is where the surface lives.
- **No hook subscriptions declared.** This plugin doesn't use the typed hook system at all — it consumes the diagnostic event stream directly via `ctx.internalDiagnostics.onEvent`. See *Hook integration* below.

## OTel SDK choice and pinned versions

From `extensions/diagnostics-otel/package.json:6-17`:

| Package | Version |
|---|---|
| `@opentelemetry/api` | `^1.9.1` |
| `@opentelemetry/api-logs` | `^0.215.0` |
| `@opentelemetry/sdk-node` | `^0.215.0` |
| `@opentelemetry/sdk-trace-base` | `^2.7.0` |
| `@opentelemetry/sdk-metrics` | `^2.7.0` |
| `@opentelemetry/sdk-logs` | `^0.215.0` |
| `@opentelemetry/resources` | `^2.7.0` |
| `@opentelemetry/exporter-trace-otlp-proto` | `^0.215.0` |
| `@opentelemetry/exporter-metrics-otlp-proto` | `^0.215.0` |
| `@opentelemetry/exporter-logs-otlp-proto` | `^0.215.0` |
| `@opentelemetry/semantic-conventions` | `^1.40.0` |

Plugin version itself: `2026.4.25` (calendar-date semver).

Notable choices:

- **Node SDK only** (`sdk-node`). Bootstraps full instrumentation in `service.ts:651`.
- **No auto-instrumentations**. Every emission is explicit, driven by the diagnostic-event subscriber.
- **OTLP/HTTP-Protobuf exporters only**. gRPC is *not* supported. `service.ts:584-593` validates `protocol !== "http/protobuf"` and fails. This is a deliberate constraint, presumably to avoid pulling the gRPC dependency surface.
- **`TraceIdRatioBasedSampler` wrapped in `ParentBasedSampler`** (`service.ts:657-659`). Sampling rate from config; default behavior respects parent sampling decisions.
- **`PeriodicExportingMetricReader` + `BatchLogRecordProcessor`** for batched export.

## Initialization flow

1. **Plugin entry** (`index.ts:1-11`):

   ```ts
   export default definePluginEntry({
     id: "diagnostics-otel",
     name: "Diagnostics OpenTelemetry",
     description: "Export diagnostics events to OpenTelemetry",
     register(api) {
       api.registerService(createDiagnosticsOtelService());
     },
   });
   ```

   Registers a single `OpenClawPluginService` — this is the SDK's "long-running service with `start()`/`stop()`" pattern.

2. **Service `start(ctx)`** (`service.ts:543`):
   - Read `ctx.config.diagnostics` and `ctx.config.diagnostics.otel` (`:546-550`).
   - Validate enablement: `tracesEnabled = otel.traces !== false` (`:572`), `metricsEnabled = otel.metrics !== false` (`:573`), `logsEnabled = otel.logs === true` (`:574`). **Logs are off by default** — explicit opt-in.
   - Resolve env-var fallbacks for endpoint, headers, service name, sampling (`:595-603`).
   - If `OPENCLAW_OTEL_PRELOADED !== "1"` (i.e., not preloaded externally), construct `NodeSDK` with the configured exporters and start it (`:651-665`).
   - Create `LoggerProvider` if logs enabled (`:946-950`).
   - Get global `tracer` and `meter` (`:697-699`).
   - **Subscribe to diagnostic events** (`:2173-2179`): `unsubscribe = ctx.internalDiagnostics?.onEvent((evt, metadata) => { ... })`.

3. **Service `stop()`** (`service.ts:520-539, 2307-2309`):
   - Unsubscribe from events.
   - Shut down log provider and SDK.
   - All shutdown calls wrapped in `.catch(() => undefined)` (`:534, :537`) — disposal must not throw.

## Instrumentation surface

### Trace spans

Spans are recorded only when `tracesEnabled && metadata.trusted`. The
`metadata.trusted` gate is everywhere — see [trust model](TOUR.md) (A6).

| Span name | Source events | Cite | Notable attributes |
|---|---|---|---|
| `openclaw.run` | `run.started`, `run.completed` | `:1422, :1602` | `openclaw.runId`, `openclaw.state`, `openclaw.attempt` |
| `openclaw.model.call` | `model.call.started/completed/error` | `:1812, :1852, :1906` | `openclaw.provider`, `openclaw.model`, `gen_ai.request.model`, conditional `openclaw.content.input_messages` |
| `openclaw.tool.execution` | `tool.execution.started/completed/error` | `:1946, :1976, :2012` | `openclaw.toolName`, `openclaw.toolCallId`, conditional `openclaw.content.tool_input/output` |
| `openclaw.harness.run` | `harness.run.started/completed/error` | `:1648, :1681, :1716` | `openclaw.harness`, `openclaw.duration` |
| `openclaw.model.usage` | `model.usage` | `:1244` | `openclaw.provider`, `openclaw.durationMs`, `gen_ai.client.token.usage` histogram |
| `openclaw.context.assembled` | `context.assembled` | `:1751` | `openclaw.contextTokens`, `openclaw.contextTokensUsed` |
| `openclaw.message.processed` | `message.processed` | `:1345` | `openclaw.duration`, `openclaw.outcome` |
| `openclaw.message.delivery` | `message.delivery.completed/error` | `:1400, :1403` | `openclaw.messageId`, `openclaw.deliveryType` |
| `openclaw.session.stuck` | `session.stuck` | `:1476` | `openclaw.state`, `openclaw.ageMs`, `openclaw.queueDepth` |
| `openclaw.tool.loop` | `tool.loop` | `:1504` | `openclaw.loop.level`, `openclaw.loop.detector`, `openclaw.loop.count` |
| `openclaw.liveness.warning` | `diagnostic.liveness.warning` | `:2145` | `openclaw.liveness.event_loop_delay_p99_ms`, `openclaw.cpuCoreRatio` |

#### Span attribute redaction (`service.ts:164-172, :1032`)

`redactOtelAttributes()` enforces:

- **Drop list**: `callId`, `runId`, `sessionId`, `sessionKey`, `spanId`, `traceId`, `toolCallId`, `parentSpanId` are removed entirely. These would be high-cardinality identifiers; they don't go to OTel.
- **String-value redaction**: every string attribute runs through `redactSensitiveText` from `plugin-sdk/security-runtime`.

#### Parent/child linkage (`service.ts:1039-1057`)

Active spans are tracked in `activeTrustedSpans`, keyed by `evt.trace.spanId`.
`activeTrustedParentContext()` looks up a parent span via `parentSpanId` and
sets it as the parent context with `trace.setSpanContext(...)`. This is what
makes nested spans render as a tree in Jaeger/Tempo rather than as a flat
list.

### Metrics

`const meter = metrics.getMeter("openclaw");` at `:696`.

**Counters** (excerpt):

| Name | Cite |
|---|---|
| `openclaw.tokens` | `:717-719` |
| `openclaw.cost.usd` | `:738-740` |
| `openclaw.message.queued`, `.processed` | `:766-772` |
| `openclaw.message.delivery.started` | `:778-783` |
| `openclaw.queue.lane.enqueue/dequeue` | `:800-806` |
| `openclaw.session.state`, `.stuck` | `:808-814` |
| `openclaw.run.attempt` | `:820-822` |
| `openclaw.tool.loop` | `:824-826` |
| `openclaw.telemetry.exporter` | `:922` |

**Histograms** (excerpt):

| Name | Unit | Cite |
|---|---|---|
| `gen_ai.client.token.usage` | `{token}` | `:721-726` |
| `gen_ai.client.operation.duration` | `s` | `:728-736` |
| `openclaw.run.duration_ms`, `.harness.duration_ms` | `ms` | `:742-748` |
| `openclaw.queue.depth`, `.wait_ms` | `:792-798` |
| `openclaw.model_call.duration_ms`, `.request_bytes`, `.response_bytes`, `.time_to_first_byte_ms` | `:828-850` |

Histogram bucket boundaries are hardcoded per metric (see `service.ts`
near each declaration). They are *not* repo-wide defaults; this plugin
chose them.

Attributes are constrained: low-cardinality, alphanumeric + `_:-`, max 120
chars (`LOW_CARDINALITY_VALUE_RE` at `:42`). Identifier values that don't
match get replaced with `"unknown"` and logged.

### Structured logs

Enabled only if `otel.logs === true` (`:574`). Log records (`:951-989`):

```ts
{
  body: normalizeOtelLogString(evt.message, 4096),  // clamp to 4 KB
  severityText: evt.level || "INFO",
  severityNumber: logSeverityMap[evt.level] ?? 9,
  attributes: redactOtelAttributes({
    "openclaw.log.level": evt.level,
    "openclaw.logger": evt.loggerName,
    "code.lineno": evt.code?.line,
    "code.function": evt.code?.functionName,
    ...evt.attributes,         // user-supplied, validated
    ...evt.trace,              // traceId, spanId — only if trusted
  }),
  timestamp: evt.ts
}
```

Log-attribute validation at `:386-414`: `OTEL_LOG_ATTRIBUTE_KEY_RE` caps
keys at 96 chars; `__proto__`, `prototype`, `constructor` are blocked; max
64 attributes per record; max 4096 chars per value; all string values
redacted.

## Configuration

Priority order: plugin config (`ctx.config.diagnostics.otel`) → env vars →
defaults.

### Plugin config keys

| Key | Default | Purpose |
|---|---|---|
| `enabled` | implicit `false` | Master switch. |
| `traces`, `metrics` | `true` | Per-signal enablement. |
| `logs` | `false` | Logs require explicit opt-in. |
| `endpoint` | none | Base OTLP endpoint, e.g., `http://localhost:4317`. Trailing slashes stripped (`:101-103`). |
| `tracesEndpoint`, `metricsEndpoint`, `logsEndpoint` | derived from `endpoint` | Per-signal override. |
| `headers` | `{}` | Passed to all exporters (e.g., `{"Authorization": "Bearer …"}`). |
| `serviceName` | `"openclaw"` | OTel `service.name` resource attribute. |
| `sampleRate` | none | 0..1; feeds `TraceIdRatioBasedSampler`. |
| `protocol` | `"http/protobuf"` | The only supported value. |
| `flushIntervalMs` | none | Metric reader + log processor flush cadence. |
| `captureContent` | off | Bool or object: `{ enabled, inputMessages, outputMessages, toolInputs, toolOutputs, systemPrompt }`. **Off by default** — opt-in for messages, prompts, tool I/O. |

### Env-var fallbacks

`OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`,
`OTEL_EXPORTER_OTLP_METRICS_ENDPOINT`, `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT`,
`OTEL_SERVICE_NAME`, `OTEL_EXPORTER_OTLP_PROTOCOL`,
`OPENCLAW_OTEL_PRELOADED` (`"1"` → skip own SDK init),
`OTEL_SEMCONV_STABILITY_OPT_IN` (controls Gen AI semconv version; set to
`"gen_ai_latest_experimental"` for the latest set).

## `api.ts` public surface

`extensions/diagnostics-otel/api.ts` is purely a re-export bundle from
`@openclaw/plugin-sdk`. It does **not** export any plugin-specific symbols
to other extensions. The plugin is a sink, not a library. Re-exports cover
`DiagnosticEventPayload`, `DiagnosticEventMetadata`,
`OpenClawPluginApi`, `OpenClawPluginService`, the trace-context helpers
(`isValidDiagnosticTraceId`, `formatDiagnosticTraceparent`, …), and
`redactSensitiveText`.

## Hook integration

**This plugin does not use the typed hook system.** It uses the diagnostic
event subscriber pattern instead:

```ts
unsubscribe = ctx.internalDiagnostics?.onEvent((evt, metadata) => {
  switch (evt.type) {
    case "model.usage":           /* ... */
    case "model.call.started":    /* ... */
    case "tool.execution.completed": /* ... */
    // 30+ cases
  }
});
```

(See A5 in `TOUR.md` — the diagnostic event stream is its own substrate
worth a deep dive.)

Why no typed hooks? Because diagnostic events are not lifecycle hooks; they
are a fire-and-forget telemetry pipe with its own trust metadata. Hooks
participate in request flow; diagnostic events observe it.

## Evolution signals

- **Semantic-convention opt-in** (`service.ts:183-213, :251-259`). The plugin reads `OTEL_SEMCONV_STABILITY_OPT_IN` and switches between `gen_ai.system` (legacy) and `gen_ai.provider.name` (newer) attributes. This lets operators migrate to newer OTel semconv versions without breaking existing dashboards.
- **Preloaded-SDK pattern** (`:320-322, :603, :683-685`). If `OPENCLAW_OTEL_PRELOADED=1`, the plugin skips its own SDK init and reuses an already-initialized SDK from the host environment. Useful in containerized setups where the runtime image preloads OTel auto-instrumentation.
- **Content capture is opt-in with sub-flags**. Suggests a future where operators want fine-grained "log my system prompts but not user messages" UX. The schema is in place.
- **No TODOs, no deprecated markers** in production code as of audit baseline. The plugin is stable.

## Minimum reproduction

Local Jaeger:

```bash
docker run -d --name jaeger -p 4317:4317 -p 16686:16686 jaegertracing/all-in-one:latest
```

OpenClaw config (`~/.openclaw/config.json` or equivalent):

```jsonc
{
  "diagnostics": {
    "enabled": true,
    "otel": {
      "enabled": true,
      "traces": true,
      "metrics": true,
      "logs": true,
      "endpoint": "http://localhost:4317",
      "serviceName": "my-openclaw-agent",
      "sampleRate": 1.0,
      "flushIntervalMs": 5000,
      "captureContent": { "enabled": true, "inputMessages": true, "outputMessages": true, "systemPrompt": false }
    }
  }
}
```

Run: `OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf openclaw run`. Browse
http://localhost:16686 and select service `my-openclaw-agent`.

## Read next

- [`diagnostics-prometheus.md`](diagnostics-prometheus.md) — sibling plugin, deliberate counterpoint (pull vs push, zero deps vs full SDK stack).
- [`plugin-model.md`](plugin-model.md) — for `definePluginEntry` and `OpenClawPluginApi.registerService`.
- A5 in [`TOUR.md`](TOUR.md) — the diagnostic event stream itself.
- A6 in [`TOUR.md`](TOUR.md) — trust model + redaction surface.
