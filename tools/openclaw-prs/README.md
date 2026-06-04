# OpenClaw PR Tools

Compact helpers for checking OpenClaw PR queues from WSL.

## Status

List open fix-title PRs for the usual author accounts, including review state,
failed/pending checks, and recent ClawSweeper or requested-changes signals:

```powershell
.\tools\openclaw-prs\status.ps1
```

On machines where the active WSL workspace is not the default
`Ubuntu/root//root/src`, set the shared wrapper defaults once:

```powershell
$env:CLAWS_WSL_DISTRO = "Ubuntu"
$env:CLAWS_WSL_USER = "giodl"
$env:CLAWS_WSL_ROOT = "/home/giodl/src"
```

Useful variants:

```powershell
.\tools\openclaw-prs\status.ps1 -Search 'fix in:title -policy -doctor'
.\tools\openclaw-prs\status.ps1 -Authors giodl73-repo -FailureLimit 10
.\tools\openclaw-prs\status.ps1 -Repo openclaw/clawhub -Search 'fix in:title'
```
