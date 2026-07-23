---
name: project-session
description: Use when starting, resuming, loading, or updating a claws-hapi project session such as policy, doctor, feeds, admin, context-budget, oc-path, clawpilot, bugs, or PR watcher. Reads CONTEXT.md, the selected project SESSION.md, and its README before acting.
---

# Project Session

Use this skill when the user asks to start, resume, load, continue, or update a
project area in `claws-hapi`.

## Project Discovery

Treat every directory matching `projects/*/SESSION.md` as a project area. Do
not maintain a hard-coded area list in this skill; it becomes stale as projects
are added. Resolve ordinary spacing variants to the directory slug, for example
`context budget` to `context-budget`, `oc path` to `oc-path`, and `pr loop` to
`pr-loop`.

List current areas when the requested name is ambiguous:

```powershell
Get-ChildItem projects -Directory |
  Where-Object { Test-Path (Join-Path $_.FullName 'SESSION.md') } |
  Select-Object -ExpandProperty Name
```

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

At the end of meaningful work:

1. Update the concise resume state in `projects/<area>/SESSION.md` only when a
   canonical fact changed. Keep these fields current where the file uses them:

- `Last updated`
- `Last agent`
- `Current focus`
- active branch / PR
- known dirty state
- blocking question
- open threads

2. Record the detailed, immutable handoff with the bundled helper:

   ```powershell
   node .agents/skills/project-session/scripts/checkpoint-session.mjs `
     --area <area> `
     --focus "<work performed>" `
     --result "<verified outcome>" `
     --next "<next action>"
   ```

   Add `--branch`, `--dirty`, or `--blocker` when they carry useful resume
   state. Use `--dry-run` to preview. The helper creates a unique file under
   `projects/<area>/sessions/` and refuses to overwrite an existing checkpoint.

Keep both updates factual and short. Do not paste a long chronological journal
at the top of `SESSION.md`, and do not rewrite the whole file unless the area
changed materially. A checkpoint complements the resume snapshot; it does not
replace a necessary canonical-state update.

## Guardrails

- Read the project session before searching old wave directories.
- Treat `.craft/waves/` as archive/source material.
- Do not prototype OpenClaw or Lobster implementation code in `claws-hapi`.
- Do not overwrite unrelated user changes.
- Never put credentials, tokens, private logs, or raw user data in a checkpoint.
- For PR status, proof, ClawSweeper, or branch hygiene, use the PR watcher
  session and relevant PR-loop skills.
