# E1a: OpenClaw Approval Host Surface

## Outcome

Package canonical Gateway approval consumption for supported non-TypeScript
host clients.

## Repository And Dependencies

- Repository: `openclaw/openclaw`
- Depends on: A3, B5, B6a, and B6b

## Change

- Publish schemas and fixtures for pending replay, live events, and resolution.
- Register the least-privilege Gateway-client contribution.
- Add readiness, Status, and Doctor evidence.

## Proof And Exit

- Replay/live dedupe, expiry, retry, conflict, reconnect, and cancellation pass.
- Existing approval protocol and authority remain unchanged.
- Operator-visible failures identify scope, connection, and generation causes.
