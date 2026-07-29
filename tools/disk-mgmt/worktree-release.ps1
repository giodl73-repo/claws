param(
  [string]$Path = "",
  [string]$Name = "",
  [string]$Project = "",
  [switch]$KeepFiles,
  [switch]$ForceDirty,
  [switch]$Apply
)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot\worktree-lib.ps1"

if (-not $Apply) {
  Write-Host "Dry-run. Pass -Apply to release."
}

$registry = Get-ActiveRegistry
$slots = @($registry.slots)
if ($slots.Count -eq 0) {
  Write-Host "Registry empty."
  return
}

$selected = @()
if ($Path) {
  $full = [System.IO.Path]::GetFullPath($Path)
  $selected = @($slots | Where-Object {
      [System.IO.Path]::GetFullPath([string]$_.path) -eq $full
    })
} elseif ($Name) {
  $selected = @($slots | Where-Object { $_.name -eq $Name -or (Split-Path -Leaf $_.path) -eq $Name })
} elseif ($Project) {
  $selected = @($slots | Where-Object { $_.project -eq $Project })
} else {
  throw "Provide -Path, -Name, or -Project"
}

if ($selected.Count -eq 0) {
  throw "No matching active slot."
}

foreach ($slot in $selected) {
  $p = [string]$slot.path
  Write-Host ("Release candidate: project={0} kind={1} path={2}" -f $slot.project, $slot.kind, $p)

  if (-not $Apply) {
    Write-Host "  would-release"
    continue
  }

  if (-not $KeepFiles -and (Test-Path -LiteralPath $p)) {
    $res = Remove-WorktreeSafe -Path $p -ForceDirty:$ForceDirty
    if (-not $res.Ok) {
      Write-Warning "  failed remove: $($res.Message)"
      if (-not $ForceDirty) { continue }
    } else {
      Write-Host "  removed: $($res.Message)"
    }
  } elseif ($KeepFiles) {
    Write-Host "  keep files; registry only"
  } else {
    Write-Host "  path already missing"
  }

  $registry.slots = @($registry.slots | Where-Object { $_.id -ne $slot.id })
  Write-Host "  unregistered"
}

if ($Apply) {
  Save-ActiveRegistry -Registry $registry
}

$budget = Get-BudgetStatus
Write-Host ("slots now {0}/{1}; free C {2} GB ({3})" -f `
    $budget.ActiveSlots, $budget.MaxActiveSlots, $budget.FreeGB, $budget.FreeState)
