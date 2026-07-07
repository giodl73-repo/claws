# Public Feed And Profile Pages

## Goal

Expose human-readable account and publisher feed pages that match the
machine-readable account-feed facts without inventing trust labels.

## Product Behavior

- Account and publisher pages show feed entries backed by account-feed API data.
- Pages show identity, official state, restriction state, review state, scan
  state, registry inclusion, and local approval only when those facts exist.
- Pages include follow controls where the user is signed in and eligible.
- Pages include empty, restricted, suspended, revoked, and unavailable states.

## Surfaces

Suggested surfaces:

- Public account feed page.
- Public publisher feed page.
- Package or skill cards within those pages.
- State labels and explanations for official, review, scan, registry, and local
  approval facts.
- Machine-readable feed link or metadata affordance.
- Pagination and stable URLs based on immutable account or publisher identity.

## Display Rules

- Use separate labels for publisher identity, official status, review status,
  scan status, registry inclusion, local approval, and package source integrity.
- Do not show review, scan, registry, or local approval states unless ClawHub has
  explicit recorded data.
- Make restricted, suspended, and revoked pages resolvable for history without
  making the publisher look active or endorsed.
- Explain empty states in normal language.
- Avoid color-only state communication; labels need accessible text.

## Boundaries

- Public profile pages are discovery surfaces, not install authority.
- Machine-readable feed authenticity still depends on signed feed envelopes and
  OpenClaw trust configuration.
- A public page may summarize package facts, but package artifact verification
  remains with the installer and package source path.

## Acceptance Criteria

- Community publishers have useful pages even when they are not official.
- Labels are plain, distinct, and backed by recorded facts.
- Pages remain usable with keyboard and screen readers.
- URLs survive display-name changes.
- Empty, restricted, suspended, revoked, and unavailable states are clear.

## Open Questions

- Which current ClawHub routes become account versus publisher pages?
- Should public pages expose raw feed JSON links directly?
- Which state labels already exist in ClawHub and should be reused?
- How should local approval be displayed when it is deployment-specific?
