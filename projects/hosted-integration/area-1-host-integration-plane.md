# Area 1: Host Integration And Traffic Governance

## Frame

### Problem

A serious host needs to connect OpenClaw to external users, channels, networks,
identity systems, approval surfaces, and operational tooling. Today Lobster
does that through a mixture of Gateway proxying, a purpose-built Rust Gateway
client, Channel-specific paths, and ProxyPipe frames.

The host needs one understandable inventory of integration points without
gaining an opaque ability to intercept every OpenClaw message.

### Thesis

OpenClaw should publish typed, owner-defined **attachment points** for hosted
integration. Hosts compose policy, routing, monitoring, and adapters at those
points. There is no global middleware pipeline.

### Invariant

Every governed flow names:

- its semantic owner;
- the attachment point;
- the host policy or adapter;
- permitted outcomes or transformations;
- subject and deployment provenance; and
- observable activation and health.

### V1 Boundaries

Include:

- Gateway client access, events, approvals, status, and lifecycle;
- Channel ingress and outbound delivery;
- provider request proxy/TLS/network policy;
- runtime identity and readiness; and
- audit and transition telemetry.

Exclude:

- explicit runtime-to-host capability calls;
- AgentHarness payload semantics;
- state publication meaning;
- arbitrary message interception; and
- carrier selection.

### Deletion Target

Move exec approvals, node pairing, and plugin approvals away from private
ProxyPipe DTOs to canonical Gateway events and methods. Delete tags 27-32 and
their copied parsers after separate migration gates.

### Disproof

The idea is too large if existing Gateway, Channel, provider-request, and
readiness surfaces already provide complete discovery, activation, status, and
provenance without a unifying host inventory.

## Audit

### Gateway

`src/gateway/methods/core-descriptors.ts` is already a canonical table for:

- method name;
- operator or node scope;
- startup availability;
- advertisement; and
- control-plane write classification.

Exec approval already has canonical methods:

```text
exec.approval.get
exec.approval.list
exec.approval.request
exec.approval.waitDecision
exec.approval.resolve
```

`OpenClawTransport` already gives host applications request/event access to
that protocol.

### Channels

`ChannelPlugin` exposes separate adapters for:

- configuration and setup;
- security;
- pairing and approvals;
- inbound conversation resolution;
- outbound delivery;
- status and lifecycle;
- bindings;
- secrets; and
- reload metadata.

The product already favors typed attachment surfaces rather than one channel
middleware hook.

### Provider traffic

Provider request configuration centralizes auth, headers, proxy, TLS, SSRF,
timeouts, and transport policy.

The ordered handoff is:

1. OpenClaw computes the logical destination and maximum permitted request.
2. Host governance may further deny or narrow the request and select a physical
   route that preserves the authorized destination.
3. The provider-request binding executes the resulting dispatch.

Host governance cannot widen destination policy or silently mutate semantic
request content. Any permitted header or route transformation is declared by
the provider-request interface.

### Reload and status

`src/gateway/config-reload-plan.ts` maps owner-defined config prefixes to
restart, hot reload, and no-op behavior. Doctor health contributions already
provide structured checks with stable IDs and findings.

These are strong precedents for integration ownership, activation effects, and
operator diagnostics.

### Lobster exec approval

The current adapter already receives canonical
`exec.approval.requested`, but then:

1. parses and flattens the Gateway payload;
2. emits ProxyPipe `ExecApprovalRequest` tag 29;
3. has the runtime re-check tenant/user gates;
4. opens an ApprovalBroker card;
5. returns `ExecApprovalResponse` tag 30; and
6. translates it back to `exec.approval.resolve`.

The canonical contract exists on both ends. ProxyPipe only bridges the host
approval surface.

## Compare

| Comparator | Reuse | Avoid |
| --- | --- | --- |
| Kubernetes Gateway API policy attachment | Typed target references, explicit route ownership, status conditions, scoped precedence | Policy inheritance that becomes hard to explain |
| Envoy extension points | Named listener/route/filter insertion points, effective config inspection, per-filter telemetry | Treating every application concern as L7 traffic |
| ASP.NET Core middleware | Simple ordered composition and short-circuit model | Global visibility, order-dependent hidden mutation, weak ownership |
| OpenClaw Gateway descriptors | Canonical method inventory and scopes | Assuming method discovery covers non-Gateway adapters |
| OpenClaw Channel adapters | Owner-specific typed surfaces | Flattening all adapters into one host hook |

## Evaluate

### Runtime owner

The integration plane must be metadata and composition around existing paths,
not another synchronous hook on every message.

### Host operator

The host needs one inventory, activation model, health view, and provenance
record. It should not have to reverse-engineer each plugin and Gateway event.

### Security

Policy attachment is explicit and default-deny. Mutation is schema-defined and
audited. A host cannot silently rewrite arbitrary Gateway or Channel payloads.

### Simplicity

The plane is a catalog of attachment points, not a new hot-path protocol.
Existing local behavior remains unchanged when no host integration is
configured.

## Slice

Design the exec-approval migration:

1. register a dedicated Lobster host operator connection;
2. subscribe to canonical `exec.approval.requested`;
3. bind tenant, user, container, and generation from the authenticated route;
4. present the existing ApprovalBroker card;
5. call canonical `exec.approval.resolve`;
6. expose one structured readiness/status entry; and
7. define mixed-version expiry for ProxyPipe tags 29-30.

Migration uses single-writer states:

```text
ProxyPipe authoritative
canonical shadow observation
canonical authoritative
ProxyPipe removed
```

Only the authoritative path may resolve an approval.

Accepted proof: one allow-once decision reaches the same Gateway approval.

Structured failure: stale generation or missing host identity denies and leaves
the command fail-closed.

No implementation is authorized by this design slice.

The exact attachment, consumer, identity, lifecycle, readiness, and deletion
contract is specified in `area-1-exec-approval-host-contract.md`.

The Channel ingress, trusted-forwarder, acknowledgement, outbound governance,
status, and Teams tags 12-13 deletion contract is specified in
`area-1-channel-attachment-contract.md`.

The provider destination, route, proxy/TLS, policy precedence, dispatch
handoff, and failure contract is specified in
`area-1-provider-traffic-governance.md`.

The canonical Gateway administration boundary and three V1 attachment kinds
are specified in `area-1-operations-and-catalog.md`. Its shared binding
envelope, phased activation, readiness/status vocabulary, and migration
mechanics are inputs to Area 3 rather than Area 1 ownership.
