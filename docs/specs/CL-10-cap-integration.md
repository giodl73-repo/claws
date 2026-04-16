# CL-10: CAP Integration & Serve API

**Status**: Draft
**Source**: CAP Product Day 09/25 (Figma), Project Lobster (Sheppard/Shahine, April 2026)
**Reviewers**: founder, gateway-eng, skill-author, new-hire

---

## Overview

Three UX surfaces need governance data from claws. Each serves a different audience
with a different interaction model, but all read/write the same 9 OC workspace files:

| Surface | Audience | Interaction Model | What They Need from claws |
|---------|----------|-------------------|--------------------------|
| **CAP Agent Settings** | Admin/manager | Form-based configuration (6 tabs) | Chunks: self-contained JSON blobs per tab section |
| **Lobster Collaboration** | End user | Collaborative editing (Loop, Teams, Calendar, To Do) | Sync: OC files ↔ M365 surfaces, governance context |
| **Companion App** | Power user/IT | Skills store + trust controls + activity log | Full API: governance summary, audit trail, trust escalation |

All three share one API: `claws serve`. It parses workspace files, serves compiled
governance data, accepts edits, and pushes live updates.

```
CAP Settings UI ──────┐
                      |
Lobster Collaboration ├──── claws serve (REST + SSE) ──── OC Files (9)
  (Loop, Teams, etc.) |            |                         |
                      |            v                         v
Companion App ────────┘     Governance Artifacts      claws build
                              (5 outputs)           (auto on change)
```

---

## Tab-by-Tab Mapping

### 1. General (slide 39)

| UI Element | OC File | Field / Section | claws Governance Role |
|-----------|---------|-----------------|----------------------|
| Avatar (picture, video, generated) | **--** | *No OC file* | None — visual identity is outside governance scope |
| Agent name | **IDENTITY.md** | `name` | G-A2A-IDENTITY: agent name in delegation chains |
| Agent description | **IDENTITY.md** | `description` | G-CLASS: description fed to capability extraction heuristics |
| Agent language | **--** | *No OC file* | None — locale is a platform concern |
| Managed by (person + role) | **AGENTS.md** | `delegation.owner` | G-A2A-DELEGATE: owner trust chain, who can modify governance |
| Delete agent | **--** | *Lifecycle operation* | Out of scope — claws compiles, doesn't manage lifecycle |

**Gaps in OC files**: No `avatar` or `language` field. IDENTITY.md covers name/description but not visual identity or locale.

### 2. Preferences (slide 40)

| UI Element | OC File | Field / Section | claws Governance Role |
|-----------|---------|-----------------|----------------------|
| Custom prompt ("Write a status report for...") | **SOUL.md** | `## Instructions` / `## Behavior` | G-INPUT: boundary extraction, deny rule source |
| Add reviewers (Alice Johnson) | **USER.md** | `pre_authorizations` / `reviewers` | G-ELICIT: standing approvals, who can approve R3+ tool calls |
| Start date / End date | **HEARTBEAT.md** | `schedule.start` / `schedule.end` | G-BOUND: scheduling constraints |
| Time (3:00 PM) | **HEARTBEAT.md** | `schedule.time` | G-BOUND: execution window |
| Frequency (Weekly) | **HEARTBEAT.md** | `schedule.frequency` | G-BOUND: recurrence pattern |

**Gaps in OC files**: None — full coverage. SOUL.md, USER.md, and HEARTBEAT.md together cover everything in the Preferences tab.

### 3. Connections (slides 41-42)

| UI Element | OC File | Field / Section | claws Governance Role |
|-----------|---------|-----------------|----------------------|
| Connection list (Planner, Outlook, Asana) | **TOOLS.md** | Tool declarations | G-CLASS: per-tool risk classification (R1-R5) |
| Per-connection skill count ("2 skills enabled") | **skills/** | Skill directory | Compiled skill manifest |
| Drill-in: per-skill toggle (Tool integration ON/OFF) | **TOOLS.md** | Per-tool `requires_approval` | G-ELICIT: maps to `host-approval-policies.json` |
| "Allow all" button | **USER.md** | `pre_authorizations: all` | G-ELICIT: blanket standing approval |
| "Add a connection" | **TOOLS.md** + **skills/** | New tool/skill registration | New tool enters G-CLASS pipeline |

**Gaps in OC files**: None structurally. But the UX shows connections as app-level (Planner, Outlook) while OC models them as MCP servers + individual tools. The UX aggregates tools by server — claws classifies per-tool. The mapping needs a `server → tool[]` grouping layer.

**Gaps in UX**: The toggle is binary (ON/OFF) but claws classifies tools at R1-R5 with nuanced approval policies. The UX doesn't show:
- Risk level per tool (R1-R5)
- Why a tool is gated (governance reason)
- Fleet policy overrides vs. local toggles

### 4. Memory & Knowledge (slides 43-44)

| UI Element | OC File | Field / Section | claws Governance Role |
|-----------|---------|-----------------|----------------------|
| Personal memories (about the user) | **MEMORY.md** | `personal` section | G-DATA: sensitivity labels on personal data |
| Shared memories (about the group) | **MEMORY.md** | `shared` section | G-DATA: sensitivity labels on shared data |
| Knowledge sources: Email | **MEMORY.md** + **TOOLS.md** | Data access declaration | G-DATA: data source classification |
| Knowledge sources: Files | **MEMORY.md** + **TOOLS.md** | Data access declaration | G-DATA: file access sensitivity |
| Knowledge sources: Channels | **MEMORY.md** + **TOOLS.md** | Data access declaration | G-DATA: channel data classification |
| Knowledge sources: SharePoint sites | **MEMORY.md** + **TOOLS.md** | Data access declaration | G-DATA: SharePoint sensitivity |
| Knowledge sources: Tables | **MEMORY.md** + **TOOLS.md** | Data access declaration | G-DATA: structured data classification |
| Knowledge sources: Files (file list) | **MEMORY.md** | `knowledge.files` | G-DATA: per-file sensitivity |
| Knowledge sources: Websites with access review | **MEMORY.md** | `knowledge.urls` | G-DATA: external URL allowlist |
| "Delete all memories" | **--** | *Lifecycle operation* | Out of scope for compilation |

**Gaps in OC files**: MEMORY.md has a flat structure today. The CAP UI distinguishes 7 knowledge source types (email, files, channels, SharePoint, tables, files, websites) each with individual access review. MEMORY.md would need a structured `knowledge_sources` section with per-source type and access configuration.

**Gaps in UX**: No visibility into data sensitivity labels (CONFIDENTIAL, RESTRICTED, etc.) that claws applies to memory/knowledge. The admin sees sources but not their governance classification.

### 5. Groups (slide 45)

| UI Element | OC File | Field / Section | claws Governance Role |
|-----------|---------|-----------------|----------------------|
| M365 Groups (distribution lists, channels) | **--** | *No direct OC file* | G-A2A: group membership defines delegation scope |
| Security Groups | **IDENTITY.md** | `groups` (partial) | G-A2A-IDENTITY: security group → trust tier mapping |
| On-Premise Groups | **--** | *No direct OC file* | None — on-premise groups are AD-specific |
| Remove group membership | **--** | *Lifecycle operation* | Out of scope |

**Gaps in OC files**: Significant. OC has no concept of organizational group membership. IDENTITY.md covers the agent's own identity, and AGENTS.md covers delegation, but neither models "this agent is a member of these M365 groups." This is an M365-specific concept that maps to:
- Who can interact with the agent (audience)
- What data the agent can access (scope)
- Trust tier assignment (via `@openclaw/identity-bridge` role mapping)

A new OC file or IDENTITY.md extension would be needed.

### 6. Entitlements (slide 46)

| UI Element | OC File | Field / Section | claws Governance Role |
|-----------|---------|-----------------|----------------------|
| Core Identity (Azure RBAC roles) | **IDENTITY.md** | `entitlements` / `roles` | G-A2A-IDENTITY: what the agent can do in Azure |
| Corp Identity Governance (M365 Pulse roles) | **IDENTITY.md** | `governance_roles` | G-A2A-IDENTITY: governance role assignments |
| Expiry dates (Expires 06/25/2026) | **--** | *No OC field* | G-BOUND: time-limited entitlements (not modeled today) |
| Link to management portal | **--** | *UX navigation* | Out of scope |

**Gaps in OC files**: IDENTITY.md doesn't model entitlement expiry or the distinction between "Core Identity" (Azure infra roles) and "Corp Identity Governance" (M365 governance roles). These are M365-specific concepts. The `@openclaw/identity-bridge` package handles role mapping but doesn't model expiry.

---

## Lobster Collaboration Surfaces (Sheppard/Shahine Model)

The Project Lobster vision ("The Lobster, The Laptop, and The License") gives each
agent a full M365 identity: Cloud PC, mailbox, Teams, calendar, To Do, OneDrive,
Loop. The user works WITH the agent through these surfaces — not through a settings
panel.

This creates a second set of API requirements beyond CAP settings:

### Collaboration Surface → OC File Mapping

| M365 Surface | User Interaction | OC File | claws serve API |
|-------------|-----------------|---------|-----------------|
| **Teams DM** | Chat with agent | *(interaction — not config)* | N/A — runtime, not governance |
| **Teams voice/video** | Onboarding call, briefings | Generates initial SOUL.md + MEMORY.md | `POST /api/onboard` — seed files from conversation |
| **Teams presence** | See agent status (Available/Busy/Away) | *(runtime status)* | `GET /api/status` — includes agent state |
| **Teams meetings** | Agent joins, takes notes, tracks actions | *(interaction)* | N/A — runtime |
| **Teams screen share** | Watch agent work on Cloud PC | *(observation)* | N/A — runtime |
| **Outlook mailbox** | Agent has own email, delegation, Send As/OBO | IDENTITY.md + TOOLS.md | `GET /api/chunks/identity` — email config |
| **Calendar** | Cron jobs visible as calendar events | HEARTBEAT.md | `GET /api/schedule` — returns calendar-renderable events |
| **To Do / Planner** | Shared work queue — visible task list | *(new — see below)* | `GET /api/workqueue` — agent's active tasks |
| **OneDrive** | Agent's file storage, shared deliverables | *(file system)* | `GET /api/files` — list of deliverables with governance labels |
| **Loop workspace** | Edit agent's memory + soul as collaborative pages | SOUL.md + MEMORY.md | `GET/PATCH /api/loop/soul`, `/api/loop/memory` |

### New Concepts from Lobster (No OC File Today)

#### Work Queue

Adam's model surfaces the agent's task list as a shared To Do / Planner board.
OC has no file for this. HEARTBEAT.md is the schedule (when things run), not the
queue (what's in progress).

Proposed: `WORKQUEUE.md` or a runtime-only concept served by `claws serve`:

```json
GET /api/workqueue
{
  "tasks": [
    {
      "id": "t-001",
      "title": "Prepare Contoso QBR dossier",
      "status": "in_progress",
      "assignedBy": "user",
      "dueAt": "2026-04-17T09:00:00Z",
      "plannerTaskId": "abc-123"
    },
    {
      "id": "t-002",
      "title": "Daily inbox triage",
      "status": "recurring",
      "source": "HEARTBEAT.md",
      "nextRun": "2026-04-16T06:00:00Z",
      "calendarEventId": "cal-456"
    }
  ]
}
```

This is the bridge between HEARTBEAT.md (static schedule) and the runtime work
queue. To Do / Planner renders from this API. The API returns Planner/Calendar
IDs so the M365 surfaces can link back.

**Work queue persistence (P-280)**: Runtime tasks (not from HEARTBEAT.md) are
persisted to `.claws/workqueue.json` so they survive server restarts. Each task
has an idempotency key to prevent duplicates on crash recovery. Tasks in
`in_progress` state at crash time are marked `interrupted` on recovery.

**Timezone requirement (P-278)**: All times in HEARTBEAT.md and the `/api/schedule`
response use explicit timezone (ISO 8601 with offset or IANA timezone name). The
parser rejects bare times like "9:00 AM" with no timezone. The `/api/schedule`
response normalizes to UTC with the original timezone preserved in a `tz` field.

#### Trust Escalation

Adam describes a trust model where authority grows over time: "you delegate more
as they earn your trust." Our trust tiers (T0-T4) model this statically. The
Lobster model wants it dynamic.

Proposed: Trust tier is a governance concept in AGENTS.md, surfaced via API with
escalation history:

```json
GET /api/trust
{
  "currentTier": "T2",
  "escalationHistory": [
    { "from": "T0", "to": "T1", "date": "2026-04-01", "reason": "Onboarding complete" },
    { "from": "T1", "to": "T2", "date": "2026-04-08", "reason": "7 days, 0 governance violations" }
  ],
  "nextEscalation": {
    "to": "T3",
    "requirements": ["30 days active", "0 R5 denials", "Manager approval"],
    "progress": { "daysActive": 15, "r5Denials": 0, "managerApproved": false }
  },
  "permissions": {
    "T2": ["read-email", "create-task", "schedule-meeting"],
    "T3_unlocks": ["send-email-as-user", "modify-calendar", "access-sharepoint"]
  }
}
```

The Companion App renders the trust dashboard. The CAP settings could show
the current tier. Loop pages could explain what the agent can and can't do.

#### Loop ↔ OC File Sync

Adam's model makes SOUL.md and MEMORY.md editable as Loop pages. This creates
a bidirectional sync problem:

```
Loop page "Soul" ←→ SOUL.md ←→ claws build → governance artifacts
Loop page "Memory" ←→ MEMORY.md ←→ claws build → governance artifacts
```

The sync must be:
- **Lossless**: Loop edits preserve all OC file structure (frontmatter, sections)
- **Governance-aware**: If a Loop edit removes a deny rule from SOUL.md, claws
  recompiles and surfaces a governance warning
- **Bidirectional**: Changes from `claws serve` PATCH also sync to Loop

Proposed API:

```json
GET /api/loop/soul
{
  "loopPageId": "loop-page-abc",
  "sections": [
    {
      "name": "Instructions",
      "content": "Write status reports for business stakeholders...",
      "editable": true,
      "governance": null
    },
    {
      "name": "Boundaries",
      "content": "Never send email without approval. Never access financial data.",
      "editable": true,
      "governance": {
        "denyRules": 2,
        "warning": "Removing boundary text may weaken governance — recompilation will verify"
      }
    }
  ],
  "writeBack": { "method": "PATCH", "url": "/api/loop/soul" }
}

PATCH /api/loop/soul
{
  "sections": [
    { "name": "Instructions", "content": "...updated text..." }
  ]
}
→ writes SOUL.md → triggers claws build → returns governance result
→ syncs to Loop page via Graph API (if configured)
```

### Session Model (ClawPilot Pattern)

OpenClaw runs dozens of concurrent sessions per agent — not one workspace with one
tool set. ClawPilot knows this. Our API must too.

**Session types**:

| Type | What it is | Example |
|------|-----------|---------|
| `main` | Primary user chat | The DM thread in Teams |
| `cron` | Scheduled heartbeat jobs | Daily inbox triage, weekly report |
| `channel` | Channel-scoped sessions | design-team, engineering |
| `agent` | Delegated agent sessions | scout, buddy |

**Each session has**:
- **Status**: `running` / `idle` / `scheduled` / `errored` / `suspended`
- **Tool permissions**: which tools are authorized for THIS session (a cron session
  may have different tool access than the main chat)
- **Run history** (cron only): past executions with status, duration, errors
- **Pinned chat**: the session's conversation thread (not mixed into main chat)

**API**:

```json
GET /api/sessions
{
  "sessions": [
    {
      "id": "main",
      "type": "main",
      "status": "running",
      "lastActivity": "2026-04-15T10:28:00Z",
      "toolCount": 12
    },
    {
      "id": "cron:daily-triage",
      "type": "cron",
      "status": "scheduled",
      "nextRun": "2026-04-16T06:00:00Z",
      "lastRun": {
        "status": "success",
        "startedAt": "2026-04-15T06:00:00Z",
        "durationMs": 45000
      },
      "toolCount": 3
    },
    {
      "id": "cron:weekly-report",
      "type": "cron",
      "status": "idle",
      "nextRun": "2026-04-21T07:00:00Z",
      "lastRun": {
        "status": "error",
        "startedAt": "2026-04-14T07:00:00Z",
        "error": "Budget exceeded (95% threshold)"
      },
      "toolCount": 5
    },
    {
      "id": "channel:design-team",
      "type": "channel",
      "status": "idle",
      "lastActivity": "2026-04-14T16:30:00Z",
      "toolCount": 8
    },
    {
      "id": "agent:scout",
      "type": "agent",
      "status": "running",
      "lastActivity": "2026-04-15T10:25:00Z",
      "toolCount": 6,
      "delegatedBy": "main"
    }
  ],
  "summary": { "total": 12, "running": 3, "errored": 1, "scheduled": 2 }
}
```

```json
GET /api/sessions/cron:daily-triage/runs
{
  "runs": [
    { "id": "run-042", "status": "success", "startedAt": "2026-04-15T06:00:00Z", "durationMs": 45000, "toolCalls": 8, "auditEvents": 8 },
    { "id": "run-041", "status": "success", "startedAt": "2026-04-14T06:00:00Z", "durationMs": 38000, "toolCalls": 6, "auditEvents": 6 },
    { "id": "run-040", "status": "error", "startedAt": "2026-04-13T06:00:00Z", "durationMs": 120000, "error": "Timeout after 120s", "toolCalls": 3, "auditEvents": 4 }
  ]
}
```

```json
GET /api/sessions/cron:daily-triage/tools
{
  "tools": [
    { "tool": "read-email", "server": "outlook", "risk": { "level": 1, "label": "read" }, "lock": { "source": "none" }, "enabled": true },
    { "tool": "create-task", "server": "planner", "risk": { "level": 3, "label": "communicate" }, "lock": { "source": "fleet" }, "enabled": true },
    { "tool": "send-email", "server": "outlook", "risk": { "level": 5, "label": "transact" }, "lock": { "source": "r5" }, "enabled": true, "approvalRequired": true }
  ],
  "note": "Tool permissions scoped to this session. Main chat may have different tools."
}
```

**Governance per session**: Different sessions can have different tool permissions.
A cron session running overnight may have access to read-email but not send-email.
A delegated agent session inherits the delegating session's trust tier but may have
a restricted tool set. The chunk API's `/api/chunks/connections` returns the
workspace-level tool set. The session API returns the session-scoped subset.

**Unattended session approval policy (C-1)**: Cron and agent sessions run without a human present. If a gated tool (R3+) triggers `requiresExternalApproval: true` in an unattended session, the timeout `failMode` is forced to `'deny'` regardless of configuration. R5 is already protected by `alwaysDenyRiskLevels`. This extends the protection to R3-R4 in unattended contexts. The approval request is queued for the next time the user is active.

### Companion App Surfaces

The Companion App (evolution of ClawPilot) is the management/control plane.
APIs it needs beyond what CAP settings and Lobster collaboration cover:

| Companion Feature | API Endpoint | Source |
|-------------------|-------------|--------|
| Session overview | `GET /api/sessions` | OC runtime state |
| Session detail + run history | `GET /api/sessions/:id`, `/runs`, `/tools` | OC runtime + governance |
| Skills store (browse, install) | `GET /api/skills`, `POST /api/skills/install` | skills/ directory |
| Trust controls (authority levels) | `GET /api/trust`, `PATCH /api/trust/escalate` | AGENTS.md trust tier |
| Activity log (full audit timeline) | `GET /api/audit?limit=100&cursor=...&category=...` | @openclaw/audit-chain |
| Governance dashboard | `GET /api/governance` | Compiled artifacts |
| Multi-claw management | `GET /api/fleet/claws` | Fleet config |
| Rate limits, escalation rules | `GET /api/chunks/config` | claws.json |

---

## Gap Summary

### Things in the CAP UX that OC files DON'T cover

| Priority | CAP Feature | Missing From | Proposed Addition |
|----------|------------|-------------|-------------------|
| **P1** | Per-knowledge-source type classification | MEMORY.md | Structured `knowledge_sources` with `type: email\|files\|channels\|sharepoint\|tables\|urls` |
| **P1** | Knowledge source access review | MEMORY.md | `knowledge_sources[].accessReview: true\|false` |
| **P2** | M365 Group membership | All files | `IDENTITY.md` `groups` section or new `GROUPS.md` file |
| **P2** | Entitlement expiry dates | IDENTITY.md | `entitlements[].expiresAt` field |
| **P2** | Core vs. Corp governance role distinction | IDENTITY.md | `entitlements.core[]` vs `entitlements.governance[]` |
| **P3** | Agent language / locale | All files | `IDENTITY.md` `locale` field |
| **P3** | On-Premise Group membership | All files | Same as M365 groups |
| **P4** | Agent avatar / visual identity | All files | Out of scope — visual identity isn't governance |

Priority: P1 = blocks Phase 1 API, P2 = needed for Phase 2-3, P3 = nice to have, P4 = out of scope.

### Things in OC files / governance that NO UX surfaces today

| Priority | Concept | File | What's Missing | Who Needs It |
|----------|---------|------|---------------|-------------|
| **P1** | Tool risk classification (R1-R5) | TOOLS.md | ON/OFF toggles but no risk context. | CAP + Companion |
| **P1** | Governance compilation status | `.claws/compiled/` | Can't see if governance is compiled, stale, or errors. | Companion + CAP |
| **P1** | Fleet policy overrides | claws.json | Can't see which settings are local vs. fleet-enforced. | CAP + Companion |
| **P2** | Deny rules | SOUL.md | No deny rule editor anywhere. | CAP + Companion |
| **P2** | OBO declarations | TOOLS.md | Can't see which tools act as the user. | CAP + Companion |
| **P2** | Trust tiers (T0-T4) | AGENTS.md | Not surfaced. No way to see or set trust tier. | Companion |
| **P2** | Audit trail | `.claws/audit/` | No visibility into governance decisions. | Companion |
| **P2** | Data sensitivity labels | MEMORY.md | Sources shown but not classified. | CAP + Loop |
| **P3** | Trust escalation over time | AGENTS.md | Static tiers only. No dynamic "earn trust" model. | Companion + Lobster |
| **P3** | Budget / token ceiling | config | No budget visibility or controls. | Companion |
| **P3** | Work queue (active tasks) | *(none)* | No OC file for agent's runtime task list. | Lobster (To Do) |
| **P3** | Loop ↔ OC file sync | SOUL.md, MEMORY.md | No bidirectional sync. | Lobster |
| **P3** | Calendar-renderable schedule | HEARTBEAT.md | Schedule exists but not as calendar events. | Lobster (Calendar) |
| **P4** | Workflow DAG | lobster.yaml | Multi-step workflows not visible. | Companion |
| **P4** | Agent presence | *(runtime)* | No status concept in OC files. | Lobster (Teams) |

Priority: P1 = blocks Phase 1 API (partners need this to render chunks), P2 = Phase 2 write path,
P3 = Phase 3 Lobster surfaces, P4 = future.

---

## Proposed API Surface: `claws serve`

A live HTTP/SSE service that bridges all three UX surfaces with compiled governance.

### Full Endpoint Map

| Endpoint | Method | Consumer | Purpose |
|----------|--------|----------|---------|
| `/api/chunks/{tab}/{section}` | GET | CAP Settings | Self-contained chunk for a settings section |
| `/api/chunks/{tab}/{section}` | PATCH | CAP Settings | Write-back edited chunk |
| `/api/governance` | GET | Companion | Compiled governance summary |
| `/api/tools` | GET | CAP + Companion | Tools grouped by server with risk + approval |
| `/api/tools/:server` | GET | CAP | Tools for one connection |
| `/api/memory` | GET | CAP + Loop | Memory config + knowledge sources |
| `/api/identity` | GET | CAP + Companion | Agent identity + groups + entitlements |
| `/api/schedule` | GET | Lobster (Calendar) | Calendar-renderable events from HEARTBEAT.md |
| `/api/workqueue` | GET | Lobster (To Do) | Agent's active task list |
| `/api/trust` | GET | Companion | Trust tier + escalation history + progress |
| `/api/trust/escalate` | PATCH | Companion | Request trust tier escalation |
| `/api/audit` | GET | Companion | Audit trail query — cursor-based pagination (P-281), integrity checks periodic not per-read |
| `/api/loop/soul` | GET/PATCH | Lobster (Loop) | SOUL.md as Loop-syncable sections |
| `/api/loop/memory` | GET/PATCH | Lobster (Loop) | MEMORY.md as Loop-syncable sections |
| `/api/skills` | GET | Companion | Available + installed skills |
| `/api/skills/install` | POST | Companion | Install a skill |
| `/api/status` | GET | All | Compilation status + agent state (presence) |
| `/api/files` | GET | Lobster (OneDrive) | Deliverables with governance labels |
| `/api/onboard` | POST | Lobster (Teams) | Seed SOUL.md + MEMORY.md from onboarding conversation |
| `/api/sessions` | GET | ClawPilot + TUI | All active sessions with type, status, last activity |
| `/api/sessions/:id` | GET | ClawPilot + TUI | Session detail: run history, errors, tool permissions |
| `/api/sessions/:id/runs` | GET | ClawPilot + TUI | Run history for cron sessions (status, duration, errors) |
| `/api/sessions/:id/tools` | GET | ClawPilot + TUI | Tool permissions scoped to this session |
| `/api/events` | SSE | All | Live updates: file changes, recompilation, governance warnings, session state |

### Architecture

```
CAP Settings ─── /api/chunks/*           Companion App ─── /api/governance
                 /api/tools                                /api/trust
                 /api/identity                             /api/audit
                                                           /api/skills
         |                                          |
         +──────────────────┬───────────────────────+
                            |
                     claws serve
                      (REST + SSE)
                            |
         +──────────────────┼───────────────────────+
         |                  |                       |
   OC Files (9)      .claws/compiled/         @openclaw/*
   SOUL.md           governance artifacts     audit-chain
   TOOLS.md          host-approval-policies   identity-bridge
   AGENTS.md         exec-approvals           budget-meter
   MEMORY.md         SKILL.md
   IDENTITY.md       lobster.compiled
   USER.md
   HEARTBEAT.md            |
   skills/           claws build
   lobster.yaml      (auto on change)
         |                                          |
         +──────────────────┬───────────────────────+
                            |
                     Lobster Sync Layer
                            |
         +──────────────────┼───────────────────────+
         |                  |                       |
   Loop pages        To Do / Planner          Calendar
   (Soul, Memory)    (Work Queue)             (Schedule)
   /api/loop/*       /api/workqueue           /api/schedule
```

### Read APIs (UX consumption)

#### GET /api/tools

Returns tools grouped by MCP server (matching the Connections tab layout) with
governance context the UX can display alongside the toggles.

```json
{
  "servers": [
    {
      "server": "outlook",
      "name": "Outlook",
      "tools": [
        {
          "tool": "send-email",
          "description": "Send email as the user",
          "risk": { "level": 5, "label": "transact" },
          "obo": true,
          "requiresApproval": true,
          "approvalSource": "compiled",
          "reason": "R5 OBO — credential forwarding, non-negotiable",
          "enabled": true
        },
        {
          "tool": "read-email",
          "description": "Read user's email",
          "risk": { "level": 1, "label": "read" },
          "obo": false,
          "requiresApproval": false,
          "approvalSource": "compiled",
          "reason": "R1 read-only — auto-allow",
          "enabled": true
        }
      ],
      "summary": { "total": 2, "enabled": 2, "gated": 1, "r5Count": 1 }
    },
    {
      "server": "planner",
      "name": "Planner",
      "tools": [
        {
          "tool": "create-task",
          "description": "Create a Planner task",
          "risk": { "level": 3, "label": "communicate" },
          "obo": false,
          "requiresApproval": true,
          "approvalSource": "fleet-override",
          "reason": "R3 — fleet policy requires approval for communicate tools",
          "enabled": true
        }
      ],
      "summary": { "total": 1, "enabled": 1, "gated": 1, "r5Count": 0 }
    }
  ]
}
```

The UX can now show:
- The existing ON/OFF toggle (maps to `enabled`)
- A risk badge next to each tool (R1-R5 with color coding)
- A lock icon for R5 tools (non-negotiable, toggle is disabled)
- A fleet icon for fleet-overridden settings
- The reason text as a tooltip

#### GET /api/governance

Returns the compiled governance summary — what the CAP UX needs to show a
governance health dashboard.

```json
{
  "compilationStatus": "clean",
  "lastCompiled": "2026-04-15T10:30:00Z",
  "toolCount": 12,
  "riskDistribution": {
    "R1": 3, "R2": 2, "R3": 4, "R4": 2, "R5": 1
  },
  "gatedTools": 7,
  "oboTools": 1,
  "denyRules": 2,
  "trustTier": "T2",
  "budgetUsed": 12400,
  "budgetLimit": 50000,
  "auditChainIntact": true,
  "auditEventCount": 342,
  "fleetPolicyApplied": true,
  "fleetOverrides": ["planner:create-task"],
  "warnings": [
    { "rule": "G-ELICIT", "tool": "send-email", "message": "R5 tool with no standing approval — will gate every call" }
  ]
}
```

#### GET /api/memory

Returns memory config and knowledge sources with sensitivity labels — what the
Memory & Knowledge tab needs for governance-aware display.

```json
{
  "memories": {
    "personal": { "count": 12, "dataLabel": "INTERNAL" },
    "shared": { "count": 5, "dataLabel": "INTERNAL" }
  },
  "knowledgeSources": [
    { "type": "email", "name": "Mailbox", "enabled": true, "dataLabel": "CONFIDENTIAL", "accessReview": false },
    { "type": "files", "name": "OneDrive files", "enabled": true, "dataLabel": "INTERNAL", "accessReview": false },
    { "type": "channels", "name": "Teams channels", "enabled": true, "dataLabel": "INTERNAL", "accessReview": false },
    { "type": "sharepoint", "name": "SharePoint sites", "enabled": true, "dataLabel": "CONFIDENTIAL", "accessReview": true },
    { "type": "urls", "name": "External websites", "enabled": true, "dataLabel": "PUBLIC", "accessReview": true }
  ]
}
```

#### GET /api/identity

Returns identity with groups and entitlements — what the General, Groups, and
Entitlements tabs need.

```json
{
  "name": "AgentX",
  "description": "Helps A365 by creating status reports, scheduling meetings, and more!",
  "locale": "en-US",
  "managedBy": { "name": "Babak Shammas", "role": "Sales representative" },
  "trustTier": "T2",
  "groups": {
    "m365": ["Moondust channel", "All-IsM-Users-Marketing"],
    "security": ["AAD_Licensing"],
    "onPremise": ["Moondust channel", "All-IsM-Users-Marketing"]
  },
  "entitlements": {
    "core": [
      { "role": "ZURE-ALL-PSV-EO14117", "type": "Azure RBAC", "expiresAt": "2026-06-25" }
    ],
    "governance": [
      { "role": "PassiveMonUser", "type": "M365 Pulse", "expiresAt": "2026-06-25" },
      { "role": "Teams_Kusto_Reader", "type": "M365 Pulse", "expiresAt": "2026-05-07" }
    ]
  }
}
```

### Write APIs — Chunk PATCH (sole write surface)

**No `/api/workspace/:file` endpoint.** Partners never touch raw OC files. The
Chunk API is the only write surface. This eliminates concurrency hazards and ensures
every edit passes through the write-time validation layer.

#### Write-Time Validation Layer

Every PATCH goes through a validation pipeline in claws-sdk BEFORE writing:

```
PATCH /api/chunks/{tab}/{section}
     |
     v
1. Parse: deserialize the edit payload
2. Validate governance: check against compiled GovernanceIR
   - R5 tools: reject disable-approval edits (R5_NON_NEGOTIABLE)
   - Fleet locks: reject edits to fleet-locked fields (FLEET_LOCK_VIOLATION)
   - "Allow all": exclude R5 from pre_authorizations (R5_EXCLUDED_FROM_ALLOW_ALL)
   - Deny rules: warn on removal, require confirmation
3. Validate structure: check edit is valid for the target file
4. Write: lossless edit to OC file (preserves formatting, frontmatter, comments)
5. Compile: incremental recompilation (cache-aware — see below)
6. Audit: emit audit event via @openclaw/audit-chain
7. Respond: return updated chunk + governance result
     |
     v
{ status: 'ok', updatedChunk: {...}, governance: { warnings: [], errors: [] } }
  OR
{ status: 'rejected', error: 'R5_NON_NEGOTIABLE', field: '...', message: '...' }
```

Steps 2-5 are **atomic**: if validation fails, nothing is written. If write
succeeds but compile fails, the write is rolled back. No temporal window where
the workspace is in a governance-violating state.

#### Error Response Schema

```typescript
type PatchResult =
  | { status: 'ok'; updatedChunk: Chunk; governance: GovernanceResult }
  | { status: 'rejected'; error: PatchError; field?: string; message: string };

type PatchError =
  | 'R5_NON_NEGOTIABLE'          // Cannot disable R5 approval
  | 'FLEET_LOCK_VIOLATION'       // Field is locked by fleet policy
  | 'R5_EXCLUDED_FROM_ALLOW_ALL' // "Allow all" cannot include R5 tools
  | 'GOVERNANCE_VIOLATION'       // Edit would create a governance error
  | 'INVALID_STRUCTURE'          // Edit payload doesn't match file schema
  | 'COMPILATION_FAILED'         // Recompile produced errors (rolled back)
  | 'TRUST_REQUIRES_APPROVAL'    // Trust escalation needs manager sign-off
  | 'AUTHORIZATION_REQUIRED';    // Caller lacks permission for this edit

type GovernanceResult = {
  warnings: Array<{ rule: string; message: string }>;
  errors: Array<{ rule: string; message: string }>;
  recompiled: boolean;
  durationMs: number;
  cacheHit: boolean;
};
```

#### Lock Enforcement

Every editable field in a chunk carries a `lock` descriptor:

```typescript
interface FieldEditability {
  type: 'string' | 'boolean' | 'number' | 'enum' | 'date' | 'text';
  options?: string[];
  required?: boolean;
  lock?: {
    locked: boolean;
    source: 'r5' | 'fleet' | 'governance' | 'none';
    reason?: string;
  };
}
```

`lock.source` tells the UX WHY a field is locked:
- `r5`: R5 non-negotiable — never unlockable
- `fleet`: Fleet policy — contact fleet admin to change
- `governance`: Governance rule requires this value — editing triggers a warning
- `none`: Editable

The server enforces locks. A PATCH that attempts to change a `locked: true` field
returns `{ status: 'rejected', error: 'R5_NON_NEGOTIABLE' | 'FLEET_LOCK_VIOLATION' }`.

#### "Allow All" Scope

The "Allow all" button in the Connections tab maps to `USER.md` `pre_authorizations`.
**R5 tools are explicitly excluded.** The PATCH handler:

1. Sets `pre_authorizations` for all R1-R4 tools
2. Skips R5 tools (returns them in the response as `still_gated`)
3. The updated chunk shows R5 tools still locked

```json
PATCH /api/chunks/connections/allow-all
→ { status: 'ok', still_gated: ['send-email'], reason: 'R5 tools excluded from Allow All' }
```

### Live Updates (SSE)

```
SSE /api/events

event: file_changed
data: { "file": "TOOLS.md", "changedBy": "admin-ui", "timestamp": "..." }

event: compilation_started
data: { "trigger": "file_change", "file": "TOOLS.md" }

event: compilation_complete
data: { "status": "clean", "warnings": 0, "errors": 0, "duration": 230 }

event: governance_warning
data: { "rule": "G-CLASS", "tool": "new-tool", "message": "Unclassified tool — defaulting to R5" }
```

The CAP UX subscribes to `/api/events` and updates the UI in real-time when
governance recompiles after an edit.

**SSE is current-state-only (P-275)**: If the client disconnects and reconnects,
events emitted during the gap are lost. This is acceptable for settings UIs (refresh
the chunk on reconnect). For audit replay, use `GET /api/audit` which provides the
full hash-chained event history. SSE events include a monotonic `sequence` number
so clients can detect gaps on reconnect.

---

## Integration with Steven's Enterprise Hardening

Steven's WS-4 (`tenant.tools.policy.get/set`) maps directly to our chunk API:

```
tenant.tools.policy.get  →  GET /api/chunks/connections (claws serve)
tenant.tools.policy.set  →  PATCH /api/chunks/connections/{server} (claws serve)
```

Write-time validation ensures Steven's admin API inherits R5 enforcement,
fleet lock checking, and audit trail automatically. The GuardrailProvider
composition means:
- `claws serve` owns the compiled baseline (what claws thinks)
- Steven's admin API owns the fleet overrides (what the admin changed)
- The ProviderRegistry composes both at runtime

---

## Chunk API — Partner-Friendly Interface

The key insight for partnering with other devs: they shouldn't need to know about
OC workspace files, claws compilation, or governance rules. They need **chunks** —
self-contained JSON blobs that map 1:1 to a UI component. Each chunk includes:

- The **data** to render
- The **schema** for what's editable
- A **write-back endpoint** that accepts the edited chunk

**Atomic workspace snapshot (P-271)**: Chunk assembly reads multiple OC files +
compiled IR. To prevent stale cross-file joins (e.g., AGENTS.md `managedBy` changing
between reading IDENTITY.md and AGENTS.md), the chunk assembler snapshots all file
hashes at the start and verifies none changed before returning the chunk. If a file
changed mid-assembly, the assembler retries (max 3 times, then returns with a
`snapshotStale: true` warning in the governance context).

### Chunk Format

```typescript
import type { RiskClassification } from '@openclaw/approval-events'; // from CL-12

type ChunkTab = 'general' | 'preferences' | 'connections' | 'memory'
              | 'groups' | 'entitlements' | 'trust' | 'schedule' | 'workqueue';

type TrustTier = 'T0' | 'T1' | 'T2' | 'T3' | 'T4';
type DataLabel = 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';

// === Per-Tab Data Shapes =====================================================

/** Maps each tab to its typed data shape. */
interface ChunkDataMap {
  general: GeneralData;
  preferences: PreferencesData;
  connections: ConnectionsData;
  memory: MemoryData;
  groups: GroupsData;
  entitlements: EntitlementsData;
  trust: TrustData;
  schedule: ScheduleData;
  workqueue: WorkqueueData;
}

/** Locks on array items (tools, knowledge sources). Derived: locked = source !== 'none'. */
interface ItemLock {
  source: 'r5' | 'fleet' | 'governance' | 'none';
  reason?: string;
}

interface GeneralData {
  name: string;
  description: string;
  language: string;
  managedBy: { name: string; role: string };
}

interface PreferencesData {
  instructions: string;
  reviewers: Array<{ name: string; id: string }>;
  schedule?: { start: string; end?: string; time: string; frequency: string };
}

interface ConnectionsData {
  server: string;
  name: string;
  tools: Array<{
    tool: string;
    description: string;
    enabled: boolean;
    risk: RiskClassification;
    obo: boolean;
    approvalRequired: boolean;
    approvalSource: 'compiled' | 'fleet-override' | 'admin';
    lock: ItemLock;
  }>;
  summary: { total: number; enabled: number; gated: number; r5Count: number };
}

interface MemoryData {
  memories: { personal: { count: number }; shared: { count: number } };
  knowledgeSources: Array<{
    type: 'email' | 'files' | 'channels' | 'sharepoint' | 'tables' | 'urls';
    name: string;
    enabled: boolean;
    dataLabel: DataLabel;
    lock: ItemLock;
  }>;
}

interface GroupsData {
  m365: string[];
  security: string[];
  onPremise: string[];
}

interface EntitlementsData {
  core: Array<{ role: string; type: string; expiresAt?: string }>;
  governance: Array<{ role: string; type: string; expiresAt?: string }>;
}

interface TrustData {
  currentTier: TrustTier;
  escalationHistory: Array<{ from: TrustTier; to: TrustTier; date: string; reason: string }>;
  nextEscalation?: {
    to: TrustTier;
    requirements: string[];
    progress: Record<string, unknown>;
  };
}

interface ScheduleData {
  events: Array<{ title: string; recurrence: string; nextRun: string; calendarEventId?: string }>;
}

interface WorkqueueData {
  tasks: Array<{ id: string; title: string; status: string; dueAt?: string; plannerTaskId?: string }>;
}

// === Field Editability =======================================================

interface FieldEditability {
  type: 'string' | 'boolean' | 'number' | 'enum' | 'date' | 'text' | 'object';
  options?: string[];
  required?: boolean;
  lock?: ItemLock;
}

// === Chunk ===================================================================

/**
 * A self-contained JSON blob that maps 1:1 to a UI component.
 * Partners render `data`, respect locks, and PATCH to `writeBack.url`.
 *
 * K constrains the tab AND discriminates the data shape via ChunkDataMap.
 */
interface Chunk<K extends ChunkTab = ChunkTab> {
  tab: K;
  section: string;
  data: ChunkDataMap[K];

  /**
   * Flat-field editability. Keys are top-level field names from `data`.
   * Array items carry their own `lock` inline (no JSONPath syntax).
   */
  editable: Record<string, FieldEditability>;

  /** Governance context. Uses RiskClassification from CL-12. */
  governance?: {
    risk?: RiskClassification;
    trustTier?: TrustTier;
    warnings?: string[];
    fleetOverride?: boolean;
  };

  /** Write-back. Omitted for read-only chunks (entitlements). */
  writeBack?: { method: 'PATCH'; url: string };
}
```

**Key design decision**: Editability for flat fields (name, description, language)
lives in the `editable` record. Editability for array items (tools, knowledge
sources) is embedded per-item in `data` — each tool carries its own `lock` field.
No JSONPath-like query syntax. Partners iterate the array and check each item's lock.

### Example Chunks

#### GET /api/chunks/general

```json
{
  "tab": "general",
  "section": "identity",
  "data": {
    "name": "AgentX",
    "description": "Helps A365 by creating status reports, scheduling meetings, and more!",
    "language": "English (United States)",
    "managedBy": { "name": "Babak Shammas", "role": "Sales representative" }
  },
  "editable": {
    "name": { "type": "string", "required": true },
    "description": { "type": "text", "required": true },
    "language": { "type": "enum", "options": ["English (United States)", "French (France)"] },
    "managedBy": { "type": "object", "lock": { "source": "none" } }
  },
  "writeBack": { "method": "PATCH", "url": "/api/chunks/general/identity" }
}
```

The dev renders inputs for each field, checks `lock.source` per field, and
PATCHes back to `writeBack.url`. They never touch IDENTITY.md or AGENTS.md.

#### GET /api/chunks/connections

Returns one chunk **per server**. Each tool carries its own `lock` inline —
no JSONPath syntax. Partners iterate the array and check each item's lock.

```json
[
  {
    "tab": "connections",
    "section": "outlook",
    "data": {
      "server": "outlook",
      "name": "Outlook",
      "tools": [
        {
          "tool": "send-email",
          "description": "Send email as the user",
          "enabled": true,
          "risk": { "level": 5, "label": "transact" },
          "obo": true,
          "approvalRequired": true,
          "approvalSource": "compiled",
          "lock": { "source": "r5", "reason": "R5 OBO — non-negotiable" }
        },
        {
          "tool": "read-email",
          "description": "Read user's email",
          "enabled": true,
          "risk": { "level": 1, "label": "read" },
          "obo": false,
          "approvalRequired": false,
          "approvalSource": "compiled",
          "lock": { "source": "none" }
        },
        {
          "tool": "timely-updates",
          "description": "Reminders and notifications within Teams",
          "enabled": false,
          "risk": { "level": 3, "label": "communicate" },
          "obo": false,
          "approvalRequired": true,
          "approvalSource": "fleet-override",
          "lock": { "source": "fleet", "reason": "Fleet policy requires approval for R3 tools" }
        }
      ],
      "summary": { "total": 3, "enabled": 2, "gated": 2, "r5Count": 1 }
    },
    "editable": {},
    "governance": {
      "risk": { "level": 5, "label": "transact" },
      "warnings": ["1 R5 tool: send-email requires approval on every call"],
      "fleetOverride": true
    },
    "writeBack": { "method": "PATCH", "url": "/api/chunks/connections/outlook" }
  }
]
```

The dev building the Connections tab:
- Iterates `data.tools`, renders a toggle per tool
- Checks `tool.lock.source` — if not `'none'`, disables the toggle and shows the reason
- Shows `tool.risk` as a badge (color-coded R1-R5)
- Shows chunk-level `governance.warnings` as a banner

#### GET /api/chunks/memory

```json
{
  "tab": "memory",
  "section": "knowledge",
  "data": {
    "memories": {
      "personal": { "count": 12 },
      "shared": { "count": 5 }
    },
    "knowledgeSources": [
      { "type": "email", "name": "Mailbox", "enabled": true, "dataLabel": "CONFIDENTIAL", "lock": { "source": "none" } },
      { "type": "files", "name": "OneDrive files", "enabled": true, "dataLabel": "INTERNAL", "lock": { "source": "none" } },
      { "type": "channels", "name": "Teams channels", "enabled": true, "dataLabel": "INTERNAL", "lock": { "source": "none" } },
      { "type": "sharepoint", "name": "SharePoint sites", "enabled": true, "dataLabel": "CONFIDENTIAL", "lock": { "source": "governance", "reason": "Contains CONFIDENTIAL data — disabling requires admin approval" } },
      { "type": "urls", "name": "External websites", "enabled": true, "dataLabel": "PUBLIC", "lock": { "source": "none" } }
    ]
  },
  "editable": {},
  "governance": {
    "warnings": ["Email access is CONFIDENTIAL — governance requires audit trail for all reads"]
  },
  "writeBack": { "method": "PATCH", "url": "/api/chunks/memory/knowledge" }
}
```

#### PATCH /api/chunks/connections/outlook (write-back)

The dev sends the edited chunk data back:

```json
{
  "tools": [
    { "tool": "send-email", "enabled": true },
    { "tool": "read-email", "enabled": true },
    { "tool": "timely-updates", "enabled": true }
  ]
}
```

`claws serve` handles:
1. Validates the edit (rejects disabling R5 approval)
2. Maps to the correct OC file (TOOLS.md)
3. Writes the edit (lossless — preserves other content)
4. Triggers recompilation
5. Returns the updated chunk with new governance context

```json
{
  "status": "ok",
  "recompiled": true,
  "updatedChunk": { "...same shape as GET, with updated governance..." }
}
```

### Why Chunks Work for Partners

| Concern | Without chunks | With chunks |
|---------|---------------|-------------|
| What file do I edit? | Dev must know TOOLS.md vs SOUL.md vs MEMORY.md | Dev posts to `/api/chunks/{tab}/{section}` |
| What fields exist? | Dev parses markdown | Dev reads `data` object |
| What's editable? | Dev guesses | Dev reads `editable` schema |
| What's locked? | Dev doesn't know about R5 or fleet policy | `lock.source: 'r5' \| 'fleet'` with reason |
| What's the governance context? | Dev doesn't know about risk levels | `governance.riskLevel`, `governance.warnings` |
| How do I save? | Dev writes OC markdown files | Dev POSTs JSON to `writeBack.url` |
| Did my edit break anything? | Dev has no visibility | Response includes recompilation result |

Partners build UI components. `claws serve` handles the governance plumbing.

---

## Incremental Compilation via the Compilation Forest

`claws serve` recompiles after every PATCH. This must be fast (<200ms for single-file
edits) to keep the UX responsive. The existing compilation cache (`claws-sdk/src/compile/cache.ts`)
uses composite SHA-256 hashing of all 9 source files — a cache hit skips recompilation
entirely. But a single-field edit in TOOLS.md invalidates the entire cache.

### Per-File Dependency Graph

The 5-phase compilation pipeline (PARSE → EXTRACT → ANALYZE → OPTIMIZE → EMIT) has
known per-file dependencies:

```
File changed          Phases that must re-run    Phases that can skip
─────────────         ─────────────────────────  ─────────────────────
SOUL.md               PARSE(soul) → EXTRACT →    PARSE(tools, agents, ...)
                      ANALYZE → OPTIMIZE → EMIT

TOOLS.md              PARSE(tools) → EXTRACT →   PARSE(soul, agents, ...)
                      ANALYZE → OPTIMIZE → EMIT

AGENTS.md             PARSE(agents) → EXTRACT →  PARSE(soul, tools, ...)
                      ANALYZE → OPTIMIZE → EMIT

MEMORY.md             PARSE(memory) → EXTRACT    ANALYZE (if no data label changes)
                                                  → skip OPTIMIZE → partial EMIT

HEARTBEAT.md          PARSE(heartbeat) → EMIT    EXTRACT → ANALYZE → OPTIMIZE
                      (schedule-only change)      (governance unchanged)

USER.md               PARSE(user) → EMIT         EXTRACT → ANALYZE → OPTIMIZE
                      (pre-auth change only)      (governance unchanged)

IDENTITY.md           PARSE(identity) → EXTRACT  ANALYZE (if no trust tier change)

claws.json            Full recompile             (config change = cache bust)
```

### Per-Phase Cache

Each phase caches its output keyed by its input hash:

```typescript
// Existing: CompilationCache in claws-sdk/src/compile/cache.ts
// Extension: per-phase cache entries

interface PhaseCache {
  /** Per-file content hashes. */
  fileHashes: Record<string, string>;

  /** Per-phase output hashes — skip a phase if its inputs haven't changed. */
  phaseOutputs: {
    parse: Record<string, string>;   // per-file parse results
    extract: string;                  // manifest hash
    analyze: string;                  // GovernanceIR hash
    optimize: string;                 // optimized IR hash
    emit: Record<string, string>;     // per-artifact hashes
  };
}
```

### PATCH → Incremental Recompile Flow

```
PATCH /api/chunks/connections/outlook
  { tools: [{ tool: 'timely-updates', enabled: true }] }
     |
     v
1. Validate (write-time validation layer)
     |
     v
2. Write TOOLS.md (lossless edit)
     |
     v
3. Hash TOOLS.md → compare with phaseCache.fileHashes['TOOLS.md']
   → CHANGED
     |
     v
4. Re-run PARSE for TOOLS.md only (other files: cache hit)
   → ~5ms (single file parse)
     |
     v
5. Re-run EXTRACT (manifest changed because tool list changed)
   → ~10ms
     |
     v
6. Re-run ANALYZE (governance rules applied to new manifest)
   → ~15ms
     |
     v
7. Check OPTIMIZE output hash — if rules unchanged, skip
   → ~0ms (cache hit) or ~5ms (reoptimize)
     |
     v
8. Re-run EMIT for affected artifacts only
   - host-approval-policies.json: re-emit (tool changed)
   - exec-approvals.json: re-emit
   - Gateway plugin: re-emit
   - SKILL.md: skip (no soul change)
   - lobster.compiled.yaml: skip (no workflow change)
   → ~10ms
     |
     v
Total: ~40ms (vs ~200ms full recompile)
```

### Cache Location

```
.claws/cache/
  hashes.json          — composite hash (existing)
  phase-cache.json     — per-phase output hashes (new)
  parse/               — cached parse results per file
  extract/             — cached capability manifest
  analyze/             — cached GovernanceIR
  emit/                — cached artifact hashes
```

The CompilationHost (`claws-serve/src/compilation-host.ts`) already does hash-based
skip for the full pipeline. The extension adds per-phase granularity using the same
`hashContent()` function.

### Compilation Queue (P-273)

Concurrent PATCHes (e.g., two CAP tabs editing TOOLS.md and SOUL.md simultaneously)
must not produce a mixed-state compilation. The compilation pipeline is serialized
via a single-consumer FIFO queue:

1. PATCH writes the file and enqueues a `dirty(file)` event
2. The compilation worker dequeues events, accumulates a dirty-file set
3. After a short debounce (50ms), the worker runs ONE incremental recompile
   covering all dirty files in the set (coalesced compilation)
4. The worker clears the dirty set and returns the result to all waiting PATCHes

This means two rapid PATCHes produce one recompilation, not two. The per-phase
cache correctly handles multi-file changes because the dirty set includes all
changed files. Queue depth is bounded (max 100 pending edits; 101st returns 429).

### Startup Health Check (P-274)

On startup, `claws serve` runs a health check:
1. Check if `.claws/cache/` exists and is consistent
2. Compare OC file hashes against last-compiled hashes in `phase-cache.json`
3. If any file hash differs (write-without-compile state from a crash), force
   full recompilation before accepting requests
4. Health endpoint returns `{ status: 'recovering' }` during startup recompile,
   `{ status: 'ready' }` after. Requests during recovery get 503.

---

## Write Path Architecture

### OC_PROTECTED_FILES Resolution

The existing `claws-sdk/src/amend/apply.ts` has an `OC_PROTECTED_FILES` invariant
that prohibits claws from modifying the 9 OC workspace files. This is correct for
the compiler — claws reads OC files, it doesn't author them.

`claws serve` writes are a different concern: **structured workspace edits**
requested by an authenticated admin through a validated API. These go through a
new `claws-sdk/src/workspace-edit/` module that:

1. Is separate from `amend/apply.ts` (the compiler's sidecar writer)
2. Has its own invariant: `EDITABLE_FILES` allowlist (the 9 OC files + claws.json)
3. Routes ALL edits through the write-time validation layer
4. Preserves the lossless guarantee (structured edits, not raw writes)
5. Emits audit events for every edit

The `amend/apply.ts` invariant is unchanged — the compiler never writes OC files.
The `workspace-edit` module is the admin's structured edit surface.

### Unified Validation for All Write Paths

All write paths route through the same validation layer. No bypass.

```
PATCH /api/chunks/{tab}/{section}  ─┐
PATCH /api/loop/soul               ─┤
PATCH /api/loop/memory             ─┼──► Write-Time Validation Layer ──► workspace-edit
PATCH /api/trust/escalate          ─┤       (claws-sdk)                   (claws-sdk)
POST  /api/onboard                 ─┤
POST  /api/skills/install          ─┘
```

The validation layer:
1. **R5 enforcement**: Rejects any edit that disables R5 approval
2. **Fleet lock check**: Rejects edits to fleet-locked fields. **Fleet policy load must fail-closed (P-272)**: if the fleet policy file is missing, corrupt, or unreachable, ALL fleet-lockable fields are treated as locked. No silent fallback to unlocked.
3. **Governance validation**: Checks edit against compiled GovernanceIR. **Deny rule detection uses GovernanceIR registry (P-276)**, not regex patterns. A "deny rule" is text that maps to a compiled G-INPUT deny intent in the GovernanceIR. This avoids false positives from regex matching ("Never" in prose that isn't a governance boundary).
4. **Deny rule provenance (P-277)**: GovernanceIR must tag each deny intent as `compiler-injected` (from R5 enforcement or template) or `user-authored` (from SOUL.md text). Compiler-injected deny rules cannot be removed via any write path. User-authored deny rules produce a governance warning on removal but are not blocked.
5. **Content validation**: For `/api/onboard`, validates seeded content before writing. **Default deny rules are immutable (P-282)**: template deny rules are always present in generated SOUL.md, even if the transcript says "I don't want restrictions."
6. **Authorization**: For `/api/trust/escalate`, verifies manager approval

### Trust Escalation Authorization

`PATCH /api/trust/escalate` requires:

```typescript
interface TrustEscalationRequest {
  /** Target tier. Must be currentTier + 1 (no skipping). */
  targetTier: TrustTier;
  /** Manager approval token (obtained via approval event flow). */
  managerApprovalToken: string;
  /** Reason for escalation. */
  reason: string;
}
```

The flow:
1. Companion App calls `GET /api/trust` — sees `nextEscalation.requirements`
2. If `managerApproved: false`, Companion App triggers an approval request
   (ApprovalRequestEvent from CL-12) to the manager
3. Manager approves → Companion App receives ApprovalResponseEvent with token
4. Companion App calls `PATCH /api/trust/escalate` with the token
5. Validation layer verifies the token, writes AGENTS.md trust tier, recompiles

No trust escalation without manager approval. No tier skipping.

**JWT verification (P-279)**: The `managerApprovalToken` is a JWT that must be
verified with:
1. **Signature**: Verified against the server's signing key (not just structure check)
2. **Audience**: Must match this agent's identity (prevents token reuse across agents)
3. **Subject**: The `sub` claim must map to a user with manager authority over this
   agent (verified against AGENTS.md delegation chain)
4. **Expiry**: Short-lived (5 minute TTL) to prevent replay
5. **One-time use**: Token ID (`jti`) tracked in a seen-set; replayed tokens rejected

### Onboard Content Validation

`POST /api/onboard` accepts a conversation transcript and seeds SOUL.md + MEMORY.md:

```typescript
interface OnboardRequest {
  /** Conversation transcript from the onboarding call. */
  transcript: string;
  /** Extracted preferences (structured by the onboarding bot). */
  preferences: {
    name?: string;
    priorities?: string[];
    workingStyle?: string;
    schedule?: { startOfDay?: string; briefingPreference?: string };
  };
}
```

Validation before writing:
1. **Content scan**: `@openclaw/secret-scanner` checks transcript for credentials
2. **Size limit**: Transcript capped at 50KB
3. **Injection defense**: No executable content, no frontmatter injection
4. **Governance seed**: Generated SOUL.md includes default deny rules (never removed by onboarding)

---

## Implementation Path

### Phase 1: Read APIs (CAP Settings + Companion App)

1. **`claws serve` command** — already wired in claws-cli (Pulse 788fa0fd7). Add
   the API routes and workspace file parser. Business logic in claws-sdk.
2. **Chunk API** — `GET /api/chunks/{tab}/{section}` for CAP settings partners.
   Self-contained JSON with `data`, `editable`, `governance`, `writeBack`.
3. **Governance + tools + identity** — `GET /api/governance`, `/api/tools`,
   `/api/identity` for the Companion App.
4. **SSE** — `GET /api/events` wired to `claws watch` file watcher.

### Phase 2: Write APIs (CAP Settings)

5. **Chunk PATCH** — `PATCH /api/chunks/{tab}/{section}` with validation,
   lossless file write, auto-recompilation, and governance result in response.
6. **R5 enforcement** — PATCH rejects any edit that would disable R5 approval.
   `locked` fields in chunks are server-enforced, not just UX hints.
7. **Audit trail** — every PATCH produces an audit event via @openclaw/audit-chain.

### Phase 3: Lobster Collaboration Surfaces

8. **Loop sync** — `GET/PATCH /api/loop/soul` and `/api/loop/memory`. Sections
   as Loop-syncable units. Bidirectional: Loop → OC file → claws build, and
   PATCH → OC file → Graph API → Loop page.
9. **Schedule as calendar** — `GET /api/schedule` returns HEARTBEAT.md as
   calendar-renderable events with recurrence rules.
10. **Work queue** — `GET /api/workqueue` as a runtime task list. Bridges
    HEARTBEAT.md (static schedule) with runtime state. Returns Planner task IDs.
11. **Trust API** — `GET /api/trust` with escalation history and next-tier
    requirements. `PATCH /api/trust/escalate` for manager-approved promotion.

### Phase 4: Companion App

12. **Skills store** — `GET /api/skills`, `POST /api/skills/install`.
13. **Audit query** — `GET /api/audit` backed by @openclaw/audit-chain.
14. **Fleet** — `GET /api/fleet/claws` for multi-claw management.

### Phase 5: Onboarding

15. **Onboard API** — `POST /api/onboard` seeds SOUL.md and MEMORY.md from
    an onboarding conversation transcript (Teams voice call → structured files).

### Partner Handoff Points

| Phase | What Partners Can Build | API They Use |
|-------|------------------------|-------------|
| 1 | CAP settings tabs (read-only) | Chunk GET |
| 2 | CAP settings tabs (editable) | Chunk GET + PATCH |
| 3 | Calendar integration, To Do integration | /api/schedule, /api/workqueue |
| 3 | Loop page sync | /api/loop/* |
| 4 | Companion App management UX | /api/governance, /api/trust, /api/audit |
| 5 | Teams onboarding bot | /api/onboard |
