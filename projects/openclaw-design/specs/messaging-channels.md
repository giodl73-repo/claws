# Messaging and Channels Facilities

## Boundary

Messaging core owns the semantic inbound event, route/session projection,
agent-facing turn, reply payload, and durable final-delivery result.

Channel plugins own native accounts, event normalization, conversation/thread
semantics, provider rendering, transport, retries, receipts, and ephemeral UX
signals.

## Three Contracts

### Messaging core

- normalized inbound context;
- canonical session route;
- semantic turn;
- reply payload/batch;
- final visible-delivery result.

### Channel projection

- native quotes, forwards, threads, and attachments;
- localization and formatting;
- drafts, previews, reactions, composing, and read state.

### Channel runtime and transport

- account activation/login and health;
- native send and retry;
- provider acknowledgement/receipt;
- disconnect, reload, and recovery.

## Open Gaps

- Minimal shared final-delivery result and partial failure vocabulary.
- Consistent route/session-key derivation boundary.
- Clear distinction among native message ID, semantic turn, delivery attempt,
  and receipt.
- Extraction of delivery lifecycle from large channel dispatch modules without
  flattening provider semantics.

Source audit: `../source-audit-messaging-channels-2026-08-01.md`.
