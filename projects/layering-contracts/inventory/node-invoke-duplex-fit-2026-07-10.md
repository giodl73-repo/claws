# `node.invoke` Fit For Duplex Transport - Pass 8

## Baseline

- OpenClaw revision: `fab69517b3d`
- OpenClaw worktree: `C:\src\openclaw-layering-audit`
- Scope: determine whether existing Gateway peer invocation can serve as the
  foundation for the Duplex Transport project

## Decision

`node.invoke` already proves the core server-to-peer unary invocation model.
Duplex Transport should reuse or extract its machinery rather than introduce a
parallel callback protocol.

However, a hosting platform must not be represented as a node. Node identity,
pairing, command approval, wake behavior, device permissions, and user-device
policy are intentionally specialized. The right architectural direction is:

```text
shared Gateway peer invocation substrate
  correlation
  advertised capabilities/methods
  timeout and disconnect cleanup
  generation/connection binding
  bounded request/result envelopes
       |                         |
       v                         v
node.invoke                host provider invocation
device pairing/policy      hosted identity/provider permissions
node commands              host.<provider>.vN methods
```

The first Duplex Transport implementation can be unary. Streaming is a separate
extension justified by AgentHarness or large egress/publication payloads, not a
requirement for the foundational PR.

## Existing `node.invoke` Contract

### Peer declaration

A node connects with:

- role `node` and no operator scopes;
- stable device/node identity;
- declared capabilities, commands, and permissions;
- client/platform/version metadata;
- optional path environment.

The Gateway preserves declared surfaces separately from effective surfaces.
Pairing and runtime policy can only narrow the session's declared command,
capability, and permission ceilings.

### Invocation

An operator calls:

```text
node.invoke {
  nodeId,
  command,
  params?,
  timeoutMs?,
  idempotencyKey
}
```

The Gateway validates the command against:

- the connected node's approved command surface;
- the current configured command allowlist;
- command-specific core restrictions;
- caller scopes for privileged commands;
- plugin node-invoke policy;
- connection identity immediately before dispatch.

It emits:

```text
node.invoke.request {
  id,
  nodeId,
  command,
  paramsJSON?,
  timeoutMs?,
  idempotencyKey?
}
```

The node replies through `node.invoke.result` with the request ID, node ID,
success flag, payload or JSON payload, and bounded error code/message.

### Correlation and lifecycle

`NodeRegistry` already provides:

- random request IDs and a pending-invoke map;
- default and caller-supplied timeout handling;
- connection-ID binding and `ROUTE_CHANGED` rejection;
- failure when the peer is unavailable or its send buffer is unusable;
- rejection of every pending invocation when its connection disconnects;
- harmless handling of late results after timeout;
- caller node-ID and connection matching on result submission;
- liveness checks via WebSocket ping/pong;
- an alternate event transport for polling peers such as watchOS;
- explicit slow-consumer behavior.

`system.run` adds stronger authorization binding for follow-on events, proving
that invocation-scoped event provenance can be tied to node ID, connection ID,
run ID, session key, and expiry.

### Extensibility

Plugins can:

- register node-host commands with capability, dangerousness, availability,
  and handler metadata;
- register Gateway-side node-invoke policy;
- request approval through the policy context;
- invoke the underlying node transport after policy/preflight work;
- fully satisfy an invocation without sending it to the node.

This is a mature extension pattern, not a fixed list of hard-coded commands.

## Fit Matrix

| Duplex requirement                  | `node.invoke` coverage   | Needed change                                                                         |
| ----------------------------------- | ------------------------ | ------------------------------------------------------------------------------------- |
| Server-to-peer unary request/result | Strong                   | Generalize shared machinery                                                           |
| Correlation                         | Strong                   | Preserve request IDs and connection binding                                           |
| Capability/method advertisement     | Strong                   | Add provider schemas/version metadata                                                 |
| Deadline                            | Strong                   | Standardize deadline versus duration semantics                                        |
| Disconnect handling                 | Strong                   | Preserve fail-pending behavior                                                        |
| Idempotency                         | Partial                  | Key is transported but peer/provider semantics are command-defined                    |
| Generation fencing                  | Partial                  | Connection ID protects dispatch; hosted runtime generation needs explicit identity    |
| Permission model                    | Strong but node-specific | Add host-provider permissions separate from operator and pairing scopes               |
| Dynamic narrowing                   | Strong                   | Reuse declared/effective ceiling pattern                                              |
| Plugin extensibility                | Strong                   | Add explicit host-provider registration rather than arbitrary methods                 |
| Cancellation                        | Gap                      | No `node.invoke.cancel`; timeout removes Gateway waiter but does not cancel peer work |
| Streaming                           | Gap                      | Unary payload/result only; no chunk, credit, half-close, or stream lifecycle          |
| Reconnect/resume                    | Gap by design            | Disconnect fails pending calls; no invocation replay or resumption                    |
| Payload bounds/schema               | Partial                  | Gateway frame bounds exist; provider-specific schemas and limits are absent           |
| Host identity                       | Gap                      | Node/device pairing identity is the wrong domain                                      |
| Multi-tenant provenance             | Gap                      | Must bind hosted tenant/user/runtime identity outside event display data              |

## Why A Host Is Not A Node

Reusing role `node` would create incorrect semantics:

- hosts are deployment/runtime infrastructure, not user-paired devices;
- node pairing approval grants command surfaces to a device;
- node wake/APNS and foreground queues are mobile concerns;
- node command allowlists protect local desktop/device capabilities;
- node IDs and device credentials do not express tenant, runtime instance, or
  host generation;
- host egress, secrets, publication, and telemetry need provider-specific
  service permissions and audit behavior.

The implementation may reuse registry, pending-call, and transport components,
but the public identity and authorization model must remain distinct.

## Recommended Primitive

Introduce a generic internal/publicly specified Gateway **peer invocation**
substrate, then specialize it:

```text
PeerSession
  peerId
  connectionId
  kind: node | host-provider
  declared/effective capabilities
  declared/effective methods
  permissions
  connectedAt

PeerInvocation
  id
  peerId
  method
  params
  deadline
  idempotencyKey

PeerInvocationResult
  id
  peerId
  ok
  payload | error
```

Public wire names should remain domain-specific initially:

```text
node.invoke.request/result
host.invoke.request/result
```

This avoids forcing node clients to migrate merely to prove the abstraction.
Both can share the same correlation and lifecycle implementation underneath.

## Revised Duplex Transport Scope

The project should be staged:

### Foundation

- host-provider peer role/identity;
- declared and effective provider/method capabilities;
- unary Gateway-to-host request/result;
- connection and hosted-generation fencing;
- provider-specific permission checks;
- deadlines, disconnect cleanup, late-result behavior, and payload limits;
- conformance tests shared with the node invocation substrate.

### Cancellation

Add explicit cancellation only after defining whether cancellation is advisory
or acknowledged and how providers prove terminal cleanup. Do not claim that a
Gateway timeout stops remote work today.

### Streaming

Add typed streams only for a demonstrated need. Candidate consumers are remote
AgentHarness, large brokered HTTP bodies, and durable publication. A stream
contract must define ordering, credit/backpressure, cancellation, half-close,
terminal status, reconnect, and maximum buffered data.

## ProxyPipe Consequence

- Approval frames still migrate to existing Gateway approval/pairing APIs.
- Unary host services can migrate to host-provider invocation.
- Brokered HTTP can use unary invocation only for bounded bodies; its current
  chunked behavior likely needs the later stream extension.
- AgentHarness remains RFC 31 and may consume typed streams later.
- Lifecycle and durable publication remain separate semantic contracts carried
  over the transport.

This makes ProxyPipe removal incremental rather than all-or-nothing.

## Likely Upstream PR Shape

1. **RFC:** Duplex Transport as host-provider specialization of the existing
   Gateway peer invocation model; define identity, permissions, failure, and
   relationship to `node.invoke`.
2. **Foundation PR:** extract/reuse pending peer invocation machinery and add
   one unary host-provider request/result path with conformance tests.
3. **Provider proof PR:** implement one bounded portable provider and a Lobster
   adapter; brokered egress is suitable only if the first proof deliberately
   limits body sizes or includes streaming.

Avoid changing `node.invoke` wire names or behavior in the first PR.

## Next Evidence

1. Audit Gateway connection roles and authentication to determine how a
   `host-provider` peer can be admitted without device-pairing semantics.
2. Inventory existing Gateway server capabilities and peer command descriptors
   to choose additive handshake fields.
3. Select the smallest unary ProxyPipe service for the first provider proof;
   feedback or judge dedup may be mechanically small but plugin-owned, while
   secrets or bounded egress better demonstrate portability.
4. Quantify which ProxyPipe code, tests, and proto tags each migration removes.
