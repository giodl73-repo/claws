# Clawpilot Issue Loop

## Source Context

May 2026 Clawpilot feedback summary:

- 588 feedback data points.
- 200+ contributors.
- Sources: email and Teams Project Lobster Community.
- Not yet including the Clawpilot Teams channels.

Core read: Clawpilot is crossing from novelty into dependency. The strongest
user signal is not "does Clawpilot work?" but "can I trust it while it works?"
Users need to see, control, and recover from delegated work.

## Primary Pain Points

1. Progress visibility is a trust issue.
2. Permission prompts are creating learned helplessness.
3. Setup/auth failures feel like product failures.
4. Automation fragility.
5. Always-on gap.
6. Workspace control is becoming urgent.

## Issues Filed

Filed in `gim-home/m` on 2026-05-28:

1. #2712 Add a shared session status model for desktop, Teams, and automations
2. #2713 Show waiting-on-user badges in the session sidebar
3. #2714 Keep long-running task progress visible in chat while tools are running
4. #2715 Add diagnostic ID and recovery actions to generic Something went wrong errors
5. #2716 Preflight PowerShell, Python, and PATH prerequisites at startup/setup
6. #2717 Add retry and continue controls for failed automation runs
7. #2718 Normalize automation run status rendering and refresh history on completion
8. #2719 Add pin and favorite support for sessions in the sidebar

Each issue references the feedback signal, related existing issues, and a
possible direction while leaving implementation details open for Clawpilot
owners.

## Existing Umbrellas To Update Instead Of Refiling

- Permission fatigue: use #1148 as the umbrella.
  Link #1646, #1774, #2479, #1600, #1374, #1773, #2130, #2687.
- Automation retry/continue: use #2458 as the umbrella.
  Link #1339, #2640, #2619, #2541, #2540, #2180, #2199, #1523, #2457.
- Workspace/session control: use #2514 or #2196 as the umbrella.
  Link #2575, #2625, #2626, #2150, #2464, #2520, #1993, #2664, #2617.

## Next PR-Able Issue Candidates

File only a few at a time.

Filed/covered on 2026-06-01:

1. Add full-width chat bubble setting: covered by #2520 / #1993.
2. Fix Windows/Linux zoom shortcuts when app menu is hidden: covered by #2664.
3. Add "Always allow similar command" permission action: filed as #2888.
4. Deduplicate repeated permission prompts across similar commands: filed as #2890.
5. Add plain-language permission prompt summaries: filed as #2887.
6. Add auth health indicator and token expiry warning: filed as #2889.
7. Detect M365 auth expiry before automation run: covered by #1178.
8. Add launch-on-startup and auto-connect setup prompt: filed as #2886.

## Later / Needs Design First

- Official always-on cloud runtime.
- Shared team skill marketplace.
- Second Brain / dreaming / memory architecture.
- Progressive trust after N confirmations.
- Full desktop-vs-cloud product model.

## Check-In Workflow

1. Switch GitHub CLI active account to `giodl_microsoft` if `gim-home/m` does
   not resolve.
2. Check issues #2712-#2719 for assignment, comments, linked PRs, and closure.
3. Look for new duplicate issues before filing another batch.
4. Keep issue text problem-led and implementation-light.
5. File 3-5 issues per pass, not the whole backlog.
