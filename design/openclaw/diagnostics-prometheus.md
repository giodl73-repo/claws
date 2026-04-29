---
name: diagnostics-prometheus
description: The diagnostics-prometheus extension — pull-based scrape endpoint, zero-dependency custom registry, hardcoded buckets, deliberate counterpoint to diagnostics-otel
type: skunkworks-spec
applies_to: openclaw-core
source_version: HEAD 5e8cc1d9c (audit baseline)
authored: 2026-04-28
---

# diagnostics-prometheus

## What it is

A **pull-based Prometheus scrape endpoint** for OpenClaw's internal
diagnostic events. Subscribes to the same event stream as
`diagnostics-otel` but emits in a fundamentally different shape: an
in-process metric registry rendered on demand at
`/api/diagnostics/prometheus` in Prometheus 0.0.4 text format. **Zero
external client dependencies** — the plugin implements its own metric
store and text serializer.

Path: `extensions/diagnostics-prometheus/`. Like its sibling, small enough
to read end-to-end — `index.ts`, `service.ts`, `api.ts`.

## Manifest

`extensions/diagnostics-prometheus/openclaw.plugin.json:1-11`:

```jsonc
{
  "id": "diagnostics-prometheus",
  "activation": { "onStartup": true },
  "configSchema": { "type": "object", "additionalProperties": false, "properties": {} }
}
```

The simplest manifest of any extension we've audited: zero config, no env
vars, no service-name customization. Pure auto-start, zero-knob.

## Dependency choice

`extensions/diagnostics-prometheus/package.json:1-24` declares **one**
production dep: `@openclaw/plugin-sdk` (workspace).

There is **no `prom-client`**, no Prometheus npm package. The plugin
implements:

- a custom in-memory metric store (`createPrometheusMetricStore()` at `service.ts:101-207`),
- a text serializer that emits Prometheus 0.0.4 wire format directly.

The tradeoff is real: avoiding `prom-client` keeps the bundle small and
sidesteps version churn, but pins the plugin to the Prometheus 0.0.4 spec —
if escaping rules or label semantics evolve, the serializer must follow.

Plugin version: `2026.4.25` (matches diagnostics-otel).

## Registry and metric types

Custom in-memory registry, three Maps:

- **Counters** — cumulative.
- **Gauges** — point-in-time.
- **Histograms** — bucketed distribution + `_sum` + `_count`.

### Bucket boundaries (hardcoded at `service.ts:41-48`)

| Constant | Buckets | Used for |
|---|---|---|
| `DURATION_BUCKETS_SECONDS` | `[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60, 120, 300, 600]` | All duration histograms |
| `TOKEN_BUCKETS` | `[1, 4, 16, 64, 256, 1024, 4096, 16384, 65536, 262144, 1048576]` | `openclaw_gen_ai_client_token_usage` |
| `BYTE_BUCKETS` | `[1024, 4096, …, 1073741824, 4294967296, 17179869184]` | `openclaw_memory_rss_bytes` |

These are isolated to this plugin — there is no shared "OpenClaw histogram
bucket spec" that diagnostics-otel reuses. Each plugin chose its own.

### Cardinality protection (`service.ts:50, :49, :53-59`)

- `MAX_PROMETHEUS_SERIES = 2048` hard cap on total series. Excess silently dropped, counted in `openclaw_prometheus_series_dropped_total`.
- `LOW_CARDINALITY_VALUE_RE = /^[A-Za-z0-9_.:-]{1,120}$/u` rejects values with control chars, newlines, anything weird → replaced with `"unknown"`.
- `lowCardinalityLabel()` helper applies the regex *and* runs `redactSensitiveText` from plugin-sdk before passing to the registry.

### Inventory

**Counters** (file:line cites in `service.ts`):

| Metric | Line |
|---|---|
| `openclaw_model_tokens_total` | `:370-378` |
| `openclaw_run_completed_total` | `:435-439` |
| `openclaw_model_call_total` | `:449-453` |
| `openclaw_tool_execution_total` | `:463-467` |
| `openclaw_harness_run_total` | `:477-481` |
| `openclaw_message_processed_total` | `:484-488` |
| `openclaw_message_delivery_total` | `:502-514` |
| `openclaw_session_state_total` | `:550-553` |
| `openclaw_memory_pressure_total` | `:593-600` |
| `openclaw_telemetry_exporter_total` | `:606-611` |
| `openclaw_prometheus_series_dropped_total` | `:186-191` |

**Gauges**:

| Metric | Line |
|---|---|
| `openclaw_queue_lane_size` | `:532-539` |
| `openclaw_session_queue_depth` | `:555-562` |
| `openclaw_memory_bytes` | `:566-583` |

**Histograms**:

| Metric | Line |
|---|---|
| `openclaw_run_duration_seconds` | `:429-434` |
| `openclaw_gen_ai_client_token_usage` | `:380-391` |
| `openclaw_model_call_duration_seconds` | `:443-448` |
| `openclaw_tool_execution_duration_seconds` | `:457-462` |
| `openclaw_harness_run_duration_seconds` | `:471-476` |
| `openclaw_message_processed_duration_seconds` | `:489-498` |
| `openclaw_message_delivery_duration_seconds` | `:515-528` |
| `openclaw_queue_lane_wait_seconds` | `:541-546` |
| `openclaw_memory_rss_bytes` | `:584-590` |

## /metrics endpoint

`index.ts:12-18` registers the route:

```ts
api.registerHttpRoute({
  path: "/api/diagnostics/prometheus",
  auth: "gateway",
  scope: "trusted-operator",
  handler: exporter.handler,
});
```

- **Mounted on the gateway's HTTP server** — no separate listener, no custom port.
- **Auth = `gateway`** — gateway-level auth required.
- **Scope = `trusted-operator`** — restricted to trusted operators.

Handler at `service.ts:618-638` (`createMetricsHandler`):

- Rejects non-`GET`/`HEAD` with 405.
- Renders all metrics on `GET` (`:627`).
- `Content-Type: text/plain; version=0.0.4; charset=utf-8`.
- `Cache-Control: no-store`.

## Instrumentation surface

Single dispatcher: `recordDiagnosticEvent()` at `service.ts:415-616`,
switch-cased on `evt.type`. **Only `metadata.trusted` events are recorded**
(`:420-422`); untrusted events return early — same security boundary the
OTel sibling enforces.

Event-to-metric mapping (excerpt):

| Event | Metrics emitted |
|---|---|
| `model.usage` | `openclaw_model_tokens_total`, `openclaw_gen_ai_client_token_usage`, `openclaw_model_cost_usd_total`, `openclaw_model_usage_duration_seconds` |
| `run.completed` | `openclaw_run_duration_seconds`, `openclaw_run_completed_total` |
| `model.call.completed/error` | `openclaw_model_call_duration_seconds`, `openclaw_model_call_total` |
| `tool.execution.completed/error` | `openclaw_tool_execution_duration_seconds`, `openclaw_tool_execution_total` |
| `harness.run.completed/error` | `openclaw_harness_run_duration_seconds`, `openclaw_harness_run_total` |
| `message.processed` | `openclaw_message_processed_total`, `openclaw_message_processed_duration_seconds` |
| `message.delivery.completed/error` | `openclaw_message_delivery_total`, `openclaw_message_delivery_duration_seconds` |
| `queue.lane.enqueue/dequeue` | `openclaw_queue_lane_size` (gauge), `openclaw_queue_lane_wait_seconds` (on dequeue) |
| `session.state` | `openclaw_session_state_total` (counter), `openclaw_session_queue_depth` (gauge if `queueDepth` field present) |
| `diagnostic.memory.sample` | `openclaw_memory_bytes` (rss/heap_total/heap_used as separate gauges), `openclaw_memory_rss_bytes` (histogram) |
| `diagnostic.memory.pressure` | `openclaw_memory_pressure_total` |
| `diagnostic.heartbeat` / `diagnostic.liveness.warning` | **no-op** (filtered) |
| `telemetry.exporter` | `openclaw_telemetry_exporter_total` — also self-emitted by the plugin on start (`:661-667`) |
| (default) | silently ignored |

Common label set across most metrics: `channel`, `model`, `provider`,
`outcome` (`completed` or `error`, derived from event type). Helper
functions `runLabels`, `modelCallLabels`, `toolExecutionLabels`,
`harnessLabels` build them at `:278-352`. **Operator/agent identity is
never exported** — `runId` and `sessionKey` are explicitly dropped (test
verifies at `service.test.ts:21-22, :42-43`).

## Configuration

None. The `configSchema` is empty (manifest line 9). No env vars. No service
name labeling. No customization knobs.

This is a deliberate posture — operationally clean for simple deployments,
inflexible for heterogeneous environments where instances need to label
themselves by region/shard/tenant. If that need surfaces, a minimal
`configSchema` can be added without breaking compatibility.

## `api.ts` public surface

`extensions/diagnostics-prometheus/api.ts:1-12` is a re-export bundle from
`@openclaw/plugin-sdk` only — `DiagnosticEventMetadata`,
`DiagnosticEventPayload`, `OpenClawPluginApi`,
`OpenClawPluginHttpRouteHandler`, `OpenClawPluginService`,
`OpenClawPluginServiceContext`, `emptyPluginConfigSchema`,
`redactSensitiveText`. No plugin-specific exports.

## Hook integration

The plugin uses **two** SDK surfaces:

1. `api.registerService(service)` (`index.ts:11`) for the long-running service. The service object (`service.ts:644-674`):
   - `id: "diagnostics-prometheus"`,
   - `start(ctx)` subscribes to `ctx.internalDiagnostics.onEvent()` and self-emits a `telemetry.exporter` event,
   - `stop()` unsubscribes and resets the metric store.
2. `api.registerHttpRoute({ path, auth, scope, handler })` for `/api/diagnostics/prometheus`.

No typed hooks (`PluginHookRegistration`). Like diagnostics-otel, this
plugin observes via the diagnostic-event substrate (A5) rather than
participating in lifecycle hooks.

## Comparison to diagnostics-otel

| Aspect | diagnostics-prometheus | diagnostics-otel |
|---|---|---|
| Transport | **Pull** — scrape `/api/diagnostics/prometheus` | **Push** — OTLP/HTTP-Protobuf to a collector |
| Dependencies | Zero external (custom registry + serializer) | Full OTel SDK stack — 11 packages, ~17 deps |
| Configuration | None | Rich config + env-var fallbacks + per-signal endpoints |
| Bucket boundaries | Hardcoded per metric in this plugin | Hardcoded per metric in that plugin |
| Cardinality protection | 2048 series cap + low-cardinality regex + 120-char clamp + drop counter | OTel SDK's view-based cardinality controls + similar regex/redaction |
| HTTP surface | Mounts on gateway HTTP | None (push-only) |
| Multi-signal | Metrics only | Traces + metrics + logs |
| Trust gate | `metadata.trusted` only | `metadata.trusted` only |
| Self-emitted lifecycle event | Yes (`telemetry.exporter` on start) | Yes (same event type) |
| Event source | Same — `ctx.internalDiagnostics.onEvent` | Same |

These are **complementary**, not redundant. They serve different
observability architectures:

- Prometheus extension fits Prometheus-native monitoring (scrape-based, pull, fast local metrics, on-box dashboards).
- OTel extension fits OTLP-compliant infrastructure (Datadog, Honeycomb, New Relic, Jaeger, cloud vendors, OTel Collectors with downstream Prometheus remote-write).

No deprecation markers or TODOs in either plugin's production code. Both
ship.

## Maintenance assessment

If we owned this plugin long-term, the load-bearing decisions worth
defending:

1. **Zero external client.** Avoids `prom-client` version management; pins us to Prometheus 0.0.4 spec. If escaping rules change upstream, the serializer needs maintenance — but that's rare. Tradeoff worth keeping.
2. **2048-series cap.** Sane safety rail against label cardinality explosions (per-run / per-message identifiers). Watch `openclaw_prometheus_series_dropped_total` over time; sustained drops = label strategy needs review.
3. **Zero config.** Operationally clean today, inflexible at scale. If multi-tenant or multi-region instances need self-labeling, add `serviceName` and `staticLabels` to `configSchema`. Backwards-compatible since current callers pass nothing.
4. **Pull-only transport.** Assumes the gateway is reachable by a Prometheus scraper. For isolated/edge deployments, the OTel sibling's push model is preferable. Architecture doesn't preclude adding a push-gateway mode later.
5. **Trust gate enforcement.** Maintain the `metadata.trusted` boundary. Plugin-emitted events have `trusted=false`; if any of those start firing as recorded metrics, it's a regression worth fixing immediately.

In the broader OTel-vs-Prometheus picture, OpenClaw's dual setup
positions it well: Prometheus for lightweight, on-box, scrape-based
monitoring (SLO thresholds, fast dashboards) and OTel for distributed
tracing + cloud-native aggregation (multi-tenancy, cross-service
correlation). Neither displaces the other. If a unification effort ever
targets OTLP-to-Prometheus remote write, the Prometheus extension can
remain as the local scrape surface while the OTel extension feeds the
remote pipeline.

## Read next

- [`diagnostics-otel.md`](diagnostics-otel.md) — sibling, deliberate counterpoint.
- A5 in [`TOUR.md`](TOUR.md) — the diagnostic event stream that both plugins consume.
- A6 in [`TOUR.md`](TOUR.md) — `metadata.trusted` and `redactSensitiveText`, the security seam invoked here.
