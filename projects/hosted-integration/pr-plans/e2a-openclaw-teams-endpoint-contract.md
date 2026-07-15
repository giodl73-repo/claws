# E2a: OpenClaw Teams Endpoint Contract

## Outcome

Add the Channel-owned endpoint attachment and trusted-forwarder contract.

## Repository And Dependencies

- Repository: `openclaw/openclaw`
- Depends on: A3, B5, B6a, and B6b

## Change

- Define route identity, authentication, limits, acknowledgement, idempotency,
  generation, and readiness.
- Register the Channel endpoint contribution shape.
- Publish portable fixtures and operator-visible findings.

## Proof And Exit

- Accepted, retryable, terminal, duplicate, timeout, and unconfirmed pass.
- No generic normalized ingress RPC is introduced.
- Channel remains the semantic and retry owner.
