# Signals Role Review

Evidence reviewed through five `.craft/roles/claws/` lenses.

## Gateway Runtime Owner

Lens: `gateway-eng`

Findings:

- **Blocking:** no mandatory wrapper around every log or thrown error.
- Emission must remain bounded, non-blocking, and reuse the existing diagnostic
  queue and listener-presence gates.
- No synchronous localization, serialization, network export, or price lookup
  on the runtime failure path.
- High-cardinality fields and raw messages cannot become metric labels.
- An owner-specific result should be reusable even when diagnostics are
  disabled.

## Fleet Operator

Lens: `platform-eng`

Findings:

- Stable reason identity must survive wording and locale changes.
- Signals need runtime/version/instance attribution where operators compare
  multiple gateways.
- Critical owner failures cannot require enabling verbose logging after the
  incident.
- Exporter health must itself be inspectable through Status or Doctor.
- Mixed-version behavior and unknown fields need explicit compatibility
  treatment before fleet rollout.

## User And Localization Surface

Lens: `cowork-ux-eng`

Findings:

- Codes alone are not a user experience; every surfaced failure needs an
  actionable rendered explanation and escalation path.
- Rendering must preserve owner facts such as what failed, whether it was
  denied or unavailable, and what the user can do next.
- Generic global toasts such as "Something went wrong" discard too much
  meaning.
- Locale selection and fallback belong to Localization, not telemetry.
- Raw provider or exception text should not be interpolated into translated
  messages without classification and redaction.

## Security And Privacy

Lens: `ciso`

Findings:

- Audit and policy consumers must never key decisions on localized prose.
- Signal trust provenance matters: core, plugin, and externally supplied trace
  context cannot be treated as equivalent.
- Redaction is part of the contract, not an exporter cleanup step.
- Correlation identifiers must be bounded and must not encode PII, credentials,
  prompts, filesystem paths, or raw provider request IDs.
- Content capture remains explicit opt-in and must not leak into the public
  event bus.

## Skeptical Simplicity And Community

Lens: `founder`

Findings:

- **Blocking:** do not add a Signals SDK, daemon, config section, storage file,
  or mandatory package in V1.
- Start with one obvious owner bug where meaning is already known and consumers
  already exist.
- Contributors should be able to understand the owner result without learning
  an enterprise observability architecture.
- The first slice must delete a workaround or duplicated classification path.
- If repeated slices do not converge on a small reusable convention, keep them
  as ordinary owner fixes and retire the project.

## Revised Decision

Proceed only as a bounded cross-project evidence lane:

- owner-defined typed outcome;
- existing diagnostics and trace context;
- separate human rendering;
- bounded redaction;
- one conformance fixture; and
- one deletion target.

Do not propose a general signal schema or RFC before at least two independent
owner slices demonstrate the same missing convention.
