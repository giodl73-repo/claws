# RFC Scope: Owner State Projection

- ID: EC-001
- Lane: Experience and administration
- Status: Scoped draft
- Initial posture: Fork + focused RFC
- Primary owner: Each semantic owner; projection contract is shared

## Scope

- Project owner identity, generation, state, freshness, certainty, and reason.
- Define machine-stable status without one universal status enum.

## Explicit Exclusions

- Canonical runtime state and owner mutation.
- UI layout, dashboard technology, and fleet storage.

## Required Outcomes

- Missing, stale, degraded, partial, and unknown remain explicit.
- Projection failure such as unreachable owner, ambiguous generation, or
  incompatible payload is explicit and distinct from owner-reported state.
- Local CLI and managed projections consume the same owner facts.
- Schema evolution preserves owner-specific payloads.

## Dependencies

- Owner generation and evidence conventions.

## Proof and Deletion Gate

- Render three unlike owners through one envelope.
- Delete projection-specific inference from logs and process existence.
- Disprove the separate contract if unlike owners already expose
  machine-stable generation, freshness, certainty, and failure semantics that
  local and managed projections can consume without shared inference.
