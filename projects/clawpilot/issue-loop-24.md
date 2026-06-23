# ClawPilot 24-Item Issue Loop

This tracks the ClawPilot feedback-to-issue loop for `gim-home/m`.

The original standalone 24-row source file has not been found. Searches covered
`.craft/waves`, git history, `C:\tmp`, `C:\Users\giodl\Downloads`, and
`C:\src\clawpilot`. The source-found record is the wave note:

- `.craft/waves/260528+hapi-the-bringer+openclaw-feeds/clawpilot-issue-loop.md`

The reconstruction below is deliberately labeled so we do not confuse confirmed
filed work with inferred remaining work.

## Summary

| Range | Status | Source |
| --- | --- | --- |
| 1-8 | Filed on 2026-05-28 as #2712-#2719 | Wave note, live GitHub |
| 9-16 | Filed or covered on 2026-06-01 | Wave note, live GitHub |
| 17-19 | Update/link existing umbrellas instead of filing duplicates | Wave note |
| 20-24 | Design-first product topics, not immediate PR-able issues | Wave note |

## Items 1-8: Filed 2026-05-28

| Item | Issue | Status | Title |
| --- | --- | --- | --- |
| 1 | [#2712](https://github.com/gim-home/m/issues/2712) | Open | Add a shared session status model for desktop, Teams, and automations |
| 2 | [#2713](https://github.com/gim-home/m/issues/2713) | Open | Show waiting-on-user badges in the session sidebar |
| 3 | [#2714](https://github.com/gim-home/m/issues/2714) | Open | Keep long-running task progress visible in chat while tools are running |
| 4 | [#2715](https://github.com/gim-home/m/issues/2715) | Open | Add diagnostic ID and recovery actions to generic Something went wrong errors |
| 5 | [#2716](https://github.com/gim-home/m/issues/2716) | Open | Preflight PowerShell, Python, and PATH prerequisites at startup/setup |
| 6 | [#2717](https://github.com/gim-home/m/issues/2717) | Open | Add retry and continue controls for failed automation runs |
| 7 | [#2718](https://github.com/gim-home/m/issues/2718) | Open | Normalize automation run status rendering and refresh history on completion |
| 8 | [#2719](https://github.com/gim-home/m/issues/2719) | Open | Add pin and favorite support for sessions in the sidebar |

## Items 9-16: Filed Or Covered 2026-06-01

| Item | Issue / Coverage | Status | Theme |
| --- | --- | --- | --- |
| 9 | [#2520](https://github.com/gim-home/m/issues/2520) / [#1993](https://github.com/gim-home/m/issues/1993) | Covered | Full-width chat bubble setting |
| 10 | [#2664](https://github.com/gim-home/m/issues/2664) | Covered | Windows/Linux zoom shortcuts when app menu is hidden |
| 11 | [#2888](https://github.com/gim-home/m/issues/2888) | Open | Scoped Always allow similar command permission action |
| 12 | [#2890](https://github.com/gim-home/m/issues/2890) | Open | Deduplicate repeated permission prompts for the same command shape |
| 13 | [#2887](https://github.com/gim-home/m/issues/2887) | Open | Plain-language permission prompt summaries |
| 14 | [#2889](https://github.com/gim-home/m/issues/2889) | Open | Auth health indicator and token-expiry warning |
| 15 | [#1178](https://github.com/gim-home/m/issues/1178) | Covered | Detect M365 auth expiry before automation run |
| 16 | [#2886](https://github.com/gim-home/m/issues/2886) | Open | Launch-on-startup and auto-connect setup controls |

Scratch body drafts for the June filed issues are in
`C:\tmp\clawpilot-issue-bodies`.

## Items 17-19: Umbrella Update Work

These should be updated, linked, or commented on before filing new duplicate
issues.

| Item | Umbrella | Status | Related issues to link/check |
| --- | --- | --- | --- |
| 17 | [#1148](https://github.com/gim-home/m/issues/1148) Permission UX | Open | #1646, #1774, #2479, #1600, #1374, #1773, #2130, #2687 |
| 18 | [#2458](https://github.com/gim-home/m/issues/2458) Automation retry/continue | Open | #1339, #2640, #2619, #2541, #2540, #2180, #2199, #1523, #2457 |
| 19 | [#2514](https://github.com/gim-home/m/issues/2514) or [#2196](https://github.com/gim-home/m/issues/2196) Workspace/session control | Open | #2575, #2625, #2626, #2150, #2464, #2520, #1993, #2664, #2617 |

## Items 20-24: Design-First Topics

These came from `Later / Needs Design First` in the wave note. Treat them as
product/design framing work before opening small implementation issues.

| Item | Topic | Next action |
| --- | --- | --- |
| 20 | Official always-on cloud runtime | Define product boundary and security model before issue filing. |
| 21 | Shared team skill marketplace | Define ownership, trust, publishing, and discovery model. |
| 22 | Second Brain / dreaming / memory architecture | Define memory model, privacy boundary, and user controls. |
| 23 | Progressive trust after N confirmations | Define trust semantics and revocation before UX or policy issues. |
| 24 | Full desktop-vs-cloud product model | Define responsibility split between local ClawPilot and cloud runtime. |

## Operating Rule

Use the `clawpilot-issue-loop` skill before filing or updating issues. Prefer
updating umbrellas and linking related issues over creating duplicates. File
only 3-5 small PR-able child issues per pass unless explicitly directed
otherwise.

## Manual Fix Pass: 2026-06-23

Live triage focused on open recent issues with small PR-able scope.

| Issue | Assessment | Action |
| --- | --- | --- |
| [#3758](https://github.com/gim-home/m/issues/3758) | Small copy regression: restore-chat surfaces still said "local Copilot history" after product naming moved to Scout. | Fixed in [PR #3820](https://github.com/gim-home/m/pull/3820). |
| [#3672](https://github.com/gim-home/m/issues/3672) | Plausible Windows regression, but many `windowsHide: true` fixes already exist and remaining child-process sites need ownership audit before patching. | Keep as follow-up candidate after targeted spawn audit. |
| [#2720](https://github.com/gim-home/m/issues/2720) | Real customer-facing diagnostics copy issue, but solution depends on diagnostics flight/privacy choice. | Keep as design-sensitive follow-up, likely not a drive-by fix. |

Verification for PR #3820:

- `pnpm vitest run --project unit src/features/settings/SettingsModal.test.tsx`
- `pnpm vitest run --project browser src/shell/RestoreSessionsBanner.browser.test.tsx`
