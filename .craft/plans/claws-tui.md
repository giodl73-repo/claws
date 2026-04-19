---
slug: claws-tui
preset: "claws"
plan: "4 headlines: claws tui renders chunks in terminal, PATCH with governance feedback, Lobster previews, VS Code extension with governance-aware editing"
area: claws
status: Draft
phase: ra
atoms: [atom:claws-serve, atom:governance-ir, atom:claws-lsp]
specs: [CL-10, CL-05]
---

# claws-tui — Local Experience (Terminal + VS Code)

## Headlines

1. **H1: `claws tui` renders all 6 CAP settings tabs from the Chunk API in the terminal** — An Ink-based (React for CLI) terminal UI that connects to `claws serve` and renders every chunk as an interactive panel. Each CAP tab (General, Preferences, Connections, Memory, Groups, Entitlements) becomes a TUI screen. The TUI consumes the exact same `GET /api/chunks/{tab}/{section}` endpoints that CAP partners will use. If the TUI works, the API works. Risk badges (R1-R5) render as colored text. Lock indicators show source (R5/fleet/governance). Governance warnings display as banners.

2. **H2: TUI supports PATCH edits with live governance feedback via SSE** — Toggle a tool, edit the prompt, change the schedule — the TUI sends `PATCH /api/chunks/{tab}/{section}` and shows the governance result inline: warnings, errors, R5 rejections, fleet lock violations. SSE events update the UI in real-time when files change externally. This validates the full write-time validation layer, incremental recompilation, and error response contract before any partner builds a real UI.

3. **H3: Lobster surface previews — trust dashboard, calendar, work queue** — Three additional TUI screens that preview the Lobster collaboration APIs via Layer 1 (`/api/oc/SOUL.md`, `/api/oc/MEMORY.md`, `/api/oc/HEARTBEAT.md#Schedule`): trust tier with escalation history, HEARTBEAT.md as a calendar view, and the work queue as a task list. These aren't full M365 integrations — they're terminal renderings of the same JSON that Loop, Calendar, and To Do would consume.

4. **H4: VS Code extension with governance-aware editing of OC workspace files** — The existing claws-lsp (6 providers: diagnostics, hover, code actions, code lens, completions, semantic tokens) gets wired to the CL-10 write-time validation layer. When you edit TOOLS.md in VS Code, you see risk badges as decorations, lock indicators in the gutter, deny rule highlighting in SOUL.md, and governance warnings as diagnostics — all live, as you type. A webview sidebar panel renders the same chunk data as the TUI (Connections with risk badges, governance dashboard, trust tier) inside VS Code. Code actions provide governance fixes: "Add elicitation gate for R5 tool", "This tool is fleet-locked — contact admin". The extension is a fourth consumer of `claws serve`, alongside the TUI, CAP partners, and the Companion App.

## Why Local Experience (TUI + VS Code)

| Concern | Without TUI | With TUI |
|---------|------------|----------|
| API validation | Unit tests check JSON shapes | Human sees the UX, catches usability gaps |
| Partner onboarding | Partners read spec, guess at rendering | Partners run `claws tui`, see the reference UX |
| Local dev experience | `curl` against `claws serve` | Interactive local dashboard |
| Demo | Architecture slides | Live terminal demo: toggle a tool, see R5 rejection |
| Scenario validation | Scenario runners check assertions | TUI manually exercises the same flows |

## Scope

### TUI Screens — 3 Experiences, 19 Screens

**Experience 1: Agent Settings (CAP)** — Form-based configuration, same as CAP tabs.

| Screen | Chunk API | Features |
|--------|----------|----------|
| **General** | `GET /api/chunks/general/identity` | Name, description, language (editable). Manager (shows cross-file source). |
| **Preferences** | `GET /api/chunks/preferences/instructions` + `/schedule` | Prompt editor (multiline text). Schedule display. Reviewer list. |
| **Connections** | `GET /api/chunks/connections` (all servers) | Server list (L1). Drill into server → tool list with toggles (L2). Risk badges. Lock icons with reasons. "Allow all" button. |
| **Memory** | `GET /api/chunks/memory/knowledge` | Knowledge source list with toggles. Data label badges (CONFIDENTIAL, etc.). |
| **Groups** | `GET /api/chunks/groups` | M365 / Security / On-Premise group lists. Read-only. |
| **Entitlements** | `GET /api/chunks/entitlements` | Core + Governance role lists with expiry dates. Read-only. |

**Experience 2: Lobster Collaboration** — Editing the agent's mind, seeing its work.

| Screen | API | Features |
|--------|-----|----------|
| **Soul Editor** | `GET/PATCH /api/oc/SOUL.md` (Layer 1) | SOUL.md as editable sections. Deny rules highlighted with governance context. Edit a section → see recompile result. Warnings on deny rule removal. Compiler-injected rules shown as locked. |
| **Memory Browser** | `GET/PATCH /api/oc/MEMORY.md` (Layer 1) | MEMORY.md sections: "Things I've Learned", "People Who Matter", "Preferences". Editable with data label indicators. |
| **Trust Dashboard** | `GET /api/trust` | Current tier badge (T0-T4). Escalation history timeline. Next-tier requirements progress bar. "Request Escalation" button triggers approval flow. |
| **Schedule** | `GET /api/oc/HEARTBEAT.md#Schedule` (Layer 1) | Calendar-style list of HEARTBEAT.md events. Recurrence indicators. Next-run countdown. Timezone display. |
| **Work Queue** | `GET /api/workqueue` | Task list with status badges. Source indicators (heartbeat/user/agent). Add task. Mark complete. |

**Experience 3: ClawPilot (Sessions + Management)** — Emulates ClawPilot's session-aware UX.

| Screen | API | Features |
|--------|-----|----------|
| **Sessions Overview** | `GET /api/sessions` (Layer 3) | All sessions: main, cron, channel, agent. Status badges (running/idle/errored/scheduled). Session count summary. |
| **Session Detail** | `GET /api/sessions/:id` (Layer 3) | Per-session view: status, last activity, tool permissions scoped to this session, pinned chat summary. |
| **Cron Run History** | `GET /api/sessions/:id/runs` (Layer 3) | Run history timeline for cron sessions: status, duration, errors. Error detail expandable. |
| **Session Tools** | `GET /api/sessions/:id/tools` (Layer 3) | Tool permissions for THIS session (may differ from workspace-level). Risk badges, locks. |
| **Governance Dashboard** | `GET /api/governance` | Compilation status, risk distribution chart (R1-R5), gated tool count, deny rule count, budget usage bar, fleet policy status. |
| **History** | `GET /api/diff`, `GET /api/oc/{path}?at=` (Layer 1 time-travel) | Version history as a scrollable timeline. Each entry shows version number, timestamp, changed paths (oc:// format), and change summary. Drill into a version to see the full GovernanceIR diff. Powered by the time-travel API -- makes historical governance state discoverable without raw `?at=` queries. (Navigator N-03: progressive disclosure surface for time-travel.) |
| **Audit Trail** | `GET /api/audit` | Scrollable event timeline. Filterable by category + session. Hash chain integrity indicator. Export (SARIF/CEF). |
| **Activity Feed** | `SSE /api/events` | Live stream with session-level events. Session state changes in real-time. |
| **Skills Store** | `GET /api/skills` | Available skills list. Installed indicator. "Install" action → shows governance impact. |

### TUI Interactions (PATCH validation across all 3 experiences)

**Agent Settings interactions:**

| Interaction | API Call | What TUI Shows |
|-------------|---------|----------------|
| Toggle tool ON/OFF | `PATCH /api/chunks/connections/{server}` | Success: tool updates, governance result. R5 rejection: red error banner. |
| Edit prompt | `PATCH /api/chunks/preferences/instructions` | Success: recompile result. Deny rule warning if boundary text removed. |
| Change schedule | `PATCH /api/chunks/preferences/schedule` | Success: schedule updates. Invalid timezone: error. |
| "Allow all" | `PATCH /api/chunks/connections/allow-all` | R1-R4 approved. R5 `still_gated` shown with lock icon. |

**Lobster collaboration interactions:**

| Interaction | API Call | What TUI Shows |
|-------------|---------|----------------|
| Edit soul section | `PATCH /api/oc/SOUL.md` (Layer 1) | Sections update. Governance warnings if deny rule affected. Compiler-injected rules show as immutable. |
| Edit memory | `PATCH /api/oc/MEMORY.md` (Layer 1) | Memory sections update. Data label warnings if sensitivity changes. |
| Request trust escalation | `PATCH /api/trust/escalate` | Without token: rejection with "requires manager approval." With token: tier promotes, history updates. |
| Add work queue task | `POST /api/workqueue` | Task appears in list. Source: "user". Status: "pending". |

**Companion/observability interactions:**

| Interaction | API Call | What TUI Shows |
|-------------|---------|----------------|
| External file edit | *(edit TOOLS.md in another terminal)* | Activity feed shows SSE event. Governance dashboard updates. Warning banner if violations. |
| Install skill | `POST /api/skills/install` | Skill installs. Connections screen updates with new tools. R5 tools auto-locked. |
| Query audit trail | `GET /api/audit?category=policy` | Filtered event timeline. Hash chain integrity check. |
| View fleet policy impact | `GET /api/governance` | Fleet override indicators. Locked field count. Policy source attribution. |

**Policy violation interactions (validates scenarios S21-S35):**

| Interaction | API Call | What TUI Shows |
|-------------|---------|----------------|
| Try to disable R5 tool | `PATCH /api/chunks/connections/outlook` | Red banner: "R5_NON_NEGOTIABLE — send-email cannot be ungated" |
| Try to edit fleet-locked field | `PATCH /api/chunks/connections/planner` | Red banner: "FLEET_LOCK_VIOLATION — contact fleet admin" |
| Remove all deny rules | `PATCH /api/oc/SOUL.md` (Layer 1) | Yellow warning: "2 deny rules removed. R5 deny rules preserved (immutable)." |
| Trigger risk drift | *(edit TOOLS.md to add OBO capability)* | Tool badge changes R3→R5. Pre-authorizations invalidated. Audit event fires. |

### TUI Components (Ink/React)

| Component | Renders | Reusable? |
|-----------|---------|-----------|
| `<ChunkPanel>` | Any chunk → auto-layout from `data` + `editable` + `governance` | Yes — generic |
| `<ToolRow>` | One tool with toggle, risk badge, lock icon | Connections-specific |
| `<RiskBadge>` | R1-R5 with color (green → red) | Shared |
| `<LockIcon>` | Lock with source tooltip (R5/fleet/governance) | Shared |
| `<GovernanceBanner>` | Warnings/errors from governance context | Shared |
| `<PatchResult>` | Success/rejection after PATCH | Shared |
| `<TrustDashboard>` | Tier + history + progress | Trust screen |
| `<ScheduleView>` | Calendar event list | Schedule screen |
| `<TaskList>` | Work queue tasks | Work Queue screen |

## Pulse Breakdown (16 pulses)

### Terminal TUI (12 pulses)

| Pulse | Deliverable | Complexity |
|-------|------------|-----------|
| 1 | TUI scaffold — Ink app, experience selector (Settings/Lobster/Companion), `claws serve` client with graceful startup (detect missing server, offer to auto-start), SSE listener with reconnection | Medium |
| 2 | General + Preferences screens — render chunks, editable fields, prompt editor | Medium |
| 3 | Connections L1 — server list, summary badges, "Allow all" button | Medium |
| 4 | Connections L2 — tool drill-in with risk badges, R5 tools rendered as lock icon (no toggle — absent, not disabled), fleet-locked tools with source attribution | Medium |
| 5 | PATCH integration — toggle tools, edit prompt, "Allow all". Error rendering with human-readable guidance. ANSI sanitization. | Heavy |
| 6 | Memory + Groups + Entitlements screens — chunk rendering with data label badges | Light |
| 7 | Soul Editor + Memory Browser — section-based editing, deny rules highlighted, compiler-injected rules dimmed/locked, governance warnings inline | Heavy |
| 8 | Trust Dashboard + Schedule + Work Queue | Medium |
| 9 | Companion screens — Governance Dashboard, Audit Trail (paginated), Activity Feed (SSE), Skills Store | Medium |
| 10 | SSE live updates — external edit detection, auto-refresh, governance warning banners, sequence-based gap detection | Medium |
| 11 | Demo mode — guided walkthrough (7 steps), fixture workspace, keyboard shortcuts, help panel | Medium |
| 62 | Sessions TUI — Sessions Overview, Session Detail, Cron Run History, Session Tools screens rendering Layer 3 session data | Medium |

### VS Code Extension (4 pulses)

| Pulse | Deliverable | Complexity |
|-------|------------|-----------|
| 12 | Wire claws-lsp to CL-10 validation — diagnostics from GovernanceIR (risk violations as squiggly lines on TOOLS.md, missing elicitation gates, deny rule warnings on SOUL.md), code lens showing R-level per tool declaration | Medium |
| 13 | Editor decorations — risk badges as gutter icons on tool declarations in TOOLS.md (green R1 → red R5), lock indicators for fleet-locked tools, deny rule background highlighting in SOUL.md, data label badges in MEMORY.md | Medium |
| 14 | Code actions — "Add elicitation gate for R5 tool", "This tool is fleet-locked", "Add deny rule for {tool}", "Upgrade trust tier to access {tool}". Quick-fix integration with the write-time validation layer. | Medium |
| 15 | Webview sidebar — chunk-based governance panel inside VS Code. Renders Connections (risk + locks), Governance Dashboard (compilation status, risk distribution), Trust tier. Same JSON as TUI, rendered as HTML in a VS Code webview. Refreshes on save via LSP notifications. | Heavy |

## Implementation Note

Some pulses bundle multiple screens (e.g., pulse 9 covers Governance Dashboard,
Audit Trail, Activity Feed, and Skills Store). During implementation, heavy pulses
may be split if velocity requires it. The pulse structure is a planning target, not
a hard constraint -- if a single pulse cannot land all its screens at acceptable
quality, it should be decomposed rather than shipping partial polish.

## Package Location

`claws tui` is a subcommand in `claws-cli` with Ink lazy-loaded via dynamic
`import()`. This keeps claws-cli lightweight for non-TUI users (Ink is only loaded
when `claws tui` is invoked). The TUI rendering code lives in `claws-cli/src/tui/`.

The TUI is a **consumer** of `claws serve`, not part of it. It calls HTTP endpoints
like any partner would. It imports types only from `@bic/claws-sdk` (no
runtime dependency on the SDK).

## Startup Behavior

```
$ claws tui
→ Check if claws serve is running on :3939
  → If yes: connect, render TUI
  → If no: "claws serve is not running. Start it? [Y/n]"
    → Y: spawn `claws serve` in background, wait for /health, then render
    → N: exit with "Run `claws serve` first"

$ claws tui --demo
→ Copy fixture workspace to tmpdir
→ Start `claws serve --workspace {tmpdir}` in background
→ Connect, render TUI with guided walkthrough
→ On exit: stop serve, clean up tmpdir
```

## Demo Mode

`claws tui --demo` starts with a fully editable fixture workspace containing:
- 3 MCP servers (Outlook, Planner, Asana) with mixed R1-R5 tools
- Fleet policy locking Planner tools
- R5 send-email with OBO
- SOUL.md with deny rules (user-authored + compiler-injected)
- HEARTBEAT.md with 3 scheduled tasks (with explicit timezones)
- Trust tier at T2 with escalation history
- Seeded audit chain with 10 events

The workspace is fully editable — governance enforcement lives in the server, not
in file permissions. External edits (e.g., `vim TOOLS.md` in another terminal)
trigger SSE events and TUI refresh, demonstrating the full file watcher flow.

**Guided walkthrough** (9 steps, shown as overlay on first launch):
1. "Welcome to your agent's governance dashboard."
2. "→ Settings: See your agent's tools and their risk levels."
3. "→ Try toggling send-email. Watch what happens." (R5 rejection)
4. "→ Soul Editor: See your agent's boundaries."
5. "→ Try removing a deny rule. Watch the governance warning."
6. "→ Schedule: See your agent's upcoming tasks as calendar events."
7. "→ Work Queue: Tasks your agent is working on right now."
8. "→ Trust: See your agent's trust tier and what it unlocks."
9. "→ Audit: Every governance decision is recorded here."

## Screen Navigation

Screens are grouped by experience, not flat tabs:

```
┌─────────────────────────────────────────┐
│  claws tui                    [?] Help  │
│─────────────────────────────────────────│
│  [1] Settings  [2] Lobster  [3] Manage  │
│─────────────────────────────────────────│
│                                         │
│  Settings >                             │
│    General                              │
│    Preferences                          │
│    Connections  ←                        │
│    Memory                               │
│    Groups                               │
│    Entitlements                          │
│                                         │
│  Lobster >                              │
│    Soul Editor                          │
│    Memory Browser                       │
│    Trust                                │
│    Schedule                             │
│    Work Queue                           │
│                                         │
│  Manage >                               │
│    Governance                           │
│    Audit Trail                          │
│    Activity Feed                        │
│    Skills                               │
│                                         │
└─────────────────────────────────────────┘
```

Number keys (1/2/3) switch between experiences. Arrow keys navigate within.

## R5 Lock Rendering

R5 tools render with **no toggle** — just a lock icon and the tool name. This is
defense-in-depth: even if someone patches the Ink component, the server rejects
the PATCH. Fleet-locked tools render with a disabled toggle (can't change locally,
but fleet admin could). Governance-locked tools render with a toggle + warning icon.

```
  ● read-email         R1 READ        [✓]
  ● create-task        R3 COMMUNICATE  [✓]  🔒 Fleet
  ● timely-updates     R3 COMMUNICATE  [ ]  🔒 Fleet
  🔒 send-email        R5 TRANSACT     (locked — acts on your behalf)
```

## Error Rendering

Every PatchError includes a human-readable sentence, not just a code:

| Error Code | Human Message |
|-----------|--------------|
| R5_NON_NEGOTIABLE | "This tool acts on your behalf (R5). Approval is required on every call and cannot be disabled." |
| FLEET_LOCK_VIOLATION | "This setting is controlled by your organization's fleet policy. Contact your fleet admin to change it." |
| R5_EXCLUDED_FROM_ALLOW_ALL | "Allow All approved 3 tools. send-email is R5 and still requires individual approval." |
| GOVERNANCE_VIOLATION | "This edit would create a governance violation: {details}. Review the governance warnings." |
| COMPILATION_FAILED | "Your edit was rolled back because it caused a compilation error: {details}." |
| TRUST_REQUIRES_APPROVAL | "Trust escalation requires manager approval. Request sent — waiting for response." |

## Dependencies

- `claws serve` (claws-cap-integration plan, Phase 1-2) — the TUI consumes the API
- Chunk types from `claws-sdk` — ChunkDataMap, FieldEditability, ItemLock, PatchResult
- `ink` v5 + `ink-select-input` + `ink-text-input` — terminal UI framework (lazy-loaded)
- Fixture workspace for demo mode
- SSE: `eventsource` npm package for reconnection support

## Security Notes

- SSE `/api/events` is unauthenticated when `claws serve` binds 127.0.0.1 (default, safe for local dev). When `--host 0.0.0.0` is used, all endpoints require bearer token auth.
- Chunk data may contain user-provided text. The TUI sanitizes ANSI escape sequences from all chunk string fields before rendering to prevent terminal injection.

## Test Strategy

The TUI itself is lightly tested (snapshot tests for component rendering). The
real validation is that **every TUI interaction exercises the same API that partners
will use**. If the TUI can render chunks, toggle tools, handle R5 rejections, and
show SSE updates, the API contract is validated end-to-end.

Integration tests: start `claws serve` with fixture workspace, start TUI, simulate
keystrokes, verify screen output matches expected governance state.
