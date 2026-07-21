# Client-Side Feed Watches And Updates

## Thesis

OpenClaw should let a user watch a stable feed item and learn when verified feed
state materially changes without requiring ClawHub to host an account inbox.
The client already refreshes signed feeds, so local watch state is the smallest
complete product and keeps installed inventory and interests private by default.

Notifications remain hints about accepted signed state. They never authorize or
perform an install, update, enable, approval, or removal.

## Current Foundation

- OpenClaw verifies DSSE feed envelopes and persists trusted snapshots.
- The feed distribution contract includes signed queries, changed-since pages,
  reset recovery, and sharded snapshots.
- OpenClaw has local durable state and installed plugin and skill identities.
- ClawHub publisher follows and timelines remain broad social discovery, not
  per-publication alerts.
- Draft ClawHub PR
  [#3171](https://github.com/openclaw/clawhub/pull/3171) proves a server-hosted
  watch and inbox model, but is parked for a future cross-device phase.

## V1 Contract

- Watch identity includes the configured feed/profile, representation class,
  item type, and stable item id; mutable titles and handles are not identities.
- OpenClaw stores the last accepted sequence or snapshot digest and bounded local
  update history with read, dismiss, mute, and coalescing state.
- A watch is evaluated only after the signed change range or snapshot is
  verified and accepted atomically.
- Initial baseline state produces no alerts. After an offline period, the next
  verified refresh catches up without replaying the full catalog as new.
- Material reasons are `updated`, `removed`, `blocked`, and
  `security-state-changed`; cosmetic metadata churn is coalesced or omitted.
- Local delivery may use Control UI, CLI, or configured OpenClaw surfaces, but
  the durable source is the local update history.
- Installed-item watches are local and opt-in. No installed inventory or watch
  history is sent to ClawHub in V1.
- Every update action uses the existing artifact integrity, trust, install, and
  policy paths.

## Active PR Plan

### PR 1 - OpenClaw Local Watch Vertical

Draft implementation:
[openclaw/openclaw#110438](https://github.com/openclaw/openclaw/pull/110438)
at `992794ad3cf`.

- Add a local SQLite-backed watch and update-history store.
- Add watch, unwatch, list, updates, read, dismiss, and mute service operations.
- Process accepted signed changes and reset snapshots into idempotent local
  update records.
- Support explicit plugin watches against accepted signed feeds first; retain
  generic item-kind storage for skills once a signed skill-feed producer exists.
- Expose bounded CLI commands and machine-readable output.

Implemented proof includes additive schema v4 migration, baseline suppression,
material update classification, mute/read/dismiss idempotency, bounded history,
unsigned-intermediate continuity, stable JSON comparison, and feed ID plus URL
source isolation. The final Codex review found no discrete correctness issues.

Remaining PR 1 proof before ready-for-review: exercise the commands against a
real configured signed feed and confirm restart durability from the packaged
CLI. Automatic GitHub CI owns broad validation.

### PR 2 - Control UI Product Surface

- Add Watch/Unwatch on feed entries and installed-item detail surfaces.
- Add a bounded updates view with unread count, reason, provenance, read,
  dismiss, and mute controls.
- Link each update to inspect and the normal update/install flow.

Proof: desktop and mobile browser flows with no layout shift or alert storm.

### PR 3 - Optional Local Delivery

- Deliver a coalesced wake-up through configured local OpenClaw surfaces.
- Keep delivery non-blocking and subordinate to the durable local update store.
- Add per-surface opt-in and bounded retry behavior.

Proof: delivery failure cannot block refresh, gateway startup, messages, or tool
execution; duplicate hints resolve to one local update.

## Parked Server Track

ClawHub [#3171](https://github.com/openclaw/clawhub/pull/3171) remains a draft
prototype, not a current merge dependency or review request. Revisit hosted
watch synchronization and an account inbox only when cross-device or offline
delivery demand justifies the additional account data, ACL, retention, fanout,
abuse, and privacy surface.

If revived, hosted delivery must reference verifiable signed feed state, keep
watch/read/mute data private, require explicit consent before synchronizing
installed inventory, and remain optional for feed operators and clients.

## Deferred

- Server-hosted watch synchronization and cross-device read state.
- ClawHub push, email, webhook, or channel fanout.
- Automatic updates.
- Public watch lists or installed inventory.
- Per-publication alerts for publisher follows.

## Deletion Gate

The V1 slice succeeds when a user no longer needs to manually refresh and
compare a catalog to learn that a watched item changed, while OpenClaw sends no
inventory to ClawHub and a notification alone remains insufficient to mutate
installed content.
