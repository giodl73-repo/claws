# RFC Scope: Usage and Cost Reconciliation

- ID: EC-012
- Lane: Models, providers, and compute
- Status: Scoped draft
- Initial posture: Fork + focused RFC
- Primary owner: Provider usage owners plus run-total and budget owners; cost
  projection is a read-only consumer, not an owner.

## Scope

- Reconcile usage across run, candidate attempt, model call, provider record,
  budget, and cost projection.

## Current Owner Baseline

Current run accumulators retain failed and retried call usage, while
provider-reported billing snapshots remain separate from estimates. Current
source does not yet provide durable candidate partitions or causal delayed
reconciliation; it has aggregate run usage plus provider snapshots.

## Investment Reconciliation

- #98968 and active PR #107937 own missing plugin
  `runtime.llm.complete` usage diagnostics. Fork PR #150 is supporting evidence
  only and must not report plugin completion latency as agent-run duration.
- Merged #85882 prevents aggregate unpriced token use from appearing as
  confident zero cost.
- #90674 remains the owner decision for persisted provider-billed, estimated,
  explicitly free, unavailable, partial, and unknown cost provenance.
- #13219, #90911, and #57404 are separate usage-product and projection
  decisions, not a global accounting owner.
- Lobster #3371/#3379 provide a downstream read-only Budget plugin and UX.
  Historical notes that identify fork PRs #3/#4/#9 as live rate-card or
  attribution work are stale; those current PRs are unrelated host-provider
  changes.

## Implementation Disposition

- Preserve the current run-total accumulator.
- Derive per-candidate usage from candidate-to-model-call links.
- Require one real delayed provider record before proposing portable
  reconciliation.
- Keep tenant rate cards, budgets, allocation, chargeback, anomaly policy, and
  FinOps UX in Lobster.

## Explicit Exclusions

- One global budget manager.
- Fabricated cost when provider pricing or usage is unavailable.

## Required Outcomes

- Failed and retried calls remain counted.
- Per-candidate usage derives from EC-011 candidate-to-call links and existing
  per-call usage; the run accumulator remains the run-total owner.
- Estimates and provider-confirmed usage are distinct.
- Allocation supports partial and delayed settlement.
- Delayed provider usage rebinds through candidate-attempt and model-call
  identities, never provider/model/time-window reconstruction.
- Reconciliation is idempotent by provider-record identity plus
  candidate/model-call identity across retry and restart.
- Provider-issued, observed, and reconciled times remain distinct for delayed
  usage and cost evidence.

## Dependencies

- EC-011.

## Proof and Deletion Gate

- Reconcile fallback calls with delayed provider usage.
- Delete aggregate-only accounting and time-window reconstruction that lose
  candidate partitions.
- Disprove the separate contract if provider, candidate, run-total, and budget
  owners already reconcile delayed usage and cost causally and idempotently
  without projection-owned truth or a separate reconciliation lifecycle.
