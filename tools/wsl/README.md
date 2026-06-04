# WSL Tools

These wrappers keep WSL work out of nested PowerShell/Bash quoting traps.

Default target:

```text
Distribution: Ubuntu-24.04
User: root
Workspace root: /root/src
```

## Commands

Run a one-line command in a WSL worktree:

```powershell
.\tools\wsl\wsl-run.ps1 -Repo openclaw-context-budget -Command 'rg -n "recommendations" src'
```

Run a multiline Bash script in a WSL worktree:

```powershell
.\tools\wsl\wsl-script.ps1 -Repo openclaw-context-budget -Script @'
git status --short --branch
rg -n "contextBudget" src | head -40
'@
```

Run Python from Windows stdin directly inside a WSL worktree:

```powershell
.\tools\wsl\wsl-python.ps1 -Repo openclaw-context-budget -Script @'
from pathlib import Path
print(Path.cwd())
'@
```

List OpenClaw/Lobster/RFC worktrees under `/root/src` with branch and dirty
state:

```powershell
.\tools\wsl\wsl-repos.ps1
```

Run the wrapper integration test:

```powershell
.\tools\wsl\test-wsl-tools.ps1
```

## Rules

- Prefer `wsl-script.ps1` or `wsl-python.ps1` over nested here-docs.
- Use single-quoted PowerShell here-strings (`@' ... '@`) for scripts so
  PowerShell does not expand TypeScript template strings or Bash variables.
- Keep command output readable; do not chain unrelated commands with noisy
  separators. Prefer `head` over nested quoted `sed -n "..."` in one-line
  commands.
- For code edits in Windows-visible repos, still prefer `apply_patch`.
- For Linux-only worktrees, use `wsl-python.ps1` for mechanical edits and
  inspect `git diff` before testing.
