param(
  [string[]]$Roots = @("C:\src", "C:\tmp"),
  [string]$Output = "projects\disk-mgmt\last-inventory.md",
  [int]$Top = 40,
  [switch]$SkipSizes,
  [switch]$NoWrite
)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot\lib.ps1"

$generated = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
$disks = @(Get-DiskFreeSummary)
$repos = @(Get-ManagedCheckouts -Roots $Roots)
$byFamily = $repos | Group-Object Family | Sort-Object Name

$lines = @(
  "# Disk Inventory",
  "",
  "Generated: $generated",
  "",
  "## Free Space",
  "",
  "| Drive | Total GB | Free GB | Used % |",
  "| --- | ---: | ---: | ---: |"
)

foreach ($d in $disks) {
  $lines += "| {0} | {1} | {2} | {3} |" -f $d.DeviceID, $d.TotalGB, $d.FreeGB, $d.UsedPct
}

$lines += @(
  "",
  "## Managed Checkout Counts",
  "",
  "| Family | Count | Dirty |",
  "| --- | ---: | ---: |"
)

foreach ($g in $byFamily) {
  $dirty = @($g.Group | Where-Object Dirty).Count
  $lines += "| {0} | {1} | {2} |" -f $g.Name, $g.Count, $dirty
}

$lines += @(
  "",
  "Total checkouts: **$($repos.Count)**",
  ""
)

if (-not $SkipSizes) {
  Write-Host "Measuring top-level sizes under: $($Roots -join ', ')"
  $sizes = @(Get-TopLevelSizes -Roots $Roots -Top $Top)
  $lines += @(
    "## Top Paths by Size",
    "",
    "| Size GB | Root | Name | Path |",
    "| ---: | --- | --- | --- |"
  )
  foreach ($s in $sizes) {
    $lines += '| {0} | `{1}` | `{2}` | `{3}` |' -f $s.SizeGB, $s.Root, $s.Name, $s.Path
  }
  $lines += ""
  $sizes | Format-Table SizeGB, Root, Name -AutoSize
} else {
  $lines += @(
    "## Top Paths by Size",
    "",
    "_Skipped (`-SkipSizes`)._",
    ""
  )
}

$lines += @(
  "## Claws Family Sample",
  "",
  "| Age days | Dirty | Name | Branch | Path |",
  "| ---: | --- | --- | --- | --- |"
)

foreach ($r in @($repos | Where-Object Family -eq "claws" | Sort-Object AgeDays -Descending | Select-Object -First 30)) {
  $lines += '| {0} | {1} | `{2}` | `{3}` | `{4}` |' -f $(if ($null -eq $r.AgeDays) { "?" } else { $r.AgeDays }), $(if ($r.Dirty) { "yes" } else { "no" }), $r.Name, $r.Branch, $r.Path
}

$lines += @(
  "",
  "## Next Actions",
  "",
  "1. `.\tools\disk-mgmt\prune-merged.ps1` for merged/closed PR worktrees",
  "2. `.\tools\disk-mgmt\prune-branches.ps1` for pushed stale local branches",
  "3. `.\tools\disk-mgmt\reclaim.ps1` for caches and retired trees",
  "4. Re-run inventory after apply and confirm free space rose",
  ""
)

if (-not $NoWrite) {
  $outPath = if ([System.IO.Path]::IsPathRooted($Output)) { $Output } else { Join-Path (Get-Location) $Output }
  Write-Report -Path $outPath -Lines $lines
  Write-Host "Wrote $outPath"
}

$disks | Format-Table -AutoSize
Write-Host "Managed checkouts: $($repos.Count)"
$byFamily | ForEach-Object { "{0,-8} {1}" -f $_.Name, $_.Count }
