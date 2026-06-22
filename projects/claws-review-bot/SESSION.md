# Claws Review Bot Session Context

## Agent Start

1. Read this file.
2. Read `README.md`.
3. Read `rules.md`.
4. Check live issue/comment state in `gim-home/m` before making issue updates.

## Baseline

- Area: project wrapper for the existing `@bic/claws-review-bot`.
- Package path: `packages/claws-review-bot`.
- Azure job: `claws-review-bot-job`.
- Primary lane: Lobster PR review.
- Experimental lane: ClawPilot issue classification in `gim-home/m`.
- Local notes repo: `C:\src\claws-hapi`.
- Related checkout: `C:\src\clawpilot`.
- Main tracking files: `projects/claws-review-bot/rules.md`,
  `projects/clawpilot/SESSION.md`.
- Relevant skill: `clawpilot-issue-loop` for live GitHub issue work.

## Current Session

- Last updated: 2026-06-22.
- Last agent: Codex.
- Current focus: Learn from a manual first pass of the separate ClawPilot
  issue-classifier mode before turning it into bot rules or automation.
- Findings from first live pass:
  - Across 26 issues updated on 2026-06-22, there were 18 comments created that
    day.
  - `github-actions` authored 12 of those comments.
  - Existing automation patterns: 2 `m-agent:triage` duplicate-hint comments,
    4 `m-agent:validity-sweep` comments asking humans to confirm validity, and
    6 vulnerability workflow notices on #2629.
  - Human comments provided acknowledgement, repro/version details, deeper
    investigation, or human validation.
- Proposed ClawPilot lane: issue classification should focus on
  regression/severity assessment, issue clustering, owner-area routing, and
  concrete next-action comments. It should avoid duplicate one-liners and
  generic validity sweeps.
- First manual pass completed on 2026-06-22:
  - Posted assessment comments on #3749, #3739, #3616, #3601, #3518, #3068,
    and #2939.
  - Skipped #3747 because the issue body already reframed it as design-gap
    feedback and the existing bot had linked the duplicate/design context.
  - Skipped #3505 because PR #3713 is already open and an assistant had claimed
    the fix path in the issue.
  - Skipped #2974 because the existing validity sweep found the evidence likely
    belongs to a different codebase/version.
  - Early rule: comment when the classifier adds owner routing, related PR/issue
    context, severity normalization, or a concrete next action; skip when it
    would only restate an existing duplicate/validity/claimed-fix thread.
- Active branch / PR: none.
- Known dirty state: session notes updated after the manual pass.
- Blocking question: none.

## Resume Checklist

- Run: `gh auth switch --hostname github.com --user giodl_microsoft`.
- Verify: `gh api repos/gim-home/m --jq '{full_name, permissions}'`.
- Refresh today activity:
  - `gh issue list --repo gim-home/m --state all --search 'updated:>=YYYY-MM-DD' --limit 200 --json number,title,state,updatedAt,labels,author,url`
  - Fetch comments for the updated set with `gh issue view <number> --json comments`.
- Review `rules.md` before commenting on issues.

## Guardrails

- Keep the first lane limited. Do not run against all open issues.
- Prefer comments and label recommendations over closing issues.
- Do not duplicate `m-agent:triage` duplicate hints or
  `m-agent:validity-sweep` comments.
- Do not comment on vulnerability workflow issue #2629 unless a security owner
  asks for a focused assessment.
- Use problem-led language and leave implementation choices to ClawPilot owners.

## Open Threads

- Follow up on maintainer reactions to the seven assessment comments and adjust
  the issue-classifier rules before automating.
- Decide whether to create a `regression` label family:
  `regression: suspected`, `regression: confirmed`,
  `regression: needs-version`, `regression: fixed-needs-validation`.
- Decide whether the ClawPilot classifier should add labels directly or only
  recommend them in comments during the first week.
