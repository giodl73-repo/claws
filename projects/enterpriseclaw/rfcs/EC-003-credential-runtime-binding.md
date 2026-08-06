# RFC Scope: Credential Runtime Binding

- ID: EC-003
- Lane: Identity, authority, and trust
- Status: Source-backed scoped draft
- Initial posture: Fork + focused RFC
- Primary owner: Credential and auth-profile owners

## Scope

- Bind a credential/profile generation to one runtime consumer and operation.
- Define refresh, expiry, rotation, degraded state, and redacted evidence.
- Consume the accepted source/configuration generation defined by EC-006.

## Current Owner Baseline

Current OpenClaw already separates credential material, SecretRefs, auth
profiles, runtime snapshots, degraded owners, provider selection, and
execution-auth fingerprints.

Current execution bindings can:

- fingerprint the exact resolved static secret selected for a profile;
- preserve stable OAuth principal identity across ordinary token refresh;
- invalidate identity-less OAuth, manual token, static secret, executable, or
  plugin-harness ownership when its effective owner changes;
- fail closed when a selected profile or opaque runtime owner cannot be
  established; and
- attach a non-reversible auth/runtime owner binding to the successful run.

Those fingerprints are deliberately process-local. They prove current
execution ownership but are not durable restart identities.

Active hosted-integration work also separates exact-origin credential use from
generic credential infrastructure. Open issue #104849 owns the concrete
fetch/media pass-through decision, while broader fork proofs remain blocked on
that owner/security choice. The residual EnterpriseClaw question is durable
non-secret operation binding across unlike consumers, not a universal
credential-slot registry.

## Contract Objects

| Object | Owner | Identity/lifetime |
| --- | --- | --- |
| Credential owner generation | Credential/profile owner | Stable principal/reference plus owner-native revision |
| Resolved binding | Runtime binding relationship | Profile/reference, resolved owner fingerprint, consumer, operation, and accepted generations |
| Attempt binding | Run/effect owner | One attempt identity plus one resolved binding |
| Refresh event | Credential/profile owner | Token refresh that may preserve the same principal generation |
| Rotation/revocation event | Credential/profile owner | Owner change that fences prior attempt bindings |
| Binding settlement | Runtime binding relationship | Active, stale, revoked, expired, unavailable, superseded, or unknown |
| Binding evidence | Evidence owner | Redacted references and comparison result without reusable material |

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
- Ordinary OAuth access-token refresh does not stale a binding when the
  credential owner proves the same principal and grant generation. Static
  secret replacement, manual token replacement, identity-less grant change,
  profile replacement, principal change, or revocation does stale it.
- Intentional provider/profile failover creates a new attempt binding. It does
  not rewrite the prior attempt to appear as though it used the replacement
  credential.
- Durable recovery persists only non-secret owner/profile/reference,
  generation, consumer, operation, and evidence identities. Process-local
  HMAC fingerprints are re-derived evidence and are never persisted as
  restart authority.

## Dependencies

- Principal identity and EC-006.

## Proof and Deletion Gate

- Rotate a credential during retry and reject the stale attempt.
- Refresh an identity-bearing OAuth token and preserve the binding, then
  replace the principal or identity-less grant and fence it.
- Restart after accepting a binding, re-resolve the same owner generation,
  and reconcile without storing or logging credential material.
- Delete implicit "current credential" lookup during execution.
- Disprove the separate contract if existing credential/profile owners already
  expose operation-scoped generation fencing, rotation/revocation state, and
  replay-safe recovery without a runtime-binding abstraction.
