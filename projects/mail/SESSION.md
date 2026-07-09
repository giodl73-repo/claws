# Mail Session Context

## Agent Start

1. Read this file.
2. Read `projects/mail/README.md`.
3. Read `CONTEXT.md` and `WORKSPACE.md` if not already loaded.
4. Check current OpenClaw source and plugin/feed state before answering
   capability questions.

## Baseline

- Area: OpenClaw mail-channel and mail-plugin research.
- Primary repo: `openclaw/openclaw`.
- Local worktree: `C:\src\openclaw`.
- Current branch: unknown until checked.
- Main tracking file: `projects/mail/README.md`.
- Skill to use: `openclaw-docs` for durable docs, `openclaw-pr-maintainer` for
  pasted OpenClaw PRs/issues, and `openclaw-testing` if implementation work
  begins.

## Current Session

- Last updated: 2026-06-23.
- Last agent: Codex.
- Current focus: GitHub issue investigation for OpenClaw mail/channel support,
  especially Gmail hooks, Outlook/Microsoft 365 requests, and third-party
  mail/calendar channel precedents.
- Active branch / PR: none.
- Known dirty state: OpenClaw not checked yet. `claws-hapi` has this new
  `projects/mail/` area plus pre-existing unrelated dirty state in
  `projects/admin/`, `projects/feeds/`, and `projects/feeds/validate-mos3-live.ps1`.
- Blocking question: none. Initial direction is research and architecture
  framing before implementation.
- 2026-06-23 GitHub issue sweep: Gitcrawl failed to launch in the Windows
  runner (`CreateProcessAsUserW failed: 1312`), so live GitHub connector search
  was used. Relevant findings: #84407 requests a Microsoft Outlook / Microsoft
  365 email plugin using Microsoft Graph OAuth and is closed `not_planned`;
  #59002 is open P1 for Gmail hook sessions / Signal inbox notifications after
  2026.3.31; #56635 is open P1 for Gmail watcher `--exclude-labels` regression,
  with open PR #56720 and closed duplicate PRs #56726/#56736; #86881 mentions an
  external IMAP sorter in a gateway-lite feature request; #69045/#69046 are
  closed Zoho Mail + Calendar channel/authz direction-check threads; #85954
  only mentions Fastmail as example approval text in an iMessage formatting
  issue.
- 2026-06-23 ClawHub Microsoft check: ClawHub page `q=` rendering is
  inconsistent, but the frontend uses `/api/v1/packages/search` and
  `/api/v1/plugins/search`. Concrete Microsoft mail results: community
  `outlook` skill by `jotamed` for Outlook/Hotmail/Microsoft 365 email and
  calendar via Microsoft Graph; community code plugin
  `@judahzf/clawmailreader` for Gmail/Outlook/iCloud read, organize, and
  draft-only workflows. Microsoft Teams is present as official channel plugin
  `@openclaw/msteams`, but that is Teams chat, not Outlook/Exchange mail.

## Resume Checklist

- Run: inspect `C:\src\openclaw` for channel providers, plugin manifests, and
  mail-related code or docs.
- Run: inspect relevant feed/marketplace notes for existing mail, Outlook,
  Exchange, Microsoft Graph, IMAP, SMTP, or Gmail plugins.
- Verify: distinguish channel ingress/egress needs from ordinary mail tools
  such as search, draft, send, and attachment operations.
- Review: auth, consent, tenant policy, audit, retention, and visible-reply
  behavior before proposing Exchange as a default channel.
- Update: this file and `README.md` with findings, decisions, and any PR/issue
  links.

## Guardrails

- Keep implementation work in the owning repo, not `claws-hapi`.
- Do not add a new public channel/plugin contract without maintainer approval.
- Treat Exchange mail as high-sensitivity user data: avoid storing message
  bodies, tokens, attachments, or mailbox identifiers in notes unless they are
  already public test fixtures.
- Keep channel behavior separate from tool/plugin behavior until the ownership
  and policy model is clear.
- Update this file at the end of a meaningful session.

## Open Threads

- Decide whether a mail integration should be a channel provider, a tool/plugin
  provider, or a paired integration with channel ingress plus mail tools.
- Identify the minimum Exchange proof path: delegated Graph auth, mailbox
  subscription or polling, message normalization, reply/send, attachments, and
  audit-safe diagnostics.
