# Evidence And Compatibility

## Disposition

Evidence and Compatibility is not a new runtime probe or one new framework. It
is a lifecycle-spanning set of existing-style surfaces:

```text
before deployment: capabilities + conformance -> host admission
during startup: required compatibility observations -> readiness conditions
during operation: runtime identity + stable events -> operational evidence
```

No `/compatible` endpoint is proposed. Compatibility depends on the host's
requirement set and should be decided before rollout. Runtime incompatibilities
that make service unsafe should contribute to `/ready`; informational identity
and drift belong in status and events.

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

## Surface Model

### Artifact capabilities

An OpenClaw artifact should expose machine-readable version, build identity,
supported contract versions, profiles, and capabilities. This is a declaration,
not proof by itself.

### Release conformance

Conformance evidence binds an exact artifact digest to the suites and supported
profiles it passed. Lobster compares that evidence with its deployment
requirements before promotion.

### Runtime identity and events

Status and stable events should carry enough identity to correlate the running
version, build, artifact, boot, profile, effective config, session, and outcome.
OpenClaw owns portable identity and event semantics; Lobster owns Kusto,
retention, dashboards, alerting, and support workflows.

### Readiness integration

Candidate observations such as `ArtifactIdentityKnown`,
`SelectedProfileSupported`, `RequiredCapabilitiesPresent`, and
`PluginSdkCompatible` belong in readiness only when failure makes service
unsafe. Their names and necessity must be derived from current OpenClaw fields
and RFC 33 rather than added speculatively.

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

Inventory only. Do not create `/compatible`. Release conformance follows
accepted contracts; it should not be used to stabilize undocumented behavior
retroactively.
