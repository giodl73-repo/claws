# Doctor Session Context

## Agent Start

1. Read this file.
2. Read `projects/doctor/README.md`.
3. Use OpenClaw testing/review skills for PR updates.
4. Check live PR state before touching branches.

## Baseline

- Area: Doctor health findings, structured repairs, repair previews, and
  focused verification.
- Primary repo: `openclaw/openclaw`.
- Main tracking file: `projects/doctor/README.md`.
- Current stack: doctor structured repair and dry-run report PRs.

## Current Session

- Last updated: 2026-06-04.
- Last agent: Codex.
- Current focus: Keep doctor work about observable findings and structured
  repair output.
- Active branch / PR: see `projects/doctor/README.md`.
- Known dirty state: check target OpenClaw worktree before edits.
- Blocking question: none recorded.

## Resume Checklist

- Run: `gh pr list --repo openclaw/openclaw --search "doctor"`.
- Verify: compare active PRs against `projects/doctor/README.md`.
- Review: avoid adding new config or plugin surface.
- Update: this file after reviews, fixes, or PR state changes.

## Guardrails

- Do not broaden config/plugin surface while cleaning up doctor checks.
- Keep tests focused to the doctor area touched.
- Treat repair output as user-facing behavior, not just diagnostics plumbing.

## Open Threads

- Continue watching the structured repair PR stack for review findings.
