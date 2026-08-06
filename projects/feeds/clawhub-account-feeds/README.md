# ClawHub Account Feed Design Pack

Working designs for the ClawHub product-side account feed stack. These drafts
stay in `claws-hapi` until they are ready to promote into the ClawHub repo as
formal design docs or implementation PRs.

## Current Implementation Series

| Order | PR                                                             | Current role                                                                                      |
| ----- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1     | [ClawHub #2948](https://github.com/openclaw/clawhub/pull/2948) | Publisher identity and bounded publisher artifact-feed snapshots.                                 |
| 2     | [ClawHub #2950](https://github.com/openclaw/clawhub/pull/2950) | Private authenticated publisher follow graph and reversible delivery preference.                  |
| 3     | [ClawHub #2958](https://github.com/openclaw/clawhub/pull/2958) | Coalesced, presentation-neutral publisher activity with separate Following and Inbox projections. |
| 4     | [ClawHub #3293](https://github.com/openclaw/clawhub/pull/3293) | Draft private Inbox UI, seen-through state, expansion, mute/unmute, and unfollow.                 |

The future chronological Following page is intentionally not another backend
slice. It can render #2958's `following` projection after the inbox-first UX is
validated. The publisher-state draft [#2949](https://github.com/openclaw/clawhub/pull/2949)
is orthogonal to this dependency chain. The item-watch prototype #3171 remains
parked for OpenClaw-local installed/watched update semantics.

## Proposed PR Stack

| Order | Design                                                                               | Implementation intent                                                                                                           |
| ----- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| 1     | [Account feed model and API](account-feed-model-api.md)                              | Stable account and publisher identity, account feed URLs, feed shape, and envelope expectations.                                |
| 2     | [Claim and official state](claim-official-state.md)                                  | Account claiming, verification state, official state, revocation, and display boundaries.                                       |
| 3     | [Follow graph and notifications](follow-graph-notifications.md)                      | Follow/unfollow behavior, notification events, privacy, rate limits, and feed update triggers.                                  |
| 4     | [Profile and discovery surfaces](profile-discovery-surfaces.md)                      | Public profile pages, account feed pages, search filters, and "people I follow" discovery.                                      |
| 5     | [Registry and scan bridge](registry-scan-bridge.md)                                  | Export into OpenClaw review lanes while preserving scans, approval, provenance, and trust separation.                           |
| 6     | [Follow controls and followed discovery](follow-controls-discovery.md)               | User-facing follow/unfollow controls, followed-publisher lists, and explainable discovery filters.                              |
| 7     | [Follow notification delivery](follow-notification-delivery.md)                      | Notification fanout, preferences, mute/unsubscribe controls, replay, backfill, and audit behavior.                              |
| 8     | [Public feed and profile pages](public-feed-profile-pages.md)                        | Human-readable account/publisher feed pages backed by account-feed facts and explicit state labels.                             |
| 9     | [Registry submission workflow](registry-submission-workflow.md)                      | Idempotent queue, retry, withdrawal, and resubmission flow for downstream registry review and scans.                            |
| 10    | [Reflected registry and scan state](reflected-registry-scan-state.md)                | Persist and display downstream review, scan, inclusion, local approval, and status history facts.                               |
| 11    | [Following inbox and personal feed projections](following-inbox-feed-projections.md) | Ship a coalesced private inbox first while preserving a chronological personal Following view over the same activity substrate. |

## Cross-Cutting Boundaries

- A ClawHub account feed can be trusted as ClawHub-authored only after feed
  envelope verification.
- A publisher identity is not the same thing as official status.
- Official status in ClawHub is not OpenClaw registry inclusion.
- Following a publisher is a discovery and notification signal, not an install
  or trust grant.
- OpenClaw registry inclusion still requires review and scans.
- Package artifact integrity remains separate from feed/source authenticity.

## Role Review Summary

- Founder/community: account feeds should make community publishers easier to
  discover without making unofficial publishing feel second class.
- Skill author/new hire: becoming claimable or followable should be a short,
  obvious ClawHub workflow; official status can require more review, but normal
  publishing should stay lightweight.
- CISO/compliance: every claim, official-state change, feed signing key change,
  export, scan result, and revocation needs an audit event with actor, time,
  reason, prior state, new state, and feed revision.
- UX: badges and filters must explain what they mean in plain language. "Follow",
  "verified", "official", "OpenClaw reviewed", and "locally approved" are
  separate signals.
- Platform: APIs and events need stable ids, pagination, sequence numbers,
  idempotency, replay/backfill behavior, rate limits, and clear failure modes.
