# Gitcrawl PR Inventory

Use Gitcrawl as the recurring archive for OpenClaw PR and issue discovery, then
use live `gh` only for final status or mutation decisions.

## Current Local State

- WSL binary: `/usr/local/bin/gitcrawl`
- Config: `/root/.config/gitcrawl/config.toml`
- Database: `/root/.config/gitcrawl/gitcrawl.db`
- Last checked: 2026-06-04
- Last synced by `gitcrawl doctor`: 2026-06-02T17:49:59Z
- Cached repositories currently reported: 1

## Refresh

```powershell
wsl.exe -d Ubuntu-24.04 -u root -- bash -lc 'gitcrawl doctor --json'
wsl.exe -d Ubuntu-24.04 -u root -- bash -lc 'gitcrawl sync openclaw/openclaw --state open --include-pr-details --json'
```

Use targeted sync for normal triage:

```powershell
wsl.exe -d Ubuntu-24.04 -u root -- bash -lc 'gitcrawl sync openclaw/openclaw --numbers <pr-or-issue> --include-pr-details --json'
wsl.exe -d Ubuntu-24.04 -u root -- bash -lc 'gitcrawl gh pr status <number-or-url> -R openclaw/openclaw --compact'
```

## Project Buckets

Keep generated or refreshed inventory under:

- `projects/policy/`
- `projects/doctor/`
- `projects/feeds/`
- `projects/context-budget/`
- `projects/oc-path/`

Do not bury active PR state in `.craft/waves/`.
