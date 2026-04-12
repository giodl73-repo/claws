# Experiment B: Communication & OBO

**Unit**: communication (146), productivity (205), calendar (65)
**Total skills**: 416

---

## Governance Angle

### OBO Action Census

This is the highest-OBO unit in the ecosystem. Systematic audit of all 416 skills:

#### OBO-EMAIL (send/read email on user's behalf)
- `aa` -- "automatically answer Gmail messages on behalf of a client"
- `agent-mail`, `agent-mail-cli` -- email inbox for agents
- `clawemail` -- Google Workspace via Gmail, Drive, Docs
- `custom-smtp-sender` -- send emails with markdown/HTML
- `email-autoreply` -- auto-reply to emails
- `freemobile-sms` -- send SMS
- `gmail-last5` -- read inbox
- `lel-mail` -- send and read email
- `lnemail` -- anonymous email accounts
- `nadmail` -- email for agents on Monad
- `personal-data-hub` -- pull emails, propose outbound actions
- `postwall` -- "Secure email gateway for AI agents - human-in-the-loop approval"
- `sixel-email` -- 1:1 email channel for agents
- `voice-email` -- send emails via voice
- `lobstermail-agent-email` -- email for AI agents
- `disposable-email-for-agents` -- disposable inboxes
- `near-email-reporter` -- send reports via email
- `m365-pnp-cli` -- Microsoft 365 (SharePoint, Teams, OneDrive)
- `microsoft365` -- Outlook, Calendar, Contacts, OneDrive
- `clippy` -- Microsoft 365 / Outlook CLI
- `exchange-2010-ews`, `exchange2010` -- Exchange integration

**Count: 22 OBO-EMAIL skills**

#### OBO-MESSAGE (post/send messages on platforms)
- `agentmesh` -- WhatsApp-style encrypted messaging
- `airc` -- IRC
- `bird-dms` -- X/Twitter DMs
- `groupme-cli` -- GroupMe
- `pidgesms` -- SMS via Android
- `rocketchat` -- Rocket.Chat
- `teltel-send-sms-text-message` -- SMS via TelTel
- `clawshat-p2p` -- P2P messaging
- `mol-instant-messenger` -- AIM-themed chat
- `quackgram` -- inter-agent messaging
- `malayalam-whatsapp` -- WhatsApp
- `publora-telegram` -- Telegram
- `outbound-call` -- phone calls
- `clawring` -- real phone calls

**Count: 14 OBO-MESSAGE skills**

#### OBO-CALENDAR (book/modify calendar events)
- `bookameeting` -- Book A Meeting via MCP
- `coordinate-meeting` -- schedule meetings
- `meetlark` -- scheduling polls
- `meeting-coordinator` -- executive scheduling
- `brainz-calendar` -- Google Calendar via gcalcli
- `gcal-pro` -- Google Calendar
- `google-calendar` -- Google Calendar API
- `temporal-cortex-scheduling` -- multi-calendar booking with 2PC
- `calendar-scheduling` -- Schedule across Google, Outlook, CalDAV
- `caldav-calendar` -- CalDAV sync
- `lark-calendar` -- Lark calendar
- `feishu-calendar` -- Feishu calendar
- `apple-calendar`, `accli` -- Apple Calendar
- `office-secretary` -- M365 calendar + triage

**Count: 15 OBO-CALENDAR skills**

#### OBO-SOCIAL (post on social media)
- `blogburst` -- turn articles into social posts
- `kiro-x-publisher` -- tweet drafts
- `x-agent` -- X/Twitter operations
- `klawdin` -- network on KlawdIn
- `clawgang` -- post on clawgang.ai
- `readx` -- Twitter intelligence toolkit
- `adaptlypost`, `postfast`, `publora` -- cross-platform scheduling

**Count: 10+ OBO-SOCIAL skills**

#### OBO-TRANSACT (financial operations)
- `boltzpay` -- pay for API data automatically
- `bitkit-cli` -- Bitcoin Lightning payments
- `arc-budget-tracker` -- track agent spending
- `mt5trade` -- trading with safety confirmation
- `etoro-apps` -- execute trades on eToro

**Count: 5 OBO-TRANSACT skills**

### Total OBO Census

| OBO Type | Count | % of Unit |
|---|---|---|
| OBO-EMAIL | 22 | 5.3% |
| OBO-MESSAGE | 14 | 3.4% |
| OBO-CALENDAR | 15 | 3.6% |
| OBO-SOCIAL | 10 | 2.4% |
| OBO-TRANSACT | 5 | 1.2% |
| **Total OBO** | **66** | **15.9%** |

### Risk Classification Defaults

| OBO Type | Default Risk | Elicitation Required |
|---|---|---|
| OBO-EMAIL (send) | **R4 EXECUTE** | Recipient, subject, body preview, confirmation |
| OBO-EMAIL (read) | **R2 READ** | None (read-only) |
| OBO-MESSAGE | **R4 EXECUTE** | Recipient, content preview |
| OBO-CALENDAR (book) | **R4 EXECUTE** | Attendees, time, duration, confirmation |
| OBO-SOCIAL (post) | **R4 EXECUTE** | Platform, content preview |
| OBO-TRANSACT | **R5 TRANSACT** | Amount, recipient, double confirmation |

### Elicitation Templates

```
OBO-EMAIL-SEND:
  trigger: "send email", "reply to", "auto-reply"
  elicit:
    - to: "Who should receive this email?"
    - subject: "Subject line?"
    - body_preview: "Here's what I'll send: [preview]. Confirm?"
  gate: user_confirm

OBO-CALENDAR-BOOK:
  trigger: "book meeting", "schedule", "set up a call"
  elicit:
    - attendees: "Who should attend?"
    - time: "When? (suggest slots)"
    - duration: "How long?"
    - notes: "Any agenda items?"
  gate: user_confirm

OBO-TRANSACT:
  trigger: "pay", "transfer", "buy"
  elicit:
    - amount: "How much?"
    - recipient: "To whom?"
    - confirmation: "Confirm: send [amount] to [recipient]?"
  gate: double_confirm
```

### Replace / Complement / Enable Matrix

| Skill | Relationship | Notes |
|---|---|---|
| `postwall` | **COMPLEMENT** | Already has human-in-the-loop; claws adds policy-level gates |
| `aa` (auto-answer Gmail) | **ENABLE** | Needs @claws/obo annotations to declare OBO-EMAIL-SEND |
| `arc-budget-tracker` | **COMPLEMENT** | Budget tracking; claws adds policy enforcement |
| `agent-team-kit` | **ENABLE** | Multi-agent framework; needs @claws/identity for team auth |
| `agentmesh` | **COMPLEMENT** | E2E encrypted messaging; claws adds audit trail |

---

## Maker Angle

### @bic/claws-skill-kit OBO Annotations

Every OBO skill should declare its boundaries:

```typescript
// @bic/claws-skill-kit annotation
export const obo = {
  type: 'OBO-EMAIL-SEND',
  risk: 'R4',
  elicitation: 'email-send-template',
  approval: 'user-confirm',
  audit: true
};
```

### Generated Approval Flows

Skills that use `@bic/claws-skill-kit` get approval flows for free:
- OBO-EMAIL-SEND: preview + confirm
- OBO-CALENDAR-BOOK: attendee check + time confirm
- OBO-TRANSACT: double confirm + budget check

### Templates for Skill Authors

| Template | Description |
|---|---|
| `skill-email-sender` | Email skill with OBO annotations, preview, confirm gate |
| `skill-calendar-booker` | Calendar skill with attendee validation, slot negotiation |
| `skill-social-poster` | Social media skill with content preview, platform-specific formatting |
| `skill-payment-processor` | Payment skill with amount limits, double confirm, audit log |

### Key Maker Recommendations

1. **@claws/obo**: Library that wraps any outbound action with elicitation + confirmation
2. **OBO registry**: Central declaration of what OBO actions a skill performs
3. **Audit trail**: Every OBO action logged with timestamp, action, user confirmation status
4. **Rate limiting**: Default OBO rate limits (e.g., max 10 emails/hour unless overridden)

---

## Summary Statistics

- Total skills analyzed: 416
- OBO-crossing skills: 66 (15.9%)
- OBO-EMAIL: 22 | OBO-MESSAGE: 14 | OBO-CALENDAR: 15 | OBO-SOCIAL: 10 | OBO-TRANSACT: 5
- R4+ skills: ~80 (19.2%)
- R5 skills: 5 (1.2%)
- Elicitation templates designed: 3 (email, calendar, transact)
