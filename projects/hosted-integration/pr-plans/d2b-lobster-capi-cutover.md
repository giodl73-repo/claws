# D2b: Lobster CAPI Vertical And Cutover

## Outcome

Complete the production-shaped CAPI proof and perform the first authoritative
canary transition.

## Repository And Dependencies

- Repository: `bic/lobster`
- Depends on: C3, D1b, D2a, E3b, and F1

## Change

- Connect the CAPI token, enterprise route, reverse dispatcher, and streams.
- Add inactive deployment wiring, then explicit canary authority.
- Add rollback to the previous authoritative path.
- Record redacted audit correlation and old/new path telemetry.

## Proof And Exit

- Guard, redirect, credential-origin, streaming, overload, cancellation,
  certainty, stale generation, and no-replay cases pass.
- Readiness, Status, and Doctor expose all generation domains.
- Canary and rollback preserve one authoritative writer.
