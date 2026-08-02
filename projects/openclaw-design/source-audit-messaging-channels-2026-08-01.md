# Messaging and Channels Source Audit - 2026-08-01

## Source Baseline

- Worktree: `C:\src\openclaw-design-audit`
- Head: `bde1602e6e86fd91dd0bec3aae714e059e556c4d`
- Representative channels: Telegram and WhatsApp

## Current Architecture

```text
channel-owned account/runtime
        |
        v
native inbound normalization
        |
        v
shared inbound event context + session routing
        |
        v
shared agent/reply turn
        |
        v
shared reply plan / durable dispatch bridge
        |
        v
channel-owned rendering, send, retry, receipt, reactions, drafts
```

The current design is already a two-layer architecture:

1. shared semantic turn/session/reply contracts; and
2. channel-owned native projection and transport.

The main weakness is that final delivery visibility, partial failure, receipt
synthesis, and transcript mirroring are still repeated in channel modules.

## Shared Core

- Shared inbound context produces `BodyForAgent`, `BodyForCommands`,
  `SessionKey`, and visibility-filtered supplemental context:
  `src/channels/inbound-event/context.ts:182-516`.
- Shared session recording canonicalizes and persists delivery/session metadata:
  `src/channels/session.ts:9-71`.
- Shared reply dispatch:
  `src/auto-reply/reply/dispatch-from-config.ts:22-94` and
  `dispatch-from-config.execute.ts:26-593`.
- Shared durable final-delivery bridge:
  `src/channels/turn/durable-delivery.ts:20-247` and
  `src/channels/message/inbound-reply-dispatch.ts:129-270`.
- Dispatch-result helpers treat visibility as projection over counts and
  signals: `src/channels/turn/dispatch-result.ts:29-68`.

## Channel Ownership

Telegram owns native message/thread context, previews/drafts, delivery retries,
status reactions, and Telegram transcript mirroring:

- `extensions/telegram/src/bot-message-context.body.ts:145-422`
- `extensions/telegram/src/bot-message-context.session.ts:456-820`
- `extensions/telegram/src/bot-message-dispatch-draft.ts:101-537`
- `extensions/telegram/src/bot-message-dispatch-delivery.ts:160-556`
- `extensions/telegram/src/bot-message-dispatch-reply.ts:61-497`

WhatsApp owns echo/content filtering, native identity, media/text chunking,
send retry, receipt synthesis, read receipts, and durable inbound persistence:

- `extensions/whatsapp/src/inbound/message-normalization.ts:27-135`
- `extensions/whatsapp/src/auto-reply/monitor/inbound-dispatch.ts:455-578`
- `extensions/whatsapp/src/auto-reply/deliver-reply.ts:81-386`
- `extensions/whatsapp/src/inbound/message-delivery.ts:108-609`

## Objects and Lifetimes

| Object | Owner | Lifetime |
| ------ | ----- | -------- |
| Channel account/runtime | Channel plugin | From activation/login until stop, reload, or credential loss. |
| Native inbound message | Channel | Native provider message/event identity. |
| Conversation/thread | Channel plus routing grammar | Native conversation lifetime projected into an OpenClaw session key. |
| Inbound event context | Shared channel core | One normalized admitted event. |
| Semantic turn | Agent/reply core | One admitted user/system turn. |
| Reply payload/batch | Shared reply core | One planned response projection before transport. |
| Delivery attempt | Channel transport | One native send/retry operation; no single cross-channel durable ID was found. |
| Receipt/acknowledgement | Channel | Provider-specific acceptance, read, or synthetic send result. |
| Draft/preview/reaction | Channel projection | Ephemeral user-experience signal, not canonical message state. |

## Covered Well

- Channel plugins retain account, native API, rendering, and transport
  ownership.
- Shared core owns semantic inbound context, session recording, reply planning,
  and durable final dispatch.
- Supplemental quote/forward/thread context is visibility-filtered.
- Telegram and WhatsApp both test retries, media/text behavior, transcript or
  durable persistence, and status/receipt projections.
- Localization and reactions do not become message semantic owners.

## Weak or Duplicated

- Route/session-key synthesis remains partly channel-owned and partly shared.
- Final visible-delivery accounting and partial errors are repeated.
- Receipt synthesis has no common semantic vocabulary beyond transport results.
- Draft/preview finalization and transcript mirroring are tightly coupled to
  delivery code.
- Large channel dispatch modules combine admission, routing, persistence,
  projection, retry, and signal behavior.
- There is no portfolio-level distinction among native message identity,
  semantic turn identity, delivery attempt identity, and acknowledgement.

## Separation Decision

Create three design contracts:

1. **Messaging core**: semantic inbound event, session route, turn, reply
   payload, durable final result.
2. **Channel projection**: native normalization, quote/media rendering,
   localization, drafts, reactions, composing/read state.
3. **Channel runtime and transport**: account activation, health, send/retry,
   provider receipt, disconnect, and recovery.

Channels must continue to own provider-native semantics. Shared core should
standardize only the facts required for routing, execution, and final delivery
evidence.

## Revised Rubric

| Dimension | Score |
| --------- | ----- |
| Ownership | 3 |
| Object model | 3 |
| Contract completeness | 2 |
| Separation/cohesion | 2 |
| Evidence | 3 |
| Evolution/operations | 3 |

**Total: 16/24 (C), medium-high confidence.**
