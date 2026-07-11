# Four-Corner Model

## Result

The four areas are classification lenses, not four new frameworks, probes, or
RFCs.

The Lobster/OpenClaw compatibility boundary is orthogonal: env vars, headers,
start fields, config overlays, proxy-pipe events, state artifacts, lifecycle
signals, and telemetry dependencies are concrete integration items. Each must
map to one semantic area and a target disposition under `charter.md`.

| Area | Canonical concept | Surface disposition |
| --- | --- | --- |
| Runtime Activation | Host intent becomes effective runtime configuration | Startup-critical observations fold into readiness; drift belongs in status/reconciliation |
| Runtime Boundary | Runtime may safely receive work | `/ready` and Readiness Conditions/Hosting Profiles |
| State and Continuity | Required runtime state catches up to durable state | `/synced` remains an audit hypothesis over synchronization conditions |
| Evidence and Compatibility | Host can admit a supported artifact and prove runtime behavior | Capabilities, conformance, runtime identity, stable events; no new probe |

## Lifecycle

```text
artifact capabilities + conformance
  -> host deployment admission
  -> activation observations
  -> /ready
  -> serve and emit identity/events
  -> state mutations
  -> synchronization conditions
  -> /synced
  -> drain + final synchronized generation
  -> graceful stop
```

## Probe Rule

Do not create one `/xxx` surface per area. Add a dedicated probe only when a
container host needs an independently actionable aggregate decision:

- `/ready` gates traffic admission.
- `/synced`, if validated, reports whether required state has caught up to a
  durable generation.
- Activation failures required for safe service are readiness conditions.
- Compatibility is a host admission decision over artifact capabilities,
  conformance evidence, and host requirements.

## Current Initiatives

Only two initiatives should be active:

1. Readiness Conditions and Standard Hosting Profiles under Runtime Boundary.
2. State and Continuity audit, using `/synced` and generation tracking as
   hypotheses and Snapshot RFC 20 as the first concrete mechanism to map.

Activation and Evidence/Compatibility remain organized inventories until they
produce a narrow independently useful gap.

## Next Audit Order

1. Build the state-path durability inventory.
2. Trace OpenClaw SQLite mutation and Snapshot RFC 20 artifact boundaries.
3. Trace Lobster artifact discovery, publication, and restore.
4. Determine whether one global generation, component watermarks, or neither
   matches current behavior.
5. Prove a drain, synchronize, restore, and graceful-stop sequence before
   proposing a new OpenClaw contract.
