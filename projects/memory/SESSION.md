# Memory Project Session

## Agent Start

1. Read this file.
2. Read `README.md`.
3. Read `paper-outline.md` and `openclaw-memory-assessment.md`.
4. Check live repo state before editing notes or assessing source.

## Baseline

- Area: memory
- Primary repo: `claws-hapi` for notes; `C:\src\openclaw-stack` for OpenClaw source evidence
- Local worktree: `C:\src\claws-hapi`
- Current branch: `main`
- Main tracking files: `projects/memory/paper-outline.md`, `projects/memory/openclaw-memory-assessment.md`
- Skill to use: `project-session` for resume, `project-creator` for structure updates

## Current Session

- Last updated: 2026-06-22
- Last agent: Codex
- Current focus: Start the memory project and seed report materials for the XAI Harness / Tools / Skills memory topic.
- Active branch / PR: none
- Known dirty state: Pre-existing unrelated edits in `projects/clawpilot`, `projects/doctor`, `projects/feeds`, and `projects/lobster`; leave untouched. `C:\src\openclaw-stack` has untracked `artifacts/`; source assessment only.
- Blocking question: Need confirmation from Selcuk/Gio/Eduardo/Todd on desired depth for Microsoft internal memory inventory and whether Cowork/MCS/Scout details can be cited.

## Resume Checklist

- Run: `git status --short --branch` in `C:\src\claws-hapi`
- Verify: `git -C C:\src\openclaw-stack status --short --branch`
- Review: `projects/memory/paper-outline.md` and `projects/memory/openclaw-memory-assessment.md`
- Update: this session file with new decisions, owners, and draft status

## Guardrails

- Keep report/project notes in `projects/memory`.
- Keep OpenClaw implementation changes out of `claws-hapi`; use OpenClaw worktrees if code changes become necessary.
- Separate confirmed source evidence from proposed strategy and open questions.
- Do not claim Microsoft product capabilities without internal source validation.

## Open Threads

- Gather current memory approaches for Claude Code, Hermes, Cowork, MCS, Scout, and Microsoft Apps & Agents.
- Decide whether the July 6 presentation should propose a POC for shared memory between MCS and Scout.
- Define enterprise requirements: governance, tenant/user scoping, consent, retention, audit, compliance, export/delete, and cross-agent access controls.
