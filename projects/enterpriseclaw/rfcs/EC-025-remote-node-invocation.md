# RFC Scope: Remote Node Invocation

- ID: EC-025
- Lane: Nodes, devices, and edge
- Status: Scoped draft
- Initial posture: Fork + focused RFC
- Primary owner: Gateway/node invocation relationship

## Scope

- Bind command, node, pairing, connection, route, policy, approval, deadline,
  idempotency, invocation, cancellation, and settlement.

## Explicit Exclusions

- Gateway ownership of remote effects.
- Cancellation dispatch as stop proof.
- Definition of device, pairing, and connection incarnation identity, owned by
  EC-024.

## Required Outcomes

- Results match invocation, node, and connection.
- Local plugin satisfaction and remote transport identify different routes.
- Unknown remote effect remains first-class.
- Cancelled, timed-out, or disconnected invocations expose explicit
  remote-effect certainty; local settlement never implies remote success or
  confirmed stop.

## Dependencies

- EC-004, EC-005, EC-014, EC-023, EC-024.

## Proof and Deletion Gate

- Exercise timeout, disconnect, late result, and route change.
- Delete public results that omit required trust correlation and any treatment
  of local abort/timeout as confirmed remote stop.
- Disprove the separate contract if generic delegated execution can preserve
  node pairing, connection incarnation, route, cancellation, and remote-effect
  certainty without node-specific relationship semantics.
