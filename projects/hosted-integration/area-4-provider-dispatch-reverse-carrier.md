# Area 4: Provider Dispatch Reverse Carrier

## Decision

Define one optional reverse carrier for the Area 2 provider-request dispatcher.
It exists only when:

- OpenClaw cannot directly reach the approved destination;
- a standard HTTP proxy or service mesh is insufficient; and
- the host must physically execute the prepared request.

This is not ClawBus, `host.invoke`, or a general host-service protocol.

## Topology

```text
host dispatcher
  -> opens authenticated provider-dispatch session
  -> OpenClaw admits the declared binding and generation
  <- OpenClaw sends prepared dispatch operations
  -> host returns response streams or structured dispatch failures
```

The host initiates the connection so an isolated OpenClaw runtime does not need
an inbound route to host services.

The recommended V1 realization is a dedicated host-provider WebSocket session
that reuses Gateway admission, challenge, identity, limits, and peer-invocation
machinery where practical. It is a separate least-privilege client and queue
from operator Gateway traffic. Provider bodies must not contend with approvals,
status, or administration.

The wire realization may change if proof shows a dedicated HTTP/2 or other
stream is materially simpler. The portable dispatcher contract does not
change.

## Binding

The OpenClaw provider-request configuration selects one dispatcher ID:

```text
providerRequests.dispatcher = lobster-egress
```

The host registers a matching implementation:

```text
id: lobster-egress
interface: provider-request-dispatcher/v1
carrier: reverse-provider-dispatch/v1
```

The effective binding is the intersection of:

- OpenClaw configuration;
- registered dispatcher ID and interface version;
- host credential grants;
- declared connection capabilities;
- Area 1 traffic-policy route selection; and
- current deployment generation.

Unknown IDs, unsupported versions, undeclared operations, and stale generations
fail closed.

## Identity And Authority

The connection proves:

- dispatcher instance identity;
- OpenClaw deployment/runtime audience;
- binding ID;
- interface and carrier versions;
- current owner binding generation;
- current host bundle generation;
- allowed operations;
- expiry and revocation boundary; and
- proof of possession when remotely admitted.

It has no operator, pairing, node, Channel, secret-provider, publication, or
telemetry authority.

The dispatcher may still observe provider credentials carried in protected
headers because it physically executes the prepared request. This is data-plane
exposure, not authority to resolve, mint, widen, or reuse secret references.
Credentials should be narrowly scoped and short-lived where possible, and
must be redacted from status, logs, failures, and audit payloads.

Per-call tenant, user, session, and audit context is derived by OpenClaw and
limited to what dispatch requires. The host cannot assert or expand that
context.

## Operation Model

Each operation has:

- random operation ID;
- binding ID and generation;
- deadline;
- approved route profile;
- method, URL, protected headers, and body stream from Area 2;
- request and response byte limits;
- cancellation signal;
- audit correlation; and
- dispatch-certainty state.

```text
admitted
  -> request-open
  -> request-body
  -> dispatch-started
  -> response-open
  -> response-body
  -> completed
```

Exactly one terminal outcome is allowed. Frames after cancellation, timeout,
generation supersession, or completion are ignored and audited.

The carrier does not interpret provider status codes, redirects, retries,
credential slots, or response bodies. Those remain Area 1/Area 2 semantics.

## Dispatch Certainty

Transport failure must distinguish:

- `not-started`: the host did not begin provider dispatch;
- `started-unconfirmed`: dispatch may have reached the provider but no response
  was confirmed;
- `response-started`: response headers or body were observed before failure;
  and
- `completed`: one terminal response was delivered.

OpenClaw decides whether any semantic retry is safe. The carrier and host
dispatcher do not automatically replay a request after reconnect.

## Streaming And Flow Control

V1 supports bounded bidirectional byte streams because ProxyPipe egress carries
large request bodies and long-lived provider responses.

Required mechanics:

- per-operation request and response credit;
- bounded connection and per-operation queues;
- maximum concurrent operations;
- maximum frame and total byte limits;
- request half-close;
- response half-close and one terminal status;
- advisory cancellation with prompt resource release;
- slow-consumer failure isolated to the affected operation where possible; and
- independent scheduling from Gateway control traffic.

Connection-wide saturation must not silently drop body chunks or produce a
truncated successful response.

V1 cancellation is advisory, not an acknowledged proof that provider-side work
stopped. Dispatch certainty determines whether a semantic retry is safe after
cancellation or connection loss.

## Connection Lifecycle

- One live connection incarnation serves one owner binding generation and one
  host bundle generation.
- Reconnect creates a new incarnation, not a new desired configuration.
- A newer owner binding generation supersedes and closes the older session.
- A newer host bundle generation requires re-admission and a new incarnation,
  but does not by itself advance owner configuration.
- Disconnect fails all pending operations with their current dispatch-certainty
  state.
- V1 does not resume or replay operations across reconnect.
- Late results from an old incarnation or generation are ignored and audited.

## Failures

Portable dispatcher failures include:

- `denied`;
- `unavailable`;
- `overloaded`;
- `stale-generation`;
- `timeout`;
- `cancelled`;
- `not-started`;
- `started-unconfirmed`;
- `response-limit-exceeded`;
- `protocol-violation`; and
- `connection-lost`.

Provider HTTP status and body remain a normal dispatcher response.

## Readiness, Status, And Doctor

The provider-request owner registers:

```text
provider.request.dispatcher
```

It is `True` only when:

- the configured dispatcher is registered;
- interface and carrier versions are compatible;
- the peer is authenticated and authorized;
- its owner and host bundle generations are current; and
- the session is operationally capable of admitting operations.

Current free capacity is not a readiness predicate. Transient saturation may
report `Degraded` in status and reject work as overloaded without making the
deployment non-ready. The independent `provider.request.policy` criterion
reports policy compilation; work is admitted only when both policy and
dispatcher conditions satisfy the selected Hosting Profile. Missing
registration, stale generation, failed authentication, or incompatible
versions make the dispatcher condition `False` or `Unknown` with a stable
reason.

Status exposes binding ID, peer identity, generation, incarnation, limits,
in-flight count, queue pressure, last transition, and redacted failure.

Doctor explains unresolved binding IDs, incompatible versions, missing
credentials, policy conflicts, and unreachable or repeatedly reconnecting
peers.

## Migration And Deletion

```text
ProxyPipe authoritative
  -> reverse dispatcher shadow with non-actionable fixtures
  -> reverse dispatcher authoritative
  -> ProxyPipe tags 1-5 removed
```

Live provider requests cannot be duplicated for shadow comparison. Compare
recorded fixtures, synthetic probes, or explicitly replay-safe test traffic.

Deletion includes:

- `BeginRequest`;
- `RequestChunk`;
- `BeginResponse`;
- `ResponseChunk`;
- `RequestCancelled`;
- pipe-local HTTP inflight registries;
- pipe-local request correlation;
- pipe-wide dispatcher admission and body queues; and
- the pipe refresh compatibility path, after session-binding renewal moves to
  its owning authentication/lifecycle contract.

## Non-Goals

- general host method invocation;
- approvals, Channel ingress, lifecycle, publication, telemetry, or
  AgentHarness;
- operator or node identity reuse;
- transparent retry or reconnect resume;
- one shared carrier for all future capabilities; or
- preserving ProxyPipe wire compatibility.

## Cheapest Proof

Use one bounded provider fixture with:

1. one accepted streaming response;
2. one Area 1 destination denial that never reaches the peer;
3. one overload rejection before dispatch;
4. one cancellation after dispatch starts;
5. one disconnect producing `started-unconfirmed`;
6. one stale-generation late result rejection; and
7. the same observable response semantics through the local dispatcher.

No implementation is authorized by this design.
