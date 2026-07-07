# Claim And Official State

## Goal

Define how a ClawHub account is claimed, verified, marked official, and revoked
without conflating ClawHub identity with OpenClaw registry approval.

## Product Behavior

- Users can claim a ClawHub account or publisher identity.
- ClawHub can show verification state for claimed identities.
- ClawHub can show official state for publishers that meet ClawHub criteria.
- Revocation removes or downgrades official state in future feed snapshots.

## State Model

Suggested states:

- `unclaimed`
- `claimPending`
- `claimed`
- `verified`
- `official`
- `suspended`
- `revoked`

## Boundaries

- `official` means official in ClawHub only.
- `official` does not mean OpenClaw reviewed, OpenClaw scanned, locally
  approved, or safe to install.
- Revoked or suspended publishers should remain resolvable for audit history.

## UX Requirements

- Show claim and official status on profile/feed surfaces.
- Show clear copy that registry inclusion and local approval are separate.
- Preserve historical provenance when official status changes.

## Role Review Requirements

- Record an audit event for every claim request, claim approval, verification,
  official-state grant, suspension, revocation, and reinstatement.
- Preserve actor, timestamp, reason, prior state, new state, proof type, and
  affected account/publisher ids for compliance review.
- Define who can perform each transition before implementation; official and
  revocation paths should not be ordinary self-service toggles.
- Keep `claimed`, `verified`, and `official` visibly distinct. A user should not
  read "official" as "OpenClaw scanned" or "safe to install".
- Do not require official status for ordinary community publishing; official
  status is a stronger signal for selected publishers, not the baseline path.

## Open Questions

- What proof is required to claim an account?
- Who can grant official status?
- Does official state apply to accounts, publishers, packages, or all three?
- What appeal or correction path exists after suspension or revocation?
