# Nodes, Devices, Pairing, and Remote Capabilities

## Boundary

This portfolio represents device identity, pairing approval, credential grants,
node sessions, capability surfaces, invocation streams, presence/wake,
revocation, and bounded remote-peer specialization.

It must not treat every Gateway client, worker, host provider, or remote service
as a user-paired node.

## Status and Sources

- Status: current source-audited node/device runtime; enterprise federation and
  fleet semantics incomplete.
- Source audit:
  `../source-audit-nodes-devices-pairing-2026-08-01.md`.

## Observed Objects

- device identity and attestation;
- pairing request/decision;
- role/scope credential grant;
- node identity and connection incarnation;
- pairing/session lease;
- declared/effective capability surface;
- invocation and ordered stream;
- presence/activity/wake/pending work;
- revocation/removal operation; and
- node/fleet evidence.

## Capabilities

- establish or attest a device identity;
- request and approve bounded roles/scopes;
- issue, rotate, and revoke role-bound credentials;
- connect a node under a current pairing generation;
- advertise and narrow capabilities, commands, permissions, tools, and skills;
- invoke commands with policy, approval, idempotency, deadlines, streaming, and
  cancellation;
- report presence and wake offline devices;
- settle disconnects and reject stale/late frames;
- remove pairing authority and converge runtime cleanup; and
- reuse invocation components for distinct remote-peer domains.

## Contracts

### Device identity

- stable device ID;
- public key or workload/hardware attestation;
- owner, platform, family, model, and client identity;
- issue, replace, repair, and retire;
- posture/health evidence; and
- disclosure-safe fingerprint.

### Pairing request and approval

- request ID and device identity;
- requested roles, scopes, and capabilities;
- remote/network context;
- approving principal and policy generation;
- user-mediated or automated proof;
- approve, reject, expire, supersede, and repair; and
- retained decision evidence.

### Credential grant

- device ID plus role;
- scopes and resource boundaries;
- credential/token/SVID generation;
- issue, rotate, expire, revoke, and reauthenticate;
- proof-of-possession binding; and
- break-glass or delegated administration constraints.

### Node session lease

- node ID and connection ID;
- pairing/credential generation;
- protocol range and selected version;
- declared capabilities/commands/permissions;
- connected-at, freshness, and presence;
- reconnect, supersession, invalidation, and disconnect; and
- stale-session rejection.

### Capability surface

- declared capabilities and command schemas;
- effective policy/approval-narrowed surface;
- dynamic tools and skills;
- version, availability, health, and limits;
- unknown/unsupported behavior; and
- rule that capability does not grant authorization.

### Invocation stream

- invocation ID and idempotency key;
- node/connection/pairing generations;
- command and owner/session context;
- sanitized payload;
- ordered input/progress sequence;
- deadline and idle timeout;
- cancellation support and acknowledgement level;
- disconnect/route-change/late-result behavior;
- side-effect certainty; and
- exactly one terminal settlement.

### Presence and wake

- node/session identity;
- alive/activity trigger and observation time;
- freshness/expiry;
- pending work and acknowledgement;
- wake attempt, transport, deadline, and result;
- foreground/background state; and
- offline/degraded projection.

### Revocation and removal

- target device/node/role/grant;
- authority and reason;
- token and pairing-generation invalidation;
- active-session disconnect;
- pending invocation settlement;
- capability/catalog/wake cleanup;
- late/offline fleet member behavior; and
- completion evidence.

### Remote-peer specialization

- shared internal correlation, deadlines, connection fencing, and settlement;
- distinct peer kind and identity;
- owner-specific permission/capability schema;
- no inheritance of device pairing, wake, or user-device policy for hosts;
- generation and credential renewal; and
- separate readiness/status authority.

## Relationships and Non-Ownership

- Device identity is not a connection incarnation or token.
- Pairing grants bounded trust; it does not grant every advertised capability.
- Capability advertisement is not authorization.
- Node commands retain semantic ownership of idempotency and side-effect
  certainty.
- Gateway timeout/cancel does not prove remote external work stopped.
- Presence is freshness-bound evidence, not permanent trust or readiness.
- A host/runtime peer may reuse internal invocation machinery but must not use
  node IDs, pairing, wake, or device permissions as its public identity model.
- No universal identity or capability bus is required.

## Fleet and Evolution

- advertise protocol and capability versions;
- support bounded version skew and explicit unsupported state;
- renew credentials, pairing leases, and presence independently;
- expose stale, offline, invalidated, revoked, and partial-fleet state;
- support delegated administration and cohort rollout;
- converge revoke/remove across connected and offline members;
- retain invocation and approval evidence without sensitive payloads;
- drain/quarantine before destructive removal; and
- fence cross-Gateway handoff with explicit owner generations.

## Enterprise Obligations

- Criticality: **E4**.
- Obligations: `A I D O N E R X U`.
- Current coverage: **C3**.
- Blocking gaps: federated/hardware-backed attestation, posture and Conditional
  Access, explicit credential TTLs, tenant administration, cross-Gateway
  ownership, capability inventory, acknowledged cancellation, offline
  revocation convergence, quarantine/drain, and fleet evidence.

## Current Gaps

- no portable device/workload attestation contract;
- no complete tenant/delegated node administration model;
- no one lease/heartbeat vocabulary across node, worker, ACP, and host peers;
- no acknowledged cancellation or external side-effect certainty contract;
- no cross-Gateway routing/handoff owner;
- no fleet-wide capability/posture inventory;
- no offline revoke/remove completion proof; and
- no first-class host/runtime peer identity separate from node pairing.

## Promotion Candidates

- device/workload attestation and renewable credential contract;
- node capability/version inventory;
- portable invocation settlement/certainty schema;
- offline revocation and fleet convergence evidence;
- node drain/quarantine/maintenance contract;
- cross-Gateway node handoff and routing;
- acknowledged cancellation capability; and
- distinct host/runtime peer identity built on shared internal invocation
  components.

First bounded enterprise proof:
`../evidence-slices/remote-node-invocation-trust.md`.
