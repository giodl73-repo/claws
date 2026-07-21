# Signals Source And Comparison Audit

## Source Baseline

- Repository: `openclaw/openclaw`
- Current live `origin/main` reviewed at
  `5197428add4787e8773bb26fe695c2e2d19d7b2a`
- Evidence worktree: `C:\src\openclaw-review-111087`

## Current OpenClaw Facts

### Typed diagnostics already exist

`src/infra/diagnostic-events.ts` defines a large discriminated
`DiagnosticEventPayload` union with:

- process-local sequence and timestamp;
- OpenClaw-owned trace context;
- run, call, session, agent, provider, model, channel, tool, and delivery
  context where applicable;
- typed usage, lifecycle, execution, memory, queue, payload, and exporter
  events;
- trust metadata and private listener-only model/tool content; and
- bounded async dispatch with drop accounting.

Error vocabulary is not uniform:

- tool execution errors have `errorCategory`, optional `errorCode`, and
  optional `terminalReason`;
- run completion has `outcome`, optional `errorCategory`, and `blockedBy`;
- harness errors have `phase` and `errorCategory`;
- model-call errors have `errorCategory` and a bounded `failureKind`;
- delivery errors have `errorCategory`; and
- other paths still expose `reason`, `deniedReason`, raw `error`, or free-form
  messages.

This variation is often legitimate owner vocabulary. The gap is that equivalent
consumer needs are sometimes reconstructed from strings or not emitted at all.

### Diagnostics already project into multiple consumers

The current tree includes:

- `extensions/diagnostics-otel/`;
- `extensions/diagnostics-prometheus/`;
- the diagnostic stability ring buffer and support export;
- JSONL log trace correlation;
- privacy-aware content capture; and
- plugin subscription to diagnostic events.

Signals must reuse this substrate. A second dispatcher would duplicate mature
trust, privacy, queueing, and exporter work.

### Doctor already has stable finding identity

`src/flows/health-checks.ts` defines `HealthFinding` with:

- stable `checkId`;
- closed severity;
- human `message`;
- source/path/target/requirement context; and
- optional `fixHint`.

This is the strongest internal analogue for separating stable identity from
human explanation. It still stores already-rendered English in `message` and
`fixHint`, so Localization must decide how descriptors and parameters are
introduced without breaking the public health contract.

### Readiness is structured but intentionally small

`src/gateway/server/readiness.ts` currently returns:

- `ready`;
- `failing` identifiers;
- optional `suppressed` identifiers;
- uptime; and
- event-loop health.

Hosting Profiles owns any richer readiness-condition contract. Signals should
not generalize readiness independently.

### Usage is typed but owner coverage is incomplete

`DiagnosticUsageEvent` already carries provider/model, agent/channel,
input/output/cache counts, context, cost, duration, and trace context.

Issue evidence shows that:

- some run types do not persist or emit equivalent attribution;
- plugin runtime LLM calls calculate usage but do not emit it;
- unknown pricing can become false zero cost; and
- lifecycle observers cannot always receive usage without polling.

This is an adoption and unknownness problem, not a missing usage schema.

### A representative semantic-loss seam exists

On current main:

- `extensions/telegram/src/bot-message-dispatch-draft.ts` passes
  `warn: logVerbose` into the draft stream;
- the draft implementation reports meaningful failure states through that
  warning callback; and
- the core already defines and exports `message.delivery.error` through OTel
  and Prometheus.

This is a useful first slice because an owner-known delivery failure is reduced
to verbose prose before existing consumers can observe it.

## Internal Analogue Matrix

| Analogue | Disposition | Why |
| --- | --- | --- |
| `DiagnosticEventPayload` | **Reuse** | Existing typed dispatch, trace, trust, privacy, queueing, and exporter substrate. |
| `HealthFinding.checkId` plus `message` | **Adapt** | Strong stable-id/human-text split; localization needs typed parameters rather than parsing English. |
| Readiness `failing` identifiers | **Adapt through Hosting Profiles** | Demonstrates bounded machine identifiers, but readiness semantics remain owner-specific. |
| Policy Doctor findings | **Reuse** | Existing concrete codes, severity, evidence, and repair projections. |
| Localization runtime descriptors | **Adapt** | Renderer consumes stable identity and parameters; it must not become the owner of runtime failure semantics. |
| Free-form log messages | **Avoid as authority** | Useful projection, unsafe as a machine contract or localization source. |
| A universal `SignalEnvelope` | **Avoid** | Would duplicate existing event, finding, readiness, and owner result contracts. |

## External Comparator Matrix

| Comparator | Useful precedent | Avoid |
| --- | --- | --- |
| [RFC 9457 Problem Details](https://www.rfc-editor.org/rfc/rfc9457.html) | Stable problem `type` and occurrence identity remain language-neutral while `title` and `detail` are human and negotiable by language. | Treating one HTTP problem shape as the universal runtime event model. |
| [Kubernetes Conditions](https://kubernetes.io/docs/reference/kubernetes-api/definitions/condition-v1-meta/) | `type`/`status`/`reason` are machine-facing; `message` is human-facing; generation and transition time prevent stale interpretation. | Copying condition arrays into ephemeral event paths or inventing conditions for every warning. |
| [OpenTelemetry GenAI conventions](https://github.com/open-telemetry/semantic-conventions-genai) | Standard operation, model/provider, usage, error, resource, and trace attributes improve backend interoperability. | Making exporter semantic conventions the canonical OpenClaw product contract. Experimental conventions may change. |
| [W3C Trace Context](https://www.w3.org/TR/trace-context/) | Standard trace ancestry crosses process/service boundaries; product fields should supplement it with bounded semantic context. | Replacing `traceparent` with OpenClaw-specific correlation headers or placing sensitive identity in trace IDs. |

## Revised Architecture Conclusion

Signals should maintain:

1. a semantic-loss inventory;
2. a small set of owner adoption patterns;
3. conformance fixtures proving stable meaning, privacy, and projection; and
4. explicit handoffs to Localization, telemetry exporters, Doctor, Status, and
   future resource governance.

It should not own a runtime platform.
