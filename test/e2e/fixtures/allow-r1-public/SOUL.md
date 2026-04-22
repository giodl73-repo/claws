# allow-r1-public fixture — SOUL

Expected decision verb: **allow**.

Canonical allow pairing per CL-07 §1a: R1 tool invoked on PUBLIC data yields
`allow` without provoking a companion approval cycle. Scenario SC-01 asserts
`DecisionEntry.decision === 'allow'`, `declaredTier === 'R1'`,
`effectiveTier === 'R1'` (no non-uplift cap triggered).

## Policy

- Tier ladder: R0 .. R5.
- Effective tier never exceeds declared tier.
- Default action on R1/PUBLIC is allow.

## Notes

No deny rules, no modify rules, no approval requirements.
