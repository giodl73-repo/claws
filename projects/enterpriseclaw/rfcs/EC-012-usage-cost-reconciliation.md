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
