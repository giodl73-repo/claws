---
name: extension-pattern-channel
description: The channel extension pattern — telegram as canonical exemplar; bundled-channel entry contract, manifest fields, polling vs webhook, inbound/outbound flows, ACP binding, credentials
type: skunkworks-spec
applies_to: openclaw-core
source_version: HEAD 5e8cc1d9c (audit baseline)
authored: 2026-04-28
---

# Extension pattern — channel plugins

## Why telegram is the exemplar

`AGENTS.md:7` cites telegram as the reference channel. Polling-based,
long-message-threaded, group-topics-aware, ACP-binding-aware. Pattern
transfers to discord, slack, msteams, irc, matrix, imessage, line,
googlechat, mattermost, nextcloud-talk, bluebubbles, bonjour.

## Plugin entry — bundled channel contract

Channel plugins do **not** call `api.registerChannel()` directly. They
export a *bundled-channel entry* via `defineBundledChannelEntry()` which
the SDK resolves into the registration. This decouples plugin discovery
(manifest) from feature registration (runtime).

`extensions/telegram/index.ts`:

```ts
export default defineBundledChannelEntry({
  id: "telegram",
  name: "Telegram",
  importMetaUrl: import.meta.url,
  plugin: { specifier: "./channel-plugin-api.js", exportName: "telegramPlugin" },
  secrets: { specifier: "./secret-contract-api.js", exportName: "channelSecrets" },
  runtime: { specifier: "./runtime-setter-api.js", exportName: "setTelegramRuntime" },
  accountInspect: { specifier: "./account-inspect-api.js", exportName: "inspectTelegramReadOnlyAccount" },
});
```

The five contract slots:

| Slot | What it is |
|---|---|
| `plugin` | The core channel contract implementation (`telegramPlugin`). |
| `runtime` | Late-loaded runtime setup. |
| `secrets` | Credential resolution. |
| `accountInspect` | Account health probe + capability enumeration. |
| `registerFull(api)` (optional) | Subagent / extra feature registration. |

## Manifest fields

Channels split metadata between `openclaw.plugin.json` (static
discovery) and `package.json` (`openclaw.channel` block, runtime UI).

### `openclaw.plugin.json`

```jsonc
{
  "id": "telegram",
  "channels": ["telegram"],
  "channelEnvVars": { "telegram": ["TELEGRAM_BOT_TOKEN"] }
}
```

### `package.json` `openclaw.channel`

```jsonc
{
  "channel": {
    "id": "telegram",
    "label": "Telegram",
    "selectionLabel": "Telegram (Bot API)",
    "detailLabel": "Telegram Bot",
    "docsPath": "/channels/telegram",
    "blurb": "simplest way to get started — register a bot with @BotFather and get going.",
    "systemImage": "paperplane",
    "markdownCapable": true,
    "commands": {
      "nativeCommandsAutoEnabled": true,
      "nativeSkillsAutoEnabled": true
    },
    "configuredState": {
      "specifier": "./configured-state",
      "exportName": "hasTelegramConfiguredState"
    }
  }
}
```

Together they let core:

- Populate channel selector UI without loading the plugin runtime.
- Route env vars to the right channel handler.
- Declare capabilities (markdown, native commands) that influence agent
  behavior + setup wizards.
- Lazy-load configured-state detection for credential status.

The two-file split mirrors the bundled vs external plugin contract from
[`manifest-schema.md`](manifest-schema.md) — bundled channels carry the
extra `package.json.openclaw.channel` block; external channels declare
the same shape via different fields.

## Bot/transport setup — polling lifecycle

Telegram uses **polling** (with optional webhook fallback) via
`@grammyjs/runner`. `monitorTelegramProvider()` (`src/monitor.ts`)
orchestrates:

1. **Startup.** Resolve bot token (`channels.telegram.botToken` or `TELEGRAM_BOT_TOKEN`). Call `probeTelegram()` (`bot.api.getMe()`).
2. **Polling session init.** Load persisted update offset. Create a `TelegramPollingSession` with concurrency from `max-agent-concurrent`, fetch timeout 30s, allowed update types, transport tuning (proxy, DNS), offset persistence callback.
3. **Polling loop.** `pollingSession.runUntilAbort()` calls `bot.api.getUpdates({ offset: lastUpdateId })` repeatedly.
4. **Offset tracking.** After each message, `persistUpdateId()` writes `update_id` to the offset store keyed by `(accountId, botToken)`. Prevents duplicate processing across restarts.
5. **Shutdown.** Abort signal stops polling; lease released. Unhandled rejection handler suppresses recoverable network errors.

**Webhook alternative.** If `account.config.webhookUrl` set,
`startTelegramWebhook()` (lazy-loaded `src/monitor-webhook.runtime.ts`)
runs an HTTPS server. Same inbound-dispatch pipeline applies.

## Inbound message flow

```
Telegram update → bot handlers (grammY) → buildTelegramMessageContext()
    → access checks + session routing + ACP binding
    → enqueue → dispatchTelegramMessage()
    → channel-reply-pipeline → agent system
```

`buildTelegramMessageContext()` (`bot-message-context.ts`) extracts:

- sender id, chat id, message thread id (forum topics),
- text, media (photos, documents),
- allowlist enforcement (DM vs group, mentions, group policies),
- session state (DM session keys, topic routing),
- ACP conversation binding (if configured).

Result: a `TelegramMessageContext` with `ctxPayload`, `route`,
`ackReactionPromise` (e.g., 👀 to indicate receipt).

`dispatchTelegramMessage()` (`bot-message-dispatch.ts`):

- Loads model catalog + default agent for the chat.
- Passes message + context to the agent via `channel-reply-pipeline`.
- Streams response back in real-time.

Inbound is **synchronous** for context capture (so allow/reject decisions
can short-circuit cheaply) but **async** for agent dispatch (non-blocking
polling loop).

## Outbound message flow

```
agent ReplyPayload (text + buttons + poll + media)
    → sendTelegramPayloadMessages() — chunks to ≤4096 chars, renders HTML/Markdown
    → sendMessageTelegram() (send.ts) — Telegram Bot API call
    → grammy Bot.api.sendMessage (or sendDocument/sendPhoto/sendVoice/sendSticker)
```

For streaming replies:

- `editMessageTelegram()` updates the in-place message.
- `reactMessageTelegram()` adds emoji reactions (✅, ⏳, 🚨) for status.

Media handling:

| Kind | API call |
|---|---|
| Document (any file) | `sendDocument()` |
| Photo | `sendPhoto()` (compressed unless `forceDocument`) |
| Voice | `sendVoice()` / `sendAudio()` (codec-dependent) |
| Sticker | resent by file ID, no re-upload |

## ACP binding interplay

Channel plugins use ACP persistent bindings (see [`acp.md`](acp.md)) to
maintain multi-client conversations. Telegram wires this in
`channel.ts:614`:

```ts
compileConfiguredBinding: ({ conversationId }) =>
  normalizeTelegramAcpConversationId(conversationId)
```

Conversation id format `"-123456:topic:7"` parses to chat id `-123456`
+ topic id `7`. `matchInboundConversation` (`channel.ts:616`) reverses
the parse on inbound messages to find existing bindings.

`src/thread-bindings.ts` maintains an in-memory map of session keys to
thread ids; lifecycle methods `setIdleTimeoutBySessionKey` and
`setMaxAgeBySessionKey` handle GC.

If an agent spawns sub-agents into group topics, the ACP binding
ensures sub-agent replies land in the correct topic — not the parent
group.

## Auth and credentials

Telegram is **bot-token only** — no user OAuth. Sender identity is
implicit (Telegram server identifies the user; bot relays).

Token resolution priority via `resolveTelegramAccount()` (`accounts.ts`):

1. Explicit config (`channels.telegram.botToken` or per-account `channels.telegram.accounts.<id>.botToken`).
2. Env var (`TELEGRAM_BOT_TOKEN` or per-account override).
3. Falls back to "none" / unconfigured.

`probeTelegram()` validates via `getMe()`; 401 marks the account
unauthorized.

## Webhook vs polling — architecture trade-off

| | Polling (default for telegram) | Webhook |
|---|---|---|
| Setup | none — works behind NAT | HTTPS + valid cert + public DNS |
| Latency | ~30s update batching | near real-time |
| API quota | higher (continuous calls) | lower |
| Restart safety | offset persisted to survive restarts | requires liveness checks |
| openclaw uses it for | telegram default | telegram opt-in via `webhookUrl` |

Other channels diverge:

- **Discord**: WebSocket (ws). Real-time, no polling alternative in openclaw.
- **Slack**: Events API (webhook) + Web API polling fallback.
- **Matrix**: HTTP long-poll sync (full event sync, similar to Telegram polling).

The pattern is "pick the canonical transport for your service; openclaw
supports stdio-style polling, webhook, or websocket as the channel
needs."

## The pattern, abstracted

A channel plugin:

1. **Declares static metadata** in `openclaw.plugin.json` and `package.json.openclaw.channel` so core can enumerate without loading runtime.
2. **Exports a bundled-channel entry** via `defineBundledChannelEntry()` with `plugin` / `runtime` / `secrets` / `accountInspect` slots.
3. **Implements the channel contract** — credential resolution + probe, allowlist + access control, inbound parsing → context → dispatch, outbound reply → API, threading (DM threads, group topics), status reporting.
4. **Lazy-loads runtime** — heavy deps (HTTP client, dispatch logic) deferred until activation.
5. **Integrates cross-cutting concerns** — session routing, ACP bindings, streaming + error handling, credential lifecycle.
6. **Implements transport abstraction** — HTTP client, proxy, DNS, timeouts, retries, rate limits, connection state (offset / liveness).
7. **Provides attestation + auditing** — bot capabilities, group membership verification, edit/delete support, reaction support.

## Footguns

1. **Rate limits.** Telegram caps ~30 msg/s per chat. Chunking at `TELEGRAM_TEXT_CHUNK_LIMIT` (4096 chars/message) is mandatory. Restart-loop polling can exhaust quota — tune `stallThresholdMs`.
2. **Strict HTML entity parser.** Unmatched tags / invalid entities fail the whole send. Adapter falls back to plain text, but agent prompt guidance should discourage problematic syntax.
3. **Thread-id mismatches.** Group topics need `message_thread_id` on every send. Missing it broadcasts to the group instead of the topic. Verify topic id is threaded all the way through the outbound path.
4. **Webhook complexity.** HTTPS cert must be valid AND cover the IP (not just hostname). Certificate pinning bugs fail silently. Polling is simpler.
5. **Stale offsets.** Deleted/corrupted offset store → next restart polls from offset 0 and replays all history. Make inbound handlers idempotent (dedup by message id).
6. **Media download timeouts.** External URLs fetched synchronously during send. Slow hosts block the reply. Configure `mediaLocalRoots` for filesystem paths; avoid large external URLs in high-concurrency.
7. **Approval handler context leakage.** Exec approval callbacks run in the polling context. Crashing handlers can stall the polling loop. Wrap approvals in try/catch.
8. **Conversation-id parsing fragility.** Topic format `"<chatId>:topic:<topicId>"` must be parsed identically in binding-compile and inbound-match — off-by-one format bugs cause silent binding cache misses.

## Files I'd link from any channel PR

1. `extensions/telegram/index.ts` — bundled-channel entry.
2. `extensions/telegram/src/channel.ts` (~1162 LOC) — core channel contract.
3. `extensions/telegram/src/monitor.ts` — polling lifecycle.
4. `extensions/telegram/src/bot-message-context.ts` — inbound parsing.
5. `extensions/telegram/src/send.ts` (~1711 LOC) — outbound send + chunking + media.
6. `extensions/telegram/src/thread-bindings.ts` — ACP thread management.
7. `extensions/discord/index.ts` — contrast: WebSocket-based channel.

## Read next

- [`acp.md`](acp.md) — persistent bindings + multi-client coordination.
- [`manifest-schema.md`](manifest-schema.md) — `channels`, `channelEnvVars`, `channelConfigs` fields.
- [`extension-pattern-provider.md`](extension-pattern-provider.md) — sister exemplar.
