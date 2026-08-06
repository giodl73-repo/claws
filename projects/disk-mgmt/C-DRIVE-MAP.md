# C: Drive Map (this laptop)

Generated: 2026-07-29  
Drive: **C:** ~952 GB total · **~249 GB free** (was critical ~5–12 GB)

## Big picture (post-reclaim)

| Bucket | ~GB | Status / next |
| ------ | --: | ------------- |
| **Free** | **~249** | Healthy vs light target ≥40 GB |
| **WSL** (`%LOCALAPPDATA%\wsl`) | **~179** | Largest remaining; export/unregister unused distro |
| **`C:\src\apportionment`** | **~105** | Local project; not full census library |
| **Business OneDrive** (`C:\Users\giodl\OneDrive`) | **~18** | Trimmed; mostly `Documents` (~17 GB) |
| **Personal OneDrive** | **0** | Unlinked + local deleted |
| **AppData\Local** (total) | high | Dominated by WSL + Docker + Packages |
| **Docker Desktop** | **~10** | `docker system prune` if safe |
| **Downloads** | **~8** | Installers/dupes |
| **Dev caches** (.codex/.copilot/pnpm/rust) | **~15–20** | Periodic prune |
| **iCloud Photos** | **0** | Removed |
| **claws worktrees** | managed | light profile + allocator |

## What already came off

1. Unallocated OpenClaw/Lobster worktrees (enforce)
2. Temp / package caches
3. Apple/iCloud photo libraries (~62 GB class)
4. Personal OneDrive (hotmail) local tree after unlink (~99 GB class)
5. Extra census under `OneDrive - Microsoft\census` (~43 GB)
6. Business OD cold bulk (~46 GB freed): `census data`, `Kartye`, camera roll, Videos/Pictures, old photo folders, `collx.xlsx`

## OneDrive map (this machine)

| Path | Role | Local size now |
| ---- | ---- | -------------: |
| `C:\Users\giodl\OneDrive` | **Business** (keep) | ~18 GB |
| `C:\Users\giodl\OneDrive - Microsoft\...` | was personal / extra | personal removed; extra census removed |

Business OD remaining top: **`Documents` ~17 GB** — review before further cut.

## Best remaining offloads

### 1. WSL (~179 GB)

```powershell
wsl -l -v
# export unused, then unregister; compact vhdx after internal cleanup
```

### 2. Apportionment (~105 GB)

Only if this laptop does not need it: move/archive off C: or delete if duplicated elsewhere.

### 3. Docker (~10 GB)

```powershell
docker system df
docker system prune -af --volumes
```

### 4. Business OD `Documents` (~17 GB)

Review work vs personal inside; prefer On-Demand for cold files still needed in cloud.

### 5. Dev caches / Downloads

```powershell
.\tools\disk-mgmt\reclaim.ps1 -Apply -TempMaxAgeDays 1
pnpm store prune
```

## Claws working set (keep on C:)

Per **light** laptop profile (`projects/disk-mgmt/BUDGET.md`):

- Protected: `claws-hapi`, `lobster`, `openclaw`/`srcopenclaw`
- Active slots: **2 projects + 1 merge** (~12 GB budget)
- Keep free **≥40 GB** (warn <25, critical <15) — **currently well above**

## Recommended steady state

| Tier | Location | Contents |
| ---- | -------- | -------- |
| Hot SSD (C:) | free ≥40–80 GB | OS, active claws slots, current browser/IDE |
| Cloud-only | Business OneDrive On-Demand | cold docs still needed online |
| External / second drive | D: or HDD | WSL exports, video/photo masters, apportionment if unused here |

## Commands

```powershell
.\tools\disk-mgmt\laptop.ps1
.\tools\disk-mgmt\inventory.ps1 -SkipSizes
.\tools\disk-mgmt\worktree-status.ps1
.\tools\disk-mgmt\reclaim.ps1 -Apply -TempMaxAgeDays 1
```
