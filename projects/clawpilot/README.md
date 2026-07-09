# ClawPilot Project

ClawPilot work in this workspace is issue-loop and product-feedback tracking for
`gim-home/m`. Implementation belongs in `C:\src\clawpilot`, not in this repo.

## Skill

Use the repo-local skill:

- `.agents/skills/clawpilot-issue-loop/SKILL.md`

It covers mapping feedback themes to existing issues, filing small PR-able issue
batches, checking linked PRs, and keeping issue text problem-led.

## Local Repo

| Item | Location |
| --- | --- |
| Local checkout | `C:\src\clawpilot` |
| GitHub repo | `gim-home/m` |
| Current local branch when last checked | `fix-cli-clawpatch-findings` |
| Local state when last checked | ahead of `origin/main` by 1 commit |

## Filed Issue Batches

Detailed 24-item issue-loop tracking lives in:

- `projects/clawpilot/issue-loop-24.md`

The historical standalone 24-item backlog source has not been found. The
source-found list is the wave note below: it accounts for the first 16 items as
8 filed issues plus 8 filed-or-covered candidates.

Filed in `gim-home/m` on 2026-05-28:

| Issue | Title |
| --- | --- |
| #2712 | Add a shared session status model for desktop, Teams, and automations |
| #2713 | Show waiting-on-user badges in the session sidebar |
| #2714 | Keep long-running task progress visible in chat while tools are running |
| #2715 | Add diagnostic ID and recovery actions to generic Something went wrong errors |
| #2716 | Preflight PowerShell, Python, and PATH prerequisites at startup/setup |
| #2717 | Add retry and continue controls for failed automation runs |
| #2718 | Normalize automation run status rendering and refresh history on completion |
| #2719 | Add pin and favorite support for sessions in the sidebar |

Filed or covered on 2026-06-01:

| Issue / Coverage | Theme |
| --- | --- |
| #2888 | Always allow similar command permission action |
| #2890 | Deduplicate repeated permission prompts across similar commands |
| #2887 | Plain-language permission prompt summaries |
| #2889 | Auth health indicator and token expiry warning |
| #2886 | Launch-on-startup and auto-connect setup prompt |
| #2520 / #1993 | Full-width chat bubble setting |
| #2664 | Windows/Linux zoom shortcuts when app menu is hidden |
| #1178 | Detect M365 auth expiry before automation run |

## Source Note

- `.craft/waves/260528+hapi-the-bringer+openclaw-feeds/clawpilot-issue-loop.md`

## Design Notes

- `scout-desktop-cli-proposal.md` - draft proposal for a first-class Scout
  Desktop CLI aligned with the IPC layer and agent-native parity.
- `local-openclaw-gateway-dev.md` - Lorant's runbook for pointing a Scout dev
  build at a token-auth local OpenClaw gateway for node-tier E2E testing.
- `provider-routing-flexibility-pitch.md` - focused pitch for #3953 as a
  provider/routing optionality layer that lets Gateway/OpenClaw be adopted
  without giving up existing Desktop provider behavior.
- `local-openclaw-value-walkthrough.md` - simplified Local OpenClaw value guide
  for #3954 that assumes the #3953 provider-routing pitch has already been
  read.
- `local-openclaw-3954-runtime-validation.md` - focused evidence matrix for
  live #3954 runtime-only validation, including the deliberately blocked cases
  before #3955 capabilities are present.
- `provider-neutral-desktop-capabilities.md` - PR-body-ready narrative for
  reframing #3955 as shared Desktop capability hardening for cloud, Local
  OpenClaw, and future providers.
- `local-openclaw-integration-proof.md` - PR-body-ready narrative for the proof
  PR that should depend on both #3954 and the rebuilt provider-neutral #3955.
- `openclaw-upstream-alignment.md` - tracking note for landed and open upstream
  OpenClaw work that can inform ClawPilot Local OpenClaw, managed-provider, and
  Desktop-capability PRs.

## Next

- Check #2712-#2719 for assignment, comments, linked PRs, and closure.
- Search for duplicates before filing another batch.
- File only 3-5 small issues per pass unless explicitly asked for a larger
  product umbrella.
