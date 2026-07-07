# Follow Controls And Followed Discovery

## Goal

Turn the follow graph foundation into user-facing controls and discovery filters
without making following look like approval or trust.

## Product Behavior

- Publisher and account surfaces show follow and unfollow controls.
- Users can view the publishers they follow.
- Search can filter to followed publishers.
- Discovery can show "new from followed publishers" or equivalent result sets.
- Discovery results explain why an entry appears.
- Follow lists default to private unless ClawHub explicitly ships a public
  social graph.

## Surfaces

Suggested surfaces:

- Follow button on publisher and account profiles.
- Followed publishers list in the signed-in user's account area.
- Search filter for followed publishers.
- Discovery module for recent entries from followed publishers.
- Empty states for users who follow nobody or whose followed publishers have no
  matching entries.

## Boundaries

- Following is still a discovery signal only.
- Following does not imply official status, registry inclusion, scan approval,
  local approval, install eligibility, or package safety.
- Follow state should be keyed by stable publisher or account ids, not display
  names, slugs, or profile URLs.
- Rename, ownership transfer, suspension, and revocation must preserve the stable
  followed identity.

## Acceptance Criteria

- Unofficial publishers remain discoverable unless the user chooses a narrower
  filter.
- Follow and unfollow are obvious, reversible, and idempotent.
- Followed-publisher results explain why they are present.
- Follow controls have clear loading and error states.
- Follow changes create basic audit events.

## Open Questions

- Should follows attach to accounts, publishers, or both in the first UI slice?
- Where should the followed-publishers list live in the current ClawHub IA?
- Should suspended or revoked publishers remain visible in the follow list for
  history?
- Which existing ClawHub components should own the follow control styling?
