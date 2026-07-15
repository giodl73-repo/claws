# E2b: Lobster Teams Endpoint

## Outcome

Implement E2a's endpoint in Lobster and cut Teams ingress authority.

## Repository And Dependencies

- Repository: `bic/lobster`
- Depends on: E2a

## Change

- Implement trusted-forwarder routing and acknowledgement.
- Register the endpoint in a new `lobster-host` snapshot.
- Add fixture-only shadow comparison, canary authority, rollback, and expiry.

## Proof And Exit

- Tenant/user/runtime route identity and idempotency pass.
- No live actionable event is duplicated during shadowing.
- Compatibility waiter and acknowledgement routing have deletion gates.
