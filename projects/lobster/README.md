# Lobster Work

Use this directory for active Lobster notes, especially dashboard and PR queue
work that spans multiple checkouts.

## Active Notes

| Area | File |
| --- | --- |
| Admin spaces and managed policy baselines | `admin-spaces.md` |
| Scout feeds and catalog work | `feeds-scout.md` |
| Partner Center registration | `partner-center.md` |

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
