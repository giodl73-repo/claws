# E3b: Lobster Enterprise Egress Policy

## Outcome

Implement `lobster/enterprise-egress` against E3a's portable policy contract.

## Repository And Dependencies

- Repository: `bic/lobster`
- Depends on: E3a

## Change

- Compile approved destinations, private routes, proxy/TLS, and route profiles.
- Register the policy in the Lobster bundle.
- Add redacted decision provenance and health evidence.

## Proof And Exit

- Rust consumes the canonical policy fixtures.
- Missing, stale, or conflicting policy is non-ready and fail-closed.
- D2b cannot become authoritative until this policy is ready.
