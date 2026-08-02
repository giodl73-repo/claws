# RFC Scope: Node Pairing and Trust

- ID: EC-024
- Lane: Nodes, devices, and edge
- Status: Scoped draft
- Initial posture: Fork + focused RFC
- Primary owner: Node pairing

## Scope

- Define device identity, pairing generation, grants, capability freshness,
  connection binding, renewal, revocation, and evidence.

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

- Revoke and reconnect one paired node.
- Delete authority inference from current connection and capability list.
- Disprove the separate contract if node trust has no identity, grant,
  renewal, revocation, or connection-binding lifecycle beyond generic
  credential/trust contracts.
