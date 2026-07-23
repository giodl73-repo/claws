# Adoption PR 10 audit: session export conformance

## Candidate

- Evidence: [openclaw/openclaw#102018](https://github.com/openclaw/openclaw/issues/102018)
- Related taxonomy issue:
  [openclaw/openclaw#102019](https://github.com/openclaw/openclaw/issues/102019)
- Owner: session lifecycle and trajectory
- Supporting owner: diagnostics-otel
- Decision: defer to session-terminal telemetry contract review

## Current behavior

The existing diagnostic `run.completed` contract has bounded outcomes and
diagnostics-otel correctly sets `SpanStatusCode.ERROR` when its outcome is
`error`. Prometheus also records the same owner outcome. That path is already
semantically coherent for `openclaw.run`.

The reported `session.ended` artifact is a separate trajectory runtime event.
The embedded runner records coarse status plus abort/timeout/error details, and
the trajectory recorder writes it to JSONL. `DiagnosticEventPayload` has no
`session.ended` event, and diagnostics-otel has no handler or span with that
name.

The issue therefore is not an exporter mapping bug on `run.completed`.
Trajectory session termination and diagnostic run completion are distinct
owners whose relationship has not been approved.

## Why no fork PR

Adding `session.ended` to diagnostics would create a new trusted lifecycle
contract and could duplicate `run.completed`. Reusing `run.completed` as the
session owner would be inaccurate because the trajectory event also represents
cleanup, interruption, timeouts, takeover, and terminal error details.

The requested `openclaw.end_reason` vocabulary overlaps issue #102019 and is a
public low-cardinality telemetry taxonomy. Both issues are labeled
`clawsweeper:no-new-fix-pr`, `clawsweeper:needs-maintainer-review`, and
`clawsweeper:needs-product-decision`.

## FACES evaluation

- Runtime owner: derive one terminal classification from existing attempt
  state; do not emit competing run/session endings.
- Operator: error status and end reason must agree across the chosen trajectory
  and OTel projections.
- Simplicity reviewer: keep `run.completed` unchanged until owners decide
  whether `session.ended` is a distinct public diagnostic lifecycle.
- Internal analogue: reuse `run.completed` error mapping only for run-owned
  semantics; adapt the trajectory event only after session ownership is
  confirmed.
- External analogue: OTel span status defines success/error mechanics but does
  not define OpenClaw's session-terminal reason taxonomy.

## Owner decision required

Session lifecycle, trajectory, and diagnostics owners must define:

1. whether `session.ended` becomes a trusted diagnostic event or remains
   trajectory-only;
2. how it relates to `run.completed` without duplicate terminal artifacts;
3. one bounded terminal outcome/reason taxonomy shared with issue #102019;
4. which errors may contribute sanitized status messages; and
5. cross-projection fixtures proving trajectory and OTel agree.

No Adoption PR 10 branch or fork PR was created.
