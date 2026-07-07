# Profile And Discovery Surfaces

## Goal

Define the ClawHub pages and discovery filters that make account feeds usable
for normal users.

## Product Behavior

- Each account or publisher has a public profile surface.
- Profiles show published feed entries, verification status, official state,
  and follow controls.
- Search supports filters such as "people I follow" and "official publishers".
- Feed pages expose the machine-readable feed and the human-readable profile.

## Surfaces

Suggested surfaces:

- account profile page
- publisher profile page
- account feed page
- publisher feed page
- search filter for followed publishers
- search filter for official publishers

## Display Rules

- Show publisher identity and official state separately.
- Show package/source provenance separately from publisher identity.
- Show scan/review state only when ClawHub actually has that state.
- Avoid implying OpenClaw registry inclusion unless that bridge has approved
  the entry.

## Role Review Requirements

- Use separate labels for "claimed", "verified", "official", "OpenClaw
  reviewed", and "locally approved"; do not collapse them into one trust badge.
- Explain empty or filtered states in normal user language, especially for
  "people I follow" and official-publisher search filters.
- Make suspended and revoked publishers resolvable for history, but prevent the
  profile from looking active or endorsed.
- Keep unofficial/community results discoverable unless the user explicitly
  filters to official or reviewed publishers.
- Show source, package digest, scan/review status, and registry status only when
  ClawHub has real data for that field.

## Open Questions

- Does ClawHub already have account profile pages to extend?
- Should account feeds appear in global search by default?
- What is the first user-facing noun: account feed, publisher feed, or creator
  feed?
- Which labels and icons already exist in ClawHub for identity and review state?
