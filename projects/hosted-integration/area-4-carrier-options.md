# Area 4: Carrier Options

## Frame

### Problem

Some hosted topologies allow direct inbound connections; others require an
isolated container to dial outward. Several integration and provider bindings
may need remote communication. Choosing one carrier too early can distort all
interfaces.

### Thesis

Carrier selection is a deployment decision evaluated after bindings define
their actual traffic, latency, streaming, security, and lifecycle needs.
OpenClaw supports a small set of conformant carrier profiles rather than one
mandatory bus.

### Invariant

Changing carriers does not change domain schemas or permissions. Carrier
failures are explicit and cannot masquerade as domain results.

Consumers receive portable interface failures. Operators receive the detailed
carrier, connection, incarnation, and generation cause through status and
provenance.

### Candidates

- direct Gateway or provider endpoint;
- loopback or mounted socket;
- local sidecar;
- dedicated reverse connection per binding family;
- Gateway peer-invocation carrier;
- shared multiplexed reverse session.

### Deletion Target

Remove ProxyPipe's duplicated keepalive, capability tokens, correlation,
generation ownership, retry classification, and unknown-frame behavior only
after replacement carriers pass equivalent conformance.

### Disproof

A shared carrier is rejected if its connection-level failure, congestion,
versioning, or release coupling is worse than the operational cost of separate
connections.

## Audit

### Gateway client transport

Gateway already provides:

- challenge/connect;
- requests and events;
- authentication;
- sequence/gap handling;
- reconnect behavior; and
- method/event capability advertisement.

This is suitable for host-to-Gateway integration traffic.

### Node peer invocation

`NodeRegistry` provides:

- declared and effective surfaces;
- connection registration;
- liveness probing;
- request correlation;
- timeout;
- disconnect failure;
- route-change rejection; and
- late-result handling.

This is useful carrier machinery for unary reverse calls, but node identity is
not a host provider model.

### Alternate event transport

NodeRegistry supports both WebSocket sessions and polling event transports.
This proves domain behavior need not depend on one physical carrier.

### ProxyPipe

ProxyPipe demonstrates the operational value of:

- one outward dial;
- one identity binding;
- one keepalive;
- one generation; and
- one capability negotiation.

It also demonstrates the risks:

- one release-coupled frame union;
- one connection failure affecting unrelated facilities;
- shared backpressure;
- duplicated retry and correlation;
- unknown-frame compatibility hazards; and
- semantic accretion.

## Compare

| Carrier | Advantages | Risks |
| --- | --- | --- |
| Direct endpoint | Simple ownership, independent failure, native tooling | Requires routable inbound path and more credentials/endpoints |
| Loopback/mounted socket | Strong local isolation, low overhead | Only works when provider is colocated |
| Sidecar | Clear process boundary, per-workload lifecycle | Startup, memory, health, and another failure domain |
| Dedicated reverse connection | Outward-dial topology with failure isolation | More sockets, auth handshakes, keepalives, and rollout surfaces |
| Gateway peer carrier | Reuses auth, correlation, connection lifecycle | Couples provider traffic to Gateway roles and control-plane capacity |
| Multiplexed session | One dial, identity, keepalive, and generation | Shared TCP failure, noisy-neighbor flow control, version coupling, bus accretion |

External precedents:

- HTTP/2/gRPC and SSH provide per-stream/channel flow control but retain
  connection-level failure and TCP head-of-line effects.
- Kubernetes Konnectivity shows the value of reverse tunnels when direct
  control-plane reachability is unavailable.
- Dedicated sidecars provide clearer isolation at the cost of process and
  connection overhead.

## Evaluate

### Runtime owner

Gateway control traffic must not be delayed by provider bodies or remote
harness streams. Separate budgets and schedulers are required even on one
connection.

### Host operator

Prefer the fewest independently diagnosable components, not merely the fewest
sockets.

### Security

Connection identity does not imply authority for every lane. Credentials,
grants, redaction, and audit remain per binding.

### Simplicity

Start with direct or existing transports. Add a shared carrier only after two
or more bindings demonstrate duplicated operational cost.

## Decision Matrix

Score each binding against:

```text
topology reachability
request/response versus streaming
payload and throughput
latency sensitivity
failure isolation
flow-control isolation
credential lifecycle
generation fencing
version skew
observability
implementation languages
connection and process cost
```

No global carrier decision is required. Different binding families may select
different carriers.

Carrier incarnation is independent from owner and host bundle generations. A
carrier reconnect may create a new incarnation without replacing unrelated
bindings or advancing owner configuration.

## Slice

Run a paper conformance comparison for:

1. exec approval over direct Gateway;
2. provider dispatch over a dedicated reverse connection;
3. both over one multiplexed session.

For each, model:

- connect and admission;
- one accepted operation;
- overload;
- disconnect;
- generation replacement;
- version mismatch;
- telemetry; and
- blast radius.

The slice ends with requirements and rejected options, not implementation.

The selected narrow V1 carrier contract for brokered provider requests is
specified in `area-4-provider-dispatch-reverse-carrier.md`. It is an optional
provider-dispatch-only reverse session, not a generic carrier catalog or shared
bus.
