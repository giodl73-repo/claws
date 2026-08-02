# RFC Scope: Authorized External Effects

- ID: EC-014
- Lane: Actions, tools, and integrations
- Status: Scoped draft
- Initial posture: Fork + focused RFC
- Primary owner: Tool runtime plus external effect owner

## Scope

- Correlate request, normalized intent, risk class and risk-classifier
  generation, policy, approval, invocation, idempotency/effect identity, owner
  result, and external-effect certainty.

## Explicit Exclusions

- Generic tool success as effect proof.
- Central ownership of external business state.

## Required Outcomes

- Authority survives through invocation evidence.
- Effect certainty is recorded separately from tool-runtime completion.
- Pending, partial, unknown, and reconciled effects are explicit.
- Retry follows owner-specific idempotency.
- Unknown, stale, or unverifiable risk classification blocks protected
  dispatch until reclassified.
- Evidence evolves through existing durable audit conventions rather than a
  parallel action ledger.

## Dependencies

- EC-004, EC-008, EC-013.

## Proof and Deletion Gate

- Prove one accepted effect, one unknown post-timeout effect, and one
  pre-dispatch block when policy or approval generation changed.
- Delete approval correlation loss and generic success claims.
- Disprove the separate contract if every relevant external effect is
  atomically and durably settled by the existing tool owner with no independent
  effect owner or uncertainty boundary.
