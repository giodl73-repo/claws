# Area 1 Deep Dive: Channel Attachment Contract

## Frame

### Problem

A hosted OpenClaw runtime must receive Channel traffic and deliver Channel
output even when the public endpoint, tenant routing, network policy, and
container placement are owned by the host.

Lobster currently carries inbound Teams activities through ProxyPipe
`DeliverActivity` and `DeliverActivityAck`. It also has a newer
pod-locality-independent HTTP path that routes an activity to the owning
container, validates host identity, posts to the local Teams plugin webhook,
and uses the HTTP response as the acknowledgement.

The risk is replacing those paths with a generic `channel.ingress` method that
copies Channel schemas, authentication, retries, and acknowledgement semantics
into a new central protocol.

### Thesis

Channels publish owner-defined **endpoint** and **adapter** attachment
descriptors. The host wires routing, identity, policy, and lifecycle around
those attachments. It does not normalize arbitrary Channel payloads into a
generic host envelope.

### Invariant

The Channel owner remains responsible for:

- external protocol authentication and parsing;
- payload validation and normalization;
- sender and conversation semantics;
- inbound deduplication meaning;
- OpenClaw session and reply dispatch;
- outbound formatting and delivery results; and
- Channel-specific error classification.

The host may route, authenticate its own forwarding hop, narrow network
policy, and report health. It may not silently mutate the Channel message or
claim that transport acceptance equals semantic processing.

### V1 Boundaries

Include:

- inbound HTTP/webhook endpoint attachment;
- trusted-forwarder attachment where direct provider authentication cannot be
  preserved;
- host route identity and generation binding;
- acknowledgement and retry classification;
- idempotency keys;
- endpoint readiness and status;
- outbound network-route governance; and
- migration of Teams ProxyPipe tags 12-13.

Exclude:

- a generic normalized inbound message RPC;
- moving Channel parsing into the host;
- replacing the Plugin SDK Channel interfaces;
- universal exactly-once delivery;
- arbitrary host rewriting of messages; and
- a requirement that ingress and egress share one carrier.

### Deletion Target

Delete ProxyPipe `DeliverActivity` and `DeliverActivityAck`, their pipe-local
waiter map, capability coupling, generation-specific acknowledgement routing,
and duplicate transport metrics after the HTTP/endpoint attachment is
authoritative.

### Disproof

The proposal is too large if ordinary service routing to an existing
Channel-owned webhook already supplies all required identity, readiness,
acknowledgement, and status semantics.

It is too generic if each Channel needs the host catalog to understand its
payload schema.

## Audit

### OpenClaw Channel ownership

`ChannelPlugin` already separates:

- `gateway.startAccount()` lifecycle;
- outbound delivery and presentation;
- status and probing;
- security and allowlists;
- approvals and pairing;
- conversation bindings;
- secrets and reload behavior; and
- Channel-specific actions and commands.

The MS Teams plugin starts a Channel-owned webhook server through
`gateway.startAccount()`. Its monitor:

- refuses to start without enabled configuration and credentials;
- starts on the configured port and path;
- requires a bearer-shaped authorization header before parsing;
- applies a bounded JSON body limit;
- delegates JWT validation and Activity processing to the Microsoft SDK; and
- stays active until the Channel account lifecycle is aborted.

This is a canonical Channel endpoint, not a generic Gateway event.

### Plugin SDK inbound pipeline

The Plugin SDK exposes reusable inbound building blocks for Channel
implementations:

- context construction;
- sender and direct-message authorization;
- route and session resolution;
- inbound session recording;
- reply dispatch; and
- delivery through the Channel's own output implementation.

Those are in-process implementation seams. Publishing them as a remote generic
RPC would let an external host bypass Channel-owned authentication,
normalization, and authorization ordering.

### Lobster ProxyPipe path

The ProxyPipe path:

1. stamps tenant and user from the pipe identity;
2. sends the raw Activity plus delivery ID;
3. validates the identity against the container's latched owner;
4. posts to the local Channel webhook;
5. returns a correlated positive or negative acknowledgement; and
6. lets the runtime retry when the pipe closes, times out, or rejects.

These are endpoint-routing mechanics around the Channel webhook. They are not
new Channel semantics.

### Lobster HTTP path

The newer HTTP path already removes the need for a live pipe:

1. Plex resolves the owning worker from durable metadata.
2. The runtime sends a host-authenticated HTTP request.
3. The container validates delivery ID, tenant, user, and latched owner.
4. It checks the validated service URL against the body.
5. It deduplicates already accepted delivery IDs.
6. It posts the opaque Activity to the selected plugin webhook.
7. It returns a structured HTTP status and reason as the acknowledgement.

This proves that the carrier can be ordinary HTTP and that the host needs route
and delivery contracts, not a bus.

It also exposes a remaining ownership issue: the host-to-container hop and the
provider-to-Channel authentication hop are distinct. A brokered host cannot
silently strip the provider credential and invoke an endpoint that expects
provider JWT validation.

## Two Channel Attachment Types

### 1. Endpoint Attachment

Use when the Channel plugin owns a reachable HTTP, WebSocket, queue, or similar
ingress endpoint.

The descriptor publishes:

| Field | Meaning |
| --- | --- |
| Stable attachment ID | Channel and account-specific route identity |
| Owner | Channel plugin |
| Endpoint kind | HTTP, WebSocket, queue, polling, or other owner-defined kind |
| Route/path | Effective route, including configured overrides |
| Authentication mode | Provider-direct, trusted-forwarder, or local-only |
| Body and framing limits | Maximum accepted request shape |
| Idempotency source | Provider event ID or Channel-defined delivery key |
| Acknowledgement taxonomy | Accepted, retryable, terminal, or unconfirmed |
| Readiness predicate | Listener and Channel handler availability |
| Reload disposition | Hot route update or account restart |
| Redaction policy | Fields safe for status and logs |

The host binds public routing and policy to this endpoint. The body remains
opaque to the composition layer.

### Future: Remote Channel Adapter Binding

Use only when the host actually implements Channel behavior rather than merely
routing to a Channel-owned endpoint.

The implementation must satisfy the existing Channel-owned contracts for:

- inbound authentication and normalization;
- sender and conversation identity;
- OpenClaw inbound dispatch;
- outbound target resolution;
- payload rendering and limits;
- delivery results;
- lifecycle; and
- status.

A remote adapter may use a dedicated carrier, sidecar, or host process, but the
Channel plugin remains the schema owner. Area 1 would supply composition
metadata and lifecycle; it would not define a universal adapter payload.

This is not a V1 attachment kind. It is justified only by a concrete Channel
whose protocol connection or credentials must remain outside the container
and cannot use endpoint routing or ordinary outbound network governance.

## Authentication Modes

### Provider Direct

The host preserves the provider's original authenticated request to the
Channel-owned endpoint. The Channel plugin validates the provider credential.

This is the preferred mode because there is one semantic authentication
authority.

### Trusted Forwarder

Use when the host terminates provider authentication and cannot preserve the
original credential.

The Channel owner must explicitly define a trusted-forwarder contract:

- mutually authenticated host-to-runtime hop;
- pinned host binding identity;
- immutable tenant, user, route, and delivery provenance;
- evidence of the provider validation performed by the host;
- replay protection and idempotency key;
- strict body preservation or owner-defined transformations;
- generation fencing; and
- structured acknowledgement semantics.

Generic headers invented by the composition layer are insufficient. The
Channel owner decides what evidence is necessary to trust a forwarded payload.

### Local Only

The endpoint is reachable only through a loopback or private sidecar binding.
The Channel binding must identify which authenticated route is allowed to reach
it. Loopback location alone is not authentication.

## Acknowledgement Model

Transport acceptance and Channel acceptance must remain distinct.

```text
host route accepted
  -> Channel endpoint authenticated
  -> payload validated
  -> idempotency decision
  -> Channel accepted or rejected
  -> classified acknowledgement
```

The portable acknowledgement classes are:

| Class | Meaning |
| --- | --- |
| `accepted` | Channel owns the event and the sender may stop retrying |
| `retryable` | Event was not accepted; retry is safe |
| `terminal` | Event is malformed or permanently rejected |
| `unconfirmed` | Delivery may have succeeded; retry requires idempotency |

HTTP status codes and provider-specific responses map to these classes under
the Channel owner's rules. Area 1 must not impose one global mapping of every
4xx and 5xx response.

At-least-once ingress is the default assumption. The Channel attachment names
the stable delivery key and deduplication window. Neither a successful HTTP
write nor a carrier acknowledgement proves exactly-once processing.

## Outbound Governance

OpenClaw's `ChannelOutboundAdapter` already owns:

- target resolution;
- text and presentation limits;
- payload normalization and rendering;
- direct or Gateway delivery mode;
- send operations;
- delivery result interpretation; and
- pre/post delivery hooks.

The host may attach network governance beneath that adapter:

1. the Channel resolves the semantic target and payload;
2. OpenClaw Channel policy establishes the maximum permitted request;
3. host governance may deny, narrow network destinations, select a proxy, or
   supply approved TLS routing;
4. the Channel adapter performs delivery; and
5. the Channel interprets the provider response.

The host cannot rewrite the recipient, conversation, message, or attachment
semantics unless the Channel descriptor explicitly permits that
transformation.

A host-supplied outbound Channel implementation is a Channel adapter
attachment, not a generic egress interceptor.

## Composition And Status

The prepared binding carries:

- Channel ID and account ID;
- attachment ID and kind;
- required or optional posture;
- effective route and authentication mode;
- host route identity;
- Channel owner generation, host bundle generation, and endpoint incarnation;
- idempotency and acknowledgement contract version;
- authority mode during migration;
- readiness contribution; and
- configuration and policy provenance.

Useful status conditions are:

```text
Accepted
ResolvedRefs
Authenticated
Listening
Programmed
Ready
Degraded
```

They describe different facts:

- `Accepted`: the owner accepts the binding configuration;
- `ResolvedRefs`: credentials, routes, and policy references exist;
- `Authenticated`: the required provider or trusted-forwarder identity is
  usable;
- `Listening`: the endpoint process is active;
- `Programmed`: host routing reaches the selected endpoint incarnation;
- `Ready`: the Channel can accept work end to end; and
- `Degraded`: traffic may be partially impaired.

`Listening` alone is not readiness. A public route can be programmed while the
Channel account is unauthenticated, and a Channel listener can be healthy
while host routing still targets a stale incarnation.

## Teams Slice

### Target

Replace ProxyPipe tags 12-13 with the existing host HTTP delivery route and a
Channel-owned trusted-forwarder contract for MS Teams.

### Accepted case

1. Lobster validates and routes an Activity for the pinned tenant/user.
2. The HTTP binding reaches the current container generation.
3. The container verifies host authentication and owner identity.
4. The Teams attachment verifies trusted-forwarder evidence and the Activity.
5. The Channel accepts the delivery ID once.
6. The HTTP response maps to `accepted`.

### Structured failures

- stale worker or identity mismatch: `retryable`, re-resolve route;
- Channel endpoint not ready: `retryable`;
- malformed Activity: `terminal`;
- timeout after request dispatch: `unconfirmed`;
- duplicate accepted delivery ID: idempotent `accepted`;
- missing host or provider authentication: fail closed.

### Migration

```text
ProxyPipe authoritative
  -> HTTP attachment shadow routing validation
  -> HTTP attachment authoritative
  -> ProxyPipe delivery disabled
  -> tags 12-13 and waiter code removed
```

Only one path may deliver an actionable Activity. Shadow mode may validate
route and schema compatibility with fixtures, probes, or a non-actionable
validation endpoint, but must not copy live traffic into the Channel handler.

## Compare

### Internal analogues

| Analogue | Classification | Lesson |
| --- | --- | --- |
| Channel plugin adapters | Reuse | Owners define parsing, delivery, lifecycle, and status |
| Channel account manager | Reuse | Account lifecycle and restart remain Channel-owned |
| Approval native runtime | Adapt | Share composition lifecycle, not callback schema |
| Provider request policy | Adapt | Host network policy may only narrow owner policy |
| Global middleware interception | Avoid | Hidden ordering and mutation erase ownership |

### External comparators

| Comparator | Reuse | Avoid |
| --- | --- | --- |
| Kubernetes Gateway API | Targeted attachment, explicit status conditions, programmed versus accepted state | Treating host policy as semantic ownership |
| CloudEvents/webhooks | At-least-once assumption, stable event IDs, receiver dedupe | Claiming HTTP success provides exactly-once processing |
| Microsoft Bot/Agents webhook | Provider JWT validation and prompt acknowledgement | Moving protocol authentication into generic hosting code |
| Dapr input bindings | Route wiring and explicit retry policy | One generic payload/ack rule for every source |

## Evaluate

### Runtime owner

Do not add a Gateway `channel.ingress` method. It would bypass Channel
authentication and duplicate Plugin SDK semantics. Expose endpoint and account
status instead.

### Host operator

One composition record should show the public route, selected endpoint
incarnation, authentication mode, identity binding, readiness, and last
classified failure.

### Security

Provider-direct authentication is preferred. Trusted forwarding is explicit,
Channel-owned, mutually authenticated, generation-fenced, and default-deny.
Host identity headers without a pinned authenticated binding are not trusted.

### Simplicity

Most hosted Channels should require only route attachment to their existing
endpoint. Do not create a remote adapter framework until a real Channel cannot
fit endpoint routing or ordinary outbound network governance.

### Fleet operation

Separate accepted configuration, programmed routing, listener state, and
end-to-end readiness so stale routes and cold Channel handlers are diagnosable.

## Conclusion

The approval and Channel slices share the same Area 1 composition vocabulary,
but not the same runtime API:

```text
approval -> Gateway consumer attachment
channel  -> endpoint attachment
```

This is evidence that Area 1 should be a small catalog of owner-defined
attachment kinds with common lifecycle metadata, not a universal host
listener interface.
