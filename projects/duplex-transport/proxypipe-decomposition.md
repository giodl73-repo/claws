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

The resulting supported session is **ClawBus**: the hosted duplex form of the
OpenClaw protocol. It intentionally carries all seven OpenClaw business
families over one connection while preserving their canonical subsystem-owned
schemas. The problem was not multiplexing; it was allowing the private pipe to
become the semantic definition of everything it carried.

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

## Resolved Home Matrix

| ProxyPipe family | Concrete OpenClaw home | Remaining upstream work | Lobster disposition |
| --- | --- | --- | --- |
| Brokered HTTP egress | New `host-provider` specialization of `OpenClawTransport`/Gateway peer invocation; initial bounded methods under `host.egress.v1` | Unary foundation first; a separate typed stream extension must define credit, backpressure, cancellation, half-close, and terminal acknowledgement before replacing arbitrary HTTP bodies | Implement provider backend and tenant routing; delete tags 1-5 only after bounded/streamed parity is proven |
| Judge dedup, user-turn hints, feedback | Owning code-mode/WorkIQ/self-diagnosis plugin. Remote dependencies use `plugin.<plugin-id>.<service>.v1`; ordinary turn observation uses existing plugin/session/agent event hooks. Feedback storage and tenant routing remain a Lobster product API | No core provider for judge or feedback. Add a plugin-owned provider only where the plugin truly requires a remote host service; verify whether `UserTurnPush` can disappear behind existing agent/session events | Move handlers out of central pipe ownership; retain Redis/feedback backend as Lobster service; delete tags 7-11 and 15-16 per plugin migration |
| Teams activity delivery | Existing `extensions/msteams` Channel plugin and plugin SDK channel ingress (`channel-inbound`, webhook ingress, channel status/ack semantics) | Define/confirm a transport-neutral activity injection adapter if the current webhook cannot be reached in hosted topology; do not define raw Bot Framework activity semantics in Duplex | Keep Bot Framework endpoint, tenant routing, and delivery UI in Lobster; replace tags 12-13 with the Channel adapter |
| Container/build evidence | Readiness RFC conditions `ArtifactIdentityAvailable`, `SelectedProfileConformant`, and `ExpectedArtifactMatched`; Gateway connect/hello already carries client version/platform/instance and negotiated capabilities | Bind packaged conformance metadata to immutable artifact digest and expose the same identity through readiness/status | Supply expected artifact/profile and consume evidence; delete tag 14 and private build parsing |
| Lifecycle supervision | `gateway.suspend.prepare/status/resume` in `src/gateway/server-methods/suspend.ts`; readiness conditions for accepting work; Runtime State Continuity for dirty/synced, checkpoint publication, restore, and safe-to-destroy | Add continuity operations/conditions after writer inventory; keep scheduler actions out of OpenClaw | Lobster keeps pause/delete/recreate placement decisions; replace tags 17 and 24-26 with Gateway lifecycle plus continuity calls |
| Node, exec, and plugin approvals | `node.pair.approve/reject`, `exec.approval.get/list/request/waitDecision/resolve`, and `plugin.approval.list/request/waitDecision/resolve` from Gateway descriptors and protocol schemas | Ensure the Lobster operator connection carries pinned tenant/user/runtime provenance and Teams can render/resolve the same pending approval; no new approval protocol | Keep approval UX/broker and identity routing; delete tags 27-32 after using canonical Gateway methods/events |
| Remote AgentHarness | Remote AgentHarness RFC 31; current core types live under `packages/agent-core/src/harness`; Duplex may later supply a typed stream carrier | Define remote ordering, cancellation, terminal persistence, reconnect/non-resume, and conformance in AgentHarness; transport streaming remains separate | Implement cell/harness adapter and routing; delete tags 20-23 when the RFC 31 protocol runs over an accepted carrier |

### No orphan rule

Every current tag now has one disposition:

- tags 1-5: Duplex host-provider/streaming;
- tag 6: rolling compatibility deletion;
- tags 7-11 and 15-16: plugin or Lobster product services;
- tags 12-13: Channel ingress;
- tag 14: readiness/runtime identity;
- tag 17 and 24-26: Gateway lifecycle plus Runtime State Continuity;
- tags 20-23: AgentHarness; and
- tags 27-32: existing Gateway approvals.

The physical ProxyPipe may temporarily carry adapters for these contracts, but
it no longer owns any of their semantics. Removal is complete when no tag or
private retry/identity/lifecycle rule remains, not merely when the gRPC service
is renamed.

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
