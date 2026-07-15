# D3b: Lobster Substrate Adoption

## Outcome

Implement and cut over the Lobster Substrate token and hosted route.

## Repository And Dependencies

- Repository: `bic/lobster`
- Depends on: D3a and D2b

## Change

- Implement `lobster/substrate-token`.
- Select the shared policy, dispatcher, and reverse carrier.
- Add inactive deployment, canary authority, rollback, and telemetry.

## Proof And Exit

- Request/response parity and credential audience pass.
- Version skew is explicit and non-ready.
- Old-path use reaches the provider-specific expiry gate.
