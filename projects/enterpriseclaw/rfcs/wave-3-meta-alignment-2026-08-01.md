# Wave 3 Meta-Model Alignment - 2026-08-01

## Baseline

Reviewed Wave 3 against:

- `../contract-principles.md`;
- `../contract-interface-patterns.md`; and
- `../contract-pitfalls.md`.

## Applied Corrections

- EC-001 adds its falsifiable projection-contract disproof condition.
- EC-002 separates repair plan identity from preview/apply operations and
  binds apply to normalized intent, risk, authority, and owner generations.
- EC-005 generation-fences and authorizes renewal, federation, and revocation.
- EC-010 limits retry behavior to schedule-level wake backoff, adds
  schedule-generation/replay fencing, and explicitly folds into EC-008 if its
  separation gate fails.
- EC-015 adds its identity-contract disproof condition.
- EC-017 adds stable export-copy identity, version, destination owner,
  replay-safety, and production settlement.
- EC-018 makes context budget exhaustion, omission, truncation, and fallback
  explicit.
- EC-021 requires atomic per-owner restore cutover and truthful cross-owner
  composition.
- EC-030 removes projection ownership and requires stable copy identity,
  lifecycle authority, source generation, and per-owner settlement.
- EC-031 gives admissions, allocations, and leases stable causal identities
  and restart-safe settlement.
- EC-033 aligns the shared evidence base with producer identity, full
  chronology, policy/authority references, integrity, and verifier identity.
- EC-034 adds parent/target-set/per-unit fan-out identity, targeted repair, and
  bounded break-glass containment.
- Every Wave 3 scope now has a falsifiable contract disproof condition.

## Result

Wave 3 now follows the common projection, repair authority, trust,
schedule-separation, copy lifecycle, atomic cutover, evidence, admission,
fan-out, containment, local-profile, and disproof grammar.
