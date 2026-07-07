# Follow Graph And Notifications

## Goal

Define following and notification behavior for account feeds without turning a
follow into a trust or install grant.

## Product Behavior

- Users can follow and unfollow ClawHub accounts or publishers.
- Followed publishers can appear in search and discovery filters.
- Users can opt into notifications when followed publishers publish or update
  entries.

## Events

Suggested event types:

- `publisher.feed.published`
- `publisher.feed.entry.added`
- `publisher.feed.entry.updated`
- `publisher.feed.entry.removed`
- `publisher.official_state.changed`

## Boundaries

- Following is a discovery and notification signal only.
- Following does not imply official status.
- Following does not bypass ClawHub scans, OpenClaw review, local policy, or
  package integrity checks.
- Follow notifications should link to profile/feed surfaces, not auto-install.

## Privacy And Abuse Controls

- Private follow lists should be the default unless ClawHub already exposes a
  social graph.
- Notification fanout should be rate limited.
- Publisher rename or ownership changes should not silently transfer follow
  trust to an unrelated identity.

## Role Review Requirements

- Make follow/unfollow idempotent so retries do not duplicate rows or emit
  confusing notification state.
- Preserve follows by stable publisher id, not display name or profile URL.
- Provide replay/backfill semantics for clients that miss notification events.
- Add abuse controls for spam publishers, mass rename churn, high-frequency
  updates, and compromised official accounts.
- Notification copy should send users to review surfaces; it should never imply
  install, approval, or safety.

## Open Questions

- Are follows account-scoped, publisher-scoped, or both?
- Should follow lists be public, private, or user-configurable?
- Which channels receive notifications first?
- Should users be notified when a followed publisher is suspended or revoked?
