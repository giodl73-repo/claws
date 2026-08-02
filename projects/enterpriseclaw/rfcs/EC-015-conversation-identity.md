# RFC Scope: Conversation Identity

- ID: EC-015
- Lane: Conversations, channels, and delivery
- Status: Scoped draft
- Initial posture: Fork + focused RFC
- Primary owner: Messaging core and channel owners

## Scope

- Relate accounts, provider conversations, semantic turns, session routes,
  messages, threads, and attachments.

## Explicit Exclusions

- One universal provider message object.
- Session transcript as channel-native canonical state.
- Transcript branch and generation state, owned by EC-017.

## Required Outcomes

- Provider and local identities remain distinct and correlated.
- Route changes and provider thread forks preserve provenance without
  modifying session transcript branches.
- External copies remain explicit lifecycle boundaries.

## Dependencies

- Principal and session identity.

## Proof and Deletion Gate

- Round-trip one threaded conversation across a session reset.
- Delete identity inference from display labels and current route.
- Disprove the separate contract if messaging/channel owners already preserve
  stable provider/local correlation, thread forks, route changes, and copy
  boundaries without display-label inference.
