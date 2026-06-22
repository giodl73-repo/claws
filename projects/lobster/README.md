# Lobster Work

Use this directory for Lobster worktree, runtime, dashboard, and LobsterTank
notes. Admin-plane work belongs in `projects/admin/`.

## Active Notes

| Area | File |
| --- | --- |
| Scout feeds and catalog work | `feeds-scout.md` |
| ADO pipeline queueing and Azure login state | `ado-pipelines.md` |

Admin spaces, policy baseline admin state, and Partner Center notes moved to
`projects/admin/`.

## Active References

| Item | Location |
| --- | --- |
| Main Lobster checkout | `C:\src\lobster` |
| LobsterTank worktree | `C:\src\lobster-lobstertank` |
| LobsterTank code | `C:\src\lobster-lobstertank\tools\lobstertank` |
| LobsterTank URL when running | `http://127.0.0.1:8787/` |

## LobsterTank

Current run command:

```powershell
cd C:\src\lobster-lobstertank\tools\lobstertank
python .\lobstertank.py --author giodl73-repo --port 8787
```

Validation:

```powershell
cd C:\src\lobster-lobstertank
python -m unittest discover -s tools/lobstertank/tests
```

Stop command:

```powershell
Stop-Process -Id <pid>
```
