# RFC Scope: Conversation Identity

- ID: EC-015
- Lane: Conversations, channels, and delivery
- Status: Scoped draft
- Initial posture: Fork + focused RFC
- Primary owner: Messaging core and channel owners

## Scope

- Relate channel accounts, provider-native conversations, parent/child
  threads, inbound events, semantic turns, session routes, outbound messages,
  attachments, and external copies without collapsing their identities.

## Current Owner Baseline

- Channel plugins own account identity, native conversation and message
  identity, provider threading, attachment identity, rendering, and transport.
- Shared messaging core owns normalized inbound context, route projection,
  semantic turn admission, reply payloads, and shared dispatch results.
- Session continuity owns session and transcript generations under EC-017.
- A current canonical conversation reference is approximately:
  `channel + accountId + conversationId + optional parentConversationId`.
- Provider resolvers and plugin metadata remain authoritative for translating
  native targets. Shared fallback parsing is a compatibility path, not
  provider truth.

Current source explicitly prefers active plugin resolvers, preserves
parent/thread metadata, and uses bundled or generic parsing only as fallback.
The residual proof is durable resolver-source and route-generation correlation
across unlike channels, not a new provider message database.

## Contract Objects

| Object | Owner | Identity/lifetime |
| --- | --- | --- |
| Channel account | Channel plugin | Stable account binding for one activated provider runtime |
| Native conversation | Channel plugin/provider | Provider conversation ID under one account |
| Native child thread | Channel plugin/provider | Child conversation ID plus explicit parent conversation ID |
| Native inbound event/message | Channel plugin/provider | Provider event/message ID and provider chronology |
| Conversation reference | Shared relationship over channel facts | Channel, account, conversation, and optional parent IDs |
| Route resolution | Messaging core using channel resolver | One resolution result with source and route generation |
| Semantic turn | Agent/reply core | One admitted turn; not the provider message |
| Session route | Session/routing owner | Session key and route generation selected for the turn |
| Outbound provider copy | Channel/provider | Provider message IDs correlated through EC-016 receipts |
| Attachment copy | Attachment/channel owner | Owner-native identity plus explicit source/copy relationship |

Display labels, formatted targets, and the currently selected route are
projections. They are never stable identity.

## State and Relationship Model

```text
native event observed
  -> normalized with provider identity
  -> conversation resolved
  -> route selected
  -> admitted semantic turn
  -> optional outbound provider copy

conversation:
  current | moved/renamed | child-thread-created | unavailable | deleted

route:
  unresolved | resolved | changed | stale | unsupported
```

A route change creates a new route resolution. It does not rewrite the
provider conversation, prior turns, or transcript history. A provider thread
fork creates a parent/child conversation relationship; it is not an EC-017
transcript branch.

## Explicit Exclusions

- One universal provider message object.
- Session transcript as channel-native canonical state.
- Transcript branch and generation state, owned by EC-017.
- Provider-specific target parsing, retention, thread semantics, or message
  mutation.
- Treating a display label, formatted address, or latest session route as
  authoritative identity.

## Required Outcomes

- Provider and local identities remain distinct and correlated.
- Every admitted turn records the conversation reference and route resolution
  actually used, including resolver source and relevant route generation.
- Route changes preserve prior provenance rather than retroactively moving
  earlier messages or turns.
- A durably accepted outbound delivery freezes the normalized provider target
  and route resolution used at acceptance. Restart or a later route change
  does not retarget that operation; changed destination requires new intent.
- Provider thread forks preserve parent/child identity without modifying
  session transcript branches.
- Unsupported, rejected, stale, and ambiguous conversation resolution remain
  explicit; fallback parsing never silently overrides a provider rejection.
- Outbound messages and attachments create explicit provider/external copies
  with separate lifecycle obligations.
- Visibility-filtered quote, forward, thread, and attachment context does not
  disclose provider-private data merely because identities correlate.

## Compatibility and Migration

- Channel-native resolvers and declared metadata are preferred over shared
  parsing.
- Legacy parser-only routes may coexist during migration, but each resolution
  records whether it came from the provider resolver or compatibility
  fallback.
- Unknown required conversation fields fail resolution rather than being
  reconstructed from labels.
- Older channels may expose only a top-level conversation reference. Parent
  and thread fields remain optional and versioned.
- Migration ends when route/session code no longer infers canonical identity
  from display labels or current delivery targets.

## Dependencies

- Principal/account identity, session identity, and EC-017.

## Proof and Deletion Gate

- Round-trip one threaded conversation across a session reset and route
  change, preserving native parent/child IDs and the original route
  provenance.
- Queue one outbound delivery, change the current route, restart, and prove
  the accepted operation still uses its frozen conversation target and route
  generation.
- Create one outbound provider copy and one attachment copy, then report their
  lifecycle separately from the local session.
- Reject one provider-invalid target without falling through to label or
  parser inference.
- Delete identity inference from display labels and current route.
- Disprove the separate contract if messaging/channel owners already preserve
  stable provider/local correlation, thread forks, route changes, and copy
  boundaries without display-label inference.
