# Adoption PR 9 audit: exporter health projection

## Candidate

- Evidence: [openclaw/openclaw#93070](https://github.com/openclaw/openclaw/issues/93070)
- Owner: diagnostics exporter lifecycle
- Supporting owners: Gateway Health/Status and Doctor
- Decision: defer to assigned maintainer and product-boundary review

## Current behavior

`diagnostics-otel` emits trusted `telemetry.exporter` events for bounded
per-signal startup, failure, and drop states. OTel and Prometheus consume those
events, but the diagnostic dispatcher is ephemeral and does not retain a
queryable current/recent exporter-health snapshot.

Gateway Health has explicit owner-backed snapshots for runtime state such as
model-pricing refresh, delivery queues, context-engine quarantine, config
reload, and plugin load failures. Doctor has structured health checks and
plugin contracts, but diagnostics-otel does not contribute one. A Doctor-only
config check could identify unsupported protocol or implicit localhost
defaults, but it cannot represent async exporter failures owned by the running
Gateway.

## Why no fork PR

A complete repair needs a retained, bounded lifecycle state owned by the
running exporter and a carrier into Gateway Health/Status. That changes at
least the plugin-to-core health boundary and the Gateway health protocol. A
module-global plugin snapshot would not serve remote Doctor/status processes,
while replaying the diagnostic queue would make an exporter its own health
dependency.

Splitting off only static configuration warnings would leave the issue's main
runtime-failure requirement unsolved and create a second health model beside
the eventual owner contract.

Issue #93070 is maintainer-authored, assigned to `@bek91` since 2026-06-14, and
currently labeled `clawsweeper:no-new-fix-pr`,
`clawsweeper:needs-maintainer-review`, and
`clawsweeper:needs-product-decision`.

## FACES evaluation

- Runtime owner: health recording must be bounded, nonblocking, and unable to
  affect exporter startup/shutdown.
- Operator: one Gateway query must expose effective per-signal configuration
  plus recent failure without requiring a working telemetry backend.
- Simplicity reviewer: do not add a diagnostic event reader, duplicate static
  Doctor state, or a diagnostics-otel-only protocol bypass.
- Internal analogue: adapt owner-backed Gateway health snapshots such as model
  pricing and delivery queues; avoid generic plugin diagnostics for runtime
  lifecycle state.
- External analogue: OpenTelemetry exposes exporter results and error handling,
  but application-owned health retention and operator presentation remain an
  application concern.

## Owner decision required

Diagnostics and Gateway Health owners must define:

1. the retained per-signal state, timestamps, and bounded failure reasons;
2. lifecycle/reset/expiry behavior after recovery, restart, and shutdown;
3. the plugin-to-Gateway snapshot carrier and protocol compatibility;
4. whether static endpoint/default configuration belongs in the same snapshot;
   and
5. the Doctor and Status rendering/repair ownership split.

No Adoption PR 9 branch or fork PR was created.
