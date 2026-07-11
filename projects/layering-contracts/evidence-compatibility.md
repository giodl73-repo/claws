# Evidence And Compatibility

## Question

How does a host prove what OpenClaw ran, why it made a decision, and whether a
particular release satisfies the contracts the host depends upon?

## Scope

- Stable diagnostics events, dimensions, and correlation identifiers.
- Runtime, profile, provider, config, and version identity.
- Stable failure reason taxonomy.
- Audit and effective-decision evidence.
- Capability and compatibility discovery.
- Release conformance and Lobster patch retirement.

## Ownership

OpenClaw owns portable evidence and conformance semantics. Lobster owns sinks,
Kusto dashboards, alert thresholds, retention, support workflows, deployment
rings, and the release promotion decision.

## Audit Questions

- Which OpenClaw event names and dimensions do current dashboards assume stable?
- Can one correlate a tenant request, runtime generation, effective config,
  profile, session, and terminal outcome without Lobster-only inference?
- Which Lobster patches exist because no upstream conformance test covered the
  behavior?
- What evidence is required before Lobster can drop a carried patch on upgrade?
- Which release gates belong upstream only after the underlying contract lands?

## Status

Inventory only. Release conformance follows accepted contracts; it should not
be used to stabilize undocumented behavior retroactively.

