# WSL Work

WSL is where several OpenClaw PR stacks live. Use the wrappers in
`tools/wsl/` instead of hand-written nested `wsl.exe ... bash -lc ...` commands.

## Active WSL Paths

| Work                     | Path                                              |
| ------------------------ | ------------------------------------------------- |
| Context budget stack     | `/root/src/openclaw-context-budget`               |
| Policy exec approvals PR | `/root/src/openclaw-policy-file-stores`           |
| Policy RFC 0003          | `/root/src/openclaw-rfcs-policy-conformance-0003` |
| Maintainer scripts       | `/root/src/openclaw-maintainers-repo`             |
| WSL operating index      | `/root/src/_hapi`                                 |

## Common Commands

```powershell
.\tools\wsl\wsl-repos.ps1
.\tools\wsl\test-wsl-tools.ps1
.\tools\wsl\wsl-run.ps1 -Repo openclaw-context-budget -Command 'git status --short --branch'
.\tools\wsl\wsl-script.ps1 -Repo openclaw-context-budget -Script @'
git status --short --branch
rg -n "contextBudget" src | head -40
'@
```

For multiline Python edits or inspection:

```powershell
.\tools\wsl\wsl-python.ps1 -Repo openclaw-context-budget -Script @'
from pathlib import Path
print(Path.cwd())
'@
```

Use single-quoted here-strings. They avoid PowerShell expanding `${...}`,
`$env`, TypeScript template strings, and Bash variables before WSL sees them.
Prefer `head` for quick truncation instead of nested quoted `sed -n "..."` in
one-line commands.
