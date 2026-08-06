# RFC Scope: Trust Revocation and Federation

- ID: EC-005
- Lane: Identity, authority, and trust
- Status: Scoped draft
- Initial posture: Fork + focused RFC
- Primary owner: Trust-relationship owners

## Scope

- Represent pairing, delegation, plugin, host, and federated trust generations.
- Define renewal, revocation, in-flight exposure, and evidence.

## Current Owner Baseline

Current device and node pairing records are generation-bearing and revocable.
Scope-checked revocation can fence live node-hosted surfaces. Federation,
host, and plugin trust remain separate target families; current source does
not prove one shared portable trust generation or cross-owner propagation
contract.

Device/node pairing is the strongest current precedent: public-key identity,
role/scoped grants, pairing generations, connection-incarnation fencing, token
rotation/revocation, and live-session invalidation are already owner-native.
Enterprise federation should adapt to those owners and declare propagation
targets; it should not replace them with one trust database.

## Explicit Exclusions

- A universal identity database.
- Automatic authority from federation membership.
- Consumer-side fencing and settlement, owned by credential, delegation, and
  invocation contracts that consume this revocation generation.

## Required Outcomes

- Revocation fences new binding and reports unsettled work.
- This contract emits revocation identity and propagation; each consumer
  performs its own fence and settlement.
- External issuers map through bounded adapters.
- Local identity remains complete without federation.
- Each federation adapter declares a propagation target and exposes work that
  may remain authorized before that target is met.
- Revocation and in-flight exposure emit durable, idempotent evidence through
  EC-033.
- Existing trust records migrate without long-lived dual trust authority.
- Renewal, federation, and revocation requests bind stable trust-subject
  identity, requested action, scope, trust/policy generations, and bounded
  authority; stale, revoked, or unverifiable authority fails closed.

## Dependencies

- EC-003, EC-004, and EC-033.

## Proof and Deletion Gate

- Revoke trust during a live connection and expose settlement.
- Delete adapters that infer trust from connection presence.
- Disprove the separate contract if existing trust owners already expose
  stable renewal/revocation generations, bounded federation adapters, and
  propagation identity without connection-presence inference.
