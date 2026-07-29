param(
  [ValidateSet("status", "set")]
  [string]$Action = "status",

  [ValidateSet("light", "heavy")]
  [string]$Profile,

  [string]$Notes = ""
)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot\worktree-lib.ps1"

if ($Action -eq "set") {
  if (-not $Profile) {
    throw "Set requires -Profile light|heavy"
  }
  if (-not $Notes) {
    if ($Profile -eq "light") {
      $Notes = "1-2 OpenClaw/Lobster projects + merge lane"
    } else {
      $Notes = "4-5 concurrent project stacks + merge lane"
    }
  }
  $cfg = Set-LaptopProfile -Profile $Profile -Notes $Notes
  Write-Host "Laptop profile set to '$($cfg.profile)' on $($cfg.hostname)"
}

$status = Get-BudgetStatus
$p = $status.Profile

Write-Host ""
Write-Host "Laptop: $($p.Hostname)  profile=$($p.Name)"
Write-Host $p.Description
Write-Host ("Free C: {0} GB ({1})  target>={2} warn<{3} critical<{4}" -f `
    $status.FreeGB, $status.FreeState, $p.MinFreeGB, $p.WarnFreeGB, $p.CriticalFreeGB)
Write-Host ("Active slots: {0}/{1} (projects {2}/{3}, merge {4}/{5}) remaining={6}" -f `
    $status.ActiveSlots, $p.MaxActiveSlots,
    $status.ProjectSlots, $p.ActiveProjectSlots,
    $status.MergeSlots, $p.MergeSlots,
    $status.SlotsRemaining)
Write-Host ("GB budget: active working set {0}/{1}  claws checkouts floor~{2} cap {3}  per-worktree ~{4}" -f `
    $status.PlannedActiveGB, $status.ActiveBudgetGB,
    $status.PlannedClawsFloorGB, $status.ClawsCheckoutBudgetGB,
    $p.PerWorktreeBudgetGB)
Write-Host ""
Write-Host "Profiles:"
Write-Host "  light  => 2 project + 1 merge slots; ~30 GB claws checkouts; keep >=40 GB free"
Write-Host "  heavy  => 5 project + 1 merge slots; ~50 GB claws checkouts; keep >=50 GB free"
Write-Host ""
Write-Host "Local config: $(Get-LaptopConfigPath)"
Write-Host "Registry:     $(Get-ActiveRegistryPath)"
