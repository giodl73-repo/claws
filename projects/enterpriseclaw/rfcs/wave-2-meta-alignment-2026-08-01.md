# Wave 2 Meta-Model Alignment - 2026-08-01

## Baseline

Reviewed Wave 2 against:

- `../contract-principles.md`;
- `../contract-interface-patterns.md`; and
- `../contract-pitfalls.md`.

## Applied Corrections

- EC-003 separates credential/profile authority from runtime binding identity
  and adds restart-safe binding recovery.
- EC-004 requires modified requests to produce new normalized intent and risk
  classification before authorization.
- EC-008 binds attempts to normalized intent/risk and durable replay-safe
  attempt identity.
- EC-009 adds durable child command acceptance and causal lineage evidence.
- EC-011 makes candidate identity restart-safe and removes call-order
  reconstruction as an authority.
- EC-012 removes projection ownership and makes delayed usage reconciliation
  causal, idempotent, and chronologically explicit.
- EC-013 adds stable negotiated-surface identity and explicit
  contract/protocol/artifact/extension compatibility.
- EC-016 adds its falsifiable disproof gate.
- EC-027 adds stable definition identity and fail-closed required semantics
  while preserving the baseline skill/workspace artifact shape.
- EC-028 explicitly preserves baseline local artifact installability unless a
  governed profile requires trust evidence.
- EC-032 separates host-controller lifecycle authority from runtime readiness,
  adds durable lifecycle command acceptance, and declares mixed-version
  hosting compatibility.
- Every Wave 2 scope now has a falsifiable contract disproof condition.

## Result

Wave 2 now follows the common authority-decision, attempt identity, durable
acceptance, evidence chronology, compatibility, artifact-autonomy,
local-profile, migration, and disproof grammar.
