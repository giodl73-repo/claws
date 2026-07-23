# Gateway Coverage Versus ProxyPipe - Pass 6

## Baseline

- OpenClaw revision: `fab69517b3d`
- OpenClaw worktree: `C:\src\openclaw-layering-audit`
- Lobster revision: `0a9514c1ce`
- Scope: determine which ProxyPipe semantics already have an upstream OpenClaw
  home and isolate the residual case for a Host Bridge primitive

Subsequent pass 7 and project reconciliation named the residual candidate
**Duplex Transport**. References to Host Bridge below describe the architectural
composition considered during this audit, not the current project name.

## Finding

The current Gateway and public SDK cover more of the proposed Host Bridge than
the initial hypothesis assumed. OpenClaw already has:

- a transport-neutral public SDK interface named `OpenClawTransport`;
- request/response RPC and replayable event streams;
- a WebSocket implementation with protocol bounds, reconnect behavior,
  per-request timeouts, sequence-gap detection, client capabilities, and
  connection lifecycle;
- granular operator scopes for read, write, administration, approvals, and
  pairing;
- advertised method and event catalogs;
- canonical exec, plugin, node, and device approval/pairing APIs;
- plugin-defined scoped Gateway methods and `plugin.*` event delivery;
- runtime health, status, identity, restart, shutdown, and suspension surfaces.

Therefore a Host Bridge must not introduce another generic RPC/event envelope
or another Gateway transport abstraction. Lobster can implement or adapt the
existing `OpenClawTransport` client contract over ProxyPipe and preserve
canonical Gateway method/event payloads.

The credible residual problem is narrower:

```text
1. reverse reachability for an isolated Gateway
2. host identity and capability binding across that reachability path
3. host-provided services called by the runtime/plugin
4. lifecycle composition beyond suspend, especially durable checkpoint and
   publication before host teardown
```

## Existing Gateway Contract

The public SDK contract is already transport-neutral:

```ts
type OpenClawTransport = {
  request(method, params, options): Promise<unknown>;
  events(filter?): AsyncIterable<GatewayEvent>;
  close?(): Promise<void> | void;
};
```

`GatewayClientTransport` supplies the ordinary WebSocket implementation. Its
options include URL and credentials, requested scopes and capabilities,
minimum/maximum protocol versions, request and handshake timeouts, lifecycle
callbacks, reconnect-pause observation, and event-gap detection.

This means the Lobster runtime does not need a new semantic protocol to act as
an OpenClaw operator. A Lobster transport adapter can expose the same SDK
contract over its reverse Plex/ProxyPipe topology.

## Coverage Matrix

| ProxyPipe family               | Existing OpenClaw surface                                                                                         | Coverage                         | Residual work                                                                                                                                  |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Exec approval                  | `exec.approval.get/list/request/waitDecision/resolve`; requested/resolved events; `operator.approvals`            | Strong                           | Preserve canonical object and decisions across Lobster transport; add Lobster UX and audit only                                                |
| Plugin approval                | `plugin.approval.list/request/waitDecision/resolve`; requested/resolved events                                    | Strong                           | WorkIQ marker is plugin-owned result data, not a core bridge protocol                                                                          |
| Node pairing                   | `node.pair.list/approve/reject/remove`; requested/resolved events; `operator.pairing`                             | Strong                           | Lobster presents/gates the decision; no new pairing semantics                                                                                  |
| Device pairing                 | `device.pair.*` methods and events                                                                                | Strong                           | Same adapter pattern as node pairing                                                                                                           |
| Status/evidence                | `health`, `status`, `system.info`, `gateway.identity.get`, health/heartbeat events                                | Strong for observation           | Hosting Profiles readiness conditions remain the supported readiness composition                                                               |
| Restart                        | `gateway.restart.preflight/request` and shutdown event                                                            | Strong for Gateway restart       | Host container replacement remains a host operation                                                                                            |
| Drain/suspend                  | `gateway.suspend.prepare/status/resume` with blockers, lease ID, expiry, admission closure, and idempotent resume | Strong for quiescing work        | Must map Lobster lifecycle to this API and prove what state is durable before teardown                                                         |
| Teams activity                 | Channel plugin registration and channel Gateway methods                                                           | Partial                          | Verify whether Lobster activity injection can use a native channel ingress adapter without private acknowledgement semantics                   |
| AgentHarness                   | Plugin `registerAgentHarness` plus RFC 31 remote protocol direction                                               | Partial/evolving                 | ProxyPipe may transport RFC 31 but must not define execution semantics                                                                         |
| Plugin-specific RPC            | `registerGatewayMethod`, scoped plugin methods, and `plugin.*` events                                             | Strong for host-to-runtime calls | Does not solve runtime-to-host service invocation                                                                                              |
| Brokered provider HTTP         | Provider plugin APIs exist, but no generic remote host-service provider was identified                            | Gap                              | Determine whether provider-specific adapters suffice or a bounded host egress service contract is portable                                     |
| Feedback and judge dedup       | Plugin service/Gateway extension points                                                                           | Product-owned                    | Keep plugin/Lobster namespaced; avoid central ProxyPipe frame growth                                                                           |
| Durable checkpoint/publication | Gateway suspend controls admission but does not establish durable host publication                                | Gap                              | Map Snapshot/state primitives and Lobster `checkpoint_unmount` before proposing a contract                                                     |
| Reverse-dial establishment     | SDK/Gateway clients normally dial the Gateway                                                                     | Topology gap                     | A custom `OpenClawTransport` can hide this from consumers; determine whether OpenClaw needs provider registration or only Lobster adapter code |

## Approval Conclusion

There is no evidence for a new generic Host Approval protocol. Current
OpenClaw already provides the common lifecycle:

```text
request -> requested event -> list/get/wait -> resolve -> resolved event
```

It also provides dedicated approval and pairing scopes, visibility filtering,
expiry, bounded decisions, requester/reviewer metadata, and fail-closed
behavior. ACP demonstrates the intended external-relay model by translating
Gateway approval events to an external permission surface and resolving them
through Gateway RPC.

Lobster should follow that model. Its approval broker and Teams/web cards are
host implementation. Its ProxyPipe approval request/response messages should
be treated as a projection to migrate toward canonical Gateway payloads, not a
new reusable OpenClaw approval abstraction.

## Lifecycle Conclusion

`gateway.suspend.*` is the upstream starting point for Lobster pause, retire,
and replacement flows:

```text
host requests suspend
  -> OpenClaw closes root work admission
  -> OpenClaw reports active blockers or issues a leased suspension
  -> host performs checkpoint/publication
  -> host tears down, or resumes the same suspension on failure
```

This covers runtime quiescence but not durable publication. Lobster's
`checkpoint_unmount -> shutdown_ready` path must be decomposed into:

1. OpenClaw suspension readiness;
2. OpenClaw/local-state checkpoint consistency;
3. Lobster workspace publication acknowledgement;
4. host authorization to destroy the container.

Only steps 2 and 3 remain plausible portable-contract gaps.

## Revised Host Bridge Shape

The evidence does not currently support a broad `HostBridge` RPC/event API.
The smallest plausible composition is:

```text
OpenClawTransport
  canonical Gateway RPC and events
  implemented over WebSocket or Lobster reverse transport

Host service providers (unproven)
  bounded runtime/plugin calls to egress, secrets, publication, telemetry

Lifecycle composition
  gateway.suspend + checkpoint + host publication + teardown
```

`Host Bridge` can remain the architectural name for that composition, but an
upstream RFC should target only a missing independently useful provider seam,
not the whole composition at once.

## Next Proof

1. Trace Lobster exec, plugin, and node approval adapters field by field against
   Gateway schemas and identify removable duplicate payloads.
2. Trace `LifecycleCommand(checkpoint_unmount)` against
   `gateway.suspend.prepare/status/resume` and actual state publication.
3. Test whether a Lobster implementation of `OpenClawTransport` can relay
   canonical Gateway calls/events without OpenClaw core changes.
4. Audit brokered provider HTTP against current provider plugin interfaces to
   determine whether the missing primitive is remote provider transport,
   generic host services, or no upstream change.
5. Audit Teams activity delivery against native Channel ingress before naming
   any channel-side gap.

## Decision

Keep the Host Bridge hypothesis, but narrow it. Gateway transport and approval
semantics are already upstream concepts. The next candidate primitive must be
derived from host-service or durability evidence, not from ProxyPipe's generic
multiplexing needs.
