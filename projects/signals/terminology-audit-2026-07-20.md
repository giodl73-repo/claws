# Signals Terminology Audit

## Purpose

Align RFC 0025 with current OpenClaw source terminology while making deliberate
structured upgrades explicit. Signals should not rename mature owner contracts
or imply that every operational fact is a diagnostic event.

Source baseline:

- repository: `openclaw/openclaw`;
- reviewed worktree: `C:\src\openclaw-review-111087`; and
- reviewed revision: `5197428add4787e8773bb26fe695c2e2d19d7b2a`.

## Existing OpenClaw Terms

| Term                | Current source role                                                                                                  | Signals disposition                                                                                                                                             |
| ------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Diagnostic event    | A member of the discriminated `DiagnosticEventPayload` union with `type`, `ts`, `seq`, and optional `trace`.         | **Reuse** for asynchronous operational projection. Do not rename it to a signal event.                                                                          |
| Event `type`        | Stable discriminator such as `run.completed`, `tool.execution.error`, or `message.delivery.error`.                   | **Reuse** as one part of machine identity.                                                                                                                      |
| Result              | An owner-specific return value, such as a tool result, hook result, policy result, or readiness result.              | **Reuse** for synchronous or awaited owner contracts.                                                                                                           |
| Outcome             | A closed terminal lifecycle classification on run, dispatch, process, security, and harness events.                  | **Reuse** when an owner already models a terminal lifecycle. Do not impose one global outcome enum.                                                             |
| Status              | Current state or subsystem result, including readiness, recovery, exporter, and fleet health status.                 | **Reuse** for state. Avoid using it as a universal historical outcome field.                                                                                    |
| Reason              | Owner-specific explanation or bounded classification attached to an outcome, status, decision, or suppression.       | **Adapt**. Machine-consumed reasons must be bounded and documented; existing free-form reasons are not automatically stable contracts.                          |
| `errorCategory`     | Sanitized broad failure category on delivery, tool, run, harness, model, and exporter events.                        | **Reuse carefully**. It may be open-ended and is not always a precise stable code. An owner may deliberately introduce a bounded category on an existing event. |
| `errorCode`         | Optional owner, protocol, provider, or runtime code where the source exposes one.                                    | **Reuse** for exact stable machine identity when its owner defines compatibility.                                                                               |
| `failureKind`       | Bounded failure mechanism on model calls and exec processes.                                                         | **Reuse** when the owner distinguishes failure mechanism from error category.                                                                                   |
| `terminalReason`    | Bounded terminal mechanism on tool execution errors.                                                                 | **Reuse** only for terminal tool lifecycle semantics.                                                                                                           |
| Classification      | Derived subtype such as session attention or harness result classification.                                          | **Reuse** for owner-defined derived categories, not as a replacement for outcome.                                                                               |
| Finding             | A detected health, security, install-policy, lint, or audit fact with stable machine identity and human explanation. | **Reuse** for inspectable detected conditions. Do not convert findings into events merely for Signals.                                                          |
| `checkId`           | Stable machine identity on `HealthFinding` and `SecurityAuditFinding`.                                               | **Reuse** for finding identity.                                                                                                                                 |
| `ruleId`            | Stable identity on `InstallPolicyFinding`.                                                                           | **Reuse** within install-policy ownership; do not rename solely for uniformity.                                                                                 |
| Severity            | Importance assigned to findings or security events.                                                                  | **Reuse** for prioritization. Do not use severity as operation outcome.                                                                                         |
| Decision            | Policy or control choice such as allow, deny, or ask.                                                                | **Reuse** for policy ownership. Do not collapse it into generic failure.                                                                                        |
| Readiness result    | Current `ReadinessResult` with `ready`, `failing`, `suppressed`, `uptimeMs`, and event-loop health.                  | **Reuse**. Richer readiness conditions remain owned by the readiness RFC and Hosting Profiles work.                                                             |
| Usage event         | `DiagnosticUsageEvent` with `type: "model.usage"`, token dimensions, context, cost, and duration.                    | **Reuse** for resource observations. Add explicit unknownness only through the usage owner.                                                                     |
| Trace context       | `DiagnosticTraceContext` with W3C `traceId`, `spanId`, `parentSpanId`, and flags.                                    | **Reuse**. Product IDs supplement trace ancestry rather than replace it.                                                                                        |
| Correlation IDs     | Existing `runId`, `callId`, `toolCallId`, `sessionId`, `sessionKey`, message IDs, agent IDs, and owner-specific IDs. | **Reuse selectively** according to boundary, trust, privacy, and cardinality.                                                                                   |
| Diagnostic metadata | `DiagnosticEventMetadata` records `trusted`, `internal`, and trusted-trace provenance.                               | **Reuse** for trust and dispatcher provenance.                                                                                                                  |
| Private data        | `DiagnosticEventPrivateData` keeps raw failure text and model/tool content off the public event payload.             | **Reuse** for sensitive diagnostic content.                                                                                                                     |
| Telemetry signal    | `DiagnosticTelemetryExporterEvent.signal` means `traces`, `metrics`, or `logs`.                                      | **Preserve**. Do not introduce a second runtime `signal` field with broader meaning.                                                                            |

## Deliberate RFC Terms

These terms describe the Signals initiative. They are not proposed runtime
types or field names.

### Semantic owner

The component that has authority to decide:

- when an operation or condition exists;
- what its outcome, status, finding, or decision means;
- which reason, code, category, or classification applies;
- which structured fields are safe and useful; and
- what recovery or remediation is valid.

Current source already uses ownership concepts such as `toolOwner`, target
`owner`, plugin namespace ownership, and surface ownership. "Semantic owner"
makes the responsibility explicit without replacing those fields.

### Structured owner outcome

An owner-specific result or terminal event that preserves machine meaning in
typed, bounded fields before human rendering. It may use existing `outcome`,
`reason`, `errorCategory`, `failureKind`, `terminalReason`, `errorCode`, or
classification fields. It is not a shared TypeScript interface.

For non-terminal state, findings, usage, and decisions, use the existing owner
term rather than calling everything an outcome.

### Projection

A read-only mapping from an authoritative owner contract into an existing
consumer:

- diagnostic event;
- log or operator warning;
- plugin hook;
- Doctor, audit, Status, or readiness output;
- telemetry recorder or exporter; or
- localized renderer.

Projection does not transfer semantic ownership. Exporters and renderers must
not reinterpret prose into a different owner outcome.

### Signals conformance record

Review evidence naming the owner, authoritative boundary, representative
accepted and structured-failure paths, stable fields, correlation, privacy,
projections, compatibility, fixtures, and deletion target.

This is preferable to "signal schema" or "signal manifest" because it is not a
runtime registry.

## Structured Upgrade Rules

Signals may deliberately strengthen an existing contract when:

1. the owner already knows the fact;
2. the existing structured surface is semantically correct;
3. the current field can carry a bounded value without changing its role;
4. compatibility and unknown-value behavior are defined;
5. public and private data remain separated;
6. one authoritative lifecycle boundary prevents duplicate projection; and
7. focused fixtures prove the owner meaning before export or rendering.

Examples:

- use a bounded `errorCategory` on `message.delivery.error` when the delivery
  owner has no more precise existing reason field;
- add an owner-approved `failureKind` only when it describes the same failure
  mechanism across accepted cases;
- preserve an existing structured tool `result` through `after_tool_call`
  instead of flattening it to text; and
- distinguish unavailable cost from numeric `costUsd` rather than encoding
  unknown as zero.

## Role Evaluation

The existing Signals role review reinforces this vocabulary:

- the Gateway runtime owner requires diagnostic events to remain bounded and
  non-blocking, so "event" must continue to mean the existing dispatcher
  contract rather than every adopted fact;
- the fleet operator needs stable machine identity and unknown-value handling,
  not one normalized cross-owner enum;
- the user and Localization surface needs actionable rendered messages while
  owner fields remain locale-neutral;
- the security lens maps directly to existing diagnostic metadata, trusted
  trace provenance, and private-data separation; and
- the simplicity lens requires "Signals" to remain an initiative and
  conformance term rather than an SDK, package, payload, or schema.

## Terms To Avoid

- `SignalEnvelope`, `SignalEvent`, `SignalPayload`, or a runtime `signal` field;
- one universal `status`, `outcome`, `reason`, `code`, or severity enum;
- treating every finding as an event;
- treating every event as a terminal outcome;
- describing free-form `error`, `message`, or `reason` text as stable identity;
- using "structured" to mean only JSON-shaped rather than typed, bounded, and
  owner-defined; and
- calling a telemetry or localization projection authoritative.
