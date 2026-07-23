# CL-10: CAP Integration & Serve API

**Status**: Draft
**Source**: CAP Product Day 09/25 (Figma), Project Lobster (Sheppard/Shahine, April 2026)
**Reviewers**: founder, gateway-eng, skill-author, new-hire

---

## Overview

Three UX surfaces need governance data from claws. Each serves a different audience
with a different interaction model, but all read/write the same 9 OC workspace files:

| Surface                   | Audience      | Interaction Model                                    | What They Need from claws                                   |
| ------------------------- | ------------- | ---------------------------------------------------- | ----------------------------------------------------------- |
| **CAP Agent Settings**    | Admin/manager | Form-based configuration (6 tabs)                    | Chunks: self-contained JSON blobs per tab section           |
| **Lobster Collaboration** | End user      | Collaborative editing (Loop, Teams, Calendar, To Do) | Sync: OC files ↔ M365 surfaces, governance context          |
| **Companion App**         | Power user/IT | Skills store + trust controls + activity log         | Full API: governance summary, audit trail, trust escalation |

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

## Quick Start for Partners

Five steps to read and edit governance data through `claws serve`:

```bash
# 1. Start the serve process
claws serve --workspace ./my-agent
```

```bash
# 2. Read a chunk (e.g., the Connections tab)
GET /api/chunks/connections
# Returns: typed JSON with per-tool risk levels, lock sources, editability
```

```bash
# 3. Render the chunk in your UI
# Each tool in the response has: enabled, risk, lock, editable, writeBack
```

```bash
# 4. Toggle a tool via chunk PATCH
PATCH /api/chunks/connections/outlook
Content-Type: application/json
{ "op": "toggle", "tool": "timely-updates", "enabled": true }
# Returns: PatchResult with updated governance state
```

```bash
# 5. Observe the governance result
# If the tool is R5-locked, the PATCH returns a PatchError with code R5_NON_NEGOTIABLE.
# If the tool is fleet-locked, the PATCH returns FLEET_LOCK_VIOLATION.
# If successful, SSE pushes a live update to all connected clients.
```

Everything below provides the detail behind these five steps: the full tab-by-tab
mapping, the 3-layer architecture, chunk schemas, error codes, and write-path
validation.

---

## Tab-by-Tab Mapping

### 1. General (slide 39)

| UI Element                         | OC File         | Field / Section       | claws Governance Role                                        |
| ---------------------------------- | --------------- | --------------------- | ------------------------------------------------------------ |
| Avatar (picture, video, generated) | **--**          | _No OC file_          | None — visual identity is outside governance scope           |
| Agent name                         | **IDENTITY.md** | `name`                | G-A2A-IDENTITY: agent name in delegation chains              |
| Agent description                  | **IDENTITY.md** | `description`         | G-CLASS: description fed to capability extraction heuristics |
| Agent language                     | **--**          | _No OC file_          | None — locale is a platform concern                          |
| Managed by (person + role)         | **AGENTS.md**   | `delegation.owner`    | G-A2A-DELEGATE: owner trust chain, who can modify governance |
| Delete agent                       | **--**          | _Lifecycle operation_ | Out of scope — claws compiles, doesn't manage lifecycle      |

**Gaps in OC files**: No `avatar` or `language` field. IDENTITY.md covers name/description but not visual identity or locale.

### 2. Preferences (slide 40)

| UI Element                                     | OC File          | Field / Section                    | claws Governance Role                                        |
| ---------------------------------------------- | ---------------- | ---------------------------------- | ------------------------------------------------------------ |
| Custom prompt ("Write a status report for...") | **SOUL.md**      | `## Instructions` / `## Behavior`  | G-INPUT: boundary extraction, deny rule source               |
| Add reviewers (Alice Johnson)                  | **USER.md**      | `pre_authorizations` / `reviewers` | G-ELICIT: standing approvals, who can approve R3+ tool calls |
| Start date / End date                          | **HEARTBEAT.md** | `schedule.start` / `schedule.end`  | G-BOUND: scheduling constraints                              |
| Time (3:00 PM)                                 | **HEARTBEAT.md** | `schedule.time`                    | G-BOUND: execution window                                    |
| Frequency (Weekly)                             | **HEARTBEAT.md** | `schedule.frequency`               | G-BOUND: recurrence pattern                                  |

**Gaps in OC files**: None — full coverage. SOUL.md, USER.md, and HEARTBEAT.md together cover everything in the Preferences tab.

### 3. Connections (slides 41-42)

| UI Element                                           | OC File                    | Field / Section              | claws Governance Role                           |
| ---------------------------------------------------- | -------------------------- | ---------------------------- | ----------------------------------------------- |
| Connection list (Planner, Outlook, Asana)            | **TOOLS.md**               | Tool declarations            | G-CLASS: per-tool risk classification (R1-R5)   |
| Per-connection skill count ("2 skills enabled")      | **skills/**                | Skill directory              | Compiled skill manifest                         |
| Drill-in: per-skill toggle (Tool integration ON/OFF) | **TOOLS.md**               | Per-tool `requires_approval` | G-ELICIT: maps to `host-approval-policies.json` |
| "Allow all" button                                   | **USER.md**                | `pre_authorizations: all`    | G-ELICIT: blanket standing approval             |
| "Add a connection"                                   | **TOOLS.md** + **skills/** | New tool/skill registration  | New tool enters G-CLASS pipeline                |

**Gaps in OC files**: None structurally. But the UX shows connections as app-level (Planner, Outlook) while OC models them as MCP servers + individual tools. The UX aggregates tools by server — claws classifies per-tool. The mapping needs a `server → tool[]` grouping layer.

**Gaps in UX**: The toggle is binary (ON/OFF) but claws classifies tools at R1-R5 with nuanced approval policies. The UX doesn't show:

- Risk level per tool (R1-R5)
- Why a tool is gated (governance reason)
- Fleet policy overrides vs. local toggles

### 4. Memory & Knowledge (slides 43-44)

| UI Element                                     | OC File                      | Field / Section         | claws Governance Role                       |
| ---------------------------------------------- | ---------------------------- | ----------------------- | ------------------------------------------- |
| Personal memories (about the user)             | **MEMORY.md**                | `personal` section      | G-DATA: sensitivity labels on personal data |
| Shared memories (about the group)              | **MEMORY.md**                | `shared` section        | G-DATA: sensitivity labels on shared data   |
| Knowledge sources: Email                       | **MEMORY.md** + **TOOLS.md** | Data access declaration | G-DATA: data source classification          |
| Knowledge sources: Files                       | **MEMORY.md** + **TOOLS.md** | Data access declaration | G-DATA: file access sensitivity             |
| Knowledge sources: Channels                    | **MEMORY.md** + **TOOLS.md** | Data access declaration | G-DATA: channel data classification         |
| Knowledge sources: SharePoint sites            | **MEMORY.md** + **TOOLS.md** | Data access declaration | G-DATA: SharePoint sensitivity              |
| Knowledge sources: Tables                      | **MEMORY.md** + **TOOLS.md** | Data access declaration | G-DATA: structured data classification      |
| Knowledge sources: Files (file list)           | **MEMORY.md**                | `knowledge.files`       | G-DATA: per-file sensitivity                |
| Knowledge sources: Websites with access review | **MEMORY.md**                | `knowledge.urls`        | G-DATA: external URL allowlist              |
| "Delete all memories"                          | **--**                       | _Lifecycle operation_   | Out of scope for compilation                |

**Gaps in OC files**: MEMORY.md has a flat structure today. The CAP UI distinguishes 7 knowledge source types (email, files, channels, SharePoint, tables, files, websites) each with individual access review. MEMORY.md would need a structured `knowledge_sources` section with per-source type and access configuration.

**Gaps in UX**: No visibility into data sensitivity labels (CONFIDENTIAL, RESTRICTED, etc.) that claws applies to memory/knowledge. The admin sees sources but not their governance classification.

### 5. Groups (slide 45)

| UI Element                                 | OC File         | Field / Section       | claws Governance Role                               |
| ------------------------------------------ | --------------- | --------------------- | --------------------------------------------------- |
| M365 Groups (distribution lists, channels) | **--**          | _No direct OC file_   | G-A2A: group membership defines delegation scope    |
| Security Groups                            | **IDENTITY.md** | `groups` (partial)    | G-A2A-IDENTITY: security group → trust tier mapping |
| On-Premise Groups                          | **--**          | _No direct OC file_   | None — on-premise groups are AD-specific            |
| Remove group membership                    | **--**          | _Lifecycle operation_ | Out of scope                                        |

**Gaps in OC files**: Significant. OC has no concept of organizational group membership. IDENTITY.md covers the agent's own identity, and AGENTS.md covers delegation, but neither models "this agent is a member of these M365 groups." This is an M365-specific concept that maps to:

- Who can interact with the agent (audience)
- What data the agent can access (scope)
- Trust tier assignment (via `@openclaw/identity-bridge` role mapping)

A new OC file or IDENTITY.md extension would be needed.

### 6. Entitlements (slide 46)

| UI Element                                  | OC File         | Field / Section          | claws Governance Role                                  |
| ------------------------------------------- | --------------- | ------------------------ | ------------------------------------------------------ |
| Core Identity (Azure RBAC roles)            | **IDENTITY.md** | `entitlements` / `roles` | G-A2A-IDENTITY: what the agent can do in Azure         |
| Corp Identity Governance (M365 Pulse roles) | **IDENTITY.md** | `governance_roles`       | G-A2A-IDENTITY: governance role assignments            |
| Expiry dates (Expires 06/25/2026)           | **--**          | _No OC field_            | G-BOUND: time-limited entitlements (not modeled today) |
| Link to management portal                   | **--**          | _UX navigation_          | Out of scope                                           |

**Gaps in OC files**: IDENTITY.md doesn't model entitlement expiry or the distinction between "Core Identity" (Azure infra roles) and "Corp Identity Governance" (M365 governance roles). These are M365-specific concepts. The `@openclaw/identity-bridge` package handles role mapping but doesn't model expiry.

---

## Lobster Collaboration Surfaces (Sheppard/Shahine Model)

The Project Lobster vision ("The Lobster, The Laptop, and The License") gives each
agent a full M365 identity: Cloud PC, mailbox, Teams, calendar, To Do, OneDrive,
Loop. The user works WITH the agent through these surfaces — not through a settings
panel.

This creates a second set of API requirements beyond CAP settings:

### Collaboration Surface → OC File Mapping

| M365 Surface           | User Interaction                                  | OC File                               | claws serve API                                                |
| ---------------------- | ------------------------------------------------- | ------------------------------------- | -------------------------------------------------------------- |
| **Teams DM**           | Chat with agent                                   | _(interaction — not config)_          | N/A — runtime, not governance                                  |
| **Teams voice/video**  | Onboarding call, briefings                        | Generates initial SOUL.md + MEMORY.md | `POST /api/onboard` — seed files from conversation             |
| **Teams presence**     | See agent status (Available/Busy/Away)            | _(runtime status)_                    | `GET /api/status` — includes agent state                       |
| **Teams meetings**     | Agent joins, takes notes, tracks actions          | _(interaction)_                       | N/A — runtime                                                  |
| **Teams screen share** | Watch agent work on Cloud PC                      | _(observation)_                       | N/A — runtime                                                  |
| **Outlook mailbox**    | Agent has own email, delegation, Send As/OBO      | IDENTITY.md + TOOLS.md                | `GET /api/chunks/identity` — email config                      |
| **Calendar**           | Cron jobs visible as calendar events              | HEARTBEAT.md                          | `GET /api/schedule` — returns calendar-renderable events       |
| **To Do / Planner**    | Shared work queue — visible task list             | _(new — see below)_                   | `GET /api/workqueue` — agent's active tasks                    |
| **OneDrive**           | Agent's file storage, shared deliverables         | _(file system)_                       | `GET /api/files` — list of deliverables with governance labels |
| **Loop workspace**     | Edit agent's memory + soul as collaborative pages | SOUL.md + MEMORY.md                   | `GET/PATCH /api/loop/soul`, `/api/loop/memory`                 |

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
- **Partial results supported (Dragon F-07)**: Loop edits support PARTIAL application.
  When a Loop edit touches both user-authored content and compiler-injected rules,
  the validation layer applies user content changes but blocks modifications to
  compiler-injected rules (R5 deny rules, governance boundaries). The response
  returns `status: "partial_applied"` with an `applied` array (sections that were
  written) and a `blocked` array (compiler-injected spans that were preserved),
  plus governance warnings explaining what was kept and why. This differs from chunk
  PATCH (which is binary pass/fail) because Loop edits operate on free-text sections
  where protected spans are interleaved with user content.

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

#### Session Lifecycle

Sessions are created by the **OC runtime** (Gateway), not by claws. claws serve
discovers and enriches them with governance context:

| Session Type | Who Creates It                       | How claws Knows                             |
| ------------ | ------------------------------------ | ------------------------------------------- |
| `main`       | User opens Teams chat / ClawPilot DM | OC Gateway event                            |
| `cron`       | HEARTBEAT.md schedule fires          | claws-serve reads HEARTBEAT.md + OC runtime |
| `channel`    | Agent added to a Teams channel       | OC Gateway event                            |
| `agent`      | Main agent delegates via AGENTS.md   | OC Gateway event                            |

#### Sessions and the 9 Files

All sessions **share the same 9 workspace files** — one SOUL.md, one TOOLS.md, one
MEMORY.md per agent. But sessions have **different views** of those files:

```
TOOLS.md (12 tools)
    |
    +-- main session:      sees all 12 tools (full workspace permissions)
    +-- cron:daily-triage:  sees 3 tools (R1-R2 default + explicit pre-auth)
    +-- channel:design:     sees 8 tools (channel-scoped subset)
    +-- agent:scout:        sees 6 tools (delegated subset, trust T1)
```

The files are shared. The **session tool resolver** computes a scoped view per session.

#### Two Kinds of Edits

| Edit Type          | Scope        | API                              | What Changes                              | Who Sees It          |
| ------------------ | ------------ | -------------------------------- | ----------------------------------------- | -------------------- |
| **Workspace edit** | All sessions | `PATCH /api/chunks/*`            | Shared OC files (TOOLS.md, SOUL.md, etc.) | Every session (live) |
| **Session config** | One session  | `PATCH /api/sessions/:id/config` | Per-session settings                      | Only this session    |

Workspace edits are the chunk PATCH path — write-time validation, incremental
recompile, all sessions see the change because tool permissions are computed live.

**User-facing session impact (Navigator N-09)**: Chunk PATCH responses include a
`sessions_affected` array showing which sessions will see the change. For workspace
edits, this lists all active sessions (since workspace files are shared). For session
config edits, this lists only the targeted session. This makes the session model
visible to users: "When you change a tool's approval policy in Settings, it affects
every session -- your chat, your cron jobs, your delegated agents. Session-scoped
changes only apply to one session."

Session config edits modify per-session settings stored in:

- **HEARTBEAT.md** for cron sessions (tool subset, schedule, parameters)
- **AGENTS.md** for delegated agent sessions (tool allowlist, trust tier)
- **Runtime state** for channel sessions (channel-scoped config)

Session config edits also route through the write-time validation layer (same
R5/fleet/governance enforcement). Delegated agent sessions cannot add tools that
the delegating session does not have. The validation layer checks the delegator's
tool set as a ceiling -- any tool in the resulting agent tool set must exist in the
delegating session's resolved tool set.

#### Workspace Introspection API

Partners and the TUI need a "what do I have?" endpoint that enumerates all files,
sections, sessions, and editability:

```json
GET /api/workspace/schema
{
  "files": [
    {
      "file": "SOUL.md",
      "exists": true,
      "sections": [
        { "name": "Instructions", "editable": true, "chunk": "preferences/instructions" },
        { "name": "Boundaries", "editable": true, "governance": { "denyRules": 2 } }
      ]
    },
    {
      "file": "TOOLS.md",
      "exists": true,
      "sections": [
        { "name": "Tools", "editable": true, "chunk": "connections/*", "toolCount": 12 }
      ]
    },
    {
      "file": "MEMORY.md",
      "exists": true,
      "sections": [
        { "name": "Personal", "editable": true, "chunk": "memory/knowledge" },
        { "name": "Shared", "editable": true },
        { "name": "Knowledge Sources", "editable": true, "sourceCount": 5 }
      ]
    },
    {
      "file": "IDENTITY.md",
      "exists": true,
      "sections": [
        { "name": "Identity", "editable": true, "chunk": "general/identity" }
      ]
    },
    {
      "file": "AGENTS.md",
      "exists": true,
      "sections": [
        { "name": "Delegation", "editable": true },
        { "name": "Trust", "editable": true, "chunk": "trust" }
      ]
    },
    {
      "file": "USER.md",
      "exists": true,
      "sections": [
        { "name": "Pre-authorizations", "editable": true },
        { "name": "Reviewers", "editable": true, "chunk": "preferences/reviewers" }
      ]
    },
    {
      "file": "HEARTBEAT.md",
      "exists": true,
      "sections": [
        { "name": "Schedule", "editable": true, "chunk": "schedule", "eventCount": 3 }
      ]
    },
    { "file": "skills/", "exists": true, "type": "directory", "skillCount": 6 },
    { "file": "lobster.yaml", "exists": false }
  ],
  "sessions": [
    { "id": "main", "type": "main", "status": "running", "toolCount": 12 },
    { "id": "cron:daily-triage", "type": "cron", "status": "scheduled", "toolCount": 3 }
  ],
  "governance": {
    "compilationStatus": "clean",
    "lastCompiled": "2026-04-15T10:30:00Z"
  }
}
```

This is the discovery endpoint. Partners call it first to learn what's available,
then call specific chunk endpoints for the data they need. The TUI uses it to
decide which screens to show (e.g., skip Groups screen if IDENTITY.md has no
groups section).

**Session types**:

| Type      | What it is               | Example                           |
| --------- | ------------------------ | --------------------------------- |
| `main`    | Primary user chat        | The DM thread in Teams            |
| `cron`    | Scheduled heartbeat jobs | Daily inbox triage, weekly report |
| `channel` | Channel-scoped sessions  | design-team, engineering          |
| `agent`   | Delegated agent sessions | scout, buddy                      |

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

**Cron pre-authorization is PER-RUN (Dragon F-03)**: Pre-authorization of R3+ tools
in HEARTBEAT.md for cron sessions does NOT grant standing approval. Each cron run
re-evaluates the pre-authorization against the current GovernanceIR at execution
time. If the tool's risk classification changed since the pre-auth was written (e.g.,
R3 reclassified to R5 via capability extraction), the pre-auth is invalidated and
the run falls back to C-1 deny semantics. The audit trail records every
pre-authorized R3+ execution in a cron session with event type
`CRON_PREAUTH_EXECUTED` so SOC review can assess the standing approval's
appropriateness.

### Companion App Surfaces

The Companion App (evolution of ClawPilot) is the management/control plane.
APIs it needs beyond what CAP settings and Lobster collaboration cover:

| Companion Feature                  | API Endpoint                                       | Source                  |
| ---------------------------------- | -------------------------------------------------- | ----------------------- |
| Session overview                   | `GET /api/sessions`                                | OC runtime state        |
| Session detail + run history       | `GET /api/sessions/:id`, `/runs`, `/tools`         | OC runtime + governance |
| Skills store (browse, install)     | `GET /api/skills`, `POST /api/skills/install`      | skills/ directory       |
| Trust controls (authority levels)  | `GET /api/trust`, `PATCH /api/trust/escalate`      | AGENTS.md trust tier    |
| Activity log (full audit timeline) | `GET /api/audit?limit=100&cursor=...&category=...` | @openclaw/audit-chain   |
| Governance dashboard               | `GET /api/governance`                              | Compiled artifacts      |
| Multi-claw management              | `GET /api/fleet/claws`                             | Fleet config            |
| Rate limits, escalation rules      | `GET /api/chunks/config`                           | claws.json              |

---

## Gap Summary

### Things in the CAP UX that OC files DON'T cover

| Priority | CAP Feature                               | Missing From | Proposed Addition                                                                            |
| -------- | ----------------------------------------- | ------------ | -------------------------------------------------------------------------------------------- |
| **P1**   | Per-knowledge-source type classification  | MEMORY.md    | Structured `knowledge_sources` with `type: email\|files\|channels\|sharepoint\|tables\|urls` |
| **P1**   | Knowledge source access review            | MEMORY.md    | `knowledge_sources[].accessReview: true\|false`                                              |
| **P2**   | M365 Group membership                     | All files    | `IDENTITY.md` `groups` section or new `GROUPS.md` file                                       |
| **P2**   | Entitlement expiry dates                  | IDENTITY.md  | `entitlements[].expiresAt` field                                                             |
| **P2**   | Core vs. Corp governance role distinction | IDENTITY.md  | `entitlements.core[]` vs `entitlements.governance[]`                                         |
| **P3**   | Agent language / locale                   | All files    | `IDENTITY.md` `locale` field                                                                 |
| **P3**   | On-Premise Group membership               | All files    | Same as M365 groups                                                                          |
| **P4**   | Agent avatar / visual identity            | All files    | Out of scope — visual identity isn't governance                                              |

Priority: P1 = blocks Phase 1 API, P2 = needed for Phase 2-3, P3 = nice to have, P4 = out of scope.

### Things in OC files / governance that NO UX surfaces today

| Priority | Concept                          | File               | What's Missing                                         | Who Needs It        |
| -------- | -------------------------------- | ------------------ | ------------------------------------------------------ | ------------------- |
| **P1**   | Tool risk classification (R1-R5) | TOOLS.md           | ON/OFF toggles but no risk context.                    | CAP + Companion     |
| **P1**   | Governance compilation status    | `.claws/compiled/` | Can't see if governance is compiled, stale, or errors. | Companion + CAP     |
| **P1**   | Fleet policy overrides           | claws.json         | Can't see which settings are local vs. fleet-enforced. | CAP + Companion     |
| **P2**   | Deny rules                       | SOUL.md            | No deny rule editor anywhere.                          | CAP + Companion     |
| **P2**   | OBO declarations                 | TOOLS.md           | Can't see which tools act as the user.                 | CAP + Companion     |
| **P2**   | Trust tiers (T0-T4)              | AGENTS.md          | Not surfaced. No way to see or set trust tier.         | Companion           |
| **P2**   | Audit trail                      | `.claws/audit/`    | No visibility into governance decisions.               | Companion           |
| **P2**   | Data sensitivity labels          | MEMORY.md          | Sources shown but not classified.                      | CAP + Loop          |
| **P3**   | Trust escalation over time       | AGENTS.md          | Static tiers only. No dynamic "earn trust" model.      | Companion + Lobster |
| **P3**   | Budget / token ceiling           | config             | No budget visibility or controls.                      | Companion           |
| **P3**   | Work queue (active tasks)        | _(none)_           | No OC file for agent's runtime task list.              | Lobster (To Do)     |
| **P3**   | Loop ↔ OC file sync              | SOUL.md, MEMORY.md | No bidirectional sync.                                 | Lobster             |
| **P3**   | Calendar-renderable schedule     | HEARTBEAT.md       | Schedule exists but not as calendar events.            | Lobster (Calendar)  |
| **P4**   | Workflow DAG                     | lobster.yaml       | Multi-step workflows not visible.                      | Companion           |
| **P4**   | Agent presence                   | _(runtime)_        | No status concept in OC files.                         | Lobster (Teams)     |

Priority: P1 = blocks Phase 1 API (partners need this to render chunks), P2 = Phase 2 write path,
P3 = Phase 3 Lobster surfaces, P4 = future.

---

## Proposed API Surface: `claws serve`

A live HTTP/SSE service with 3 layers.

### Three-Layer Architecture

```
                    Consumers
                       |
     +-----------------+-----------------+
     |                 |                 |
 Layer 2           Layer 2           Layer 3
 Chunks            Chunks            Runtime
 (partners)        (TUI)             (governance)
     |                 |                 |
     +--------+--------+                 |
              |                          |
          Layer 1                    Layer 3
          Generic OC API             (not file-backed)
          /api/oc/{path}
              |
              v
       Workspace Parser + GovernanceIR + Session Resolver
              |
              v
       OC Files (9) + .claws/compiled/ + OC Runtime
```

**Layer 1 — Generic OC API** (universal file access via oc:// paths):

| Endpoint                          | Method | Purpose                                                      |
| --------------------------------- | ------ | ------------------------------------------------------------ |
| `/api/oc/`                        | GET    | Workspace schema: all files, sections, sessions, editability |
| `/api/oc/{file}`                  | GET    | Full file with parsed sections + governance context          |
| `/api/oc/{file}/{section}`        | GET    | Specific section with items                                  |
| `/api/oc/{file}/{section}/{item}` | GET    | Specific item with fields                                    |
| `/api/oc/{file}/{section}/{item}` | PATCH  | Edit an item (routes through validation layer)               |
| `/api/oc/{path}?session={id}`     | GET    | Session-scoped view of any path                              |
| `/api/oc/{path}?at={version}`     | GET    | Historical state (version, date, or snapshot)                |
| `/api/diff?from={v}&to={v}`       | GET    | Diff between two versions/snapshots                          |

> **Note on `?session=` (Architect F-07)**: The `?session=` parameter is a query
> filter, not a dependency. Layer 1 resolves sessions from the OC runtime state
> cache, not by calling Layer 3 endpoints. The session resolver reads in-memory
> session state that the runtime populates independently. Layer 1 does not import
> or invoke any Layer 3 route handler. The dependency direction is preserved:
> Layer 3 calls into Layer 1, never the reverse.

All responses include governance context (risk, locks, warnings) and ETag for
versioning. All PATCHes support `?dryRun=true`. The generic API replaces what
would have been 12+ specific endpoints (`/api/tools`, `/api/memory`, `/api/identity`,
`/api/schedule`, `/api/loop/soul`, etc.) — one router, one path parser, one response
builder.

> **oc:// path syntax**: One path. One form. `/`-delimited throughout.
> `oc://TOOLS.md/Tools/send-email` in URIs, `/api/oc/TOOLS.md/Tools/send-email`
> in HTTP. No conversion needed — the path segments are identical. Works in
> oc:// URIs, HTTP APIs, shell scripts, YAML, logs, and audit trails without
> escaping or conversion. `parseOcPath()` parses the single canonical form.

**Layer 2 — Chunk API** (partner convenience, built on Layer 1):

| Endpoint                      | Method | Purpose                                                               |
| ----------------------------- | ------ | --------------------------------------------------------------------- |
| `/api/chunks/{tab}/{section}` | GET    | Self-contained JSON blob assembling multiple oc:// reads + governance |
| `/api/chunks/{tab}/{section}` | PATCH  | Validated edit — resolves to one or more Layer 1 PATCHes              |

Chunks join data from multiple files (e.g., General chunk reads IDENTITY.md +
AGENTS.md), add the `editable` schema, `lock` indicators, `governance` context,
and `writeBack` URL. Partners use chunks. Power users and the TUI can use Layer 1
directly.

> **When to use which layer**: Partners building UI components (CAP settings tabs,
> form-based configuration) use **Layer 2 (chunks)** -- self-contained blobs with
> editability schemas and governance context. Developers building custom integrations,
> debugging tools, or programmatic access use **Layer 1 (generic)** -- direct file and
> section addressing via oc:// paths. Layer 2 internally calls Layer 1.

**Layer 3 — Runtime + Governance** (not file-backed):

| Endpoint                   | Method | Purpose                                                              |
| -------------------------- | ------ | -------------------------------------------------------------------- |
| `/api/governance`          | GET    | Compiled governance summary (risk distribution, gated tools, budget) |
| `/api/sessions`            | GET    | All sessions with type, status, last activity                        |
| `/api/sessions/:id`        | GET    | Session detail: tools, run history, errors                           |
| `/api/sessions/:id/runs`   | GET    | Cron run history                                                     |
| `/api/sessions/:id/tools`  | GET    | Session-scoped tool permissions                                      |
| `/api/sessions/:id/config` | PATCH  | Per-session config (tool subset, schedule)                           |
| `/api/trust`               | GET    | Trust tier + escalation history + progress                           |
| `/api/trust/escalate`      | PATCH  | Manager-approved trust promotion                                     |
| `/api/audit`               | GET    | Audit trail query (cursor-paginated, SARIF export)                   |
| `/api/skills`              | GET    | Available + installed skills                                         |
| `/api/skills/install`      | POST   | Install a skill (triggers recompile)                                 |
| `/api/workqueue`           | GET    | Runtime task list                                                    |
| `/api/onboard`             | POST   | Seed SOUL.md + MEMORY.md from transcript                             |
| `/api/batch`               | POST   | Atomic multi-operation transaction                                   |
| `/api/status`              | GET    | Server health + compilation status                                   |
| `/api/events`              | SSE    | Live updates (file changes, recompilation, session state)            |

**Cross-cutting**: `?dryRun=true` on any PATCH. ETag/If-Match on all GET/PATCH.
All paths in errors, warnings, and audit events use `oc://` syntax.

### Architecture

```
CAP Settings ─── /api/chunks/*           ClawPilot ─── /api/sessions/*
TUI ───────────── /api/oc/*                             /api/governance
VS Code ────────  /api/oc/*              Companion ──── /api/trust, /api/audit
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
    "R1": 3,
    "R2": 2,
    "R3": 4,
    "R4": 2,
    "R5": 1
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
    {
      "rule": "G-ELICIT",
      "tool": "send-email",
      "message": "R5 tool with no standing approval — will gate every call"
    }
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
    {
      "type": "email",
      "name": "Mailbox",
      "enabled": true,
      "dataLabel": "CONFIDENTIAL",
      "accessReview": false
    },
    {
      "type": "files",
      "name": "OneDrive files",
      "enabled": true,
      "dataLabel": "INTERNAL",
      "accessReview": false
    },
    {
      "type": "channels",
      "name": "Teams channels",
      "enabled": true,
      "dataLabel": "INTERNAL",
      "accessReview": false
    },
    {
      "type": "sharepoint",
      "name": "SharePoint sites",
      "enabled": true,
      "dataLabel": "CONFIDENTIAL",
      "accessReview": true
    },
    {
      "type": "urls",
      "name": "External websites",
      "enabled": true,
      "dataLabel": "PUBLIC",
      "accessReview": true
    }
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
    "core": [{ "role": "ZURE-ALL-PSV-EO14117", "type": "Azure RBAC", "expiresAt": "2026-06-25" }],
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

**Defense-in-depth: ALL validators run (Dragon F-04)**: The validation pipeline does
NOT short-circuit on first failure. All validators (R5, fleet, governance, structure)
run regardless of prior failures, and results are collected into a composite
violation set. The response returns ALL violations ranked by severity, not just the
first one encountered. This ensures that (a) the partner sees the full set of issues
to resolve in a single round-trip, and (b) a bug in one validator cannot mask
violations that another validator would catch.

#### Error Response Schema

```typescript
type PatchResult =
  | {
      status: "ok";
      updatedChunk: Chunk;
      governance: GovernanceResult;
      dryRun?: boolean;
      retroactivelyLocked?: string[];
    }
  | { status: "rejected"; error: PatchError; field?: string; message: string; dryRun?: boolean };

type PatchError =
  | "R5_NON_NEGOTIABLE" // Cannot disable R5 approval
  | "FLEET_LOCK_VIOLATION" // Field is locked by fleet policy
  | "R5_EXCLUDED_FROM_ALLOW_ALL" // "Allow all" cannot include R5 tools
  | "GOVERNANCE_VIOLATION" // Edit would create a governance error
  | "INVALID_STRUCTURE" // Edit payload doesn't match file schema
  | "COMPILATION_FAILED" // Recompile produced errors (rolled back)
  | "TRUST_REQUIRES_APPROVAL" // Trust escalation needs manager sign-off
  | "AUTHORIZATION_REQUIRED" // Caller lacks permission for this edit
  | "VERSION_CONFLICT"; // ETag mismatch — workspace modified since last read

// HTTP status codes for PATCH responses (F-01):
// - 200 OK: successful PATCH (status: 'ok')
// - 403 Forbidden: R5_NON_NEGOTIABLE, FLEET_LOCK_VIOLATION, AUTHORIZATION_REQUIRED
//     (governance or permission blocks — the request is understood but denied)
// - 409 Conflict: VERSION_CONFLICT (ETag mismatch — retry with fresh read)
// - 422 Unprocessable Entity: INVALID_STRUCTURE (malformed request body,
//     schema validation failure)

type GovernanceResult = {
  warnings: Array<{ rule: string; message: string }>;
  errors: Array<{ rule: string; message: string }>;
  recompiled: boolean;
  durationMs: number;
  cacheHit: boolean;
  /** Present when workspace is in a degraded state. */
  violations?: PendingViolation[];
};
```

#### Lock Enforcement

Every editable field in a chunk carries a `lock` descriptor:

```typescript
// Lock Enforcement uses the authoritative ItemLock type (see Chunk Format section).
// Derived: locked = source !== 'none'. No explicit locked boolean.
interface FieldEditability {
  type: "string" | "boolean" | "number" | "enum" | "date" | "text" | "object";
  options?: string[];
  required?: boolean;
  lock?: ItemLock;
}
```

`lock.source` tells the UX WHY a field is locked:

- `r5`: R5 non-negotiable — never unlockable
- `fleet`: Fleet policy — contact fleet admin to change
- `governance`: Governance rule requires this value — editing triggers a warning
- `violation`: Policy violation in degraded state — blocked until resolved
- `unclassified`: Tool absent from last-good GovernanceIR — treated as R5 fail-closed
- `none`: Editable

The server enforces locks. A PATCH that attempts to change a field where
`lock.source !== 'none'` returns `{ status: 'rejected', error: 'R5_NON_NEGOTIABLE' | 'FLEET_LOCK_VIOLATION' }`.

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

> **Recompilation ordering (Dragon F-10)**: Allow-all triggers recompilation
> BEFORE computing the response. The response reflects post-recompile governance
> state. If recompilation reclassifies any tool (e.g., R4 promoted to R5 due to
> cross-file OBO detection after enabling), the response includes those tools in
> `still_gated` with a `retroactively_locked` flag and explanation. The partner
> UI never shows "enabled" for a tool that post-recompile is R5-locked.

### Live Updates (SSE)

```
SSE /api/events

event: file_changed
data: { "file": "TOOLS.md", "changedBy": { "source": "patch", "endpoint": "/api/chunks/general", "sessionId": "sess_xyz" }, "timestamp": "..." }

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
import type { RiskClassification } from "@openclaw/approval-events"; // from CL-12

type ChunkTab =
  | "general"
  | "preferences"
  | "connections"
  | "memory"
  | "groups"
  | "entitlements"
  | "trust"
  | "schedule"
  | "workqueue";

type TrustTier = "T0" | "T1" | "T2" | "T3" | "T4";
type DataLabel = "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED";

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
  source: "r5" | "fleet" | "governance" | "violation" | "unclassified" | "none";
  reason?: string;
}

/** A pending governance violation surfaced in degraded states (DEGRADED_R5, etc.). */
interface PendingViolation {
  path: string; // oc:// path to the violating element
  severity: string; // e.g. 'r5', 'warn', 'structural', 'fleet'
  rule: string; // governance rule that triggered the violation
  message: string; // human-readable description
  fixGuidance: string; // remediation instructions (see fix guidance templates)
  scope: "isolated" | "structural"; // whether the fix is local or cross-file
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
    approvalSource: "compiled" | "fleet-override" | "admin";
    lock: ItemLock;
  }>;
  summary: { total: number; enabled: number; gated: number; r5Count: number };
}

interface MemoryData {
  memories: { personal: { count: number }; shared: { count: number } };
  knowledgeSources: Array<{
    type: "email" | "files" | "channels" | "sharepoint" | "tables" | "urls";
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
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    dueAt?: string;
    plannerTaskId?: string;
  }>;
}

// === Field Editability =======================================================

interface FieldEditability {
  type: "string" | "boolean" | "number" | "enum" | "date" | "text" | "object";
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
    /** Structured warnings -- same shape as GovernanceResult.warnings. */
    warnings?: Array<{ rule: string; message: string; path?: string }>;
    fleetOverride?: boolean;
    /** Present in degraded states (DEGRADED_R5, etc.). See Policy Violation State Model. */
    violations?: PendingViolation[];
    /** True when a file changed during cross-file chunk assembly and retries exhausted (P-271). */
    snapshotStale?: boolean;
  };

  /** Write-back. Omitted for read-only chunks (entitlements). */
  writeBack?: { method: "PATCH"; url: string };
}
```

**Key design decision**: Editability for flat fields (name, description, language)
lives in the `editable` record. Editability for array items (tools, knowledge
sources) is embedded per-item in `data` — each tool carries its own `lock` field.
No JSONPath-like query syntax. Partners iterate the array and check each item's lock.

**Authoritative response shape (Navigator N-02)**: The `Chunk<K>` TypeScript interface
above is the authoritative contract for chunk response shapes. Scenario examples
(e.g., S06-chunk-read-connections) are illustrative and may use simplified field
names for readability. When a scenario's expected response shape diverges from the
`Chunk<K>` interface, the interface wins. Partners should build against the typed
interface, not scenario examples.

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
      {
        "type": "email",
        "name": "Mailbox",
        "enabled": true,
        "dataLabel": "CONFIDENTIAL",
        "lock": { "source": "none" }
      },
      {
        "type": "files",
        "name": "OneDrive files",
        "enabled": true,
        "dataLabel": "INTERNAL",
        "lock": { "source": "none" }
      },
      {
        "type": "channels",
        "name": "Teams channels",
        "enabled": true,
        "dataLabel": "INTERNAL",
        "lock": { "source": "none" }
      },
      {
        "type": "sharepoint",
        "name": "SharePoint sites",
        "enabled": true,
        "dataLabel": "CONFIDENTIAL",
        "lock": {
          "source": "governance",
          "reason": "Contains CONFIDENTIAL data — disabling requires admin approval"
        }
      },
      {
        "type": "urls",
        "name": "External websites",
        "enabled": true,
        "dataLabel": "PUBLIC",
        "lock": { "source": "none" }
      }
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

| Concern                        | Without chunks                                 | With chunks                                   |
| ------------------------------ | ---------------------------------------------- | --------------------------------------------- |
| What file do I edit?           | Dev must know TOOLS.md vs SOUL.md vs MEMORY.md | Dev posts to `/api/chunks/{tab}/{section}`    |
| What fields exist?             | Dev parses markdown                            | Dev reads `data` object                       |
| What's editable?               | Dev guesses                                    | Dev reads `editable` schema                   |
| What's locked?                 | Dev doesn't know about R5 or fleet policy      | `lock.source: 'r5' \| 'fleet'` with reason    |
| What's the governance context? | Dev doesn't know about risk levels             | `governance.riskLevel`, `governance.warnings` |
| How do I save?                 | Dev writes OC markdown files                   | Dev POSTs JSON to `writeBack.url`             |
| Did my edit break anything?    | Dev has no visibility                          | Response includes recompilation result        |

Partners build UI components. `claws serve` handles the governance plumbing.

---

## Standard API Patterns

### Universal Path Syntax (`oc://`)

A URI scheme that addresses any piece of the workspace. Used in governance warnings,
audit trail entries, error messages, and cross-references between chunks.

```
oc://{file}[/{section}[/{item}[/{field}]]][?session={id}]

Files:
  oc://TOOLS.md/Tools/send-email              → tool declaration
  oc://TOOLS.md/Tools/send-email/risk         → risk level (R5)
  oc://SOUL.md/Boundaries                      → boundaries section
  oc://SOUL.md/Boundaries/deny-rule-1          → specific deny rule
  oc://MEMORY.md/Knowledge/email               → email knowledge source
  oc://IDENTITY.md/Identity/name               → agent name field
  oc://HEARTBEAT.md/Schedule/daily-triage      → cron job entry
  oc://AGENTS.md/Delegation/scout              → delegated agent config
  oc://USER.md/PreAuthorizations/send-email    → standing approval

Skills:
  oc://skills/email-drafter                    → skill directory
  oc://skills/email-drafter/SKILL.md           → skill manifest
  oc://skills/email-drafter/handler.ts         → skill handler file

Lobster workflows:
  oc://lobster.yaml/steps/triage               → workflow step
  oc://lobster.yaml/steps/triage/tools         → tools used by a step
  oc://lobster.yaml/transitions/triage-to-draft → DAG transition

Sessions:
  oc://TOOLS.md/Tools/send-email?session=cron:daily → session-scoped tool
  oc://sessions/cron:daily-triage              → session itself
  oc://sessions/cron:daily-triage/tools        → session-scoped tool list
  oc://sessions/main/config                    → session config
```

Used in:

- **PatchError messages**: `"R5_NON_NEGOTIABLE at oc://TOOLS.md/Tools/send-email"`
- **Audit events**: `{ path: "oc://TOOLS.md/Tools/create-task", action: "enabled" }`
- **Governance warnings**: `{ rule: "G-ELICIT", path: "oc://TOOLS.md/Tools/send-email" }`
- **Chunk governance context**: `{ warnings: [{ path: "oc://SOUL.md/Boundaries/deny-rule-2", message: "..." }] }`

```typescript
/** Parse an oc:// path into components. */
interface OcPath {
  file: string; // "TOOLS.md"
  section?: string; // "Tools"
  item?: string; // "send-email"
  field?: string; // "risk"
  sessionScope?: string; // "cron:daily-triage" (if session-scoped)
}

function parseOcPath(uri: string): OcPath;
function formatOcPath(path: OcPath): string;
```

> **Single canonical form**: oc:// uses `/` throughout — one form for URIs and HTTP.
> `parseOcPath()` parses this single form. No conversion functions needed. Example:
>
> - `oc://TOOLS.md/Tools/send-email` (oc:// URI)
> - `/api/oc/TOOLS.md/Tools/send-email` (HTTP path — same segments)

**Positional parsing (F-01 -- oc-path-parser-trace)**: The field names (`file`,
`section`, `item`, `field`) are abstract slot names. For directory-style paths like
`oc://skills/email-drafter/SKILL.md`, `file='skills'`, `section='email-drafter'`,
`item='SKILL.md'`. For session paths like `oc://sessions/cron:daily/tools`,
`file='sessions'`, `section='cron:daily'`, `item='tools'`. The parser does not
interpret semantics -- it splits on `/` and assigns positionally.

**Empty segment rejection (F-02 -- oc-path-parser-trace)**: Empty segments are
invalid. Double slashes (`oc://TOOLS.md//Tools`) and trailing slashes
(`oc://TOOLS.md/`) are rejected by `parseOcPath` with an `OcPathError`. This
preserves round-trip fidelity.

### Dry-Run PATCH

`?dryRun=true` on any PATCH endpoint validates the edit and returns what WOULD
happen without writing. Partners show governance impact before the user commits.

```
PATCH /api/chunks/connections/outlook?dryRun=true
{ "tools": [{ "tool": "send-email", "enabled": false }] }

→ {
    "status": "rejected",
    "error": "R5_NON_NEGOTIABLE",
    "field": "oc://TOOLS.md/Tools/send-email/enabled",
    "message": "This tool acts on your behalf (R5). Cannot be disabled.",
    "dryRun": true
  }
```

```
PATCH /api/chunks/connections/outlook?dryRun=true
{ "tools": [{ "tool": "timely-updates", "enabled": true }] }

→ {
    "status": "ok",
    "dryRun": true,
    "governance": {
      "warnings": [{ "rule": "G-ELICIT", "path": "oc://TOOLS.md/Tools/timely-updates", "message": "R3 tool — will require approval" }],
      "errors": [],
      "recompileEstimateMs": 40
    }
  }
```

### Batch Edits

`POST /api/batch` accepts multiple edit operations as a transaction. Either all
succeed or all roll back. The validation layer runs on the combined edit set,
catching cross-field conflicts (e.g., enabling a tool AND removing its deny rule
simultaneously).

**Projected-state validation (Dragon F-05)**: The batch executor validates each
operation against the PROJECTED GovernanceIR that includes the cumulative effect of
all preceding operations in the batch, not the current GovernanceIR applied to each
operation independently. Operations are simulated sequentially: operation 1 is
validated against the current IR, operation 2 is validated against the IR as-if
operation 1 had been applied, and so on. A dry-run recompilation on the combined
edit set runs before any files are written. This prevents scenarios where individually
valid operations produce a combined governance posture that violates invariants.

```json
POST /api/batch
{
  "operations": [
    { "method": "PATCH", "path": "/api/chunks/connections/outlook", "body": { "tools": [{ "tool": "timely-updates", "enabled": true }] } },
    { "method": "PATCH", "path": "/api/chunks/connections/planner", "body": { "tools": [{ "tool": "create-task", "enabled": true }] } },
    { "method": "PATCH", "path": "/api/chunks/preferences/schedule", "body": { "frequency": "Daily" } }
  ],
  "dryRun": false
}

→ {
    "status": "ok",
    "results": [
      { "index": 0, "status": "ok" },
      { "index": 1, "status": "ok" },
      { "index": 2, "status": "ok" }
    ],
    "governance": { "warnings": 1, "errors": 0 },
    "recompiled": true,
    "durationMs": 45
  }
```

If any operation in the batch fails validation, ALL operations are rejected:

```json
→ {
    "status": "rejected",
    "failedAt": 1,
    "error": "FLEET_LOCK_VIOLATION",
    "field": "oc://TOOLS.md/Tools/create-task/enabled",
    "message": "Fleet policy locks Planner tools.",
    "rolledBack": true
  }
```

**Write-ahead log for batch atomicity (P1 -- write-atomicity-trace F:P1)**: Multi-file
batch writes use a WAL (write-ahead log). All temp files are written first, then a
journal entry records the rename set. Renames execute sequentially. If any rename fails,
the journal enables rollback of completed renames on next startup.

**Sandboxed dry-run cache (P7 -- write-atomicity-trace F:P7)**: Batch dry-run uses a
sandboxed compilation cache (in-memory copy). The real per-phase cache is not modified
by dry-run validation. The CompilationHost accepts a `dryRun: boolean` parameter that
prevents all disk writes during compilation. If the batch fails, the sandbox is
discarded. If the batch succeeds, the sandbox is promoted to the real cache.

One recompilation for the entire batch (not per-operation). The compilation queue
coalesces all file writes into a single dirty set.

### Workspace Versioning (ETag)

Each successful edit increments a workspace version. All GET responses include
`ETag`. PATCH requests include `If-Match` to prevent lost updates from concurrent
editors (two CAP tabs editing the same tools simultaneously).

```
GET /api/chunks/connections/outlook
ETag: "v42"
→ { ... chunk data ... }

PATCH /api/chunks/connections/outlook
If-Match: "v42"
→ 200 OK, ETag: "v43"

PATCH /api/chunks/connections/outlook
If-Match: "v41"  (stale!)
→ 409 Conflict
  { "status": "rejected", "error": "VERSION_CONFLICT",
    "currentVersion": "v43", "yourVersion": "v41",
    "message": "Workspace was modified since you last read it. Refresh and retry." }
```

The version is a monotonic counter stored in `.claws/cache/version.json`. Incremented
atomically with each successful write. SSE events include the version number so
clients can detect staleness without polling.

### Time-Travel API (`?at=`)

Any Layer 1 GET endpoint accepts an `?at=` parameter to query historical state.
Three addressing modes:

```
Version-addressed:
  GET /api/oc/TOOLS.md/Tools?at=v38              → state at version 38
  oc://TOOLS.md/Tools?at=v38                     → same target (oc:// form)

Time-addressed:
  GET /api/oc/TOOLS.md/Tools?at=2026-04-14       → state at that date
  oc://TOOLS.md/Tools?at=2026-04-14              → same target (oc:// form)

Named snapshot:
  GET /api/oc/TOOLS.md/Tools?at=snap:pre-upgrade → saved snapshot state
  oc://TOOLS.md/Tools?at=snap:pre-upgrade        → same target (oc:// form)
```

**ETag on time-travel responses (F-02)**: Time-travel responses (`?at=`) return the
HISTORICAL version in the `ETag` header (e.g., `ETag: "v38"`), not the current
workspace version. This prevents stale-write errors when the caller doesn't intend
to write — a client reading `?at=v38` gets `ETag: "v38"`, so a subsequent PATCH
with `If-Match: "v38"` will correctly fail with 409 VERSION_CONFLICT if the
workspace has advanced past v38.

**Backed by three existing systems**:

| Source                             | What it stores                            | Addressing                         |
| ---------------------------------- | ----------------------------------------- | ---------------------------------- |
| Compilation forest per-phase cache | GovernanceIR + parsed AST per version     | `?at=v{N}`                         |
| `claws snap save/restore`          | Named workspace snapshots                 | `?at=snap:{name}`                  |
| Workspace versioning               | Version counter + file hashes per version | `?at={ISO date}` (nearest version) |

**`changedBy` structured type (F-03)**: All `changedBy` fields in diff responses
and SSE events use a structured object, not a free-form string:

```typescript
type ChangedBy = {
  source: "patch" | "external" | "oc_runtime" | "recompilation";
  endpoint?: string; // present when source is 'patch'
  sessionId?: string; // present when source is 'patch' or 'oc_runtime'
};
```

**Diff endpoint**:

```json
GET /api/diff?from=v38&to=v43

{
  "from": "v38",
  "to": "v43",
  "changes": [
    {
      "path": "oc://TOOLS.md/Tools/timely-updates",
      "type": "modified",
      "field": "enabled",
      "before": false,
      "after": true,
      "changedAt": "v40",
      "changedBy": {
        "source": "patch",
        "endpoint": "/api/chunks/connections/outlook",
        "sessionId": "sess_abc123"
      }
    },
    {
      "path": "oc://TOOLS.md/Tools/send-email/risk",
      "type": "modified",
      "field": "level",
      "before": 3,
      "after": 5,
      "changedAt": "v42",
      "changedBy": {
        "source": "recompilation"
      }
    }
  ],
  "summary": { "added": 0, "modified": 2, "removed": 0 }
}
```

**Use cases**:

| Use Case                                             | API Call                                                                 |
| ---------------------------------------------------- | ------------------------------------------------------------------------ |
| "When did send-email become R5?"                     | `GET /api/diff?from=v1&to=current` filtered to that tool                 |
| "What changed in the last upgrade?"                  | `GET /api/diff?from=snap:pre-upgrade&to=current`                         |
| "Show me governance state when this cron job failed" | `GET /api/oc/TOOLS.md?at=v38` (version from audit event)                 |
| "Roll back this one tool change"                     | Diff shows before value → PATCH to restore it                            |
| "Audit correlation"                                  | Audit event says `version: 42` → `GET /api/oc/?at=v42` shows exact state |

**Retention**: Version history is bounded by the compilation forest cache size
(configurable, default: last 100 versions). Named snapshots are unbounded (user
manages via `claws snap prune`). Time-addressed queries resolve to the nearest
cached version.

**Historical state safety**: Historical responses include a `historical: true` flag
and a warning: "This is historical state -- risk classifications may have changed.
Do not use for current enforcement decisions." The TUI renders historical state in
a muted/dimmed style. The session tool resolver MUST reject governance data from
historical versions -- only current GovernanceIR feeds tool authorization.

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
    parse: Record<string, string>; // per-file parse results
    extract: string; // manifest hash
    analyze: string; // GovernanceIR hash
    optimize: string; // optimized IR hash
    emit: Record<string, string>; // per-artifact hashes
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

## OpenClaw Runtime Writes

The OC runtime writes to workspace files directly — these bypass the claws serve API:

| OC Runtime Event                | File Modified       | Governance Impact                               |
| ------------------------------- | ------------------- | ----------------------------------------------- |
| Agent learns a preference       | MEMORY.md           | Data label may change (INTERNAL → CONFIDENTIAL) |
| User approves tool in OC UI     | exec-approvals.json | Pre-authorization added                         |
| Agent delegates                 | AGENTS.md           | Trust chain changes, new session created        |
| Skill installed via marketplace | skills/ directory   | New tools enter risk classification             |
| Workflow step completes         | lobster.yaml        | Workflow governance state changes               |
| Session state saved             | Various             | Session config may drift from compiled state    |

### Detection and Response

1. **File watcher detects the change** (same as external edits — debounced, oc:// path in SSE)
2. **Auto-snapshot** before recompile: `claws snap save --auto` creates a timestamped snapshot in `.claws/snapshots/auto/{version}`. Bounded to last 20 auto-snapshots.
3. **Recompile** with the new file content
4. **If violations found**: enter severity-based state (see below)
5. **SSE events**: `oc_runtime_write` event with oc:// path + diff from auto-snapshot
6. **OneDrive sync**: if workspace is on OneDrive (Lobster model), the file watcher also detects OneDrive sync events. Same pipeline: detect → auto-snapshot → recompile → report. OneDrive sync detection is implemented via a pluggable detector interface. The default detector handles Windows rename-and-replace patterns. The trigger type is simplified to `api | external` with attribution detail in extensible metadata (e.g., `{ detector: 'onedrive', device: '...', cloudTimestamp: '...' }`).

### Auto-Snapshot Contract

Every external write (OC runtime, VS Code, OneDrive sync) triggers an auto-snapshot
of the PREVIOUS state before recompilation. This means:

- `GET /api/diff?from=auto:previous&to=current` shows exactly what OC changed
- `PATCH /api/oc/...?at=auto:previous` lets the admin see the pre-change state
- Rollback is possible: restore the auto-snapshot if the OC write violated policy

Auto-snapshots ARE compilation forest entries tagged with `snapshotType: 'auto'`. They share the same storage, addressing, and eviction as version-indexed entries. The time-travel API resolves `?at=auto:{timestamp}` to these forest entries. No separate snapshot storage system.

---

## Policy Violation State Model

When an external write (OC runtime, VS Code, OneDrive) creates a governance violation,
the workspace is already in a violating state when we discover it. The API write path
(PATCH) validates BEFORE writing and rejects. But external writes bypass validation.

### State Machine

```
                    ┌─────────────────────────────────────────────────────┐
                    │                                                     │
                    v                                                     │
              ┌──────────┐                                                │
     ┌───────>│  CLEAN   │<───────────────────────────────────────┐       │
     │        └────┬─────┘                                        │       │
     │             │                                              │       │
     │             │ recompile produces violations                │       │
     │             │                                              │       │
     │    ┌────────┼──────────┬──────────────┬────────────────┐   │       │
     │    │        │          │              │                │   │       │
     │    v        v          v              v                v   │       │
     │ ┌────────┐ ┌────────┐ ┌────────────┐ ┌──────────────┐ ┌───────┐  │
     │ │DEGRADED│ │DEGRADED│ │ DEGRADED   │ │  DEGRADED    │ │       │  │
     │ │ _WARN  │ │  _R5   │ │_STRUCTURAL │ │  _FLEET      │ │ ERROR │  │
     │ └───┬────┘ └───┬────┘ └─────┬──────┘ └──────┬───────┘ └───┬───┘  │
     │     │          │            │               │              │      │
     │     │          │            │               │              │      │
     │     └──────────┴────────────┴───────────────┴──────────────┘      │
     │                             │                                     │
     │                fix applied → recompile succeeds                   │
     │                             │                                     │
     └─────────────────────────────┘                                     │
                                                                         │
                         concurrent worse violation                      │
                    DEGRADED_* ──────────────────────> ERROR ────────────┘
                                                       (fix → recompile
                                                        may → DEGRADED
                                                        not → CLEAN)
```

**Transitions**:

| From                | To                  | Trigger                                                  | Guard                |
| ------------------- | ------------------- | -------------------------------------------------------- | -------------------- |
| CLEAN               | DEGRADED_WARN       | Recompile finds R3-R4 violation                          | Scope = isolated     |
| CLEAN               | DEGRADED_R5         | Recompile finds R5 violation                             | Scope = isolated     |
| CLEAN               | DEGRADED_STRUCTURAL | Recompile finds trust/delegation violation               | Scope = structural   |
| CLEAN               | DEGRADED_FLEET      | Recompile finds fleet policy conflict                    | Fleet policy present |
| CLEAN               | ERROR               | Recompile fails (parse error, corrupt file)              | —                    |
| DEGRADED_WARN       | CLEAN               | Fix applied → recompile succeeds                         | Zero violations      |
| DEGRADED_R5         | CLEAN               | Fix applied → recompile succeeds                         | Zero violations      |
| DEGRADED_STRUCTURAL | CLEAN               | Fix applied → recompile succeeds                         | Zero violations      |
| DEGRADED_FLEET      | CLEAN               | Fleet policy fixed → recompile succeeds                  | Zero violations      |
| ERROR               | CLEAN               | Fix applied → recompile succeeds                         | Zero violations      |
| ERROR               | DEGRADED_*          | Fix applied → recompile succeeds but finds new violation | Violations remain    |
| DEGRADED_*          | ERROR               | Concurrent violation causes parse failure                | —                    |
| DEGRADED_WARN       | DEGRADED_R5         | New R5 violation while WARN active                       | Worst wins           |
| DEGRADED_R5         | DEGRADED_STRUCTURAL | Violation scope escalates to structural                  | Scope = structural   |

**Invariants**:

- **Violations are a set, not a single state**: The system tracks ALL active violations independently. The top-level state is the worst severity in the set. DEGRADED_STRUCTURAL + DEGRADED_FLEET = both enforcement behaviors apply simultaneously (chain blocking AND most-restrictive fleet interpretation). When one violation is fixed, the state may drop to the next-worst remaining violation (e.g., ERROR → DEGRADED_R5 if an R5 violation remains after the structural error is fixed).
- **Worst wins for top-level state**: ERROR > DEGRADED_STRUCTURAL > DEGRADED_R5 > DEGRADED_FLEET > DEGRADED_WARN > CLEAN. But all active violations enforce their behavior regardless of which is "worst."
- **Last successful IR pinned in forest cache**: The most recent SUCCESSFUL compilation's GovernanceIR is pinned — not subject to LRU eviction. This may be a CLEAN or DEGRADED IR (degraded compilations DO produce valid IRs). The pin is released only when a newer successful compile runs. In ERROR state, this pinned IR serves. This prevents compilation failures from evicting the safety baseline.
- **State persists across restart**: Stored in `.claws/cache/violation-state.json`. On startup, recompile determines actual state (may differ from persisted if files changed while server was down).
- **Cold-start with violations**: If the first-ever compilation produces violations, there is no last-good IR. In this case, the system enters ERROR with an empty GovernanceIR (all tools blocked, R5 fail-closed on everything) until the violations are fixed.
- **SSE on every state change**: `governance_state_changed` event with `{ from, to, activeViolations: [...], timestamp }`. Non-transitions (CLEAN → CLEAN) do not emit.

**PATCH behavior per state**:

| State               | PATCH targeting violation file        | PATCH targeting other file                          |
| ------------------- | ------------------------------------- | --------------------------------------------------- |
| CLEAN               | Normal (validate → write → compile)   | Normal                                              |
| DEGRADED_WARN       | Normal + warnings in response         | Normal + warnings in response                       |
| DEGRADED_R5         | Normal (repair attempt)               | Normal + warnings                                   |
| DEGRADED_STRUCTURAL | Normal (repair attempt)               | Blocked for affected chain tools, normal for others |
| DEGRADED_FLEET      | Normal (but fleet lock still applies) | Normal (fleet lock still applies)                   |
| ERROR               | Allowed (repair PATCH)                | 503 Rejected                                        |

### Severity-Based States

| Violation Severity                                  | System State     | Enforcement                                                                                                 | User Experience                                                                                                                                                                                                                                                                                                           |
| --------------------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **R5 violation** (missing elicitation on OBO tool)  | `DEGRADED_R5`    | That tool is **blocked** (fail-closed). All other tools operate normally.                                   | Governance dashboard shows red alert. Chunks show the tool as `lock.source: 'violation'`. SSE emits `governance_violation` event. GET /api/governance includes `degradedState: 'DEGRADED_R5'`, `blockedTools: ['oc://TOOLS.md/Tools/send-email']`, `violations: [{ path, severity, rule, message, fixGuidance, scope }]`. |
| **R3-R4 violation** (missing deny rule, policy gap) | `DEGRADED_WARN`  | Agent operates with warnings. Violations visible but not blocking.                                          | Yellow warnings in governance dashboard + chunks. Audit trail records the violation.                                                                                                                                                                                                                                      |
| **Structural error** (invalid YAML, corrupt file)   | `ERROR`          | **Serve the last good GovernanceIR** from the compilation forest. Agent operates under previous governance. | Status endpoint returns `{ status: 'error', lastGoodVersion: 42, errorDetails: '...' }`. Repair PATCHes targeting files in `pendingViolations` are allowed; other PATCHes return 503.                                                                                                                                     |
| **Fleet policy conflict**                           | `DEGRADED_FLEET` | Most restrictive interpretation applied.                                                                    | Fleet admin notified via SSE. Conflicting fields shown with both policy sources.                                                                                                                                                                                                                                          |

**Unclassified tool handling**: Tools that exist in the current workspace files but are ABSENT from the serving (last-good) GovernanceIR are treated as R5 fail-closed. They cannot execute. This is the same principle as the fail-mode table's 'Unknown = R5' row. The last-good IR is the governance floor — anything not in it gets maximum restriction until a clean compilation classifies it.

**Violation scope**: Each violation has a scope: `isolated` (one tool missing a gate → block that tool only) or `structural` (trust chain broken, delegation cycle, fleet policy corrupt → block ALL tools in the affected dependency chain). The state machine carries a `scope` field per violation. Structural violations escalate from DEGRADED_R5 to DEGRADED_STRUCTURAL which blocks the entire affected chain, not just one tool.

**Fix guidance templates**: Each violation includes a `fixGuidance` string with concrete instructions:

- R5 missing elicitation: `'Add elicitation gate: edit oc://TOOLS.md/Tools/{tool} or run claws check --fix'`
- Structural error: `'Fix syntax error in {file} at line {line}: {detail}. Or restore: claws snap restore auto:previous'`
- Fleet policy conflict: `'Contact fleet admin. Conflicting policies: {policy1} vs {policy2}'`
- Missing deny rule: `'Add boundary: edit oc://SOUL.md/Boundaries or run claws check --fix'`

### The Key Invariant

**The agent always runs under a valid GovernanceIR. The serving IR is always the most recent successful compilation.**

Two cases:

**DEGRADED** (compilation SUCCEEDED but found policy violations):

- The NEW GovernanceIR (e.g., v44) serves. It is valid — it classifies all tools.
- The violating tool is explicitly blocked via `lock.source: 'violation'`.
- Other new tools from the same edit ARE classified and available.
- The pinned IR is this v44 (the most recent successful compile, even though it's degraded).

**ERROR** (compilation FAILED — parse error, corrupt file):

- No new GovernanceIR was produced.
- The LAST SUCCESSFUL GovernanceIR serves (e.g., v44 from the degraded state, or v43 if it was clean).
- The pinned IR is the most recent successful compile — which may itself have been degraded.
- New tools added AFTER the last successful compile are absent from the serving IR → R5 fail-closed.

This means: DEGRADED is better than ERROR. In DEGRADED, new tools get classified. In ERROR, they don't.

If recompilation produces violations or fails:

1. The appropriate IR serves (new IR for DEGRADED, pinned IR for ERROR)
2. The violating file state is recorded as `pending_violations` in the workspace status
3. Chunks include `governance.violations` array with oc:// paths + severity + fix guidance
4. The TUI shows a "Fix Required" banner with the specific violations
5. **Repair PATCHes**: In ERROR state, PATCHes targeting a file listed in `pendingViolations` are ALLOWED (these are repair attempts). PATCHes targeting other files return 503.
6. The auto-snapshot is preserved so the admin can diff what caused the violation

### Recovery Flow

```
1. External write creates violation
2. Recompile detects violation → keeps last good IR
3. Status: DEGRADED_R5 (or WARN or ERROR)
4. Admin sees violations in governance dashboard / TUI / SSE
5. Admin fixes (PATCH to resolve, or restore auto-snapshot)
6. Recompile succeeds → new GovernanceIR accepted
7. Status: CLEAN
```

For OC runtime writes specifically, if the OC runtime caused the violation (e.g., installed a skill with R5 tools but no elicitation gate), the violation is attributed to the OC runtime in the audit trail: `{ source: 'oc_runtime', event: 'skill_install', violation: 'G-ELICIT', path: 'oc://skills/bad-skill/SKILL.md' }`.

The compile wrapper (`violation-aware-compile.ts`) is the single owner of the last-good IR reference. The ViolationStateMachine consumes state transitions from the compile wrapper. No independent tracking.

The file watcher runs with a watchdog. If the watcher process dies (OOM, crash), the watchdog restarts it within 5 seconds and emits `watcher_restarted` SSE event. During the gap, changes are detected on the next watcher startup via mtime comparison.

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

**Rollback failure recovery (P5 -- write-atomicity-trace F:P5)**: If rollback itself
fails (disk error, permission), the system enters ERROR with a `ROLLBACK_FAILED` error
code. The status endpoint returns filesystem state details for manual recovery. This is
the only state that requires filesystem access -- the API cannot recover from a failed
rollback. The `ROLLBACK_FAILED` response includes: which files exist on disk, their
hashes, the WAL entry content, and explicit instructions for manual recovery. The status
endpoint surfaces this as a critical alert distinct from normal ERROR.

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

## Eval API + Sift Query

### When Evals Run

| Tier              | What                                                | Trigger                         | Cost       |
| ----------------- | --------------------------------------------------- | ------------------------------- | ---------- |
| **G0** Schema     | Files parse, frontmatter valid                      | Every compile (~40ms recompile) | Free       |
| **G1** Cross-file | Conflicts, referential integrity, sift expressions  | Every compile                   | Free       |
| **G2** Semantic   | Boundary specificity, tool coverage (LLM-as-judge)  | On demand or CI                 | LLM call   |
| **G3** Runtime    | Mock Gateway fires tool calls, verifies block/allow | On demand or CD                 | Mock setup |

G0+G1 run automatically on every edit (they're in the compile pipeline). G2+G3
are available via the eval API — triggered by the admin, CI, or the TUI.

### Eval Endpoints

```
POST /api/eval                     → run full eval (G0-G3) on current workspace
POST /api/eval?tier=G2             → run just one tier
POST /api/eval?tier=G0,G1          → run multiple tiers
GET  /api/eval/results             → last eval results (cached)
GET  /api/eval/results?at=v44      → eval results at a historical version (time-travel)
```

Response:

```json
{
  "version": "v44",
  "tiers": {
    "G0": { "status": "pass", "checks": 12, "failures": 0, "durationMs": 8 },
    "G1": {
      "status": "pass",
      "checks": 29,
      "failures": 0,
      "durationMs": 45,
      "siftResults": { "expressions": 14, "matches": 8 }
    },
    "G2": {
      "status": "warn",
      "checks": 3,
      "failures": 1,
      "durationMs": 4200,
      "findings": [
        {
          "rule": "boundary-specificity",
          "score": 0.6,
          "message": "SOUL.md boundaries are too vague — 'be careful' is not enforceable",
          "path": "oc://SOUL.md/Boundaries"
        }
      ]
    },
    "G3": {
      "status": "pass",
      "checks": 8,
      "failures": 0,
      "durationMs": 12000,
      "toolCalls": [
        { "tool": "send-email", "decision": "blocked", "reason": "R5 elicitation gate" },
        { "tool": "read-email", "decision": "allowed" }
      ]
    }
  },
  "summary": { "pass": 3, "warn": 1, "fail": 0 }
}
```

### Sift Query API

Ad-hoc governance queries using sift/RELAX expressions at zero token cost:

```
POST /api/eval/sift
{
  "expression": "risk >= R3 AND obo = true",
  "scope": "oc://TOOLS.md/Tools"
}

→ {
    "expression": "risk >= R3 AND obo = true",
    "matches": [
      { "path": "oc://TOOLS.md/Tools/send-email", "risk": 5, "obo": true },
      { "path": "oc://TOOLS.md/Tools/calendar-delegate", "risk": 4, "obo": true }
    ],
    "count": 2,
    "evaluatedIn": "0.3ms"
  }
```

```
POST /api/eval/sift
{
  "expression": "trust_tier < T2 OR data_label = RESTRICTED",
  "scope": "oc://MEMORY.md/Knowledge"
}

→ { "matches": [...], "count": 1, "evaluatedIn": "0.2ms" }
```

Sift expressions use the RELAX evaluator from claws-sdk — zero LLM calls, zero
token cost, sub-millisecond evaluation. The expression language is the same one
used in governance policies (`.claws/policies/*.yaml`).

### When to Eval After Edits

| Edit Type                   | G0+G1               | G2                                      | G3                    |
| --------------------------- | ------------------- | --------------------------------------- | --------------------- |
| PATCH via API               | Auto (in recompile) | Not auto — run `POST /api/eval?tier=G2` | Not auto              |
| External edit (VS Code, OC) | Auto (in recompile) | Not auto                                | Not auto              |
| CI pipeline                 | Auto                | Auto (CI gate)                          | Auto (CD gate)        |
| TUI "Run Eval" button       | Shows cached G0+G1  | Triggers G2 on demand                   | Triggers G3 on demand |

G2+G3 are never automatic on edit — they're expensive (LLM calls, mock setup).
They run on demand via the API or automatically in CI/CD. The TUI and Companion
App provide a "Run Eval" button that triggers them.

### Eval + Violation State

Eval results are versioned with the workspace version. Time-travel lets you see
eval results at any historical version: `GET /api/eval/results?at=v38`. This
answers "did the eval pass when we deployed v38?" without re-running the eval.

If a G2 eval finds a semantic issue (boundary too vague), it surfaces as a
governance WARNING — not a violation state change. Eval findings are advisory.
Only the compile pipeline (G0+G1) triggers violation state transitions.

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
    **Skill install quarantine (Dragon F-09)**: Tools from newly installed skills are
    classified as R5 (fail-closed) until the first compilation after install
    completes. During the recompilation window, the API serves these tools with
    `classification: 'pending'` and treats them as R5 per the fail-mode table
    ("Unknown / Missing / Invalid -> fail-closed -> treat as R5"). The install
    response does not return until compilation AND capability extraction are
    complete -- no early response with declared-risk data. This prevents a
    quarantine window where tools with declared-but-unverified risk levels appear
    unlocked in the partner UI.
13. **Audit query** — `GET /api/audit` backed by @openclaw/audit-chain.
14. **Fleet** — `GET /api/fleet/claws` for multi-claw management.

### Phase 5: Onboarding

15. **Onboard API** — `POST /api/onboard` seeds SOUL.md and MEMORY.md from
    an onboarding conversation transcript (Teams voice call → structured files).

### Partner Handoff Points

| Phase | What Partners Can Build                 | API They Use                            |
| ----- | --------------------------------------- | --------------------------------------- |
| 1     | CAP settings tabs (read-only)           | Chunk GET                               |
| 2     | CAP settings tabs (editable)            | Chunk GET + PATCH                       |
| 3     | Calendar integration, To Do integration | /api/schedule, /api/workqueue           |
| 3     | Loop page sync                          | /api/loop/*                             |
| 4     | Companion App management UX             | /api/governance, /api/trust, /api/audit |
| 5     | Teams onboarding bot                    | /api/onboard                            |
