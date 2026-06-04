# ClawPilot Session Context

## Agent Start

1. Read this file.
2. Read `projects/clawpilot/README.md`.
3. Read `projects/clawpilot/issue-loop-24.md`.
4. Use the `clawpilot-issue-loop` skill for live issue work.

## Baseline

- Area: ClawPilot feedback-to-issue loop for `gim-home/m`.
- Primary repo: `gim-home/m`.
- Local checkout: `C:\src\clawpilot`.
- Main tracking files: `projects/clawpilot/README.md` and
  `projects/clawpilot/issue-loop-24.md`.
- Skill: `.agents/skills/clawpilot-issue-loop/SKILL.md`.

## Current Session

- Last updated: 2026-06-04.
- Last agent: Codex.
- Current focus: Preserve the reconstructed 24-item issue-loop state and make
  future sessions start cleanly from the project context.
- Active branch / PR: local checkout was
  `fix-cli-clawpatch-findings`, ahead of `origin/main` by 1 commit when last
  checked.
- Known dirty state: check `C:\src\clawpilot` before edits.
- Blocking question: none recorded.

## Resume Checklist

- Run: `gh auth switch --hostname github.com --user giodl_microsoft` if
  `gim-home/m` cannot resolve.
- Run: check live issue state for the tracked issue ranges.
- Verify: update/link umbrella issues before filing duplicates.
- Update: `issue-loop-24.md` when issue statuses or remaining work changes.

## Guardrails

- Keep issue text problem-led and implementation-light.
- Prefer updating umbrellas and linking related issues over filing duplicates.
- File only 3-5 small PR-able child issues per pass unless explicitly directed.

## Open Threads

- Items 17-19 are umbrella update/link work.
- Items 20-24 are design-first topics, not immediate implementation issues.
