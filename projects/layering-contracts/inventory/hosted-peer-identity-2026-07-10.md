# Hosted Peer Identity For Duplex Transport - Pass 9

## Baseline

- OpenClaw revision: `fab69517b3d`
- Scope: Gateway role, authentication, authorization, identity, and generation
  requirements for a Duplex Transport host-provider peer

## Decision

Add a distinct Gateway peer role, tentatively **`host-provider`**. Do not reuse
`operator` or `node` as the public identity for runtime-to-host services.

A host-provider connection should be admitted with a short-lived,
capability-bound credential tied to:

- one Gateway/deployment audience;
- one provider instance and provider namespace set;
- one tenant/runtime binding where applicable;
- one active host/runtime generation;
- one declared public key or equivalent proof-of-possession identity;
- an expiry and revocation/rotation boundary.

Its effective provider methods are the intersection of credential grants,
connection declarations, configured host requirements, and current runtime
policy. It receives no operator scopes and does not participate in device/node
pairing.

## Current Gateway Identity Model

### Roles

Gateway roles are a closed set:

```text
operator
node
```

Unknown roles fail the handshake. Role authorization occurs before method-level
scope checks:

- operators call scope-classified Gateway methods;
- nodes call the small node-role method set and receive node invocation events.

This is structurally suitable for an additive peer role, but every role-aware
authorization, broadcast, presence, pairing, and protocol-compatibility path
must remain default-deny until it explicitly handles `host-provider`.

### Operator scopes

Operator scopes are also a closed set:

```text
operator.admin
operator.read
operator.write
operator.approvals
operator.pairing
operator.talk.secrets
```

They authorize a human/operator client to act on OpenClaw. They do not describe
which services OpenClaw may call on a hosting platform. Host-provider
permissions must therefore be a separate vocabulary.

### Connection declaration

The existing `ConnectParams` already carries useful peer declaration fields:

- protocol range;
- client ID, mode, version, platform, and instance ID;
- capabilities;
- commands;
- permissions;
- role and scopes;
- signed device identity;
- authentication material.

The hello response already returns negotiated protocol, server connection ID,
available methods/events/capabilities, effective auth role/scopes, and transport
payload/buffer limits.

Duplex can evolve this declaration additively. It should not overload node
`commands` or operator `scopes`; use explicit provider declarations and grants.

## Existing Authentication Options

| Mechanism                            | Fit                        | Reason                                                                                                                             |
| ------------------------------------ | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Shared Gateway token/password        | Poor                       | Authenticates possession of a deployment-wide secret; cannot safely self-declare provider methods or tenant/generation identity    |
| Trusted proxy                        | Poor for provider identity | Authenticates a user/header identity at a network boundary; intended for operator HTTP/UI access, not workload proof-of-possession |
| Paired device token                  | Poor                       | Persistent device role/scope grant and device-pairing lifecycle are the wrong domain                                               |
| Node bootstrap/pairing               | Poor                       | Couples host infrastructure to user/device command approval, wake, and node policy                                                 |
| Operator device token                | Poor                       | Grants host-to-Gateway operator authority, not Gateway-to-host provider authority                                                  |
| Process-local approval runtime token | Useful precedent only      | Safely grants one narrow backend responsibility but is intentionally loopback/process-local and not remotely portable              |
| Agent runtime identity token         | Useful precedent only      | Demonstrates signed, scoped runtime identity but binds agent/session execution, not host provider methods                          |
| New host-provider admission token    | Best fit                   | Can bind provider identity, capabilities, deployment, generation, expiry, and proof of possession                                  |

## Why `operator` Is Insufficient

A dedicated runtime-owned operator connection remains the correct Lobster path
for approvals, pairing, status, and other host-to-Gateway operations. It is not
the same peer as a Duplex host provider.

```text
Lobster operator connection
  calls Gateway methods
  receives Gateway events
  has operator.approvals / operator.pairing / selected read scopes

Lobster host-provider connection
  receives OpenClaw host-service invocations
  returns provider results
  has host provider grants, no operator scopes
```

Combining these authorities on one connection would recreate the adapter's
current broad read/write/admin/approval/pairing identity and make compromise of
an egress provider equivalent to compromise of an OpenClaw administrator.

## Why `node` Is Insufficient

Nodes already provide server-to-peer invocation but carry the wrong identity
and policy semantics:

- durable device identity and pairing;
- user approval of device command surfaces;
- platform/device metadata;
- mobile wake and foreground queues;
- local-machine command allowlists and dangerous-command handling;
- node removal and device-role revocation.

Host-provider invocation should share pending-call machinery with nodes, not
their role or trust lifecycle.

## Proposed Hosted Peer Identity

### Connection declaration

Illustrative shape:

```json
{
  "role": "host-provider",
  "client": {
    "id": "host-provider",
    "mode": "service",
    "version": "1.0.0",
    "platform": "linux",
    "instanceId": "lobster-runtime-7f2"
  },
  "providers": [
    {
      "id": "egress",
      "version": 1,
      "methods": ["fetch"],
      "streams": []
    }
  ],
  "hostBinding": {
    "deploymentId": "deployment-123",
    "runtimeId": "runtime-456",
    "generation": "generation-9"
  },
  "auth": {
    "hostProviderToken": "..."
  },
  "peer": {
    "id": "sha256:...",
    "publicKey": "...",
    "signature": "...",
    "signedAt": 0,
    "nonce": "..."
  }
}
```

Names are provisional. The important distinction is between untrusted declared
capabilities and credential/config-approved effective capabilities.

### Credential claims

The admission credential should bind at least:

```text
issuer
audience / Gateway deployment
provider peer id or public-key thumbprint
allowed provider ids and versions
allowed methods/streams
tenant/runtime binding when hosted
host generation
issued-at and expiry
credential id for revocation/audit
```

It may be an opaque signed token or another bounded credential format. The RFC
should specify validation semantics, not require JWT.

### Proof of possession

Reuse the Gateway challenge/nonce handshake pattern. The peer signs a canonical
payload containing:

- peer identity;
- client ID and mode;
- role;
- declared provider surface digest;
- host binding/generation;
- credential identifier or digest;
- server nonce and timestamp.

This prevents replaying a stolen bearer credential from another peer or
silently upgrading provider declarations.

### Effective surface

The Gateway computes:

```text
effective providers/methods/streams
  = declared by peer
  intersect credential grants
  intersect configured host requirements/allowlist
  intersect protocol-version support
```

Like node surfaces, later updates may narrow but never exceed the connection's
declared and credential-approved ceilings.

## Generation Fencing

Connection ID alone protects against a peer reconnect during one Gateway
process. Hosted deployments also need an external generation fence so an old
Lobster runtime, OCC cell, or replaced container cannot continue serving host
calls.

Required behavior:

1. The host/controller mints or provisions a credential for generation `G`.
2. Gateway accepts only the currently configured/expected generation.
3. Every pending invocation records peer connection ID and generation.
4. A newer generation atomically supersedes the older provider session.
5. Pending calls on the old session fail with a stable route-changed/stale-peer
   result.
6. Late results from old connection/generation are ignored and audited.
7. Credential rotation or desired-generation change closes stale sessions.

For local Docker, generation can default to one process/deployment generation
issued at startup. Hosted platforms can provide an externally meaningful lease
or revision. The portable contract must not require Lobster's Redis owner lease.

## Tenant And User Identity

Provider connection identity and per-call user identity are separate:

- the connection proves which host/provider instance is serving a deployment;
- each invocation carries only the tenant/user/session context required by that
  provider;
- the Gateway derives that context from authenticated runtime state, not from
  provider-supplied display fields;
- providers must not use connection-wide user identity when a call can span
  multiple users or sessions;
- audit events record both provider peer identity and invocation subject.

Single-tenant Gateway deployments may bind tenant at connection admission.
Future OCC multi-tenant runtime planes may require per-call tenant binding. The
contract should permit both without routing hot-path traffic through OCC.

## Authorization Model

Do not reuse operator scopes. Define provider permissions from registered
provider descriptors, for example:

```text
host.egress.fetch
host.secrets.resolve
host.publication.publish
host.telemetry.emit
```

Authorization occurs twice:

1. admission computes the peer's effective provider surface;
2. dispatch verifies the requested provider method against the current
   effective surface and current generation.

Unknown providers/methods default deny. Plugin-owned providers must be
namespaced to the registering plugin and cannot claim core host namespaces.

## Admission And Provisioning

The contract needs more than one deployment path:

- **Local/container:** OpenClaw creates a one-time or short-lived provider
  bootstrap credential and passes it to the colocated supervisor/provider.
- **Managed host:** Lobster/OCC provisions the expected peer identity,
  generation, and grants alongside Gateway startup, then presents the matching
  credential over its transport.
- **Remote third-party provider:** explicit administrator enrollment with a
  narrow provider grant; no silent device-style pairing.

Interactive pairing is not the default because hosted infrastructure admission
is declarative and automated. Administrative enrollment may still require an
explicit approval workflow outside the hot path.

## Failure And Security Requirements

- reject unknown role, provider, method, or generation;
- reject bearer-only provider elevation when proof of possession is required;
- bound clock skew, token lifetime, declaration size, method count, and payload;
- rate-limit admission failures separately from operator/device auth;
- redact credentials and sensitive invocation fields from logs;
- emit stable admission, supersession, dispatch, denial, timeout, disconnect,
  and late-result audit events;
- close stale connections on credential/config generation rotation;
- never grant operator methods to a host-provider role;
- never allow provider declarations to expand credential grants.

## Upstream Surface Impact

Likely additive OpenClaw changes:

- `host-provider` Gateway role and role policy;
- host-provider client ID/mode or a generic service-peer mode;
- additive connect declaration for providers and host binding;
- host-provider authentication verifier and bootstrap/provisioning API;
- provider permission/descriptor registry;
- host-provider session registry sharing peer invocation internals;
- host invocation request/result schemas and events/methods;
- generation supersession and conformance tests;
- SDK support for registering handlers and receiving invocations.

This is meaningful core work, but it is narrower and more native than adding a
parallel Host Bridge server.

## Next Design Gate

Select the first portable unary provider proof. Evaluate candidates against:

- portability beyond Lobster;
- no streaming requirement for the foundation;
- clear permission and schema;
- meaningful ProxyPipe code removal;
- no dependence on optional policy;
- ability to test with local Docker and a non-TypeScript client.

Candidates:

| Provider                                | Advantages                                           | Risks                                                                   |
| --------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------- |
| Secret resolution                       | Portable, bounded unary, strong least-privilege case | Existing OpenClaw secret APIs may already provide the correct extension |
| Bounded egress metadata/token operation | Central to ProxyPipe origin                          | Full HTTP bodies require streaming; avoid a misleading partial contract |
| Durable publication acknowledgement     | Architecturally valuable                             | Depends on unfinished state/continuity semantics                        |
| Feedback submission                     | Small and already implemented                        | Product/plugin-owned and weak evidence for core                         |
| Judge dedup                             | Simple unary                                         | Lobster/code-mode specific; should remain plugin-owned                  |

Audit existing secret provider/broker extension points before selecting the
foundation proof.
