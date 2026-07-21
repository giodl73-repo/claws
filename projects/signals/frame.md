# Signals FACES Frame

Last updated: 2026-07-20

## Falsifiable Thesis

OpenClaw already has structured diagnostics, Doctor findings, readiness
snapshots, usage accounting, and trace propagation. However, owner paths often
discard stable machine meaning before failures reach hooks, diagnostics, logs,
status, or user-facing rendering.

The smallest useful Signals contract is therefore:

> An owner emits one bounded, locale-neutral terminal outcome with stable
> identity and correlation before any consumer renders, exports, aggregates, or
> enforces it.

This should let existing consumers reuse the same meaning without introducing a
new event bus, telemetry backend, findings framework, or universal envelope.

## Affected Users

- operators diagnosing silent channels, sessions, plugins, and schedulers;
- plugin authors trying to correlate hooks and distinguish success from
  failure;
- telemetry consumers building alerts and traces;
- localizers rendering actionable errors without parsing English;
- administrators attributing usage and cost to the responsible run or agent;
  and
- maintainers who currently fix the same missing signal independently in each
  surface.

## Current Workarounds And Cost

- enable verbose logging after already suspecting the affected subsystem;
- read bundled or generated source to discover hidden environment variables or
  buried diagnostics;
- parse free-form error strings or flattened tool results;
- correlate session JSONL, run tables, and timestamps manually;
- poll state after a run because usage is not emitted on the lifecycle stream;
- infer failures from silence, stale flags, or missing output; and
- build exporter-specific mappings for fields whose owner semantics are absent.

Issue reports explicitly describe hours of debugging, production turns that go
quiet, alerts that never fire, and manual session-file parsing.

## Proposed Invariant

For an adopted owner path:

1. the semantic owner determines the terminal outcome;
2. the owner emits or returns a stable code/reason plus typed bounded
   parameters;
3. available run, trace, session, agent, and generation context is preserved;
4. sensitive values remain private, redacted, hashed, or omitted;
5. human text is rendered after the structured result exists; and
6. telemetry, logs, hooks, status, Doctor, and localization consume the owner
   result rather than reclassifying free-form text.

## V1 Boundaries

- one representative owner path before any shared package or schema;
- reuse `DiagnosticEventPayload`, `HealthFinding`, existing trace context, and
  owner-specific result types;
- no global conversion of every thrown `Error`;
- no new configuration keys or mandatory plugin SDK surface;
- no storage, transport, sampling, alerting, dashboard, or budget enforcement;
- no promise that one vocabulary covers errors, findings, readiness, and usage;
  and
- no localized strings in machine-facing telemetry attributes.

## Deletion Target

The first slice must delete or bypass one source of semantic loss, such as:

- a warning callback collapsed to `logVerbose`;
- free-form string parsing used to recover an error class;
- a flattened result that discards an existing structured outcome; or
- a second consumer-specific reconstruction of an owner-known terminal state.

## Disproof Criteria

Shrink or close Signals as a separate initiative if evidence shows that:

- missing signals are only isolated instrumentation bugs with no repeated
  semantic-loss pattern;
- existing diagnostic contracts already provide sufficient stable identity and
  only need owner-specific adoption PRs;
- a shared convention requires a universal runtime envelope or public SDK
  expansion to be useful; or
- localization, telemetry, and resource accounting cannot share owner results
  without coupling their policies.

The evidence so far disproves the original idea of building a new common
runtime evidence substrate. It supports a narrower adoption and consistency
project.
