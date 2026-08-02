# RFC Scope: Diagnostic and Repair Plans

- ID: EC-002
- Lane: Experience and administration
- Status: Scoped draft
- Initial posture: Fork + focused RFC
- Primary owner: Diagnostic/Doctor facility

## Scope

- Findings, causes, consequences, repair previews, conflicts, and applied
  results across owner-native repairs.

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
