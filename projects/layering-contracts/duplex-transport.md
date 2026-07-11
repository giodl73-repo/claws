# Duplex Transport Project

## Status

Named candidate project within the Layering Contracts portfolio. Evidence and
interface discovery only; no RFC has been filed.

This note supersedes `host-bridge-hypothesis.md` as the project definition. The
Host Bridge remains useful architectural motivation, but **Duplex Transport** is
the narrow OpenClaw primitive being investigated.

## Goal

Extend OpenClaw's transport contract from client requests plus server events
into a secure, capability-negotiated duplex transport that can carry
runtime-to-host service requests and streams.

```text
Current OpenClawTransport

host/client  -- request -->  OpenClaw
host/client  <-- event  ----  OpenClaw

Duplex Transport

host         -- request/stream -->  OpenClaw
host         <-- request/stream --  OpenClaw
```

The intended outcome is that Lobster can implement the standard transport over
its network topology, migrate portable semantics away from private ProxyPipe
frames, and eventually delete ProxyPipe when no Lobster-only service still
requires it.

## Existing Foundation

OpenClaw already provides most of the host-to-runtime half:

- public `OpenClawTransport.request()` and `events()`;
- Gateway protocol negotiation and method/event discovery;
- request correlation and timeouts;
- event sequencing and gap detection;
- operator roles and granular scopes;
- canonical approval, pairing, health, status, restart, and suspend APIs;
- plugin Gateway methods and events.

Lobster also already has two physical Gateway paths:

- browser Gateway WebSockets proxied by the runtime through Plex;
- a purpose-built Rust Gateway client inside the container.

The missing candidate is not another client RPC/event envelope. It is the
runtime-to-host half needed for bounded host services and duplex streams.

## Candidate Contract

The current interface remains compatible. Duplex implementations add optional
host-call and stream facilities, conceptually:

```ts
interface OpenClawDuplexTransport extends OpenClawTransport {
  connect(): Promise<TransportSession>;

  registerHandler(
    method: string,
    handler: HostRequestHandler,
    options: HostHandlerOptions,
  ): Disposable;

  openStream(
    protocol: string,
    params: unknown,
    options?: StreamOptions,
  ): Promise<DuplexStream>;
}
```

This signature is illustrative, not approved. The `node.invoke` audit confirmed
that OpenClaw already has the server-to-peer unary invocation substrate and
needs a sibling, scoped host-provider specialization over shared machinery.

## Required Semantics

- server-initiated correlated requests and responses;
- bidirectional streaming without whole-payload buffering;
- protocol, capability, method, and stream advertisement;
- deployment/runtime/tenant identity binding requirements;
- active runtime generation fencing;
- method-specific permissions separate from operator scopes;
- deadlines, cancellation, and bounded failure results;
- backpressure and overload behavior;
- reconnect, retry, replay, and non-replay rules;
- independently versioned provider namespaces and schemas;
- conformance tests reusable by WebSocket, gRPC, OCC, and Lobster transports.

## Provider Model

Do not expose an unrestricted arbitrary callback bus. Portable host services
must use explicit namespaces, permissions, schemas, and versioning:

```text
host.egress.v1
host.secrets.v1
host.publication.v1
host.telemetry.v1
plugin.<plugin-id>.<service>.v1
```

Each provider declares:

- supported methods and streams;
- request and response schemas;
- permission requirements;
- timeout and payload bounds;
- idempotency and replay behavior;
- redaction and audit metadata;
- required versus optional availability.

## ProxyPipe Migration

| ProxyPipe family | Duplex disposition |
| --- | --- |
| Exec, plugin, node, and device approvals | Existing Gateway request/event contract; should not require new duplex provider semantics |
| Container identity and capabilities | Transport session handshake and generation binding |
| Brokered provider HTTP | Candidate `host.egress.v1` provider |
| Durable workspace publication | Candidate `host.publication.v1`, after state/continuity proof |
| Feedback and judge dedup | Plugin-owned namespaced providers, if they remain remote services |
| Teams ingress | Existing Channel contract; audit before adding any duplex surface |
| AgentHarness | RFC 31 protocol carried on a typed duplex stream, not redefined here |
| Lifecycle | Existing Gateway suspend/restart plus proven checkpoint/publication gaps |

ProxyPipe can remain a physical implementation during migration. The project
does not upstream its proto, tags, Plex routing, or Lobster product semantics.

## Architecture Alignment

- **Gateway** owns runtime RPC, events, approvals, pairing, status, and
  lifecycle APIs.
- **Channels** own messaging ingress and delivery semantics.
- **AgentHarness** owns execution data-plane events and terminal behavior.
- **Duplex Transport** carries canonical contracts and bounded host-service
  providers in both directions.
- **Lobster** implements transport, identity mapping, enterprise services,
  approval UI, routing, and fleet operations.
- **OCC** configures, provisions, admits, and observes duplex endpoints but does
  not become the hot-path message or harness relay.
- **Hosting Profiles** can declare required transport/provider capabilities and
  validate them in release conformance.

## Non-Goals

- Lobster tenant policy or approval UI;
- a new approval protocol;
- a second Gateway protocol;
- OCC desired-state or admission APIs;
- Teams-specific behavior;
- AgentHarness payload semantics;
- snapshot consistency or publication semantics themselves;
- provider-specific implementation details;
- one monolithic hosted OpenClaw envelope.

## First Design Gate: `node.invoke`

**Completed in audit pass 8.** `node.invoke` proves the server-to-peer unary
foundation. Duplex Transport should reuse or extract its correlation,
capability, timeout, connection-binding, and result machinery, but must use a
distinct host-provider identity and permission model. Do not represent hosts as
nodes. Streaming and explicit cancellation remain separate gaps.

Before proposing an interface, audit OpenClaw's existing node peer contract:

1. how peers advertise capabilities and commands;
2. how Gateway initiates `node.invoke.request`;
3. correlation and result delivery;
4. permission and pairing requirements;
5. deadlines, cancellation, and disconnect behavior;
6. stream and backpressure support;
7. whether non-node host peers can reuse the machinery safely;
8. which assumptions are specific to user devices and must not leak into host
   services.

Decision:

- **Selected:** add a sibling host-provider facility using shared peer
  invocation machinery. Preserve `node.invoke` wire compatibility.

## Next Design Gate: Hosted Peer Identity

**Completed in audit pass 9.** Add a distinct `host-provider` peer role with no
operator scopes and no node/device pairing. Admit it using a short-lived,
capability-bound, proof-of-possession credential tied to deployment, provider
surface, and active runtime generation. Reuse connection declarations and peer
invocation internals, but keep provider permissions separate from operator
scopes.

Audit Gateway roles, pairing, bootstrap tokens, trusted proxy identity, device
credentials, and generation binding to define how a host-provider peer is
admitted with least privilege and without inheriting node/device semantics.

## Next Design Gate: First Unary Provider

Audit existing secret-provider and broker extension points, then select one
portable bounded provider for the foundation proof. Do not choose a
Lobster-specific convenience service merely because its current ProxyPipe frame
is small.

## Delivery Shape

Keep the upstream work small and independently reviewable:

1. **RFC:** transport direction, peer/provider model, security, lifecycle, and
   conformance, explicitly reconciled with `node.invoke` and Gateway.
2. **Foundation PR:** one bounded server-to-peer request/provider path with
   capabilities, permissions, deadlines, cancellation, and tests.
3. **Proof PR:** one portable provider, likely brokered egress, plus a
   non-TypeScript/Lobster conformance adapter.

Approvals migrate through existing Gateway contracts and should not inflate the
Duplex Transport implementation stack.

## Evidence Required Before RFC

- completed `node.invoke` comparison recorded in audit pass 8;
- exact Gateway authentication model for a hosted peer;
- proof that direct runtime Gateway connectivity does not already solve the
  candidate use case;
- one runtime-to-host service that cannot use existing provider/plugin APIs;
- one topology beyond Lobster, such as OCC cells or isolated Kubernetes,
  benefiting from the same contract;
- bounded failure, reconnect, generation, and compatibility model;
- quantified ProxyPipe code and frame families removable through adoption.
