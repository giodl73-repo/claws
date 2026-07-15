# F1: Bundle And Hosting Profile Activation

## Outcome

Prepare and validate inactive Lobster bundle/profile selections before the
provider-specific authority cutover.

## Repository And Dependencies

- Repository: `bic/lobster` (including deployment configuration owned there)
- Depends on: A2, A3, B5, B6a, B6b, D1a, D1b, E3a, and E3b

## Change

- Select applicable Gateway clients, Channel endpoints, adapters, credential
  resolvers, traffic policy, dispatcher, and profile IDs.
- Prefer Managed Configuration exact authority for managed deployment
  invariants while preserving ordinary config support.
- Define disabled and non-authoritative validation modes.
- Record the prior selection needed by D2b rollback.

## Non-Goals

- No authority cutover; D2b owns the first CAPI canary and rollback.
- No implicit fallback or global activation transaction.
- No configuration-owned health truth.

## Proof And Exit

- Unresolved, disabled, ambiguous, and incompatible references are explicit.
- Required criteria are observable before traffic authority is enabled.
- Config provenance, generations, authority mode, and rollback appear in
  Status and Doctor.
