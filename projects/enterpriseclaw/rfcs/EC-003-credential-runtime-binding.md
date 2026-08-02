# RFC Scope: Credential Runtime Binding

- ID: EC-003
- Lane: Identity, authority, and trust
- Status: Scoped draft
- Initial posture: Fork + focused RFC
- Primary owner: Credential and auth-profile owners

## Scope

- Bind a credential/profile generation to one runtime consumer and operation.
- Define refresh, expiry, rotation, degraded state, and redacted evidence.
- Consume the accepted source/configuration generation defined by EC-006.

## Explicit Exclusions

- Universal secret storage.
- Provider-specific authentication semantics.

## Required Outcomes

- Stale bindings are fenced after rotation or revocation.
- Evidence carries references, never secret material.
- Local and federated providers share the binding contract.
- Refresh failure or unverifiable rotation fails closed for protected
  consumers; lower-risk degradation is explicit and evidenced.
- Existing implicit credential lookup remains read-compatible during
  migration but cannot remain a second runtime authority.
- Credential/profile owners remain authoritative for credential material,
  validity, rotation, and revocation; the runtime binding owns only the
  accepted binding reference, bound consumer/operation identity, and fence
  state.
- Accepted bindings are durably recoverable by binding/operation identity so
  reconnect or restart reconciles prior state before replay and never rebinds
  to current credential state.

## Dependencies

- Principal identity and EC-006.

## Proof and Deletion Gate

- Rotate a credential during retry and reject the stale attempt.
- Delete implicit "current credential" lookup during execution.
- Disprove the separate contract if existing credential/profile owners already
  expose operation-scoped generation fencing, rotation/revocation state, and
  replay-safe recovery without a runtime-binding abstraction.
