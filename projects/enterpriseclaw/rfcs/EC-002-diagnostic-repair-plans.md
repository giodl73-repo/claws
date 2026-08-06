# RFC Scope: Diagnostic and Repair Plans

- ID: EC-002
- Lane: Experience and administration
- Status: Scoped draft
- Initial posture: Fork + focused RFC
- Primary owner: Diagnostic/Doctor facility

## Scope

- Findings, causes, consequences, repair previews, conflicts, and applied
  results across owner-native repairs.

## Current Owner Baseline

Current Doctor repair flows already produce structured per-check findings,
support dry-run preview, apply returned owner repairs, and validate after
repair. Unsafe or failed repairs remain visible instead of being projected as
successful. The missing target is durable repair-plan identity, preview/apply
correlation, and rollback settlement, not basic repair classification.

## Explicit Exclusions

- A central mutation engine.
- Silent automatic repair of high-risk state.
- Checkpoint/state restore and rollback implementation, owned by EC-021.

## Required Outcomes

- A repair plan has stable plan identity reused for preview/apply correlation;
  preview and apply remain separate operations with distinct operation/attempt
  identities and settlements.
- Partial, blocked, superseded, and rolled-back repairs are visible.
- Owners retain validation and mutation.
- Apply requests bind normalized repair intent, risk-classifier generation,
  approval/authority reference, and expected owner generations; material plan
  changes produce new intent and require reauthorization.
- Repairs that require restore consume EC-021 instead of reimplementing it.
- Applied repairs emit durable, idempotent evidence through EC-033 rather than
  a bespoke repair ledger.
- Existing repair paths remain read-compatible during migration and are
  deleted after plan-identity repairs are authoritative.

## Dependencies

- EC-001, EC-004, EC-021, EC-033, and owner generation contracts.

## Proof and Deletion Gate

- Compose two owner repairs with one conflict and one evidenced rollback.
- Delete bespoke repair output and hidden mutation sequences.
- Disprove the separate contract if owner-native diagnostics already compose
  preview/apply identity, bounded authority, conflicts, rollback, and durable
  settlement without a central repair lifecycle.

## Implementation Package Reconciliation

- Preserve Doctor as the diagnostic/repair facility and owner callbacks as the
  mutation boundary.
- Adopt #99255 for bounded config-write preview and #84472 for selective
  truthful dry-run reports; do not create another preview substrate.
- Add stable plan identity only after a two-owner fixture proves conflict,
  supersession, expected-generation, authority, partial, validation, and
  rollback-reference gaps.
- Consume EC-021 for restore and EC-033 for durable evidence rather than
  building Doctor-specific backup or audit stores.
- Keep Lobster repair orchestration downstream and delete ordering/text joins
  after stable plan/operation identities are authoritative.
