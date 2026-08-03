# RFC Scope: Owner Readiness Observations

- ID: EC-007
- Lane: Configuration and activation
- Status: Scoped draft
- Initial posture: Fork + focused RFC
- Primary owner: Activating owner readiness surface. Criterion semantics and
  subject state remain with their semantic owners.

## Scope

- Define the relationship between owner-native accepted/active generations and
  separate readiness and availability observations for one owner or deployment
  unit.
- For OpenClaw configuration activation, EC-006 owns accepted/active
  generations, rollback, and restart debt; EC-007 observes those facts.

## Current Owner Baseline

The active upstream delivery stack is RFC #33 and #104018 for canonical
readiness, #113421 for core owner observations, RFC #37 and #113422 for
standard hosting profiles, and #114636 for catalog, live validation, and
package release evidence. All remain open as of 2026-08-02.

## Implementation Disposition

- Adopt the existing stack in dependency order; do not create another
  readiness framework or host evaluator.
- Treat watch, wait, catalog, validation, and release evidence as facilities
  consuming the canonical result.
- Replace private process/listener checks only where canonical profile
  readiness covers the same semantics; retain shallow liveness separately.
- Require Rust owners to emit this same contract rather than a Rust-specific
  health schema.

## Explicit Exclusions

- One generic health state.
- Source resolution, configuration acceptance, activation commit, rollback,
  restart debt, or owner-native recovery state.
- Fleet desired-state ownership.
- Fleet-level convergence and mixed-unit composition, owned by EC-034.
- Host process ordering and probe implementation, owned by EC-032.
- Criterion catalog, watch/wait operator facilities, hosting-profile
  catalog/validation, durable evidence packaging, and conformance artifacts;
  those are consumers or adjacent contracts rather than EC-007 core.

## Required Outcomes

- Activation failure preserves prior authoritative state where possible.
- Readiness identifies criterion kind, evaluating producer, primary and related
  subjects, active generation, required/advisory status, freshness, reason,
  and contract version.
- Evaluation binds to one active configuration/plugin-registry snapshot.
- Required false or unknown conditions make the aggregate not ready; advisory
  conditions remain visible without silently becoming required.
- Unavailable is distinct from valid not-ready. Recovery re-emits the complete
  canonical result for the current active generation and never implies healthy
  readiness by itself.
- Stable criterion kind and subject reference survive provider replacement
  when semantics are unchanged; producer identity/version changes remain
  visible.
- Mixed-version comparison uses declared contract/schema/profile versions and
  never assumes identical criteria.
- EC-032 lifecycle commands and probes consume EC-007 owner-produced readiness
  results for the active generation; probes do not infer readiness from process
  existence or redefine criterion meaning.
- Detailed reasons, related subjects, and retained artifacts are protected
  projections with audience-bound authorization and redaction. Missing, stale,
  revoked, or unverifiable authority does not disclose protected detail.
- Live readiness is ephemeral operational observation by default. Durable
  packaging is outside EC-007 core and must declare producer, subject and owner
  generations, chronology, integrity/verifier identity, disclosure,
  retention, and legal-hold semantics or remain explicitly non-auditable.
- Accepted generation, active generation, readiness observation, availability,
  and recovery observation retain distinct identities plus causal links.
- Provider evaluation declares latency/deadline behavior and cannot block
  unrelated runtime work; watch/wait consumers own polling and total-deadline
  semantics.

## Dependencies

- EC-006 and EC-001.

## Proof and Deletion Gate

- Show accepted-but-not-active and active-but-not-ready for one owner.
- Prove unavailable -> recovered with the full result, required/advisory
  behavior, provider replacement, protected-detail denial/redaction, and one
  mixed-version comparison.
- Before depth readiness, name and delete one install/process-state readiness
  check or private host evaluator and show the replacement canonical result.
- Disprove the separate contract if activation ownership already exposes
  generation-bound readiness and recovery without projection inference or a
  new lifecycle.
