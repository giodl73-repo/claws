param(
  [string[]]$Roots = @("C:\src", "C:\tmp"),
  [ValidateSet("all", "claws", "craft", "maxim", "other")]
  [string]$Family = "claws",
  [int]$StaleDays = 14,
  [int]$Limit = 0,
  [switch]$Apply,
  [switch]$ForceDirty,
  [switch]$IncludeOpen,
    [switch]$OnlyPrTerminal,
    [switch]$IncludeProtectedNames,
    [string]$Output = "projects\disk-mgmt\last-prune-merged.md",
    [switch]$NoWrite
  )

$ErrorActionPreference = "Stop"
. "$PSScriptRoot\lib.ps1"

$repos = @(Get-ManagedCheckouts -Roots $Roots -Family $Family)
$candidates = @()

foreach ($r in $repos) {
  if ($r.Branch -in @("main", "master", "(detached)")) { continue }
  if (-not $IncludeProtectedNames -and (Test-IsProtectedCheckoutName -Name $r.Name)) {
    continue
  }

  $pr = Get-GhPrStateForBranch -RepoPath $r.Path -Branch $r.Branch -HostName $r.Host -Owner $r.Owner -RepoName $r.Repo
  $state = if ($pr) { $pr.state } else { "UNKNOWN" }
  $mergedOrClosed = $state -in @("MERGED", "CLOSED")
  $staleEnough = ($null -ne $r.AgeDays -and $r.AgeDays -ge $StaleDays)

  $reason = $null
  if ($mergedOrClosed) {
    $reason = "pr-$($state.ToLowerInvariant())"
  } elseif ($OnlyPrTerminal) {
    continue
  } elseif ($IncludeOpen -and $state -eq "OPEN" -and $staleEnough) {
    $reason = "open-stale"
  } elseif ($state -eq "UNKNOWN" -and $staleEnough -and (Test-BranchPushed -Repo $r.Path -Branch $r.Branch)) {
    $reason = "stale-pushed-no-pr"
  } else {
    continue
  }

  if ($r.Dirty -and -not $ForceDirty) {
    $action = "skip-dirty"
  } else {
    $action = if ($Apply) { "remove" } else { "would-remove" }
  }

  $candidates += [pscustomobject]@{
    Family  = $r.Family
    Name    = $r.Name
    Path    = $r.Path
    Branch  = $r.Branch
    AgeDays = $r.AgeDays
    Dirty   = $r.Dirty
    State   = $state
    Reason  = $reason
    PrUrl   = if ($pr) { $pr.url } else { "" }
    Action  = $action
    Result  = ""
  }
}

if ($Limit -gt 0) {
  $candidates = @($candidates | Select-Object -First $Limit)
}

foreach ($c in $candidates) {
  if ($c.Action -ne "remove") { continue }
  $res = Remove-WorktreeSafe -Path $c.Path -ForceDirty:$ForceDirty
  $c.Result = $res.Message
  if (-not $res.Ok) {
    $c.Action = "failed"
  } else {
    $c.Action = "removed"
  }
}

$generated = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
$lines = @(
  "# Prune Merged / Closed PR Worktrees",
  "",
  "Generated: $generated",
  "Mode: $(if ($Apply) { 'APPLY' } else { 'DRY-RUN' })",
  "Family: $Family",
  "StaleDays: $StaleDays",
  "",
  "| Action | Reason | PR | Age | Dirty | Name | Branch | Path |",
  "| --- | --- | --- | ---: | --- | --- | --- | --- |"
)

foreach ($c in $candidates) {
  $lines += '| {0} | {1} | {2} | {3} | {4} | `{5}` | `{6}` | `{7}` |' -f `
    $c.Action,
    $c.Reason,
    $(if ($c.PrUrl) { $c.PrUrl } else { $c.State }),
    $(if ($null -eq $c.AgeDays) { "?" } else { $c.AgeDays }),
    $(if ($c.Dirty) { "yes" } else { "no" }),
    $c.Name,
    $c.Branch,
    $c.Path
}

$lines += @(
  "",
  "## Summary",
  "",
  "- Candidates: $($candidates.Count)",
  "- Would/did remove: $((@($candidates | Where-Object { $_.Action -in @('would-remove','removed') })).Count)",
  "- Skipped dirty: $((@($candidates | Where-Object Action -eq 'skip-dirty')).Count)",
  "- Failed: $((@($candidates | Where-Object Action -eq 'failed')).Count)",
  "",
  "Re-run with `-Apply` after reviewing this report.",
  ""
)

if (-not $NoWrite) {
  $outPath = if ([System.IO.Path]::IsPathRooted($Output)) { $Output } else { Join-Path (Get-Location) $Output }
  Write-Report -Path $outPath -Lines $lines
  Write-Host "Wrote $outPath"
}

if (-not $candidates) {
  Write-Host "No prune candidates found."
} else {
  $candidates | Format-Table Action, Reason, State, AgeDays, Dirty, Name, Branch -AutoSize
}
