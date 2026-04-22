---
role: craft/navigator
round: 1
wave: "Ra the Radiant (XCIII)"
scope: "Pulses 60-63 — session model types, session HTTP routes, TUI sessions screen, approval session context"
tension: "User journey coherence > implementation simplicity"
date: 2026-04-15
finding_count: 11
severity_distribution:
  HC-BLOCK: 2
  HC-WARN: 4
  MEDIUM: 3
  LOW: 2
---

# R1 — craft/navigator Review: Session Model Additions (Pulses 60-63)

## Summary

Pulses 60-63 introduce the session model into claws: core types (60), HTTP routes (61), a TUI sessions screen (62), and session-aware approval events (63). Together they answer "what is happening inside this agent right now?" across four session kinds (main, cron, channel, agent). The session model is the bridge between the static workspace configuration that the first 59 pulses build and the runtime reality that ClawPilot has always shown: an agent running multiple concurrent sessions with different tool permissions, schedules, and error states.

The macro story is correct. From a user journey perspective, the key question is whether a developer implementing the TUI sessions screen (pulse 62) can produce a coherent experience from the API response, whether cron error states are clearly surfaced to operators, and whether the approval UX improvement in pulse 63 ("Daily Triage (cron) wants to send-email" vs. "Agent wants to send-email") lands as intended.

I evaluated all four pulses through the navigator lens: does every user path tell a consistent story? Findings below.

---

## Findings

### F-01: TUI sessions screen has no visual specification for the sessions overview [HC-BLOCK]

**Pulses affected**: 62

Pulse 62 says "render session list with type/status badges" and specifies color codes (main=blue, cron=yellow, channel=green, agent=purple) and status indicators (active=green dot, idle=gray, error=red). But there is no ASCII wireframe or example rendering in the pulse. Every other TUI screen in the wave has a visual specification in the claws-tui plan -- the Connections screen has the four-row example with risk badges and lock icons, the navigation structure has a full ASCII wireframe, and the R5 lock rendering has a four-line visual spec.

The sessions screen is the only TUI screen with no visual example of what the rendered output looks like. A developer implementing this pulse must invent the layout. Does the session ID appear left-aligned or right? Is the type badge inline with the name or on a separate line? Where does the "23/25 successful" summary appear relative to the session row? Without a visual spec, two developers would produce different layouts.

The claws-tui plan (Experience 3: ClawPilot) lists the screens and their APIs but provides no visual spec for any of the Manage experience screens. This is a gap inherited from the plan, but pulse 62 is the place to close it.

**Recommendation**: Add an ASCII wireframe to pulse 62 showing a sample sessions list rendering. Minimally:

```
Sessions                              3 active  1 errored
-------------------------------------------------------
  main              ACTIVE   12 tools  10:28 AM
  cron:daily-triage SCHEDULED  3 tools  Next: 6:00 AM
  cron:weekly-report  ERROR    5 tools  Last: failed
  channel:design     IDLE      8 tools  Yesterday 4:30 PM
  agent:scout        ACTIVE    6 tools  10:25 AM (via main)
```

This becomes the reference rendering. Without it, the implementer is guessing.

### F-02: Cron error states are buried in session detail — no first-class error signal on the overview screen [HC-BLOCK]

**Pulses affected**: 61, 62

The `GET /api/sessions` response in CL-10 shows `cron:weekly-report` with status `"idle"` and a nested `lastRun.status: "error"` with error message `"Budget exceeded (95% threshold)"`. The session-level status is `"idle"` (the session is not currently running), but the last execution failed.

Pulse 62's acceptance criteria say "Status indicators: active=green dot, idle=gray, error=red." The `status` field on the session is `"idle"`, not `"errored"`. So the cron:weekly-report row would render with a gray dot, even though its last run failed. The error is only visible after drilling into the session detail and viewing the Runs tab.

This is a significant operator UX gap. Cron sessions that fail silently are the primary monitoring concern for ClawPilot-style interfaces. An operator scanning the sessions list needs to see "this cron is unhealthy" without clicking into every session. ClawPilot surfaces this as a distinct visual state: the session row shows a warning/error indicator even when the session is currently idle.

The root issue is in the API (pulse 61), not just the TUI: the `SessionSummary` returned by `GET /api/sessions` does not include `lastRunStatus` at the summary level. The consumer must infer health from the nested `lastRun.status` field. Pulse 62's `SessionRow.tsx` component does not mention rendering `lastRun.status` — only the top-level `status`.

**Recommendation**: Two changes are needed:
1. Pulse 60: Add `lastRunStatus?: 'success' | 'error' | 'timeout'` to `SessionSummary` so the list endpoint surfaces cron health at the summary level. Cron sessions with `status: 'idle'` and `lastRunStatus: 'error'` should render distinctly from healthy idle sessions.
2. Pulse 62: Add a visual state for "idle but last run failed": yellow or orange indicator (distinct from active-green, idle-gray, and error-red). The acceptance criteria should explicitly require: "Cron session with status=idle and lastRunStatus=error renders with a warning indicator, not gray."

### F-03: "Daily Triage (cron) wants to send-email" is better but the displayLabel derivation is underspecified [HC-WARN]

**Pulses affected**: 63

Pulse 63 adds `displayLabel` to `ApprovalRequestEvent` as a computed property. The examples are "Daily Triage (cron)" for cron and "Main Session" for main. This is a clear improvement over "Agent wants to send-email" — the approver now knows the context of the request.

However, the derivation rule is incomplete. The pulse says `displayLabel` "returns human-friendly session identification like 'Daily Triage (cron)' or 'Main Session' based on sessionType and optional session name metadata." Where does "Daily Triage" come from? The `SessionState` from pulse 60 has `id`, `type`, `status`, `createdAt`, `lastActiveAt`, and `metadata` (optional). The session ID in CL-10 is `"cron:daily-triage"`, which is a slug, not a human name.

The derivation must answer: is "Daily Triage" parsed from the session ID (strip prefix, title-case the slug)? Read from `metadata.name`? Read from the HEARTBEAT.md event title? Pulse 63 does not specify. A developer implementing `displayLabel` would produce different output depending on the derivation source:
- From ID: "Cron Daily Triage (cron)" — redundant type prefix
- From metadata.name: "Daily Triage (cron)" — requires SessionState to carry metadata.name
- From HEARTBEAT.md event title: "Daily inbox triage (cron)" — requires a cross-reference to the schedule

**Recommendation**: Specify the `displayLabel` derivation chain in pulse 63: (1) if `metadata.displayName` exists, use it; (2) else if session type is `cron`, extract the slug from session ID (`cron:daily-triage` -> `daily-triage`), title-case it, append ` (cron)`; (3) else use the session type capitalized + " Session". Also add `displayName?: string` to `SessionConfig` in pulse 60's `metadata` definition so that cron sessions can carry a human name sourced from HEARTBEAT.md.

### F-04: Session detail view has three tabs but the tab names are not specified [HC-WARN]

**Pulses affected**: 62

Pulse 62 says session detail "renders three tabbed panels (Overview, Runs, Tools)." The Overview tab fetches `/api/sessions/:id`. The Runs tab fetches `/api/sessions/:id/runs`. The Tools tab fetches `/api/sessions/:id/tools`. But:

1. For non-cron sessions, the Runs tab has no data — runs are a cron-only concept. The pulse does not specify what the Runs tab shows for main, channel, or agent sessions. Empty state? Hidden tab? "N/A" message? The acceptance criteria say "Cron session detail shows RunHistoryTimeline" but say nothing about non-cron sessions in the Runs tab.

2. The Tools tab shows session-scoped tool permissions. For the main session, this is the full workspace tool set. The visual difference between "main session tools" and "workspace tools" (already shown on the Connections screen) is not explained. An operator comparing the two screens might think they are broken because they show the same data.

**Recommendation**: 
- Pulse 62 should specify: Runs tab is hidden or shows "No run history" for non-cron sessions. 
- Tools tab for main sessions should show a note: "Main session — full workspace permissions." For other session types, show a delta view or count: "6 of 12 workspace tools enabled for this session."

### F-05: The `suspended` status in SessionState has no TUI rendering specification [HC-WARN]

**Pulses affected**: 60, 62

CL-10 defines session status as `running | idle | scheduled | errored | suspended`. Pulse 60's `SessionState` carries `status`. But pulse 62's acceptance criteria only specify rendering for three states: "active=green dot, idle=gray, error=red." There is no visual spec for `scheduled` or `suspended`.

The `scheduled` status is mentioned in the CL-10 API response for `cron:daily-triage`, but pulse 62 does not specify its indicator color. Is it the same as idle? A distinct color (e.g., blue for pending)? The `suspended` status has no rendering specification at all — no color, no icon, no mention.

A developer implementing `SessionRow.tsx` will encounter all 5 status values but only has visual specs for 3 of them.

**Recommendation**: Add rendering specs for all 5 statuses to pulse 62's acceptance criteria: active=green, idle=gray, scheduled=blue or cyan, errored=red, suspended=yellow/orange with a pause icon.

### F-06: Session-scoped tool resolver semantics are not visible to the TUI consumer [HC-WARN]

**Pulses affected**: 60, 62

Pulse 60 defines `resolveSessionTools()` which filters workspace tools based on session type: cron sessions get a restricted allowlist, agent sessions inherit delegator permissions minus revoked, main gets everything, channel uses workspace defaults. Pulse 62 renders the result as a tool list in the Session Tools tab.

But the TUI consumer sees a flat list of `ToolDefinition[]` from `GET /api/sessions/:id/tools`. There is no indicator of WHY a tool is or is not in the list. An operator looking at a cron session's tools sees "3 tools" but cannot tell whether the other 9 workspace tools were excluded because of session-type defaults, per-session overrides, or fleet policy. There is no attribution on the exclusion.

Compare with the Connections screen, where every tool has `lock.source` explaining WHY it is locked (r5, fleet, governance, none). The session tools endpoint returns the tools that ARE available but says nothing about tools that are NOT available or why.

**Recommendation**: Add an `excluded` array or `totalWorkspaceTools` count to the `GET /api/sessions/:id/tools` response so the TUI can render "3 of 12 tools (9 restricted by session type: cron default allowlist)". Alternatively, return the full workspace tool list with a `sessionAccess: 'allowed' | 'restricted'` per tool, matching the lock attribution pattern used in the Connections chunk.

### F-07: RunHistoryTimeline component shows duration above and timestamp below — but what about errors? [MEDIUM]

**Pulses affected**: 62

Pulse 62 specifies `RunHistoryTimeline.tsx` with "status markers (checkmark for success, X for error, clock for timeout), timestamps below, duration above." The summary line is "23/25 successful, 1 error, 1 timeout (last 7 days)."

For the error case, the CL-10 API includes an `error` field: `"Budget exceeded (95% threshold)"` and `"Timeout after 120s"`. But the RunHistoryTimeline component specification does not say where the error message renders. Duration is above the marker. Timestamp is below. Where is the error text?

Pulse 62 says "Error detail expandable" on the Cron Run History screen but this is listed as a separate screen from RunHistoryTimeline. The component itself (used in the session detail Runs tab) has no error expansion specification.

**Recommendation**: Add to the RunHistoryTimeline component spec: error markers are expandable (Enter key or click expands to show the error message below the timestamp). Alternatively, error markers show a truncated error string (first 40 chars) inline.

### F-08: Approval displayLabel for channel and agent sessions has no UX example [MEDIUM]

**Pulses affected**: 63

Pulse 63 gives UX examples for two session types: "Daily Triage (cron)" and "Main Session." But there are four session types. The examples for channel and agent are missing:

- Channel: Is it "design-team (channel)" or "#design-team (channel)" or "Channel: design-team"?
- Agent: Is it "scout (agent)" or "Agent scout" or "scout (delegated by main)"?

The agent case is particularly important because pulse 60 defines agent sessions as having a `delegatedBy` field. The approval display for an agent session should arguably include the delegation chain: "scout (agent, via main)" — so the approver knows who spawned the agent that wants to send email.

**Recommendation**: Add explicit displayLabel examples for all four session types in pulse 63's acceptance criteria. For agent sessions, include the delegator: "scout (agent, via main)".

### F-09: Session ID format is inconsistent between CL-10 and pulse 60 [MEDIUM]

**Pulses affected**: 60, 61

CL-10 uses compound IDs: `"main"`, `"cron:daily-triage"`, `"channel:design-team"`, `"agent:scout"`. The session type is encoded in the ID with a colon prefix for non-main sessions. But pulse 60 defines `SessionState` with separate `id` and `type` fields. This raises the question: is `id` the full compound ID (`"cron:daily-triage"`) or just the discriminator (`"daily-triage"` with `type: "cron"` as a separate field)?

Pulse 61's route is `GET /api/sessions/:id`. If the ID is compound, the colon in `cron:daily-triage` must be URL-encoded (`cron%3Adaily-triage`) or the route must handle it specially. Express/Fastify route params with colons in the value work correctly but this is non-obvious.

A developer implementing the TUI HTTP client in pulse 62 must know the ID format to construct the URL. The pulse does not specify whether the client URL-encodes the session ID when calling `/api/sessions/${id}/runs`.

**Recommendation**: Pulse 60 should specify whether `SessionState.id` is the full compound form or the name-only form. If compound, pulse 61 should note that colons in path params are handled correctly by Fastify. Pulse 62's TUI client should use `encodeURIComponent(sessionId)` in URL construction.

### F-10: Pulse 63 is additive but does not specify backward compatibility for consumers that do not expect session fields [LOW]

**Pulses affected**: 63

Pulse 63's acceptance criteria include "Existing approval event consumers continue to work (additive change, no breaking removals)." This is the right criterion. But `createApprovalRequest()` changes from accepting `(tool, args)` to requiring `(tool, args, session)`. This is a breaking signature change, not an additive one.

Existing callers of `createApprovalRequest()` that do not have session context (e.g., tool calls from workspace-level contexts before sessions exist) must be updated. The pulse says session fields are "required" on `ApprovalRequestEvent`, which means there is no way to emit an approval event without session context.

This creates a chicken-and-egg problem: approval events from CL-12 (pulse timeframe unclear) may predate the session model. If session context is required on every approval event, all existing approval call sites must be updated simultaneously.

**Recommendation**: Make `sessionId` and `sessionType` required on the event type but provide a `createApprovalRequest()` overload that accepts no session and defaults to `{ id: 'workspace', type: 'main' }`. This preserves backward compatibility while making session context the norm.

### F-11: No specification for how the TUI sessions screen refreshes when sessions change [LOW]

**Pulses affected**: 62, 54

Pulse 54 (SSE live updates) wires `useSSERefresh` into existing screens: connections, soul editor, governance dashboard. But pulse 62 (TUI sessions) is in CP-9, the same checkpoint as SSE (pulse 54). Pulse 62's deliverables do not mention SSE integration.

Session state is the most dynamic data in the entire TUI — sessions start, stop, error, and complete continuously. The sessions screen without SSE refresh requires manual re-fetch (navigate away and back). This is the one screen where live updates are most valuable, yet it has no SSE specification.

**Recommendation**: Add a deliverable to pulse 62: sessions screen subscribes to SSE `session_state_changed` events (or the appropriate event type) and auto-refreshes the session list. If the SSE event type for session changes does not exist, add it to pulse 54's event list.

---

## Evaluation: Does the TUI Emulate ClawPilot Well Enough?

ClawPilot's core UX is a session-aware dashboard: you see all sessions at a glance, drill into any session to see its tools and history, and get visual alerts when a cron job fails. The TUI sessions screen (pulse 62) captures the structure — list, drill-in, tabs — but misses three ClawPilot qualities:

1. **At-a-glance health**: ClawPilot shows cron health on the overview row. The TUI buries it in the detail view (F-02).
2. **Tool attribution**: ClawPilot explains why a session has fewer tools. The TUI shows a flat list with no exclusion context (F-06).
3. **Live state**: ClawPilot updates session status in real-time. The TUI has no SSE spec for session changes (F-11).

With the recommendations from F-02, F-06, and F-11 applied, the TUI would be a credible terminal emulation of ClawPilot for validation purposes. Without them, the TUI validates the API contract but not the operator experience.

## Evaluation: "Daily Triage (cron)" vs. "Agent wants to send-email"

The session-contextualized approval label is unambiguously better. An approver seeing "Daily Triage (cron) wants to send-email" knows immediately: this is the scheduled inbox triage job requesting email send access, not an interactive user action. This context changes the approval decision — a cron job sending email at 6 AM is a different risk posture than a user clicking "send" in a chat.

The improvement is real and well-motivated. The gap is in the derivation specifics (F-03) and the missing examples for channel and agent types (F-08). The concept is right; the specification needs to be precise enough that any implementer produces the same output.

## Evaluation: Would a Developer Know What to Render?

For the session list: partially. The API response shape in CL-10 is clear — JSON with type, status, toolCount, lastActivity. A developer can render something. But the lack of a visual wireframe (F-01) means they do not know the expected layout, and the incomplete status rendering spec (F-05) means they must invent visual treatment for 2 of 5 states.

For the session detail: no. The three-tab structure is named but the tab content is underspecified: what does the Runs tab show for non-cron sessions (F-04)? What does the Tools tab show when it matches the workspace set (F-04)? Where do error messages render in the timeline (F-07)?

For the approval display: almost. The displayLabel computed property is well-conceived but the derivation chain is ambiguous (F-03) and two of four session types lack examples (F-08).

---

## Overall Assessment

The session model is architecturally sound. The four-pulse sequence (types -> routes -> TUI -> approval) follows the SDK-owns-logic pattern correctly. The session-scoped tool resolver is a real capability differentiator. The approval context improvement is exactly right.

The two HC-BLOCK findings are about operator visibility:

1. **No visual spec for the sessions overview** (F-01): The implementer needs a wireframe, not just acceptance criteria. Every other TUI screen has one.
2. **Cron error states invisible on the overview** (F-02): This is the primary monitoring use case for ClawPilot-style interfaces, and it is not addressed at either the API level or the TUI level.

Both are addressable within the existing pulse structure — F-01 by adding a wireframe to pulse 62, F-02 by adding `lastRunStatus` to `SessionSummary` in pulse 60 and rendering it in pulse 62.
