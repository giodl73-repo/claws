# r4-args-from-restricted-runtime fixture — SOUL

Expected decision verb on RESTRICTED-provenance runtime args: **review**.
Control (PUBLIC provenance): **allow**.

Per CL-07 §1a, runtime-axis escalation re-computes `effectiveTier` at
`preAuthorize` when provenance is knowable only at call-time. Critical:
the provenance source MUST be trusted (pulled from a prior DecisionEntry's
audit metadata or re-classified from raw bytes), NEVER from
user-supplied args directly.

## Policy

- R4 declared + runtime-observed RESTRICTED provenance → R5 at runtime.
- `DecisionEntry.escalationSource: 'runtime-provenance'`.
- Control: PUBLIC provenance → `allow`, no handle, no approval.
- Adversarial: self-reported `provenance: 'PUBLIC'` with
  actually-RESTRICTED bytes → classifier re-classifies via
  `ctx.contentClassifier(bytes)`, escalates anyway.
