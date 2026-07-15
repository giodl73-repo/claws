# Four-Area Hosted Architecture

## The Four Areas

```text
1. Host Integration Plane
   Where the host attaches to canonical OpenClaw traffic and operations.

2. Host Capability Providers
   Explicit services the isolated runtime consumes.

3. Host Wiring And Composition
   How independently owned bindings are selected and observed as one hosted
   deployment through registries, Hosting Profiles, status, and Doctor.

4. Carrier Options
   How a hosted binding crosses a process or network boundary.
```

## Ownership Rule

The semantic owner defines the interface, validates configuration, constructs
the effective binding, activates it, and fences its generation. The host bundle
registers implementations. Hosting Profiles aggregates owner evidence. The
carrier moves bytes. No lower layer may redefine an upper layer's meaning.

```text
host bundle registration
  -> typed owner reference
  -> owner binding and evidence
  -> Hosting Profile
  -> native or selected carrier
```

## Host Integration Bundle

A host registers one namespaced bundle declaring the implementations it can
supply across all four areas. Owner configs select those implementations by
typed ID; Hosting Profiles promotes their readiness criteria to required or
advisory; status and Doctor expose the assembled integration.

Central registration packages the host surface without centralizing semantics.
See `host-integration-bundle.md`.

## Ordered Provider-Request Handoff

```text
OpenClaw semantic policy
  logical destination
  credentials policy
  allowed origins and request shape
        |
        v
optional host traffic governance
  may deny or narrow
  may select physical route
  may apply only declared transformations
        |
        v
provider-request binding
  executes authorized dispatch
        |
        v
carrier, if remote
```

No layer may widen the authority granted by the layer above it.

## Lifecycle Model

Each owner may expose an **owner binding generation** for its authoritative
configuration. Remote host implementations additionally expose a **host bundle
generation** and a **binding/carrier incarnation**.

Optional binding loss does not fence unrelated work. Loss of a
profile-required binding makes the workload non-ready. Recovery may replace an
incarnation within the same owner generation. Owners, not Hosting Profiles,
activate bindings and fence stale generations.

Runtime suspend/resume/shutdown remains Gateway lifecycle behavior.

## Migration Model

Every replacement uses single-writer states:

```text
old-authoritative
  -> shadow-new
  -> new-authoritative
  -> old-removed
```

Shadow paths may compare payloads and outcomes but cannot perform side effects.
Rollback explicitly changes the authoritative writer.

## Operational Model

The effective status surface reports:

- desired and effective binding;
- semantic owner;
- interface and version;
- deployment criticality;
- owner and host bundle generation;
- binding/carrier incarnation;
- ready, degraded, or unavailable;
- provenance and policy source;
- reload disposition;
- last transition; and
- portable failure plus operator-only cause.

## ProxyPipe Decomposition

| ProxyPipe concern | Area |
| --- | --- |
| Gateway approvals, pairing, canonical events | Host integration plane |
| Teams ingress | Host integration plane through a Channel endpoint attachment |
| Channel outbound implementation | Existing Channel owner, or a host capability only when a concrete external execution seam is required |
| Egress dispatch, secrets, publication, telemetry | Host capability providers |
| Capability flags and readiness aggregation | Host wiring and composition |
| Activation, generation, and migration authority | The semantic owner |
| Reverse dial, framing, correlation, flow control | Carrier |
| AgentHarness and lifecycle semantics | Their existing owners, not any of the four generic layers |

All four areas are needed to eliminate ProxyPipe cleanly. None requires keeping
ProxyPipe's central envelope or a replacement bus.
