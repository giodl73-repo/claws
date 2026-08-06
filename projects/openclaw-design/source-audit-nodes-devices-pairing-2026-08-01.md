# Nodes, Devices, Pairing, and Remote Capabilities Source Audit - 2026-08-01

## Source Baseline

- Worktree: `C:\src\openclaw-design-audit`
- Head: `bde1602e6e86fd91dd0bec3aae714e059e556c4d`

## Finding

OpenClaw has a mature node/device runtime:

- explicit device and node pairing requests, approval, rejection, rename, and
  removal;
- stable device/node identity with public-key proof, signatures, nonces, and
  role-bound device tokens;
- pairing generations that fence active node sessions;
- role, scope, capability, command, permission, platform, and version
  declarations at connect;
- dynamic plugin-tool and skill catalogs;
- node presence, activity, wake, pending work, and watch polling;
- connection-bound `node.invoke` with idempotency, ordered input/progress,
  deadlines, idle timeouts, cancellation, late-result rejection, and disconnect
  cleanup;
- command policy, approval, dangerous-command, and operator-scope gates;
- node-host MCP and remote tool authority; and
- N-1 protocol compatibility for rolling node upgrades.

The key architecture rule is that device identity, pairing authority, node
runtime, connection incarnation, capability declaration, invocation, and result
evidence are separate contracts. A hosting platform or generic remote worker
must not inherit user-device pairing semantics merely to reuse invocation
machinery.

## Current Architecture

```text
device identity
   deviceId + public key + proof
        |
        v
pairing request and approval
   requestId + roles + scopes + policy
        |
        v
role-bound credential grant
   device token + pairing generation
        |
        v
node connection incarnation
   nodeId + connId + protocol + declared surfaces
        |
        v
effective capability/command/tool/skill surface
        |
        v
node invocation
   invokeId + idempotency + deadline + ordered stream + cancel
        |
        v
result, disconnect settlement, presence, and audit evidence
```

## Device Identity and Connect Proof

Gateway connect schemas carry:

- client identity and mode;
- device ID;
- public key/signature/nonce proof;
- role and scopes;
- min/max protocol and capabilities; and
- platform/version metadata.

See:

- `packages/gateway-protocol/src/schema/frames.ts:29-104`;
- `src/shared/device-auth.ts:1-29`;
- `packages/gateway-protocol/src/connect-error-details.test.ts:71-184`; and
- `packages/gateway-protocol/src/native-protocol-levels.guard.test.ts:190-278`.

The device ID is a stable claimed identity. A connection ID is one transport
incarnation. A role-bound device token is a renewable credential grant, not the
device identity itself.

## Pairing and Approval

Device and node protocol schemas define:

- list;
- approve by request ID;
- reject by request ID;
- remove by device/node ID;
- rename while preserving stable identity;
- token rotate with role/scopes;
- token revoke by role; and
- requested/resolved events.

See:

- `packages/gateway-protocol/src/schema/devices.ts:1-110`; and
- `packages/gateway-protocol/src/schema/nodes.ts:56-99`.

Node pairing handlers:

- filter visibility for non-admin device callers;
- apply cross-device management authorization;
- preserve mixed-role device rows while removing only the node role;
- emit security/audit facts;
- invalidate clients before accepting pipelined frames;
- clear node runtime/wake/catalog state; and
- disconnect node-role sessions after the success response.

See `src/gateway/server-methods/nodes.pairing.ts:130-235,390-460`.

Pairing request/approval identity is `requestId`. Approved authority is renewed
when roles/scopes/token or pairing generation changes. Removal is not merely a
catalog edit; it revokes the node role and fences live transport state.

## Node Session and Pairing Lease

`NodeRegistry` owns connected node sessions and maps:

- node ID to current pairing-bound session;
- connection ID to node ID;
- event transport by connection;
- pending invokes; and
- authorized `system.run` follow-on events.

See `src/gateway/node-registry.ts:240-320`.

Active node sessions capture a pairing generation. Before invocation or
projection, the registry can resolve current persistent pairing state. A stale
pairing:

- invalidates the client/session;
- removes connected plugin tools;
- settles pending invokes as disconnected;
- removes authorized follow-on events; and
- republishes presence.

See `src/gateway/node-registry.ts:540-680,1040-1140`.

This is a lease-like relationship between persistent pairing authority and one
connection incarnation. Reconnect creates a new connection ID and must
republish the current surface.

## Declared and Effective Capability Surfaces

Connect and node schemas distinguish declared metadata from effective runtime
surfaces:

- capabilities;
- commands;
- permissions;
- platform/client/version;
- plugin/MCP tool descriptors;
- skill descriptors;
- pending-work classes; and
- presence/activity.

See:

- `packages/gateway-protocol/src/schema/frames.ts:29-104`;
- `packages/gateway-protocol/src/schema/nodes.ts:1-158`;
- `src/gateway/node-catalog.ts`;
- `src/gateway/node-command-policy.ts`;
- `src/gateway/node-plugin-tool-snapshot.ts`;
- `src/gateway/server-plugins-node-runtime.ts`; and
- `src/gateway/server-methods/node-skills-update.ts`.

Pairing, config, operator scope, command policy, plugin policy, availability,
and connection state may narrow the declared ceiling. Capability advertisement
does not grant invocation authority.

## Node Invocation

The public request includes:

- node ID;
- command;
- owner payload;
- timeout;
- required idempotency key;
- optional session ownership metadata; and
- approval-routing metadata that is stripped before forwarding.

See `packages/gateway-protocol/src/schema/nodes.ts:120-180` and
`src/gateway/server-methods/nodes.invoke.ts:127-702`.

Before dispatch, the Gateway checks:

- operator scope and command-specific restrictions;
- command allowlist and dangerousness;
- approval and plugin node-invoke policy;
- current node connection;
- client invalidation;
- expected pairing generation;
- current persistent pairing state;
- expected connection ID; and
- remaining request deadline.

The registry assigns a random invocation request ID and binds it to:

- node ID;
- connection ID;
- command;
- optional system-run authorization context;
- timeout/idle timeout;
- progress callback;
- input/progress sequence state; and
- caller abort signal.

See `src/gateway/node-registry.ts:1040-1225`.

## Ordered Streaming, Deadlines, and Cancellation

`NodeInvokeStreamController` owns bounded ordered streaming:

- input frames receive monotonically increasing sequence numbers;
- input payloads are capped at 16 KiB;
- progress chunks are ordered and buffered up to 128 gaps;
- duplicate/out-of-order progress does not extend idle deadlines;
- hard timeout returns `TIMEOUT`;
- idle timeout returns `IDLE_TIMEOUT`;
- caller abort returns `ABORTED`;
- timeout/abort/callback failure sends `node.invoke.cancel` where supported;
- timers/listeners are removed at settlement; and
- no output is delivered after terminal cancellation.

See `src/gateway/node-registry.invoke-stream.ts:1-280`.

Cancellation support is capability/client dependent. Older nodes only receive
streamed cancellation; the first-party node host also aborts ordinary shell,
MCP, and inference calls. Cancellation is a request to stop remote work, not
proof that an external side effect was undone.

## Result, Late Frames, and Disconnect Settlement

Results are accepted only when invocation ID, node ID, and connection ID match
the pending record. Unknown, late, stale-connection, or already-settled results
return false and do not reopen the invocation.

On disconnect:

- all pending invokes bound to that connection are settled;
- MCP calls receive a structured `MCP_SERVER_UNAVAILABLE` result;
- other commands reject with `node disconnected`;
- authorized system-run follow-on events are removed; and
- connected tool/presence projections are retired.

See:

- `src/gateway/node-registry.invoke-stream.ts:91-120`;
- `src/gateway/node-registry.ts:280-310,560-680`; and
- `src/gateway/node-registry.test.ts:988-1109,1283-1738`.

There is no transparent invocation replay across reconnect. The idempotency key
is transported, but command-specific semantic replay safety remains with the
node command owner.

## Command Policy and Approval

Node invocation applies several independent gates:

- method/operator scopes:
  `src/gateway/method-scopes.ts:193`;
- core command restrictions:
  `src/gateway/server-methods/nodes-policy.ts`;
- payload sanitization:
  `src/gateway/node-invoke-sanitize.ts`;
- `system.run` approval binding:
  `src/gateway/node-invoke-system-run-approval.ts`;
- plugin-defined dangerousness and approval policy:
  `src/gateway/node-invoke-plugin-policy.ts:1-320`; and
- replay/bypass tests:
  `src/gateway/server.node-invoke-approval-bypass.test.ts:256-866`.

Plugin policy is the final Gateway-side guard before invocation and may narrow,
approve, deny, or satisfy a command without forwarding it.

## Presence, Wake, and Offline Work

Node presence schemas distinguish:

- alive triggers;
- operator activity/idle state;
- display/platform/version metadata; and
- pending work acknowledgement.

See `packages/gateway-protocol/src/schema/nodes.ts:1-120`.

Wake and pending-work paths support mobile/offline nodes:

- `src/gateway/node-pending-work.ts`;
- `src/gateway/node-wake-state.ts`;
- `src/gateway/server-methods/nodes-pending.ts`;
- `src/gateway/server-methods/nodes.wake.ts`; and
- `src/gateway/server-methods/nodes.invoke-wake.test.ts:709-2134`.

watchOS uses an authenticated HTTP event/polling transport with explicit
disconnect cleanup:

- `src/gateway/watch-node-http.ts:80-1097`; and
- `src/gateway/watch-node-http.test.ts:385-787`.

Presence is freshness-bound operational evidence. It is not permanent device
trust or proof that a capability will accept work.

## Node-Host MCP and Remote Tool Authority

Node-host MCP and worker tool authority are separate from ordinary node
commands:

- `src/node-host/mcp.ts:309-432`;
- `src/worker/tool-authority.ts:14-19`; and
- `src/gateway/worker-environments/worker-tool-authority.ts:72-89`.

MCP disconnect maps to a structured unavailable result so callers can degrade
without treating it as an opaque transport crash.

## Protocol and Mixed-Version Behavior

Authenticated node clients advertise min/max protocol ranges and may use the
N-1 rolling-upgrade floor:

- `packages/gateway-protocol/src/native-protocol-levels.guard.test.ts:190-278`;
- `src/gateway/server.node-version-mismatch.test.ts:54-209`; and
- `packages/gateway-client/src/reconnect-policy.ts:1-60`.

Protocol mismatch may stop reconnect rather than produce an infinite retry
loop. Capability and command catalogs must still be interpreted per connected
version and effective policy.

## External Comparison

Official precedents reinforce:

- Kubernetes node leases for freshness and liveness;
- taints/tolerations for exclusion, quarantine, and bounded eviction;
- device plugins for capability and health advertisement;
- SPIFFE/SPIRE node/workload attestation and renewable SVIDs;
- OAuth device flow for user-mediated enrollment on constrained devices;
- Microsoft Entra device identity and Conditional Access;
- Tailscale expiring node credentials and reauthentication; and
- gRPC deadlines/cancellation/status for remote calls.

No mature precedent treats a device as permanently trusted. Identity,
credentials, liveness, capability, and authorization are renewable and
revocable relationships.

## Enterprise Validation

### Covered

- stable device/node identity and connection-incarnation separation;
- public-key proof, nonce/signature, and role-bound device tokens;
- pairing request/approval/reject/list/rename/remove;
- token rotate/revoke;
- pairing-generation fencing;
- declared/effective capability and command surfaces;
- command/operator/plugin policy and approvals;
- dynamic tool/skill catalogs;
- invocation ID, idempotency, deadlines, ordered streams, progress, input, and
  cancellation;
- route/pairing-change rejection;
- disconnect and late-result settlement;
- presence, wake, pending work, and watch polling;
- N-1 protocol skew and mismatch handling; and
- extensive authorization, lifecycle, wake, and invocation tests.

### Partial or missing

- tenant/org/project ownership and delegated node administration;
- federated device/workload attestation beyond local pairing;
- hardware-backed key and posture/health attestation;
- explicit credential TTL/renewal policy across every client;
- enterprise Conditional Access and network-zone policy;
- portable capability schema/version and fleet inventory;
- durable invocation/audit evidence across all node commands;
- acknowledged remote cancellation and side-effect certainty;
- fleet-wide revoke/unpair convergence, offline-member handling, and kill;
- node quarantine/drain/maintenance windows;
- cross-Gateway node ownership, routing, and handoff;
- consistent lease/heartbeat model across nodes, workers, ACP, and host peers;
  and
- a separate first-class host/runtime peer identity contract.

## Separation Decision

Document nine child contracts:

1. **Device identity**: device ID, public key/attestation, platform, ownership,
   and replacement.
2. **Pairing request and approval**: request ID, requested roles/scopes,
   approving principal, policy, decision, and expiry.
3. **Credential grant**: role-bound token/SVID, scopes, issue/rotate/expire/
   revoke, and proof generation.
4. **Node session lease**: node ID, connection ID, pairing generation,
   protocol, connect/reconnect, freshness, and invalidation.
5. **Capability surface**: declared and effective capabilities, commands,
   permissions, tools, skills, versions, and health.
6. **Invocation stream**: invoke ID, command, idempotency, owner context,
   ordered input/progress, deadlines, cancellation, certainty, and settlement.
7. **Presence and wake**: heartbeat/activity, pending work, wake attempt,
   freshness, offline state, and expiry.
8. **Revocation and removal**: role/token revoke, unpair/remove, disconnect,
   catalog cleanup, offline convergence, and retained evidence.
9. **Remote-peer specialization**: reuse internal invocation substrate while
   keeping node, worker, and host-provider identities and permissions distinct.

## Monolithic Hotspots

- `src/gateway/node-registry.ts` combines session, pairing lease, presence,
  invocation, event authorization, and connectivity behavior.
- `src/gateway/server-methods/nodes.invoke.ts` combines wake/recovery,
  authorization, policy, approval, routing, deadline, and dispatch.
- `src/gateway/server-methods/nodes.pairing.ts` combines compatibility pairing
  stores, device-role management, authorization, runtime cleanup, and events.
- Gateway node method families and native transports expose overlapping
  presence/wake/catalog semantics.

## Revised Rubric

| Dimension | Score | Reason |
| --------- | ----- | ------ |
| Ownership | 3 | Device, pairing, registry, connection, policy, capability, and invocation owners exist but overlap. |
| Object model | 4 | IDs, requests, grants, generations, sessions, catalogs, invokes, sequences, presence, and revocation objects are concrete. |
| Contract completeness | 4 | Enrollment, auth, invocation, streaming, cancellation, disconnect, revocation, wake, and compatibility are substantial. |
| Separation/cohesion | 2 | Large registry and handlers combine several independently renewable contracts. |
| Evidence | 4 | Broad protocol, authz, lifecycle, invocation, wake, native-client, and mismatch tests support current behavior. |
| Evolution/operations | 3 | Pairing generations, token rotation/revocation, reconnect, N-1 skew, wake, and removal are explicit; fleet/handoff/attestation remain incomplete. |

**Total: 20/24 (B), high confidence for the audited paths.**

Enterprise contract coverage is **C3**: strong local identity, pairing,
invocation, revocation, and evidence exist, while federation, posture,
cross-Gateway fleet control, and offline convergence remain incomplete.
