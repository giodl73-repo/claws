# ProxyPipe And OpenClawTransport Fit - Pass 7

## Baseline

- OpenClaw revision: `fab69517b3d`
- Lobster revision: `0a9514c1ce`
- Question: why is Gateway-shaped ProxyPipe traffic not using OpenClaw's
  `OpenClawTransport`, and what would change if it did?

## Short Answer

ProxyPipe did not begin as a Gateway transport. It began as a reverse-dialed
HTTP egress bridge for an isolated container. Lobster subsequently added
unrelated frame families to the available connection.

At the same time, Lobster developed two separate Gateway integration paths:

1. The runtime's browser Gateway proxy opens a Gateway WebSocket through Plex
   and generally relays canonical frames between the SPA and container.
2. The container adapter runs a hand-built Rust Gateway client for native
   Teams, pairing, cron inventory, and approvals. It parses selected Gateway
   events and translates some of them into custom ProxyPipe request/response
   DTOs for the runtime.

The second path is semantically an OpenClaw transport client but is not exposed
as a general request/event transport. That is why approval semantics are copied
into ProxyPipe.

## Historical Sequence

The repository history supports an accretion explanation:

| Date              | Change                                                                                 |
| ----------------- | -------------------------------------------------------------------------------------- |
| 2026-04-29        | OpenClaw SDK package introduced                                                        |
| 2026-05-18        | Lobster ProxyPipe introduced as runtime-dialed gRPC                                    |
| 2026-05-21        | HTTP forward/refresh traffic moved onto ProxyPipe                                      |
| 2026-06-08        | In-container native Teams channel integrated                                           |
| 2026-06-13 onward | Build identity, feedback, lifecycle, AgentHarness, approvals, and other services added |
| 2026-06-30        | Hosted `system.run` approval added through ProxyPipe                                   |
| 2026-07-06        | Native Teams WorkIQ approval gap patched through ProxyPipe                             |

`OpenClawTransport` is a TypeScript SDK interface, while the Lobster runtime and
container adapter are Rust. Lobster could not import the TypeScript type
directly, but it could preserve its wire semantics or implement an equivalent
Rust interface. The language boundary explains implementation mechanics, not
the duplicated protocol semantics.

## Current Architecture

```text
Browser / SPA
  -> Lobster runtime Gateway proxy
  -> Plex Gateway WebSocket route
  -> OpenClaw Gateway

Native Teams / adapter services
  -> in-container Rust OpenClawGatewayClient
  -> loopback OpenClaw Gateway WebSocket
  -> selected event parser
  -> custom approval/lifecycle/etc. ProxyPipe DTO
  -> Lobster runtime service
```

The runtime Gateway proxy says frames pass through unmodified, but it also
contains Lobster-owned intercepts for approvals, cron signing, session
management, user-turn sniffing, and other product behavior. It is therefore a
transport plus interception layer, not yet a reusable host operator client.

The in-container `OpenClawGatewayClient` is also purpose-built:

- it implements Gateway challenge/connect and persists an Ed25519 device;
- it requests broad read/write/admin/approval/pairing scopes;
- it supports a single active message plus separate query waiters;
- it parses a selected union of events and response payloads;
- it has special code for pair approval, node inventory, cron inventory,
  exec approval, and plugin approval;
- it exposes session frame subscriptions, not the full canonical Gateway event
  stream.

This is the direct source of duplication. Each new hosted use case extends the
custom client parser and often adds another ProxyPipe frame family.

## What `OpenClawTransport` Would Mean Here

The exact TypeScript interface does not need to cross into Rust. The required
behavior is:

```text
request(method, canonical params, timeout) -> canonical Gateway result/error
events(filter) -> canonical Gateway event frames with sequence/state metadata
close()
```

Two implementation choices are viable.

### Option A: Runtime Host-Operator Gateway Connection

```text
Lobster host operator client
  -> existing Plex Gateway WebSocket route
  -> OpenClaw Gateway
```

The runtime already opens this physical route for browser sessions. A dedicated
least-privilege operator connection could subscribe to approval/pairing events
and resolve them directly. This is the cleanest architecture because canonical
Gateway traffic would not enter ProxyPipe at all.

Unresolved requirement: define safe host authentication. The runtime must use a
dedicated host identity and only the scopes it needs, rather than receiving the
adapter's broad persisted device key or reusing an end-user browser connection.
Connection ownership must also follow the active container generation so stale
connections cannot resolve new approvals.

### Option B: ProxyPipe-Backed OpenClawTransport

```text
Lobster host operator client
  -> canonical Gateway frame subprotocol over ProxyPipe
  -> container relay
  -> loopback OpenClaw Gateway
```

This preserves the reverse pipe as the physical path while replacing individual
approval DTOs with canonical Gateway requests, responses, and events. It needs
one bounded Gateway relay family, correlation, deadlines, cancellation,
sequence-gap handling, capability negotiation, scope enforcement, and
generation fencing.

This is better than today's per-feature frames but less attractive than Option
A when the existing Plex Gateway WebSocket route is available. It also risks
building a second WebSocket-like multiplexer inside ProxyPipe.

## Frames That Could Disappear

With a host-operator Gateway connection, these custom semantic pairs are
immediate migration candidates:

| ProxyPipe tags | Current DTO                            | Canonical replacement                                                                                       |
| -------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 27-28          | `NodePairApprovalRequest/Response`     | `node.pair.requested` plus `node.pair.approve/reject`                                                       |
| 29-30          | `ExecApprovalRequest/Response`         | `exec.approval.requested` plus `exec.approval.resolve`                                                      |
| 31-32          | `CronCreationApprovalRequest/Response` | `plugin.approval.requested` plus `plugin.approval.resolve`; Lobster marker remains plugin-owned result data |

The eager container adapter may still need a local Gateway connection for
container-local duties such as pairing repair or cron inventory. It would no
longer need to own the external approval presentation round trip.

## Traffic That Would Not Disappear

`OpenClawTransport` does not replace runtime-to-host services or non-Gateway
data planes:

- brokered HTTP/provider egress;
- durable workspace publication;
- AgentHarness streams;
- Lobster feedback and judge-dedup services;
- possibly native Teams activity delivery, pending Channel ingress audit;
- host lifecycle generation fencing and container ownership.

Those remain separate logical subprotocols even if they share one physical
ProxyPipe connection.

## Security Correction

The current adapter requests all major operator scopes on one persisted device:

```text
operator.read
operator.write
operator.admin
operator.approvals
operator.pairing
```

A host-operator transport should split responsibilities and request only the
scopes required by each service. For the approval relay that is normally
`operator.approvals` and `operator.pairing`, with read/admin added only for
separately justified methods. Lobster tenant/user identity must remain pinned
from the authenticated runtime/container binding and must not be accepted from
Gateway event display fields.

## Recommendation

Prefer Option A unless authentication or network evidence blocks it:

1. Add a reusable Rust Gateway transport/client in Lobster runtime with
   canonical request/event behavior.
2. Dial the existing Plex Gateway WebSocket route as a dedicated host operator.
3. Bind the connection to tenant, user, container, and active generation.
4. Use least-privilege approval/pairing scopes.
5. Move exec approval first as the proof because it has the cleanest canonical
   requested/resolve lifecycle.
6. Move node pairing second.
7. Move WorkIQ plugin approval last, separating the plugin-owned signed marker
   from the generic approval transport.
8. Retire ProxyPipe tags 27-32 only after mixed-version capability rollout and
   conformance proof.

If direct host-operator authentication cannot be made safe, use Option B as a
compatibility step, but keep canonical Gateway payloads and treat it as an
`OpenClawTransport` adapter rather than a new approval API.

## Upstream Consequence

This audit does not yet prove that OpenClaw needs a new Gateway transport
primitive. Its public SDK contract and Gateway wire protocol are sufficient for
the semantic migration. Potential upstream work is narrower:

- document and test non-TypeScript implementations of the Gateway transport
  contract;
- provide stable protocol/schema artifacts for generated clients if needed;
- define a least-privilege hosted operator authentication pattern;
- add only missing host-service or durability providers separately.

The immediate corrective work is primarily Lobster architecture: consume the
upstream Gateway contract consistently before asking OpenClaw for another
abstraction.

## Next Proof

Trace the existing runtime Gateway dial and connect handshake end to end:

1. identify where the Gateway token or device credential is generated;
2. identify what the runtime knows after `gateway_start`;
3. prove whether a dedicated runtime-owned operator identity can pair without
   granting broad admin scope;
4. bind reconnect and event delivery to the active container generation;
5. prototype the exec approval flow as canonical Gateway frames in a design
   sketch before changing code.
