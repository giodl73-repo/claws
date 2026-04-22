---
role: craft/navigator
round: 1
wave: "Ra the Radiant (XCIII)"
scope: "Pulse 73 — Policy Violation State Model + CL-10 OC Runtime Writes + Scenario S41"
tension: "User journey coherence > implementation simplicity"
date: 2026-04-16
finding_count: 12
severity_distribution:
  HC-BLOCK: 3
  HC-WARN: 4
  MEDIUM: 3
  LOW: 2
---

# R1 — craft/navigator Review: OC Runtime Writes & Policy Violation State Model

## Summary

Pulse 73 introduces the violation state machine (CLEAN, DEGRADED_R5, DEGRADED_WARN, ERROR) that governs what happens when an external write -- OC runtime skill install, VS Code edit, OneDrive sync -- creates a governance violation in the workspace. CL-10 specifies the detection and response pipeline (file watcher detect, auto-snapshot, recompile, degrade, surface, fix, clean) and the severity-based enforcement table. Scenario S41 validates the specific case of an OC runtime installing a skill with an R5 tool that lacks an elicitation gate.

The mechanical pipeline is sound. The state machine transitions are correct. The safety invariant -- never accept a violation into the compiled GovernanceIR -- is the right design. The per-tool blocking granularity (DEGRADED_R5 blocks only the violating tool, not the workspace) is the critical differentiator from a naive implementation.

Where this design falls short is in the admin's experience of discovering, understanding, and resolving a violation. The spec describes what the system does internally but underspecifies what the admin sees at each step. The admin is the protagonist of the recovery flow, yet the spec treats them as a downstream consumer of SSE events and status endpoint JSON, not as a person sitting in front of a terminal who needs to understand what went wrong, what is affected, and what to do about it -- in that order.

I evaluated all three sources through the navigator lens: does every user path from "violation detected" to "CLEAN restored" tell a consistent, actionable story?

---

## Findings

### F-01: DEGRADED_R5 in the governance dashboard is a status code, not a diagnosis [HC-BLOCK]

**Sources affected**: CL-10 Policy Violation State Model, Pulse 73

CL-10's severity table says DEGRADED_R5 produces "Governance dashboard shows red alert." Pulse 73's status endpoint returns `{ status: 'degraded_r5', lastGoodVersion: 42, violations: [...], fixGuidance: '...' }`. But the spec never defines what the governance dashboard actually renders when it receives this payload.

An admin opens the governance dashboard and sees... what? A red banner that says "DEGRADED_R5"? That is a system state label, not a diagnosis. The admin's first question is not "what state am I in?" -- it is "what happened?" The status code tells them the system is degraded but not why. The `violations` array in the status response contains oc:// paths and severity, but the spec does not define the rendering of this array on the governance dashboard or in the TUI.

Compare with the Connections screen, which has a full visual specification: risk badges, lock icons, "Allow all" button, and error banners with three-part structure (what happened, why, what to do). The violation state has no equivalent rendering specification. The governance dashboard section of CL-10 (GET /api/governance) returns `compilationStatus: "clean"` and `warnings: [...]` but has no field for active violations or degraded state. There is a structural gap: the governance dashboard API response (line 862) has no `violations` field, no `degradedState` field, and no `blockedTools` field. The status endpoint (GET /api/status) has the violation data, but the governance endpoint does not.

**Recommendation**: The governance dashboard API response (GET /api/governance) must include violation state when it is not CLEAN: `degradedState: 'degraded_r5'`, `blockedTools: [{ tool: 'deploy-to-prod', violation: 'R5_MISSING_ELICITATION', since: '...' }]`, `fixGuidance: '...'`. The TUI governance screen needs a visual specification for the degraded state: a red section at the top of the dashboard showing each blocked tool, the violation type, the source attribution, and a one-line fix action. This is the first thing the admin sees when they open the dashboard, not a detail they drill into.

### F-02: "Fix Required" banner has no specification for what "fix" means [HC-BLOCK]

**Sources affected**: CL-10 line 1903, Pulse 73

CL-10 says: "The TUI shows a 'Fix Required' banner with the specific violations." Pulse 73's deliverables include "Chunks include governance.violations array." Neither source specifies what the "Fix Required" banner contains beyond the violation list.

The admin sees "Fix Required" and asks: fix WHAT? Fix WHERE? Fix HOW? The spec provides the violation path (e.g., `oc://TOOLS.md/Tools/deploy-to-prod`) and the violation type (`R5_MISSING_ELICITATION`), but never specifies the fix action in concrete terms. For an R5 violation caused by a missing elicitation gate, the fix is one of:

1. Add an elicitation gate to the tool definition in TOOLS.md
2. Remove the tool entirely
3. Restore the auto-snapshot to undo the OC runtime's write

The spec does not tell the admin which of these is appropriate or how to do any of them. Pulse 73's `fixGuidance` field in the status response is a single string -- but its content is never specified. Is it a static message? A per-violation-type template? A computed recommendation based on the violation?

This is an HC-BLOCK because the entire recovery flow depends on the admin knowing what to do. A banner that says "Fix Required: R5_MISSING_ELICITATION at oc://TOOLS.md/Tools/deploy-to-prod" tells the admin that a tool named deploy-to-prod violates R5, but does not tell them how to add an elicitation gate, what an elicitation gate looks like in TOOLS.md syntax, or whether they should instead restore the snapshot.

**Recommendation**: Define `fixGuidance` as a per-violation-type template with concrete instructions. For R5_MISSING_ELICITATION: "Tool 'deploy-to-prod' operates On-Behalf-Of the user but has no elicitation gate. To fix: (1) edit oc://TOOLS.md and add `elicitation: required` to the tool's configuration, or (2) remove the tool, or (3) restore the auto-snapshot at [timestamp] to undo the install. Use `claws snap restore auto:[version]` or PATCH /api/snapshots/restore." The TUI "Fix Required" banner should render this as a multi-line block with the fix options numbered.

### F-03: The recovery flow has no "you are here" indicator across the 7-step sequence [HC-BLOCK]

**Sources affected**: CL-10 Recovery Flow (line 1909), Pulse 73

CL-10 defines a 7-step recovery flow: (1) external write, (2) recompile detects violation, (3) status DEGRADED, (4) admin sees violations, (5) admin fixes, (6) recompile succeeds, (7) CLEAN. The admin enters this flow at step 4. But the spec gives the admin no indication of where they are in the sequence or what has already happened.

When the admin opens the TUI or queries the status endpoint, they see the current state (DEGRADED_R5) and the violations. They do not see: when the violation was detected (step 2 timestamp), what triggered it (step 1 -- OC runtime? VS Code? OneDrive?), whether an auto-snapshot exists (step 1.5), or whether a recompile has been attempted since (did a previous fix attempt fail?).

Pulse 73's audit trail (scenario S41, F09) records the full lifecycle with timestamps, but the audit trail is a forensic tool for post-incident review, not a real-time status indicator. The admin needs a condensed "violation timeline" in the status endpoint and the TUI, not a full audit log. Something like: "2:15 PM: OC runtime wrote to TOOLS.md. 2:15 PM: Auto-snapshot captured (auto:1713286500). 2:15 PM: Recompile found R5 violation. Status: DEGRADED_R5. Waiting for admin fix."

Without this timeline, the admin has questions that the current spec cannot answer from the status endpoint alone: Was the snapshot taken before or after the violation? (Critical for knowing if restore is safe.) How long have we been degraded? Has anyone already attempted a fix? Is there a recompile in progress right now?

**Recommendation**: Add a `violationTimeline` array to the status endpoint response when state is not CLEAN. Each entry has a timestamp, action, and actor. The TUI renders this as a compact timeline above the fix guidance. Minimally: source event, snapshot ID, recompile result, current state, time elapsed.

### F-04: OneDrive sync violations are invisible to the admin because the source attribution is ambiguous [HC-WARN]

**Sources affected**: CL-10 line 1864, Pulse 73 acceptance criteria line 65, Scenario S41 F13

CL-10 says: "OneDrive sync: if workspace is on OneDrive (Lobster model), the file watcher also detects OneDrive sync events. Same pipeline: detect, auto-snapshot, recompile, report." But the Lobster model puts the workspace on OneDrive by design -- every file change on any synced device propagates to the workspace. The admin may not even know that a sync happened.

Scenario S41's finding F13 acknowledges this: "The file watcher must distinguish between OC runtime writes and user editor writes... the audit trail should capture whatever distinguishing signals are available (process name via lsof/handle)." But this is marked as severity "warning" and the attribution is "best-effort." For OneDrive sync, the problem is worse: OneDrive sync writes look identical to local writes at the filesystem level. There is no process name to capture -- OneDrive's sync engine (OneDrive.exe) modifies the file, but so does the admin's own edits propagating from another device.

The concrete user journey failure: Admin edits TOOLS.md on their laptop. OneDrive syncs the change to the agent's Cloud PC. The file watcher detects it. Recompile finds a violation. The admin sees DEGRADED_R5 with source "external_edit" or "onedrive_sync" -- but the admin IS the source. They edited the file on their own laptop. The violation banner tells them "an external write caused a violation" when they themselves caused it. The admin does not think of their own OneDrive-synced edit as an "external write."

**Recommendation**: Two changes. (1) When the source is OneDrive sync, the violation message should say "A file synced via OneDrive introduced a governance violation" -- not "an external write." The admin needs to know it was a sync, not a mysterious external actor. (2) If the edit originated from the same user identity (detectable via OneDrive sync metadata or NTFS owner), the message should say "Your edit to TOOLS.md (synced via OneDrive) introduced a governance violation" -- making it clear the admin themselves caused the issue from another device.

### F-05: The admin has three places to see violations but no single canonical view [HC-WARN]

**Sources affected**: CL-10 lines 1890-1903, Pulse 73

CL-10 specifies that violations surface in three places: (1) governance dashboard (red alert), (2) chunks (governance.violations array), (3) SSE events (governance_violation). The TUI adds a fourth: the "Fix Required" banner. The Companion App adds a fifth. The status endpoint (GET /api/status) is a sixth.

The admin's experience: they might discover the violation via an SSE push notification in the Companion App, via the governance dashboard on their next visit, via a chunk response that includes violations, via the status endpoint from a monitoring tool, or via the TUI banner. Each surface shows a different subset of the violation information:

- Status endpoint: state, violations array, lastGoodVersion, fixGuidance (string)
- Governance dashboard: "red alert" (unspecified rendering)
- Chunks: governance.violations array (oc:// paths + severity)
- SSE: event type, tool name, violation type, source, state
- TUI banner: "Fix Required" + specific violations (rendering unspecified)

No single surface shows the complete picture: violation + source attribution + auto-snapshot availability + fix guidance + recovery timeline. The admin must query multiple endpoints or screens to assemble the full story.

**Recommendation**: Define a canonical "violation detail" view that is reachable from every surface. In the API, this is `GET /api/violations` (or `GET /api/status?detail=violations`) returning the complete violation record: state, each violation with path/severity/type/source/timestamp, fix guidance per violation, auto-snapshot ID and diff URL, and the violation timeline. The TUI renders this as the content of the "Fix Required" banner expansion. The governance dashboard links to it. SSE events include a `detailUrl` field. Every surface points to one place.

### F-06: Chunk responses include violations but do not indicate which tools in the chunk are affected [HC-WARN]

**Sources affected**: CL-10 line 1902, Pulse 73

CL-10 says: "Chunks include governance.violations array with oc:// paths + severity + fix guidance." But the Connections chunk (GET /api/chunks/connections/outlook) returns a list of tools, each with `lock.source`. In DEGRADED_R5, the violating tool has `lock.source: 'violation'` (per CL-10 line 1890). But the chunk-level `governance.violations` array is a flat list of oc:// paths.

A partner rendering the Connections tab sees: (a) a tool with `lock.source: 'violation'` -- correctly locked, (b) a chunk-level `governance.violations` array -- but no linkage between the two. The violation in the array says `oc://TOOLS.md/Tools/deploy-to-prod` has an R5 violation. The tool in `data.tools` has `{ tool: 'deploy-to-prod', lock: { source: 'violation', reason: '...' } }`. The partner must correlate by tool name across two different structures.

Worse, if the chunk spans multiple files (the Connections chunk reads TOOLS.md), the violations array might include violations from tools NOT in this chunk (tools in a different server/connection). The partner has no way to filter "violations relevant to this chunk" vs. "violations elsewhere in the workspace."

**Recommendation**: The chunk-level `governance.violations` array should be scoped to violations within the chunk's data scope. Each violation should include a `toolRef` that matches the `tool` field in `data.tools`, so the partner can correlate without parsing oc:// paths. Alternatively, each tool in `data.tools` should carry its own `violation` field (not just `lock.source`) with the full violation detail inline.

### F-07: The "Fix Required" banner should appear on every TUI screen, not just the governance dashboard [HC-WARN]

**Sources affected**: CL-10 line 1903, TUI plan

CL-10 says: "The TUI shows a 'Fix Required' banner with the specific violations." It does not say WHERE in the TUI this banner appears. Is it only on the governance dashboard? Is it a global banner visible on every screen? Is it a tab-level banner on affected screens only?

The admin might be on the Connections tab when the violation occurs (via SSE push). If the "Fix Required" banner only appears on the governance dashboard, the admin must navigate there to see it. If they are on the Soul Editor or Memory Browser, they have no indication that the workspace is degraded.

The prior navigator review of the TUI plan (R1-craft-navigator.md in cl10-tui-plan) established the principle that error banners should be three-part (what, why, what to do) and that the TUI is a reference implementation whose UX patterns partners will copy. A violation that is only visible on one screen violates this principle -- it means the admin can be editing tools on the Connections tab while the workspace is degraded, unaware that their edits might interact with the violation.

**Recommendation**: The "Fix Required" banner is a global TUI element -- a persistent top bar visible on every screen when the violation state is not CLEAN. It shows a one-line summary ("DEGRADED_R5: deploy-to-prod blocked -- R5 violation from OC runtime install") with a key binding to expand to the full violation detail. This mirrors how the ClawPilot Companion App would render a persistent alert banner.

### F-08: PATCH blocking granularity in DEGRADED_R5 contradicts between CL-10 and Pulse 73 [MEDIUM]

**Sources affected**: CL-10 line 1904, Pulse 73, Scenario S41 F05

CL-10 line 1904 says: "PATCH is blocked (503) until violations are resolved -- you can't edit on top of a broken state." This is a blanket PATCH block. But Scenario S41 finding F05 says: "PATCH requests for other tools and other OC files must succeed normally. The PATCH handler must check the target tool's blocked status, not the workspace-level degraded state. A blanket PATCH block during DEGRADED_R5 is too aggressive."

Pulse 73 takes the scenario's position: "Middleware that blocks PATCH requests when state is ERROR (503), allows PATCH when DEGRADED (with warnings in response)." So PATCH is blocked only in ERROR, allowed with warnings in DEGRADED_R5.

But the CL-10 spec text has not been updated to reflect the per-tool PATCH granularity from the scenario findings. An implementer reading CL-10 alone (without the scenario findings) would implement a blanket 503 for all PATCHes in any non-CLEAN state. An implementer reading pulse 73 would implement per-state PATCH control (503 only in ERROR). An implementer reading scenario S41 would implement per-tool PATCH control (403 for the blocked tool, 200 for everything else).

This is a user journey problem because the admin's ability to continue working during DEGRADED_R5 depends on which interpretation is implemented. If PATCH is blanket-blocked, the admin cannot fix anything via the API -- they must edit files directly or restore a snapshot. If PATCH is per-tool, the admin can continue managing other tools while fixing the violation.

**Recommendation**: CL-10's Policy Violation State Model section must be updated to align with the scenario findings. In DEGRADED_R5: PATCH for the blocked tool returns 403 (R5_TOOL_BLOCKED), PATCH for other tools returns 200 with a `governance.warnings` header, PATCH for non-tool resources (SOUL.md, MEMORY.md) returns 200 normally. In ERROR: all PATCHes return 503. The per-tool granularity is the correct design -- it keeps the workspace operational while the violation is being resolved.

### F-09: No specification for what happens when the admin fixes the violation incorrectly [MEDIUM]

**Sources affected**: CL-10 Recovery Flow, Pulse 73

The recovery flow assumes: admin fixes, recompile succeeds, CLEAN. But what if the admin's fix introduces a new violation? Or what if the fix resolves the R5 violation but creates an R3 violation? Or what if the admin's PATCH is syntactically valid but semantically wrong (adds an elicitation gate to the wrong tool)?

The spec has no "fix failed" state or "fix attempt" event. The state machine in pulse 73 has four states (CLEAN, DEGRADED_R5, DEGRADED_WARN, ERROR) with transitions triggered by recompilation results. If the admin's fix triggers a recompile that still finds violations, the state simply stays DEGRADED (or transitions to a different degraded state). But the admin does not know their fix failed -- the "Fix Required" banner looks the same. The violations array might have different entries, but without a "your fix attempt at T7 did not resolve the violation" message, the admin might think nothing happened.

**Recommendation**: Add a `fixAttempts` counter and `lastFixResult` field to the violation state. When a recompile is triggered after a PATCH (or file edit) during degraded state, the result should indicate whether violations decreased, changed, or increased. The TUI should render: "Fix attempted at 2:25 PM -- 1 violation remaining (was: 1). The R5_MISSING_ELICITATION violation on deploy-to-prod is still present." This feedback loop is essential for the admin to know whether their action had any effect.

### F-10: The auto-snapshot diff endpoint returns structured data but the TUI has no diff viewer [MEDIUM]

**Sources affected**: CL-10 line 1871, Scenario S41 F07, TUI plan

CL-10 specifies `GET /api/diff?from=auto:previous&to=current` to show what OC changed. Scenario S41 finding F07 requires this to be a structured diff (files changed, tools added/removed, risk classifications changed), not raw text. The admin is supposed to use this diff to understand what the OC runtime wrote before deciding whether to fix forward or restore the snapshot.

But the TUI plan has no diff viewer component. The 15 TUI screens include General, Preferences, Connections, Memory, Groups, Entitlements, Soul Editor, Memory Browser, Schedule, Session List, Session Detail, Governance Dashboard, Activity Feed, Audit Timeline, and Skills Store. None of these is a diff viewer. The diff endpoint exists in the API, but the TUI has no way to render its output.

The admin's journey: they see "Fix Required," they want to understand what changed, they call `GET /api/diff` via curl or the Companion App, they read JSON. There is no TUI screen where they can view the diff, compare before and after, and decide on the fix. The entire "understand the violation" step of the recovery flow requires leaving the TUI.

**Recommendation**: Add a "Violation Detail" screen to the TUI that includes a diff view. When the admin expands the "Fix Required" banner (or presses a key), the TUI fetches the diff and renders a before/after comparison: tools added, risk levels changed, governance violations introduced. This does not need to be a full file-level diff -- the structured diff from S41 F07 can render as a table: "deploy-to-prod: ADDED, risk R5, elicitation: MISSING."

### F-11: SSE event names are inconsistent between CL-10 and Pulse 73 [LOW]

**Sources affected**: CL-10 line 1890, Pulse 73

CL-10 line 1890 says: "SSE emits governance_violation event" (underscore). Pulse 73 says: "SSE events: governance_violation... governance_resolved" (underscore). But CL-10 line 1863 says: "oc_runtime_write event" (underscore). Meanwhile, CL-10's SSE section elsewhere uses event names with no prefix convention specified.

A partner subscribing to SSE events needs a consistent naming convention. Are governance events prefixed with `governance_`? Are runtime events prefixed with `oc_`? The event type names in the SSE spec must follow a single convention so partners can write event listeners with pattern-based routing (e.g., all `governance_*` events routed to the violation handler).

**Recommendation**: Standardize SSE event naming to `{domain}:{action}` colon-delimited format (matching the common SSE convention): `governance:violation`, `governance:resolved`, `oc:runtime_write`, `session:state_changed`. This is a minor consistency issue but it affects every SSE consumer's event routing code.

### F-12: No notification to the admin when the workspace exits OneDrive sync scope [LOW]

**Sources affected**: CL-10 line 1864

CL-10 says OneDrive sync is detected by the file watcher and follows the same pipeline. But it does not specify what happens when OneDrive sync itself creates problems that are not governance violations: file conflicts (two devices editing the same file), sync delays (workspace sees a stale version for minutes before the real one arrives), or partial syncs (OneDrive syncs TOOLS.md but not skills/ directory yet).

A partial OneDrive sync could trigger a recompile with incomplete data: the new TOOLS.md references a skill in skills/bad-skill/SKILL.md, but the skills/ directory has not synced yet. The recompile fails with a structural error (missing file), the state transitions to ERROR, and the admin sees "Fix Required" for a problem that will resolve itself in 30 seconds when OneDrive finishes syncing.

This is a low-severity finding because the system behavior is technically correct (ERROR state, last good IR serves, admin notified). But the user experience is poor: the admin rushes to fix a transient error that the system should have waited for.

**Recommendation**: Add a debounce window specifically for OneDrive-attributed changes. If the file watcher detects a change attributed to OneDrive sync, wait for a configurable quiet period (e.g., 5 seconds of no further OneDrive changes) before triggering the recompile. This prevents transient partial-sync states from producing false ERROR transitions. The debounce is separate from the existing recompile debounce -- it applies only to OneDrive-sourced changes.

---

## Evaluation: When the Admin Sees DEGRADED_R5 -- Do They Know What to Do?

No. The admin knows the system is degraded and can identify the violating tool from the violations array. But they do not know:

1. **What happened** -- the source attribution ("oc_runtime" or "external_edit") is a machine label, not a human explanation. "The OC runtime installed a skill that includes deploy-to-prod" would be actionable. "source: oc_runtime" is not.
2. **What to do** -- the fixGuidance field is unspecified. The admin sees a violation but has no concrete fix instructions. Three options exist (add gate, remove tool, restore snapshot) and the spec does not tell them which is appropriate or how to execute any of them.
3. **Where they are in the process** -- no violation timeline. The admin cannot tell if the violation just happened or has been active for hours, whether a snapshot exists, or whether a previous fix attempt failed.

The admin's experience is: red alert, cryptic state label, list of oc:// paths, and silence about what to do next.

## Evaluation: Is the Recovery Flow Intuitive?

The 7-step flow (detect, snapshot, recompile, degrade, surface, fix, clean) is mechanically correct but the admin only experiences steps 4-7. Steps 1-3 happen automatically. The admin's perceived flow is: "I see a red alert. I fix something. The red alert goes away." This is acceptable IF the "fix something" step is well-guided.

Currently it is not. The flow from the admin's perspective is: "I see a red alert. I do not know what to fix or how. I query multiple endpoints to assemble context. I make a change. I do not know if my change worked until I check the status again. Eventually the alert goes away." Each gap in the middle is an opportunity for the admin to give up, fix the wrong thing, or escalate to engineering.

## Evaluation: Dedicated Violations Screen vs. Existing Screens

A dedicated "Violations" screen is not needed IF violations surface prominently on existing screens. The governance dashboard is the natural home. But the governance dashboard API (GET /api/governance) currently has no violation fields -- it reports `compilationStatus: "clean"` and `warnings`. The violation data lives on a different endpoint (GET /api/status). Until the governance dashboard API includes violation state, violations are a status-endpoint concern without a TUI home.

The recommendation is not a new screen but a global banner (F-07) that links to an expanded violation detail within the existing governance dashboard. The governance dashboard needs violation fields added to its API response (F-01).

## Evaluation: OneDrive Sync Awareness

The admin is not aware their files synced. OneDrive sync is transparent by design -- that is its value proposition. But that transparency becomes a liability when sync triggers governance violations. The admin edited a file on their laptop, went to lunch, and came back to find DEGRADED_R5 with source "external_edit." They have no mental model that connects "I edited a file on my laptop" to "the agent's governance is degraded."

The fix is source attribution clarity (F-04) and the debounce window for partial syncs (F-12). The admin needs to see "Your edit synced via OneDrive and introduced a violation" -- not "external write detected."

---

## Overall Assessment

The violation state machine is architecturally sound. Per-tool blocking in DEGRADED_R5, last-good-IR serving in ERROR, and the auto-snapshot contract are all correct design choices. The safety invariant (never accept violations into GovernanceIR) is non-negotiable and correctly specified.

The three HC-BLOCK findings are about admin actionability:

1. **DEGRADED_R5 has no rendering specification** (F-01): The governance dashboard API lacks violation fields, and the TUI has no visual spec for degraded state.
2. **"Fix Required" banner lacks fix instructions** (F-02): The fixGuidance field is undefined. The admin knows something is wrong but not how to fix it.
3. **No violation timeline** (F-03): The admin cannot reconstruct what happened or track whether their fix attempts are working.

All three are addressable within pulse 73's scope -- they require API response additions and TUI rendering specifications, not architectural changes. The state machine is the right foundation. The admin experience built on top of it needs the same level of specification that the Connections screen and Session Model received.
