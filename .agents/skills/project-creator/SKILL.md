---
name: project-creator
description: Use when creating or reorganizing a top-level project area in claws-hapi under projects/<area>, including README.md, SESSION.md, root index updates, and clean separation from wave archives or unrelated project areas.
---

# Project Creator

Use this skill when the user asks to create a new `projects/<area>` workspace
area, split an existing area, or standardize project session context.

## Workflow

1. Inspect the current project map:

   ```powershell
   Get-Content CONTEXT.md
   Get-Content WORKSPACE.md
   Get-Content projects\README.md
   Get-ChildItem projects -Directory
   ```

2. Decide the owning project name and scope. Keep names short, lowercase, and
   durable, for example `policy`, `doctor`, `feeds`, `admin`, `bugs`.

3. Create or update these files:

   ```text
   projects/<area>/README.md
   projects/<area>/SESSION.md
   ```

   Use `projects/session-context-template.md` as the starting shape for
   `SESSION.md` when available.

4. Update the indexes:

   ```text
   CONTEXT.md
   WORKSPACE.md
   projects/README.md
   ```

5. If splitting an existing area, move durable notes into the new area and leave
   short cross-links in the old area. Do not duplicate long content.

6. Verify:

   ```powershell
   rg -n "<area>|<Project Name>" CONTEXT.md WORKSPACE.md projects -g "*.md"
   git status --short --branch
   git diff --check
   ```

7. Commit and push when the user asked for persistence or the repo convention
   expects durable organization changes:

   ```powershell
   git add CONTEXT.md WORKSPACE.md projects .agents/skills/project-creator
   git commit -m "chore: add <area> project area"
   git push claws main
   ```

## README.md Shape

Keep the README as the project landing page:

```markdown
# <Project Name> Project

Use this area for <scope>.

## Active Notes

| Area | File |
| --- | --- |

## Active Work

| Repo | PR / Issue | Branch | Status | Purpose |
| --- | --- | --- | --- | --- |

## Related Areas

- `projects/<other>/README.md`
```

## SESSION.md Shape

Every active project area should answer:

- what to read first
- owning repo and local worktree
- current focus
- active branch or PR
- known dirty state
- resume checklist
- guardrails
- open threads

Update `SESSION.md` at the end of meaningful work so future agents can resume
from project context instead of searching old wave directories.

## Guardrails

- Keep active operating notes under `projects/`, not `.craft/waves/`.
- Treat `.craft/waves/` as archive/source material unless a named artifact is
  intentionally promoted.
- Do not prototype OpenClaw or Lobster implementation code in `claws-hapi`.
- Do not move or delete unrelated user changes.
- Prefer a new project area when two workflows have different owners, PR loops,
  or session handoff needs, even if they are related.
