# Following Inbox And Personal Feed Projections

## Product Direction

Ship the signed-in ClawHub experience as a private following inbox first. Keep a
chronological personal `Following` feed as a second projection over the same
publisher activity data so ClawHub can expose a Facebook-, Instagram-, or
X-like surface later if usage supports it.

This does not add user-authored posts, reactions, or ranked recommendations.
Publisher release activity remains the content.

## Shared Activity Substrate

Store immutable, granular events for each affected skill, plugin, or claw. Each
event should carry:

- a stable event id and publisher/account id
- artifact identity, version, event type, and event time
- a stable publication batch id when several artifacts came from one release,
  repository revision, import, or publish job
- source and moderation facts needed to hydrate the event safely
- a monotonic sort key suitable for cursor pagination and replay

Do not discard the per-artifact events when the presentation is coalesced. They
remain the audit, expansion, dedupe, replay, and future-query source.

## Projection 1: Following Inbox

The first product surface is an account-scoped, private inbox:

- Group events by publisher and publication batch.
- Render one card such as "Patrick published 50 skill updates" with a short
  preview and an expandable list of the exact changes.
- Track unread or seen state on the projected group or a per-user cursor rather
  than creating 50 unread rows for one release.
- Support mark read/done, mute, and unfollow without changing trust or install
  state.
- Keep security, suspension, and revocation events able to break out of normal
  release grouping when urgency requires it.
- Explain why the user received each group: for example, "You follow Patrick."

The initial delivery is pull-based and in-app. Email, push, webhooks, and
synchronous publish-time fanout are later choices.

## Projection 2: Personal Following Feed

The optional personal feed reads the same projected activity groups and cursors:

- Show groups in chronological order initially.
- Reuse publisher mute, follow, visibility, moderation, and hydration rules.
- Allow richer cards and continuous browsing without changing the underlying
  event or batch contract.
- Keep ranking, recommendations, author-authored messages, reactions, and
  comments outside the first contract.

The API should use neutral `activity` or `following activity` vocabulary. Inbox
and feed are views, not separate event types or stores.

## Coalescing Contract

Prefer an explicit publication batch id produced by the bulk publish/import job.
A repository commit or source revision can be the deterministic batch source.
Avoid relying only on time windows: they can merge unrelated releases or split
one large release.

For legacy events without a batch id, use a conservative deterministic fallback
that never hides individual changes. The UI may summarize nearby events from one
publisher, but the API must preserve their separate identities.

## Product Boundaries

- Following is private by default and never grants trust, approval, install, or
  update authority.
- This ClawHub following inbox is publisher/account discovery activity.
- OpenClaw's local Updates experience remains the actionable view for installed
  or explicitly watched artifacts.
- A ClawHub personal library/feed remains an artifact distribution concept; it
  should not be overloaded with social activity state.

## First Implementation Slice

Build on the follow graph and current publisher activity timeline work:

1. Add stable publication-batch identity to granular publisher activity.
2. Return grouped, cursor-paginated following activity for the signed-in user.
3. Add a private inbox UI with a seen-through cursor, expansion, mute, and
   unfollow controls.
4. Prove a 50-skill bulk release plus one unrelated plugin release renders as
   two groups, while expansion exposes all 51 exact events.
5. Keep the response presentation-neutral enough for a later chronological
   `Following` view to consume unchanged.

## Decision Gate For The Personal Feed

Add the separate `Following` feed surface when inbox usage shows that people
return to browse publisher activity, or when publishers can add meaningful
release context. If users primarily triage and dismiss updates, keep the inbox
as the primary navigation and avoid prematurely adding social mechanics.

## Implementation Status (2026-07-28)

- ClawHub #2958 implements the shared granular events, stable publication
  batches, coalesced groups, bounded previews/expansion, and explicit
  `following` versus `inbox` projections.
- ClawHub #3293 implements the first private Inbox surface with a monotonic
  seen-through frontier, mark-all-read, expansion, mute/unmute, and unfollow.
- Muting removes a publisher from Inbox delivery without removing the follow;
  the `following` projection therefore remains ready for the later personal
  feed.
- The chronological Following page, ranking, authored messages, reactions, and
  comments remain intentionally unimplemented.
