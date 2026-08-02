# Remote Node Invocation Trust Evidence Slice

## Status

- Phase: Frame + narrow source audit
- Priority: 5
- Audited OpenClaw worktree:
  `C:\src\openclaw-design-audit`
- Audited commit:
  `bde1602e6e86fd91dd0bec3aae714e059e556c4d`

## Thesis

The existing node invocation path can expose one redacted trust/settlement
record binding pairing generation, connection incarnation, effective command
policy, invocation identity, idempotency, dispatch state, and terminal
certainty without changing node-command ownership.

The slice must preserve two truths:

- capability advertisement is not authorization; and
- local timeout/cancellation is not proof remote side effects stopped.

## Problem and Affected Users

OpenClaw strongly fences node calls at runtime, but most fencing facts remain
inside Gateway control flow:

- the public request supplies node, command, timeout, and idempotency;
- the Gateway evaluates scopes, allowlists, approval/plugin policy, pairing,
  route, and deadline;
- `NodeRegistry` generates an internal invocation ID and binds it to one
  connection;
- result/progress handlers reject stale or mismatched frames; and
- the public result normally returns command payload without invocation,
  pairing, connection, or policy evidence.

Operators and security reviewers therefore cannot distinguish from one
portable record:

- blocked before dispatch;
- satisfied by Gateway plugin policy;
- dispatched to a particular node connection;
- cancelled locally with unknown remote settlement;
- disconnected after dispatch; or
- completed under an authority generation that has since changed.

## Working Owners

| Object | Owner |
| ------ | ----- |
| Device/node identity | Device and pairing owners |
| Pairing generation | Persistent pairing/credential owner |
| Connection incarnation | `NodeRegistry` transport session |
| Declared commands/capabilities | Connected node |
| Effective command authority | Operator scope, config allowlist, approval, and plugin policy owners |
| Invocation ID/stream | `NodeRegistry` |
| Idempotency/effect semantics | Node command owner |
| Cancellation support | Connected node/client capability |
| Result settlement | Registry plus node command owner |
| Durable trust evidence | Proposed read-only projection |

The evidence projection may correlate these facts but cannot grant authority,
deduplicate effects, or declare compensation.

## Current Source Facts

### Request and policy admission

`packages/gateway-protocol/src/schema/nodes.ts` requires:

- node ID;
- command;
- owner payload;
- optional timeout;
- idempotency key; and
- optional session/approval-routing metadata.

`src/gateway/server-methods/nodes.invoke.ts` evaluates:

- command-specific and operator-admin restrictions;
- forbidden browser-profile mutation;
- the allowlist against both admitted and current config;
- payload sanitization;
- plugin node-invoke policy and approval;
- request deadline;
- current pairing work;
- dispatch connection; and
- a final current-config allowlist before dispatch.

A plugin policy may satisfy the invocation inside the Gateway without sending
the raw command to the node. Evidence must therefore identify the effect owner
and route rather than assuming every `node.invoke` crossed node transport.

### Pairing and route fencing

The handler captures a pairing generation and connection ID before policy
work. Immediately before dispatch it resolves the session for the same pairing
generation and rejects a changed connection with `ROUTE_CHANGED`.

`src/gateway/node-registry.ts` revalidates:

- client invalidation;
- expected pairing generation;
- current persistent pairing state; and
- expected connection ID.

It returns `PAIRING_CHANGED`, `ROUTE_CHANGED`, or `UNAVAILABLE` before dispatch
when those preconditions fail.

This is already the correct runtime fence. The missing contract is a retained
record of which generation and connection were actually used.

### Internal invocation identity

After pairing validation, `NodeRegistry.invoke` generates a random request ID.
The ID is sent to the node and used for:

- ordered input;
- ordered progress;
- cancellation;
- terminal result;
- late-result rejection; and
- pending-invocation settlement.

The public `node.invoke` result does not ordinarily expose this invocation ID.
The registry offers `onDispatchReady(invokeId)`, but the Gateway handler does
not currently use it to project invocation evidence.

### Pending-record limitations

`PendingInvoke` currently retains:

- node ID;
- connection ID;
- command;
- optional authorized `system.run` event;
- timers and progress/input sequence state; and
- result callbacks.

It does not retain:

- pairing generation;
- idempotency-key reference;
- effective command-policy fingerprint/generation;
- approval reference;
- dispatch time;
- cancellation request/acknowledgement; or
- effect certainty.

Those facts cannot be reconstructed reliably from current node/config state.

### Ordered settlement

`src/gateway/node-registry.invoke-stream.ts`:

- accepts result only when invocation ID, node ID, and connection ID match;
- rejects unknown, late, stale-route, and already-settled results;
- orders progress and bounds gaps;
- does not let duplicate/out-of-order chunks extend idle deadlines;
- sends cancellation on timeout, idle timeout, abort, or progress callback
  failure;
- emits no output after local terminal cancellation; and
- settles all pending calls for a disconnected connection.

These guarantees prove local stream settlement. They do not prove a remote
external effect was stopped or undone.

### Evidence gap

Current durable audit has agent-run, tool-action, and message records. There is
no dedicated durable node-invocation record carrying:

- invocation ID;
- pairing generation;
- connection ID;
- policy/approval generation;
- dispatch state;
- idempotency reference;
- cancellation support/acknowledgement; or
- remote-effect certainty.

Tool audit may show that a `nodes` tool succeeded, but that is not equivalent
to the node invocation trust envelope.

## Bounded V1 Slice

### Included

- one paired test node;
- one role-bound current pairing generation;
- one connection incarnation;
- one declared and allowed no-op fixture command;
- one effective policy fingerprint;
- one invocation with ordered progress;
- one terminal result;
- one pairing-generation change before a second dispatch; and
- one abort-after-dispatch result with explicit unknown remote-effect
  certainty.

### Excluded

- real shell or device mutation;
- cross-Gateway routing;
- offline pending-action execution;
- fleet revocation convergence;
- hardware posture/attestation;
- universal remote-worker identity;
- replaying an invocation across reconnect; and
- claiming exactly-once external effects.

## Proposed Trust Envelope

```json
{
  "operationId": "node-invoke-...",
  "subject": {
    "nodeId": "sha256:...",
    "pairingGeneration": "sha256:...",
    "connectionId": "sha256:..."
  },
  "authority": {
    "operatorScope": "operator.write",
    "commandPolicyGeneration": "sha256:...",
    "approvalRef": null
  },
  "invocation": {
    "invokeId": "sha256:...",
    "command": "fixture.noop",
    "idempotencyKey": "sha256:...",
    "route": "node_transport",
    "dispatched": true
  }
}
```

Hashing/export rules may differ for local support versus external audit, but
raw payloads, tokens, approval text, and command results remain outside the
ordinary envelope.

## Accepted Result

```json
{
  "schemaVersion": 1,
  "evidenceType": "node.invocation",
  "operationId": "node-invoke-...",
  "result": "completed",
  "certainty": "confirmed",
  "stream": {
    "lastProgressSequence": 2,
    "terminalSettled": true
  },
  "cancellation": {
    "requested": false,
    "acknowledged": false
  },
  "effect": {
    "owner": "fixture.noop",
    "result": "completed",
    "certainty": "confirmed"
  }
}
```

The node ID, connection ID, pairing generation, invocation ID, and command
policy generation must match the dispatch envelope.

## Structured Failures

### Pairing changed before dispatch

```json
{
  "result": "blocked",
  "reason": "PAIRING_CHANGED",
  "invocation": {
    "dispatched": false,
    "invokeId": null
  },
  "effect": {
    "result": "not_started",
    "certainty": "confirmed"
  }
}
```

### Abort after dispatch

```json
{
  "result": "cancelled",
  "reason": "ABORTED",
  "invocation": {
    "dispatched": true
  },
  "cancellation": {
    "requested": true,
    "support": "advertised",
    "acknowledged": false
  },
  "effect": {
    "result": "unknown",
    "certainty": "unknown"
  }
}
```

The second result is essential: it prevents a locally settled cancellation
from becoming a false remote-effect success claim.

## Internal Analogues

| Analogue | Decision | Reason |
| -------- | -------- | ------ |
| Tool-action durable audit | Adapt | Reuse redacted lifecycle projection, but retain node-specific authority and route fields. |
| Exec approval request IDs | Reuse | Approval identity/expiry precedent can link without copying command text. |
| Prepared model-runtime generation fencing | Adapt | Same stale-generation principle; node pairing and connection remain their own owners. |
| Transcript projection idempotency | Avoid | Projection deduplication is not command-effect idempotency. |
| Universal remote operation object | Avoid | Nodes, workers, ACP, and hosts have different identity and authority models. |

## Role Findings

### Node/runtime owner

Expose facts already used for dispatch and settlement. Do not move command
policy, pairing, streaming, or idempotency into the evidence writer.

### CISO/operator

Retain the exact authority and route used at dispatch, not current pairing or
current config. Distinguish no dispatch, local plugin satisfaction, node
dispatch, disconnect, and uncertain cancellation.

### Founder/simplicity

Use the existing internal invocation ID and one compact projection. Do not add
a service bus, distributed transaction, or required fleet controller.

## Deletion Target

Remove or prohibit:

- host adapters inferring authority from advertised capabilities;
- support reconstruction from current pairing/config state;
- treating node connection as permanent trust;
- treating idempotency transport as exactly-once proof;
- treating local abort as confirmed remote stop; and
- replaying an invocation automatically after reconnect.

## Disproof Conditions

Stop or narrow the slice if:

- exposing invocation identity changes command ownership;
- policy evidence requires storing sensitive payloads;
- pairing/connection facts cannot be captured at dispatch;
- plugin-satisfied and node-dispatched routes cannot be distinguished; or
- the result shape cannot preserve unknown remote-effect settlement.

## Cheapest Proof

1. Connect one in-process fixture node under pairing generation `g1`.
2. Admit `fixture.noop` through a fingerprinted command policy.
3. Dispatch one invocation with two progress frames and a successful result.
4. Verify one trust envelope contains the same node, connection, generation,
   invocation, and policy facts.
5. Rotate to `g2` before a second dispatch and prove `PAIRING_CHANGED` with no
   invocation ID/effect.
6. Dispatch a third call, abort locally, and prove cancellation requested with
   remote-effect certainty `unknown`.
7. Verify no payload, token, approval text, or command output enters ordinary
   durable evidence.
