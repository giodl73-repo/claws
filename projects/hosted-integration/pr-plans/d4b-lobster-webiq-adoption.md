# D4b: Lobster WebIQ Adoption

## Outcome

Implement the WebIQ key resolver and adopt hosted dispatch in Lobster.

## Repository And Dependencies

- Repository: `bic/lobster`
- Depends on: D4a and D2b

## Change

- Materialize the declared `x-apikey` value.
- Add inactive selection, canary, rollback, and old-path telemetry.

## Proof And Exit

- Credential redaction and origin restriction pass.
- Local/hosted parity passes.
- Compatibility retirement has a release and telemetry gate.
