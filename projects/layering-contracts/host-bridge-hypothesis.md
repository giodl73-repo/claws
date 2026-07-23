# OpenClaw Host Bridge Hypothesis

## Status

Superseded as the project definition by `hosted-integration.md`. Host Bridge is
retained as architectural motivation and composition language, not as a
separate proposed OpenClaw abstraction or RFC.

Gateway coverage pass 6 narrowed this hypothesis: the public SDK already has a
transport-neutral `OpenClawTransport` contract, and Gateway already owns the
RPC/event, approval, pairing, health, restart, and suspension semantics. A Host
Bridge must compose those surfaces rather than duplicate them. The remaining
candidate gaps are host-service invocation and durable lifecycle composition.
Pass 7 then isolated the reusable technical primitive as Duplex Transport.

## Problem

Lobster must integrate an isolated OpenClaw deployment with an enterprise host.
Its container cannot initiate ordinary outbound calls to the Lobster runtime,
so Lobster uses a reverse bidirectional gRPC connection through Plex.

That physical connection, ProxyPipe, has gradually accumulated several
unrelated semantic protocols: Gateway approvals and pairing, Teams ingress,
AgentHarness execution, lifecycle control, provider egress, diagnostics, and
plugin-owned services. The constrained topology justifies a shared transport;
it does not justify redefining each OpenClaw contract in a Lobster proto.

The customer need exposed by Lobster is broader than ProxyPipe: OpenClaw lacks
one explicit, supported boundary through which a hosting platform can connect
an isolated runtime to host identity, supervision, and optional host services
while preserving OpenClaw's canonical runtime protocols.

## Candidate Primitive

Define a **Host Bridge** composition between OpenClaw and the platform hosting
it, using the existing `OpenClawTransport` contract for Gateway traffic and
adding only independently proven missing provider/lifecycle seams.

The Host Bridge composes existing OpenClaw primitives. It does not replace
Gateway, Channels, AgentHarness, plugins, or OCC, and it does not make
ProxyPipe an upstream protocol.

```text
OpenClaw runtime semantics
  Gateway requests, responses, and events
  Channel ingress
  AgentHarness execution protocol
  lifecycle, readiness, and state signals
  optional host-service requests
                |
                v
       Host Bridge composition
                |
       transport implementation
        /          |          \
   direct WS   OCC runtime   Lobster ProxyPipe
                              through Plex
```

## Responsibilities

Portable OpenClaw contracts within the Host Bridge composition should own:

- connection and supervision lifecycle;
- protocol and capability negotiation;
- deployment/runtime identity binding requirements;
- use of canonical Gateway request, response, event, and stream envelopes;
- deadlines, cancellation, backpressure, reconnect, and replay boundaries;
- allowlisted Gateway methods and events available to a host;
- declarations for optional host services such as egress, secrets, telemetry,
  audit, or durable publication;
- conformance tests for bridge providers and consumers.

The hosting platform should own its implementation and enterprise decisions:

- transport and network topology;
- tenant and user identity mapping;
- authorization, admission, and approval presentation;
- Teams/web/admin surfaces;
- storage, egress, secret, telemetry, and audit backends;
- routing, deployment, worker pools, and fleet operations.

## Mapping Existing ProxyPipe Traffic

| ProxyPipe family                      | Canonical semantic owner                  | Host Bridge role                                                            |
| ------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------- |
| Exec approval                         | Gateway `exec.approval.*`                 | Relay canonical events and RPC; Lobster presents the decision surface       |
| Node/device pairing                   | Gateway `node.pair.*` and `device.pair.*` | Relay scoped pairing events and decisions                                   |
| Plugin approval                       | Gateway/plugin approval lifecycle         | Relay canonical plugin intent and decision without a second approval schema |
| Teams activity                        | Channel ingress                           | Transport accepted channel input and acknowledgement                        |
| Remote harness                        | AgentHarness RFC 31                       | Carry the canonical data-plane stream                                       |
| Lifecycle/status                      | OpenClaw runtime lifecycle                | Carry portable supervision commands and observations                        |
| Brokered provider HTTP                | Host egress/provider service              | Advertise and invoke an optional host service                               |
| Judge dedup, feedback, WorkIQ markers | Plugin or Lobster product service         | Keep namespaced outside the core bridge semantics                           |

For approvals, the existing ACP implementation establishes the relevant
pattern: it observes Gateway approval events, presents an external permission
request, and resolves the operation through Gateway RPC. Lobster should be
another host/operator adapter over that contract, not the owner of parallel
approval semantics.

## Relationship To Other Architecture

- **Gateway** remains OpenClaw's runtime API and operator event/RPC surface.
- **Channels** remain user-message integrations; host supervision and approval
  are not channels.
- **AgentHarness** remains the execution data-plane contract.
- **OCC** may configure, provision, and admit Host Bridge instances, but should
  not carry hot-path Gateway, channel, or harness traffic.
- **Hosting Profiles** describe supported deployment/readiness expectations;
  they may require Host Bridge capabilities but do not implement the bridge.
- **Lobster ProxyPipe** remains a Lobster transport provider and the first
  demanding conformance implementation.

## Design Constraint

The bridge must not become a single growing `hosted-openclaw` envelope. Each
semantic payload remains governed and versioned by its owning OpenClaw
contract. The bridge standardizes connection, capability discovery, identity,
transport behavior, and access to those contracts.

## Evidence Gate

Before proposing an RFC:

1. Map every ProxyPipe frame to Gateway, Channel, AgentHarness, lifecycle,
   optional host service, plugin-owned traffic, or an unresolved gap.
2. Replace conceptual approval duplication with exact mappings to current
   Gateway methods, events, scopes, expiry, and resolution behavior.
3. Identify which requirements cannot be met by `OpenClawTransport`, an
   ordinary authenticated Gateway client, plus existing plugin APIs.
4. Prove that at least one additional host topology beyond Lobster benefits
   from the same provider boundary, such as OCC runtime cells or an isolated
   Kubernetes deployment.
5. Derive the smallest provider interface from those remaining gaps and define
   failure, reconnect, compatibility, and conformance behavior.

## Working Decision

Treat Host Bridge only as the architectural composition. Treat Duplex
Transport as the candidate upstream primitive and ProxyPipe as Lobster's
transport implementation and migration evidence. Until the evidence gate is
complete, do not upstream the ProxyPipe wire schema or create private copies of
OpenClaw semantics under a generic bridge name.
