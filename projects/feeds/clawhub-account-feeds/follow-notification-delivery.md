# Follow Notification Delivery

## Goal

Deliver useful notifications for followed publisher activity while giving users
control over noise and preserving auditability.

## Product Behavior

- ClawHub emits notification events when followed publishers publish or update
  skills and plugins.
- The first signed-in surface is a private, in-app following inbox. A future
  chronological personal feed is a second projection over the same activity
  events and publication groups, not a separate store.
- Users can choose notification preferences for followed publishers.
- Users can mute, unsubscribe, or disable notification classes.
- Missed events can be replayed or backfilled from bounded event history.
- Notification settings are reversible without unfollowing the publisher.

## Event Sources

Suggested event sources:

- Publisher feed publication.
- Feed entry added.
- Feed entry updated.
- Publisher suspended, restored, or revoked, if ClawHub already emits that
  state.

## Delivery Rules

- Coalesce high-frequency publisher updates by stable publication batch while
  preserving the granular per-artifact events for expansion, audit, and replay.
- Rate-limit fanout for spam or compromised publishers.
- Avoid sending install-like calls to action.
- Link notifications to review/profile surfaces.
- Preserve enough event identity for dedupe and replay.
- Include a clear reason for each notification.

## Boundaries

- Notifications do not imply approval, review, scan completion, local approval,
  or install eligibility.
- Notification delivery failure should not block publishing.
- Notification fanout should not expose private follow lists unless the user has
  opted into a public social surface.

## Acceptance Criteria

- Notifications are useful but not spammy.
- Users can mute or unsubscribe without unfollowing.
- Publishers can understand which updates notify followers.
- Delivery is deduped, rate-limited, and observable.
- Notification copy identifies the publisher and action in plain language.

## Open Questions

- How much event history should ClawHub retain for replay/backfill?
- Should users choose per-publisher preferences or global defaults first?
- What abuse threshold should pause notification fanout for a publisher?
