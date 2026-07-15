# E1b: Lobster Approval Gateway Client

## Outcome

Adopt E1a from Lobster and cut approval authority away from private frames.

## Repository And Dependencies

- Repository: `bic/lobster`
- Depends on: E1a

## Change

- Implement the least-privilege Gateway client and audit correlation.
- Register it in a new `lobster-host` snapshot.
- Add inactive deployment, authority cutover, rollback, and expiry.

## Proof And Exit

- One approval resolver is authoritative.
- Disconnect and retries do not duplicate resolutions.
- Compatibility bridge deletion waits for mixed-version expiry.
