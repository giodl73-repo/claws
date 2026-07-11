# ProxyPipe Decomposition

## Diagnosis

ProxyPipe began as the network path OpenClaw needed to call services supplied by
its host. It grew into a second application protocol beside the OpenClaw
Gateway transport. Its `PipeFrame` multiplexes seven semantic families plus
connection, correlation, retry, cancellation, identity, generation, and
lifecycle mechanics.

The upstream mistake would be to rename ProxyPipe or tunnel its `oneof` through
`host.invoke`. The correct migration assigns each frame family to its existing
OpenClaw owner and upstreams only the missing runtime-to-host provider
primitive.

## What The Duplicate Protocol Carries

| Family | Current ProxyPipe behavior | Correct owner | Duplex role |
| --- | --- | --- | --- |
| Brokered HTTP egress | Begin/chunk/cancel request and response streams | Host provider contract; host owns backend/routing | Core candidate, but full bodies require a later bounded stream contract |
| Product runtime services | Judge dedup, user-turn hints, feedback | Owning plugin/product plus Lobster backend | Namespaced plugin provider only where remote service remains justified |
| Teams channel ingress | Activity delivery and acknowledgement | OpenClaw Channel semantics plus Lobster Teams routing | None beyond carrying an existing Channel adapter if needed |
| Runtime/build evidence | Container hello and capability/build identity | Gateway/runtime identity, readiness, packaged profile evidence | Handshake may advertise identity; no product payload API |
| Lifecycle supervision | Lifecycle signals, capabilities, commands, checkpoint/unmount, shutdown-ready | Existing Gateway lifecycle plus Runtime State Continuity | Transport may carry calls; semantics stay outside Duplex |
| Interactive approvals | Node pairing, exec approval, cron creation approval | Existing Gateway node/exec approval APIs; plugin approval for WorkIQ | None; migrate to existing approval contracts |
| Remote AgentHarness | Open, agent frames, brain frames, close | Remote AgentHarness RFC and conformance | A future typed stream may carry it without redefining payload semantics |

Legacy `CronSchedule` is compatibility-only and should be deleted after rolling
decode support is no longer required.

## Duplicated Transport Mechanics

ProxyPipe also reimplements concerns that should come from
`OpenClawTransport`/Gateway peer invocation:

- connection establishment and runtime/container hello;
- peer capability advertisement;
- request/result correlation;
- chunk ordering and cancellation markers;
- deadlines, retries, and string-derived failure classification;
- keepalive and disconnect handling;
- boot/runtime/binding generation ownership;
- tenant, user, run, and session context propagation;
- stale-result rejection;
- payload framing and buffering; and
- telemetry for dispatch and failures.

The Duplex RFC replaces these for host-service calls by extending the existing
Gateway peer model. It shares correlation, timeout, connection binding, and
late-result handling with `node.invoke`, while adding a distinct
`host-provider` identity, provider permissions, typed schemas, overload bounds,
and runtime-generation fencing.

## What Is Actually New In OpenClaw

The narrow missing primitive is:

```text
OpenClaw runtime
  -> invokes a named, versioned host-provider method
  -> over the existing OpenClaw transport/Gateway peer session
  -> with bounded request/result, permission, deadline, identity, and generation
```

It is not:

- a replacement Channel protocol;
- a new approval bus;
- a lifecycle state machine;
- an AgentHarness protocol;
- a persistence coordinator; or
- a generic arbitrary callback mechanism.

## Migration Units

ProxyPipe cannot be removed in one cut. Migration proceeds by frame family:

1. Move approvals to existing Gateway APIs.
2. Move AgentHarness payload semantics to the remote AgentHarness contract.
3. Move lifecycle/checkpoint meaning to Gateway lifecycle and Runtime State
   Continuity.
4. Move Teams delivery to the Channel boundary.
5. Move product services to namespaced plugins or retain them as explicit
   Lobster product behavior.
6. Move one portable bounded unary host service to `host-provider` invocation.
7. Add streaming only after brokered HTTP or AgentHarness proves the concrete
   need and backpressure/cancellation semantics.
8. Delete each old frame, handler, retry classifier, and test after the
   replacement passes mixed-version conformance and the fallback expires.

## First Provider Decision

The first provider must prove the core abstraction without requiring streams or
depending on unfinished state semantics:

| Candidate | Current assessment |
| --- | --- |
| Secret resolution | Best mechanical fit if current OpenClaw secret-provider APIs do not already solve host-backed runtime resolution |
| Bounded egress metadata/token call | Strong host use case, but must avoid pretending it solves full streamed HTTP proxying |
| Durable publication | Valuable but blocked on Runtime State Continuity semantics |
| Feedback | Too product-specific for the core proof |
| Judge dedup | Plugin/Lobster-specific, not a core proof |

The next evidence task is therefore to audit existing OpenClaw secret provider
and broker extension points before choosing secret resolution or a narrowly
bounded egress operation.
