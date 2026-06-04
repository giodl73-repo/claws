# Bugs Session Context

## Agent Start

1. Read this file.
2. Read `projects/bugs/README.md`.
3. Check whether the bug belongs in a specific project area before adding new
   notes here.
4. Use the relevant repo skill for the owning repo and PR loop.

## Baseline

- Area: Cross-cutting bugfix triage and repair tracking.
- Primary repos: usually `openclaw/openclaw`, sometimes `bic/lobster`,
  `gim-home/m`, or local tools in `claws-hapi`.
- Main tracking file: `projects/bugs/README.md`.
- Skills to consider: `openclaw-pr-loop`, `openclaw-pr-maintainer`,
  `openclaw-small-bugfix-sweep`, `codex-review`, `clawsweeper`.

## Current Session

- Last updated: 2026-06-04.
- Last agent: Codex.
- Current focus: Establish a clean baseline area for bugfix sessions.
- Active branch / PR: none indexed yet.
- Known dirty state: check the target repo before edits.
- Blocking question: none recorded.

## Resume Checklist

- Run: identify the owning repo, issue, PR, or failing command.
- Verify: reproduce or inspect direct evidence before changing code.
- Review: confirm the fix is narrow and does not belong to a feature stack.
- Update: add a bug row to `README.md` and update this session file.

## Guardrails

- Do not use this area as a feature backlog.
- Do not batch unrelated bugs into one PR.
- Do not mark a bug fixed without proof or a clear not-reproduced note.

## Open Threads

- Add active bug rows as they are discovered.
