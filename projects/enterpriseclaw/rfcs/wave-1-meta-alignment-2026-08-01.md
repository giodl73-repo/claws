# Wave 1 Meta-Model Alignment - 2026-08-01

## Baseline

Reviewed Wave 1 against:

- `../contract-principles.md`;
- `../contract-interface-patterns.md`; and
- `../contract-pitfalls.md`.

## Applied Corrections

- EC-006 adds a falsifiable disproof gate.
- EC-007 makes the activating facility the sole owner, treats readiness as an
  owner-native observation, and maps hosted probe signals without transferring
  readiness authority.
- EC-014 binds protected effects to normalized intent and risk-classifier
  generations.
- EC-019 fails closed on stale or unknown classification, policy, and
  revocation inputs.
- EC-020 gives every derived memory copy stable identity, source generation,
  freshness, and per-copy settlement.
- EC-022 removes the pairing/trust reverse-edge ambiguity and adds explicit
  fresh-install, upgrade, downgrade, and version-range behavior.
- EC-023 owns only transport/stream lifecycle and preserves semantic operation
  authority with the invoked owner.
- EC-024 separates device authentication from grant/approval authority.
- EC-025 retains node-specific invocation only where pairing, connection,
  route, and remote-effect semantics cannot be represented generically.
- EC-026 preserves local completeness and limits Rust authority to node-local
  execution behavior.
- EC-029 consumes fleet convergence only for fleet/multi-unit release targets.
- Every Wave 1 scope now has a falsifiable contract disproof condition.

## Result

Wave 1 now follows the common owner, profile, generation, authority, lifecycle,
effect, evidence, compatibility, migration, and deletion/disproof grammar.
