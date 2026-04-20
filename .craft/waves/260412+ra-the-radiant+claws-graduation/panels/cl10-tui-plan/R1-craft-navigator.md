# R1 Review: claws-tui Plan -- Navigator Lens

**Role**: craft/navigator
**Cluster**: E (User journey coherence > Implementation simplicity)
**Plan**: claws-tui
**Date**: 2026-04-15
**Round**: 1

## Orientation

Evaluating whether the TUI tells a coherent story across its 3 experiences (Settings, Lobster, Companion), whether first-time users can navigate without reading specs, whether error states are immediately understandable in a terminal, and whether the demo mode creates a compelling "first 5 minutes" for both internal validation and partner onboarding.

## Findings

### F01 -- The 3 experiences have no visible narrative arc connecting them [M]
**Severity**: Must-address
**Category**: Journey coherence

The plan defines 3 experiences (Agent Settings, Lobster Collaboration, Companion App) but presents them as parallel tabs in a flat navigation structure. There is no connective tissue. A user landing in the TUI sees 15 screens across 3 categories with no indication of *why* they are grouped this way, *who* each experience is for, or *what order* to explore them. The CAP Figma has a clear persona story (admin configures settings, user collaborates, power user monitors). The TUI flattens this into a tab strip where "General" sits next to "Soul Editor" sits next to "Governance Dashboard" with no grouping cues.

**Recommendation**: Add experience-level grouping to the tab navigation. Three tab groups with visible headers: "Settings (Admin)" / "Collaboration (User)" / "Management (IT)". Within each group, tabs are ordered by complexity (simple screens first). The grouping makes the TUI self-documenting: even without reading the spec, a user understands that these are three distinct personas sharing one API. Consider a welcome/landing screen that shows the three experiences as entry points before diving into any tab.

### F02 -- Tab ordering within Connections violates progressive disclosure [M]
**Severity**: Must-address
**Category**: Progressive disclosure

The Connections screen is the most complex in the entire TUI: two-level drill-down (server list L1, tool list L2), risk badges, lock icons, governance banners, "Allow all" button, and PATCH interactions including R5 rejection flows. The plan schedules it as Pulse 3 (the third screen built) and lists it third in the Experience 1 table. For a user exploring the TUI top-to-bottom, they hit maximum complexity on the third screen. General and Preferences are gentle warm-ups, then Connections is a wall of badges, locks, and drill-in states.

**Recommendation**: Reorder Experience 1 tabs so the user encounters complexity gradually: General (editable text fields) -> Preferences (multiline editor + schedule) -> Memory (read-only toggles with data labels) -> Connections (full drill-in + risk + locks) -> Groups (read-only lists) -> Entitlements (read-only lists). Memory before Connections gives the user a gentler introduction to toggles and data labels before encountering the full governance gauntlet. Groups and Entitlements are simple read-only screens that serve as "rest stops" after the Connections deep-dive.

### F03 -- Error banners lack next-action guidance [M]
**Severity**: Must-address
**Category**: Error experience

The plan specifies error rendering as colored banners: red for R5 rejection ("R5_NON_NEGOTIABLE -- send-email cannot be ungated"), red for fleet lock ("FLEET_LOCK_VIOLATION -- contact fleet admin"). These messages explain WHAT is wrong but not WHAT TO DO. "Contact fleet admin" is a start, but in a terminal there is no hyperlink, no admin name, no fleet policy file path. "Cannot be ungated" tells the user their action failed but not why R5 is non-negotiable or what their alternatives are.

For a partner watching the TUI demo, these error messages are the API contract they will implement. If the TUI shows terse rejection codes, partners will copy that UX into their real UI. The TUI is a reference implementation -- its error messages teach partners what good governance UX looks like.

**Recommendation**: Every error banner should have three parts: (1) what happened (red code), (2) why (one-sentence governance explanation), (3) what to do next (actionable step). Example: "R5_NON_NEGOTIABLE: send-email uses On-Behalf-Of and cannot operate without approval. This is enforced by the governance compiler and cannot be overridden. To authorize individual calls, add a reviewer in the Preferences tab." For fleet lock: include the fleet policy file path and the admin identity from AGENTS.md if available.

### F04 -- Demo mode has no guided walkthrough [M]
**Severity**: Must-address
**Category**: First 5 minutes

`claws tui --demo` loads a fixture workspace and... drops the user into the tab view. The plan says it "shows all 9 screens" (though the plan elsewhere says 15 screens) and "exercises PATCH rejection on R5." But it does not describe HOW a first-time user discovers these flows. A fixture workspace with pre-loaded data is necessary but not sufficient for a demo. The user must know: (a) which tab to look at first, (b) what to click to see the R5 rejection, (c) what the governance feedback looks like when it works.

The Build demo is the single most important partner onboarding artifact. If a partner runs `claws tui --demo` and sees a tab strip with 15 tabs and pre-loaded data, they will spend 10 minutes clicking around randomly before understanding the value proposition. Compare: a guided walkthrough that says "Try toggling send-email OFF in the Connections tab" and then shows the R5 rejection live -- that is a 30-second "aha moment."

**Recommendation**: Add a `--demo --guided` mode (or make guided the default for demo). A sidebar or bottom panel shows a sequence of 5-7 prompts: "1. Open General -- see agent identity. 2. Open Connections -- notice the R5 lock on send-email. 3. Try toggling send-email OFF -- watch the rejection. 4. Try 'Allow All' -- notice R5 is excluded. 5. Open Governance Dashboard -- see the risk distribution. 6. Edit the prompt in Preferences -- watch recompilation. 7. Open Activity Feed -- see the SSE events from your edits." This turns the demo from a data dump into a story.

### F05 -- The screen count is inconsistent (9 vs 15) [W]
**Severity**: Warning
**Category**: Plan coherence

The plan title says "15 Screens" in the scope section. The demo section says "shows all 9 screens." The scope tables actually list 6 (Settings) + 5 (Lobster) + 4 (Companion) = 15. The 9-screen reference in the demo section appears to be an earlier draft that was not updated. A partner reading this plan will be confused about the actual scope.

**Recommendation**: Fix the demo section to reference all 15 screens, or explicitly state which subset the demo covers. If the demo intentionally omits 6 screens (e.g., the Companion App screens are too advanced for a first demo), say so and explain the phasing. Consistency in the plan is a signal of consistency in the product.

### F06 -- No keyboard shortcut discoverability beyond Pulse 8 [W]
**Severity**: Warning
**Category**: Terminal UX

Pulse 8 lists "keyboard shortcuts, help panel" as polish work. But the plan never specifies what the keyboard model IS. Tab navigation between 15 screens in a terminal needs: (a) a consistent key to move between tabs (arrow keys? number keys? ctrl+tab?), (b) a way to go "back" from L2 drill-in to L1 server list, (c) a way to confirm/cancel edits, (d) a way to trigger PATCH from an edit state. These are not polish -- they are the interaction model. A TUI without a clear keyboard model is unusable.

**Recommendation**: Define the keyboard model in the plan scope, not in Pulse 8 polish. At minimum: left/right arrows for tab groups, up/down for tab selection within a group, Enter to drill in, Escape to go back, Tab to move between form fields, Enter to submit a PATCH, `?` to show the help overlay. This model should be implemented in Pulse 1 (scaffold) so every subsequent pulse builds on it. Partners watching the demo will judge the TUI by its keyboard fluency.

### F07 -- Soul Editor and Memory Browser lack visual governance cues [M]
**Severity**: Must-address
**Category**: Governance visibility

The Soul Editor screen says "Deny rules highlighted with governance context" and "Compiler-injected rules shown as locked." The Memory Browser says "Editable with data label indicators." But the plan never specifies HOW these render in a terminal. Deny rules in SOUL.md are prose text -- they are not structured fields with toggle switches. How does the TUI visually distinguish "Never send email without approval" (a deny rule that maps to R5 enforcement) from "Write reports in a professional tone" (an instruction with no governance significance)?

This is a critical UX question because the Soul Editor is where the user's mental model of governance is formed. If deny rules look the same as instructions, the user has no intuition for what is governance-significant. If compiler-injected rules are "shown as locked" but the user does not understand WHY they are locked (because the TUI does not explain the provenance), the locked state feels arbitrary.

**Recommendation**: Define a visual language for governance annotations in text. Deny rules should be rendered with a left-border color (red for R5, yellow for user-authored) and a trailing badge ("R5 DENY" / "USER DENY"). Compiler-injected rules should have a distinct background (grey) with a lock icon and a one-line explanation: "Injected by governance compiler -- cannot be removed." Instructions with no governance significance render plain. This visual language teaches the user to read governance in natural text -- the same literacy they need when editing SOUL.md directly.

### F08 -- Trust Dashboard "Request Escalation" button hides a multi-step flow [W]
**Severity**: Warning
**Category**: Interaction clarity

The Trust Dashboard screen shows "Request Escalation button triggers approval flow." The CL-10 spec describes this as a multi-step process: Companion App triggers ApprovalRequestEvent, manager approves, Companion App receives token, Companion App calls PATCH with token. In the TUI, this is represented as a single button. But pressing that button does not immediately escalate trust -- it starts an asynchronous approval flow that requires a different person (the manager) to act.

If the TUI renders "Request Escalation" as a button that the user presses and then... nothing happens (because the manager has not approved yet), the experience is confusing. The user does not know if their request was sent, if it is pending, or if it failed.

**Recommendation**: The "Request Escalation" interaction should have three visible states: (1) "Request Escalation" button (before press), (2) "Escalation Requested -- Awaiting Manager Approval" status with a timestamp (after press, before approval), (3) "Escalation Approved -- Tier Promoted to T3" confirmation (after approval). In demo mode, simulate the approval flow with a 3-second delay so the partner sees all three states. This teaches the approval pattern that partners must implement in their real UI.

### F09 -- Activity Feed (SSE) has no empty-state or connection-state UX [W]
**Severity**: Warning
**Category**: Edge states

The Activity Feed screen says "Live stream of file changes, compilations, governance warnings. Real-time updates as you edit in another terminal." But the plan does not address: (a) What does the Activity Feed show when no events have occurred? An empty screen with no guidance? (b) What does it show when the SSE connection drops? CL-10 specifies SSE is current-state-only with no replay. If the user switches to the Activity Feed tab after being on another tab, they see only events that arrived after they opened it. (c) What does it show during server recovery (503 from startup health check)?

Empty states and connection states are where terminal UIs fail hardest. A blank screen with a blinking cursor teaches the user nothing. A "Disconnected -- reconnecting..." banner teaches them that SSE is live and transient.

**Recommendation**: Define three Activity Feed states: (1) "Listening for events..." (connected, no events yet -- with a hint: "Edit a file in another terminal to see events here"), (2) live event stream (normal operation), (3) "Connection lost -- reconnecting in 3s..." (SSE disconnect, with automatic retry). In demo mode, pre-seed 3-4 historical events so the feed is never empty on first view.

### F10 -- No screen for "Allow All" result decomposition [W]
**Severity**: Warning
**Category**: Interaction feedback

The "Allow all" interaction returns `{ still_gated: ['send-email'], reason: 'R5 tools excluded from Allow All' }`. The plan says the TUI shows "R1-R4 approved. R5 still_gated shown with lock icon." But "Allow all" potentially affects dozens of tools across multiple servers. The user pressed one button and needs to understand what happened to every tool. A single banner saying "R5 still gated" does not decompose: how many tools were approved? Which servers were affected? Were any fleet-locked tools also excluded?

**Recommendation**: After "Allow all," show a result panel that lists: (a) tools now approved (green checkmarks, grouped by server), (b) tools still gated due to R5 (red locks with reason), (c) tools still gated due to fleet policy (orange locks with reason). This decomposition is essential for the partner demo -- it shows that "Allow all" is governance-aware, not a blunt override.

### F11 -- The TUI is a consumer of `claws serve` but has no graceful startup when serve is not running [M]
**Severity**: Must-address
**Category**: First-run experience

The plan says "The TUI is a consumer of claws serve, not part of it. It calls HTTP endpoints like any partner would." But what happens when a user runs `claws tui` and `claws serve` is not running? The plan does not address this. The most likely first-run experience is: user installs claws, runs `claws tui`, gets a connection refused error, does not know they need to run `claws serve` first.

**Recommendation**: Two options: (a) `claws tui` auto-starts `claws serve` as a child process (managed lifecycle -- TUI starts serve, TUI exit kills serve), or (b) `claws tui` detects that serve is not running and shows a clear message: "claws serve is not running. Start it with: claws serve --port 3000" with the exact command. Option (a) is better for the demo experience -- `claws tui --demo` should be a single command that starts everything. Option (b) is better for production where serve may be a long-running daemon. Consider (a) for `--demo` mode and (b) for normal mode.

### F12 -- Partner watching the demo cannot see the API calls behind the TUI [W]
**Severity**: Warning
**Category**: Partner onboarding

The plan positions the TUI as a reference implementation: "If the TUI works, the API works." But a partner watching the TUI demo sees screens and interactions -- they do not see the HTTP calls that produced them. The partner's job is to replicate these screens in CAP/Lobster/Companion using the same API. Without seeing the API calls, the partner must reverse-engineer the mapping from the spec.

**Recommendation**: Add a "Developer Mode" toggle (e.g., press `d` to toggle) that shows a side panel or bottom panel with the raw HTTP request/response for every API call the TUI makes. When the user navigates to the Connections tab, the developer panel shows `GET /api/chunks/connections` and the JSON response. When the user toggles a tool, it shows the `PATCH /api/chunks/connections/outlook` request and the `PatchResult` response. This transforms the TUI from a demo into a teaching tool. Partners can literally copy the API calls from the developer panel.

## Summary

The TUI plan is architecturally sound -- consuming the same API that partners will use is the right validation strategy. But the plan is written from the implementer's perspective (what to build in 8 pulses) rather than the user's perspective (what it feels like to use). The three experiences lack a visible narrative arc. Progressive disclosure is violated by placing Connections (maximum complexity) third. Error messages teach rejection codes but not next actions. Demo mode loads data but does not guide the user through the value proposition. The keyboard model is deferred to polish when it should be foundational. Governance annotations in text (Soul Editor, Memory Browser) have no visual language specification.

The single highest-leverage fix is F04 (guided demo mode). The Build demo is the primary partner onboarding artifact. A guided walkthrough that takes 2 minutes and shows R5 rejection, fleet lock, SSE live updates, and risk badges will do more for partner adoption than 15 perfectly rendered screens with no narrative.

| Severity | Count |
|----------|-------|
| Must-address | 6 |
| Warning | 6 |
| Note | 0 |
