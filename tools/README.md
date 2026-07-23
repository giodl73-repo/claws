# Local Tools

Repo-local operator tools live here.

## Known Tools

| Tool               | Location                                       | Notes                                                                                   |
| ------------------ | ---------------------------------------------- | --------------------------------------------------------------------------------------- |
| LobsterTank        | `C:\src\lobster-lobstertank\tools\lobstertank` | Dashboard currently lives in the Lobster worktree, not this directory.                  |
| OpenClaw PR status | `tools/openclaw-prs/status.ps1`                | Compact WSL/GitHub status for open fix PRs, checks, ClawSweeper, and requested changes. |
| Worktree audit     | `tools/worktrees/audit-worktrees.ps1`          | Inventory local OpenClaw/Lobster worktrees and write `projects/prs/worktrees.md`.       |
| Worktree setup     | `tools/worktrees/setup-worktree.ps1`           | Create or hydrate a git worktree and run package-manager install.                       |

If a tool is promoted into this repo, give it `tools/<name>/README.md` with:

- purpose;
- run command;
- stop command;
- validation command;
- source-of-truth repo/worktree.
