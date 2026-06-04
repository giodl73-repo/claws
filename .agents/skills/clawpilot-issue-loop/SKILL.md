---
name: clawpilot-issue-loop
description: "Use for Clawpilot issue-loop work in gim-home/m: mapping user feedback themes to existing GitHub issues, filing small PR-able issue batches, checking issue status, tracking linked PRs, and keeping issue text problem-led while leaving implementation choices to Clawpilot owners."
---

# Clawpilot Issue Loop

Use this skill for Clawpilot feedback-to-issue work in `gim-home/m`.

## Repository And Auth

- Local checkout: `C:\src\clawpilot`.
- GitHub repo: `gim-home/m`.
- If `gh` cannot resolve the repo, check auth and switch the active GitHub.com
  account to `giodl_microsoft`:

```powershell
gh auth status
gh auth switch --hostname github.com --user giodl_microsoft
```

Use `gh` for live issue state. Do not rely only on local notes.

## Issue Loop Workflow

1. Start with a live issue search/list for the relevant theme.
2. Classify coverage:
   - `covered`: one issue directly captures the pain point.
   - `fragmented`: several issues cover symptoms but no umbrella exists.
   - `missing`: no issue captures the product problem.
3. Prefer updating/linking existing umbrella issues over filing duplicates.
4. File only small PR-able child issues unless the user explicitly asks for a
   product umbrella.
5. Keep issue text problem-led:
   - user signal
   - problem
   - possible direction
   - related issues
   - acceptance sketch
6. Leave implementation details open for Clawpilot owners.
7. File only a few issues per pass, normally 3-5 unless the user asks for a
   larger batch.

## Current Master Notes

Read the wave note when you need the current master list:

```powershell
Get-Content C:\src\claws-hapi\.craft\waves\260528+hapi-the-bringer+openclaw-feeds\clawpilot-issue-loop.md
```

## First Filed Batch

Issues filed on 2026-05-28:

- #2712 Add a shared session status model for desktop, Teams, and automations
- #2713 Show waiting-on-user badges in the session sidebar
- #2714 Keep long-running task progress visible in chat while tools are running
- #2715 Add diagnostic ID and recovery actions to generic Something went wrong errors
- #2716 Preflight PowerShell, Python, and PATH prerequisites at startup/setup
- #2717 Add retry and continue controls for failed automation runs
- #2718 Normalize automation run status rendering and refresh history on completion
- #2719 Add pin and favorite support for sessions in the sidebar

## Next Candidate Batch

Filed/covered on 2026-06-01:

- Full-width chat bubble setting: covered by #2520 / #1993.
- Windows/Linux zoom shortcuts when app menu is hidden: covered by #2664.
- "Always allow similar command" permission action: filed as #2888.
- Deduplicate repeated permission prompts across similar commands: filed as #2890.
- Plain-language permission prompt summaries: filed as #2887.
- Auth health indicator and token expiry warning: filed as #2889.
- Detect M365 auth expiry before automation run: covered by #1178.
- Launch-on-startup and auto-connect setup prompt: filed as #2886.

## Useful Commands

```powershell
gh issue list --repo gim-home/m --state open --limit 200 --json number,title,state,labels,updatedAt,url
gh issue view <number> --repo gim-home/m --json number,title,state,labels,assignees,comments,closedAt,url
gh pr list --repo gim-home/m --state all --search "<issue number or title keywords>" --json number,title,state,url,updatedAt
gh issue create --repo gim-home/m --title "<title>" --body-file <file> --label needs-triage
```
