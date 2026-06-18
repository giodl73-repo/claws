# Snapshot Session

## Agent Start

1. Read this file.
2. Read `projects/snapshot/README.md`.
3. Read the linked RFC or issue in `Baseline`.
4. Check live repo state before acting.

## Baseline

- Area: OpenClaw SQLite state snapshot plugin
- Primary repo: `openclaw/rfcs`
- Local worktree: none; RFC opened through GitHub app
- Current branch: `rfc/cloud-serializable-sqlite-state`
- Main tracking file: `openclaw/rfcs#20`
- Skill to use: `openclaw-docs`

## Current Session

- Last updated: 2026-06-18
- Last agent: Codex
- Current focus: Open a narrow RFC that defines an opt-in `snapshot` plugin, reusable SQLite snapshot provider contract, restore verification, backup integration, and failover substrate.
- Active branch / PR: `rfc/cloud-serializable-sqlite-state`, https://github.com/openclaw/rfcs/pull/20
- Known dirty state: `claws-hapi` had unrelated modifications in `.agents/skills/openclaw-testing/SKILL.md` and `projects/prs/SESSION.md` before this project was renamed; do not include them in snapshot commits.
- Blocking question: None. Keep logical DB units as existing context rather than the main RFC decision.

## Resume Checklist

- Run: `git status --short --branch` in `C:\src\claws-hapi`.
- Verify: #90370 remains the canonical OpenClaw issue for broad storage discussion.
- Review: RFC repo template at `openclaw/rfcs/rfcs/0000-template.md`.
- Update: this file with RFC branch, PR URL, and follow-up issue links.

## Guardrails

- Keep implementation work in OpenClaw or RFC repos, not `claws-hapi`.
- Keep the first RFC focused on the snapshot plugin and restore proof, not database replacement.
- Do not reopen #94675 unless a maintainer explicitly asks; route discussion to #90370 or the RFC PR.
- Do not define a new logical database taxonomy unless snapshot semantics require it. Reference existing global state, per-agent state, and dedicated store boundaries.
- Update this file at the end of a meaningful session.

## Open Threads

- Draft RFC: https://github.com/openclaw/rfcs/pull/20
- #90370 comment posted linking RFC PR #20.
