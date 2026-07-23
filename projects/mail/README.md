# Mail Project

Use this area for OpenClaw mail-channel research and plugin planning.

## Scope

This project tracks whether OpenClaw should support mail through the channel
runtime, through plugin/tool surfaces, or through both. It also covers possible
Exchange and Microsoft Graph integration paths.

## Active Questions

| Question                                          | Status  | Notes                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Does OpenClaw already support mail over channels? | Partial | GitHub issues show Gmail hook/watch support via Gateway hooks and `gog`, plus mail workflows over existing channels. No open issue found for a native mail channel provider.                                                                                                                                                                                                                                       |
| Are there existing mail plugins?                  | Partial | `gog` covers Gmail-style workflows. ClawHub has a community `outlook` skill for Microsoft Graph email/calendar and `@judahzf/clawmailreader` for Gmail/Outlook/iCloud read/organize/draft-only workflows. A Microsoft Outlook / Microsoft 365 plugin request exists as #84407 but is closed `not_planned`. A third-party Zoho Mail + Calendar channel direction-check exists as #69045, also closed `not_planned`. |
| Could Exchange run over channels?                 | Open    | #84407 asks for Microsoft Graph OAuth mail plugin capabilities. Need decide whether Exchange/M365 should be a plugin/tool surface, channel, or paired integration.                                                                                                                                                                                                                                                 |

## GitHub Issue Findings

| Issue                                                       | State                 | Signal                                                                                                                                                                                                                 |
| ----------------------------------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [#84407](https://github.com/openclaw/openclaw/issues/84407) | Closed, `not_planned` | Direct request for a Microsoft Outlook / Microsoft 365 email plugin similar to `gog`, using Microsoft Graph OAuth. Desired capabilities are read/search/list/read-message/draft/send-with-confirmation/cron summaries. |
| [#59002](https://github.com/openclaw/openclaw/issues/59002) | Open, P1              | Gmail hook sessions and Signal inbox notifications stopped after update. This is Gmail hook ingestion/session/delivery, not a mail channel plugin.                                                                     |
| [#56635](https://github.com/openclaw/openclaw/issues/56635) | Open, P1              | Gmail watcher regression around excluded labels. Linked fix PR [#56720](https://github.com/openclaw/openclaw/pull/56720) is open; duplicate PRs #56726/#56736 are closed unmerged.                                     |
| [#86881](https://github.com/openclaw/openclaw/issues/86881) | Open, P2              | Gateway-lite feature request mentions an external IMAP sorter where OpenClaw transports deterministic output over channels, not mail itself.                                                                           |
| [#69045](https://github.com/openclaw/openclaw/issues/69045) | Closed, `not_planned` | Third-party Zoho Mail + Calendar exposed as a `zoho` channel direction check. Useful as precedent for channel-vs-tool ambiguity and third-party packaging questions.                                                   |
| [#69046](https://github.com/openclaw/openclaw/issues/69046) | Closed, `not_planned` | Caller-principal/authz gap raised from the Zoho mail/calendar plugin. Important if mail send becomes a channel outbound capability.                                                                                    |
| [#85954](https://github.com/openclaw/openclaw/issues/85954) | Open, P3              | iMessage approval formatting example mentions Fastmail plugin approval text, but the issue itself is about iMessage rendering.                                                                                         |

## ClawHub Findings

| Entry                                                                               | Type                    | Signal                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`outlook`](https://clawhub.ai/skills/outlook)                                      | Community skill         | Outlook/Hotmail and Microsoft 365 email/calendar via Microsoft Graph API. Exposes scripts for inbox, unread, search, read, attachments, mark read/unread, flag, delete, archive, move, send, reply, folders, stats, and calendar operations. Uses delegated Graph scopes including `Mail.ReadWrite`, `Mail.Send`, `Calendars.ReadWrite`, `offline_access`, and `User.Read`. |
| [`@judahzf/clawmailreader`](https://clawhub.ai/plugins/%40judahzf%2Fclawmailreader) | Community code plugin   | Source-linked, scan-clean email plugin for Gmail, Outlook, and iCloud read/organize/draft-only workflows. Explicitly registers no send, trash, or delete tools; Outlook uses delegated Graph `Mail.ReadWrite` and `offline_access`.                                                                                                                                         |
| [`@openclaw/msteams`](https://clawhub.ai/plugins/%40openclaw%2Fmsteams)             | Official channel plugin | Microsoft Teams channel provider for bot conversations. This is Microsoft-related channel support, but not Outlook/Exchange mail.                                                                                                                                                                                                                                           |

## Recommendation For A Mail Channel Attempt

Do not pitch a mail channel as "full mailbox access over channels." Pitch it as
"selected email threads as conversational sessions" with mailbox operations kept
as separate tools.

Recommended shape:

- Build a provider-specific prototype first, preferably `exchange-mail` or
  `m365-mail`, using Microsoft Graph delegated auth.
- Treat inbound mail as session ingress only after filtering by allowlist,
  folder/label, or explicit subscription rule.
- Map one email conversation/thread to one OpenClaw session. Preserve stable
  provider IDs, internet message IDs, and normalized subject/thread references
  for diagnostics, but avoid storing message bodies in durable notes.
- Default outbound behavior should be reply-only to the current thread. New
  messages, forwards, broad CC/BCC changes, attachment sends, deletes, and
  mailbox moves should be separate tools with explicit approval.
- Start with read, summarize, draft reply, and reply-with-confirmation. Defer
  general send, delete, and archive until the authz/audit model is proven.
- Require clear identity binding: account owner, mailbox, sender allowlist,
  recipient allowlist or confirmation, and a visible audit trail for every
  outbound action.
- Make spam/list/bulk mail non-goals for the channel. They belong in search or
  triage tools, not in conversational ingress.
- Keep provider-specific code outside OpenClaw core unless the prototype exposes
  a concrete SDK gap in channel setup, session mapping, outbound reply routing,
  or approval handling.

Suggested maintainer framing:

> Mail should not be treated as a generic core channel yet. A reasonable
> experiment is a provider-specific mail-thread channel that only turns
> allowlisted threads into sessions, defaults to reply-only outbound, and uses
> separate mailbox tools for search, draft, archive, delete, and new-message
> workflows. If the experiment hits channel SDK limitations, bring those gaps
> back to core with a minimal repro.

## Active Work

| Repo                | PR / Issue | Branch | Status      | Purpose                                                      |
| ------------------- | ---------- | ------ | ----------- | ------------------------------------------------------------ |
| `openclaw/openclaw` | n/a        | n/a    | Not started | Determine the right extension surface for mail and Exchange. |

## Related Areas

- `projects/feeds/README.md`
- `projects/admin/README.md`
- `projects/policy/README.md`
- `projects/openclaw/README.md`
