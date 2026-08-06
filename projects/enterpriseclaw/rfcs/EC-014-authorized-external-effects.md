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

## Current Owner Baseline

Current tool and message paths separate pre-dispatch gating, owner-specific
idempotency, and redaction-safe blocked or unknown audit outcomes. Generic
tool completion is not sufficient effect proof. Durable approval-to-effect
correlation and a portable effect-certainty record remain target semantics.

Open issue #113440 already owns the missing generic check for a final resolved
nested operation immediately before effect. The current protected-effect
simulation proves the composition shape without real I/O. Any further
upstream delta should therefore extend that owner seam or existing trusted
diagnostics; it should not create another pre-effect hook or action ledger.

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
