# modify-arg-redaction fixture — SOUL

Expected decision verb: **modify**.

The tool is admitted, but arguments are rewritten before the call ships.
Scenario SC-04 asserts the `DecisionEntry` carries:

- `decision === 'modify'`
- `modifiedArgsHash` set to the sha256 of the canonicalized *post*-redaction
  argument payload (NOT the raw payload). SC-04 F-01..F-07 pin this contract.
- `declaredTier === 'R2'`, `effectiveTier === 'R2'`.

## Modify rules

### rule: redact-email-addresses

- match: tool `notes.store`, arg key `body`.
- transform: replace every RFC 5322-ish email address with `[REDACTED-EMAIL]`
  using the regex `/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g`.
- action: modify (continue)

The raw args flowing from the agent include two email strings; the
canonicalized post-redaction payload is what feeds `modifiedArgsHash`.
