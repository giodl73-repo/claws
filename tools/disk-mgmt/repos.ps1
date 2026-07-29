param(
  [string[]]$Roots = @("C:\src", "C:\tmp"),
  [ValidateSet("all", "claws", "craft", "maxim", "other")]
  [string]$Family = "all",
  [int]$Limit = 0,
  [string]$Output = "projects\disk-mgmt\last-repos.md",
  [switch]$NoWrite
)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot\lib.ps1"

$repos = @(Get-ManagedCheckouts -Roots $Roots -Family $Family -Limit $Limit)
$generated = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

$lines = @(
  "# Managed Repo Inventory",
  "",
  "Generated: $generated",
  "",
  ("Family filter: {0}" -f $Family),
    ("Roots: {0}" -f ($Roots -join ', ')),
  "",
  "| Family | Dirty | Age | Name | Branch | Repo | Path |",
  "| --- | --- | ---: | --- | --- | --- | --- |"
)

foreach ($r in $repos) {
  $repoSlug = if ($r.Owner -and $r.Repo) { "$($r.Owner)/$($r.Repo)" } else { "" }
  $lines += '| {0} | {1} | {2} | `{3}` | `{4}` | `{5}` | `{6}` |' -f `
    $r.Family,
    $(if ($r.Dirty) { "yes" } else { "no" }),
    $(if ($null -eq $r.AgeDays) { "?" } else { $r.AgeDays }),
    $r.Name,
    $r.Branch,
    $repoSlug,
    $r.Path
}

$lines += @(
  "",
  "## Family Counts",
  ""
)

foreach ($g in @($repos | Group-Object Family | Sort-Object Name)) {
  $lines += "- **$($g.Name)**: $($g.Count)"
}

if (-not $NoWrite) {
  $outPath = if ([System.IO.Path]::IsPathRooted($Output)) { $Output } else { Join-Path (Get-Location) $Output }
  Write-Report -Path $outPath -Lines $lines
  Write-Host "Wrote $outPath"
}

$repos | Format-Table Family, Dirty, AgeDays, Name, Branch, @{N = "Repo"; E = { if ($_.Owner) { "$($_.Owner)/$($_.Repo)" } else { "" } } } -AutoSize
Write-Host "Total: $($repos.Count)"
