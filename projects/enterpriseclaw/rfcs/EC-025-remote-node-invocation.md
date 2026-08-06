# RFC Scope: Remote Node Invocation

- ID: EC-025
- Lane: Nodes, devices, and edge
- Status: Scoped draft
- Initial posture: Fork + focused RFC
- Primary owner: Gateway/node invocation relationship

## Scope

- Bind command, node, pairing, connection, route, policy, approval, deadline,
  idempotency, invocation, cancellation, and settlement.

## Current Owner Baseline

Current node invocation is fenced by policy, pairing generation, connection
ID, route, deadline, and invocation identity. Timeout, disconnect, late
result, route change, and pairing replacement reject stale settlement. Local
abort or timeout never proves confirmed remote stop or effect reversal.

The current relationship already carries the major portable identities. The
residual work is conformance: prove the same admission, ordering, timeout,
disconnect, cancellation, and late-result behavior through TypeScript and a
bounded Rust profile before adding another invocation API.

## Implementation Disposition

- Reuse the current invocation owner and structured failures.
- Adopt #100960/#104158/#104159 for command observation and guidance only.
- Keep Scout actor policy, placement, approvals, reconciliation, and audit
  retention in Lobster.
- Select TypeScript or Rust before admission and bind the selected runtime
  generation; never dual-dispatch one effect.

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
