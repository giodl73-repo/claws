# Conversations, Channels, and Delivery

## Architectural Goal

Preserve a stable semantic conversation while respecting channel-native
identity, rendering, transport, delivery, and lifecycle semantics.

## Responsibilities

- Normalize inbound accounts, conversations, messages, attachments, and
  interaction context.
- Route semantic turns to sessions and agents.
- Render replies for channel constraints.
- Track drafts, sends, retries, receipts, edits, reactions, and failures.
- Correlate local transcript projections with provider-native identities.

## Explicit Non-Ownership

- A semantic turn is not the provider message.
- Transcript persistence does not own channel retention.
- Send acceptance does not necessarily mean delivery or user visibility.

## Conceptual Pieces

| Piece | Purpose | Owner expectation |
| ----- | ------- | ----------------- |
| Channel account | Provider binding and identity | Channel owner |
| Conversation identity | Thread, room, DM, or route | Provider-native mapping |
| Semantic turn | Channel-neutral interaction intent | Agent/session relationship |
| Rendered message | Channel-specific representation | Renderer and locale aware |
| Delivery attempt | One provider send try | Retry and idempotency explicit |
| Receipt | Accepted, delivered, read, failed, or unknown | Provider certainty retained |

## Core Contracts

- Provider and local identifiers remain correlated but distinct.
- Rendering is repeatable for a declared capability and locale generation.
- Retry and deduplication use channel-owner semantics.
- Deletion reports local and provider outcomes separately.

## Quality Attributes

- Multi-channel consistency without lowest-common-denominator behavior.
- Ordering, deduplication, and resumable delivery.
- Attachment safety and bounded media handling.
- Accessible and localized output.

## Candidate Fit

| Need | Existing or adjacent candidate | Initial disposition | What must be proven |
| ---- | ------------------------------ | ------------------- | ------------------- |
| Shared messaging core | Current messaging/channels | Reuse/adapt | Delivery evidence and identity |
| Channel plugins | Existing channel owners | Reuse | Capability and lifecycle declaration |
| Rendering | Current renderers/localization | Adapt | Stable semantic meaning |
| Durable delivery | Conversation delivery state | Adapt | Restart and provider reconciliation |
| Universal message object | Cross-channel abstraction | Avoid | Must not erase provider semantics |

## Cross-Lane Dependencies

- Depends on identity, sessions, agents, protocols, and localization.
- Serves end-user interaction.
- Must not absorb session continuity or provider-native state.
