# RFC Scope: Node Pairing and Trust

- ID: EC-024
- Lane: Nodes, devices, and edge
- Status: Scoped draft
- Initial posture: Fork + focused RFC
- Primary owner: Node pairing

## Scope

- Define device identity, pairing generation, grants, capability freshness,
  connection binding, renewal, revocation, and evidence.

## Current Owner Baseline

Current source distinguishes pairing approval, pairing generation, device
identity, and connection incarnation. Dispatch revalidates the persistent
pairing generation and current route immediately before send, producing
explicit pairing-changed or route-changed rejection instead of restoring
authority from reconnection.

Current command inventory work (#100960, #104158, and #104159) observes
declared/effective node commands and projects bounded guidance. It does not
replace pairing, grant, connection, policy, or approval authority. The Rust
node profile must consume these same trust generations rather than define a
parallel enrollment system.

## Implementation Disposition

- Reuse the current device/node pairing owner and generation fencing.
- Adopt the active command inventory stack as observation, not authority.
- Keep tenant enrollment, placement, fleet revocation distribution, and
  recovery UX in Lobster.
- Add portable trust fields only after shared TypeScript/Rust fixtures expose
  a missing owner fact.

## Explicit Exclusions

- Presence as readiness.
- Capability advertisement as authority.
- Invocation and result correlation, owned by EC-025.

## Required Outcomes

- New work is fenced after revocation.
- Connection incarnation remains distinct from device identity.
- In-flight exposure is reported.
- Authentication establishes device identity only; approval/grant generation
  authorizes use. Reconnect or credential renewal never restores revoked or
  unapproved authority without a new grant decision.
- Pairing and connection evidence records trust generation, renewal, and
  revocation time without claiming invocation settlement.

## Dependencies

- EC-005 and EC-022.

## Proof and Deletion Gate

- Revoke and reconnect one paired node and require explicit
  `PAIRING_CHANGED` or `ROUTE_CHANGED` rejection.
- Delete authority inference from current connection and capability list.
- Disprove the separate contract if node trust has no identity, grant,
  renewal, revocation, or connection-binding lifecycle beyond generic
  credential/trust contracts.
