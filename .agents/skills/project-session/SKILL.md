---
name: project-session
description: Use when starting, resuming, loading, or updating a claws-hapi project session such as policy, doctor, feeds, admin, context-budget, oc-path, clawpilot, bugs, or PR watcher. Reads CONTEXT.md, projects/<area>/SESSION.md, and the project README before acting.
---

# Project Session

Use this skill when the user asks to start, resume, load, continue, or update a
project area in `claws-hapi`.

## Project Map

| User phrase | Area | Session file |
| --- | --- | --- |
| policy | `policy` | `projects/policy/SESSION.md` |
| doctor | `doctor` | `projects/doctor/SESSION.md` |
| feeds | `feeds` | `projects/feeds/SESSION.md` |
| admin | `admin` | `projects/admin/SESSION.md` |
| context budget, context-budget | `context-budget` | `projects/context-budget/SESSION.md` |
| oc-path, oc path | `oc-path` | `projects/oc-path/SESSION.md` |
| clawpilot, claw pilot | `clawpilot` | `projects/clawpilot/SESSION.md` |
| bugs, bugfix | `bugs` | `projects/bugs/SESSION.md` |
| pr watcher, pr loop, prs | `prs` | `projects/prs/SESSION.md` |

If the user names an area that does not exist, use `project-creator` if they are
asking to create it. Otherwise report that no project session file exists.

## Load Sequence

1. Read global context:

   ```powershell
   Get-Content CONTEXT.md
   ```

2. Read the area session file:

   ```powershell
   Get-Content projects\<area>\SESSION.md
   ```

3. Read the area README:

   ```powershell
   Get-Content projects\<area>\README.md
   ```

4. Read additional files explicitly named by `SESSION.md` or `README.md`, such
   as `issue-loop-24.md`, PR stack notes, or admin detail files.

5. Check live state before acting:

   - local `git status --short --branch` in this repo
   - target repo/worktree status if the session names one
   - live PR/issue state if the task depends on GitHub or GHE

## Start Response

When the user only asks to load/resume a project, respond with a concise state
summary:

- project area loaded
- current focus
- active branch/PR or issue loop
- known dirty state or required status check
- next recommended action

Then continue with the user's requested work if they asked for action.

## Update Session

At the end of meaningful work, update `projects/<area>/SESSION.md` with:

- `Last updated`
- `Last agent`
- `Current focus`
- active branch / PR
- known dirty state
- blocking question
- open threads

Keep updates factual and short. Do not rewrite the whole session file unless the
area changed materially.

## Guardrails

- Read the project session before searching old wave directories.
- Treat `.craft/waves/` as archive/source material.
- Do not prototype OpenClaw or Lobster implementation code in `claws-hapi`.
- Do not overwrite unrelated user changes.
- For PR status, proof, ClawSweeper, or branch hygiene, use the PR watcher
  session and relevant PR-loop skills.
