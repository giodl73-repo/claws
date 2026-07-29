param(
  [string[]]$Roots = @("C:\src", "C:\tmp"),
  [ValidateSet("all", "claws", "craft", "maxim", "other")]
  [string]$Family = "claws",
  [int]$StaleDays = 21,
  [int]$Limit = 0,
  [switch]$Apply,
  [switch]$IncludeUnmergedLocal,
  [string]$Output = "projects\disk-mgmt\last-prune-branches.md",
  [switch]$NoWrite
)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot\lib.ps1"

# Collect unique git common dirs so linked worktrees are not double-processed.
$checkouts = @(Get-ManagedCheckouts -Roots $Roots -Family $Family)
$mains = @{}
foreach ($c in $checkouts) {
  $common = Get-GitText -Repo $c.Path -GitArgs @("rev-parse", "--path-format=absolute", "--git-common-dir")
  if (-not $common) { continue }
  $mainPath = $c.Path
  # If .git is a file, resolve main worktree path from common dir parent when possible.
  $gitFile = Join-Path $c.Path ".git"
  if (Test-Path -LiteralPath $gitFile -PathType Leaf) {
    $mainPath = Split-Path -Parent $common
  }
  if (-not $mains.ContainsKey($common)) {
    $mains[$common] = [pscustomobject]@{
      Path   = $mainPath
      Family = $c.Family
      Name   = Split-Path -Leaf $mainPath
      Host   = $c.Host
      Owner  = $c.Owner
      Repo   = $c.Repo
    }
  }
}

$candidates = @()
foreach ($entry in $mains.GetEnumerator()) {
  $repoPath = $entry.Value.Path
  if (-not (Test-Path -LiteralPath $repoPath)) { continue }

  $branches = Get-GitText -Repo $repoPath -GitArgs @("for-each-ref", "--format=%(refname:short)|%(committerdate:iso8601)|%(upstream:short)|%(objectname:short)", "refs/heads")
  if (-not $branches) { continue }

  $current = Get-GitText -Repo $repoPath -GitArgs @("branch", "--show-current")
  foreach ($line in ($branches -split "`n")) {
    if (-not $line) { continue }
    $parts = $line -split "\|", 4
    if ($parts.Count -lt 4) { continue }
    $branch = $parts[0]
    $dateText = $parts[1]
    $upstream = $parts[2]
    $sha = $parts[3]

    if ($branch -in @("main", "master")) { continue }
    if ($current -and $branch -eq $current) { continue }

    $ageDays = $null
    try {
      $ageDays = [int][math]::Floor(((Get-Date).ToUniversalTime() - [datetime]::Parse($dateText).ToUniversalTime()).TotalDays)
    } catch { $ageDays = $null }

    if ($null -ne $ageDays -and $ageDays -lt $StaleDays) { continue }

    $pushed = [bool]$upstream
    if (-not $pushed) {
      $pushed = Test-BranchPushed -Repo $repoPath -Branch $branch
    }
    if (-not $pushed) { continue }

    # Prefer branches already merged into main/master.
    $merged = $false
    foreach ($base in @("main", "master")) {
      $contains = Get-GitText -Repo $repoPath -GitArgs @("merge-base", "--is-ancestor", $branch, $base)
      # git merge-base --is-ancestor returns exit code; Get-GitText nulls on nonzero.
      # Re-check explicitly:
      $prev = Get-Location
      try {
        Set-Location -LiteralPath $repoPath
        & git merge-base --is-ancestor $branch $base 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) { $merged = $true; break }
      } finally {
        Set-Location $prev
      }
    }

    if (-not $merged -and -not $IncludeUnmergedLocal) {
      # Still allow if PR merged/closed.
      $pr = Get-GhPrStateForBranch -RepoPath $repoPath -Branch $branch -HostName $entry.Value.Host -Owner $entry.Value.Owner -RepoName $entry.Value.Repo
      if (-not $pr -or $pr.state -notin @("MERGED", "CLOSED")) {
        continue
      }
      $reason = "pr-$($pr.state.ToLowerInvariant())"
      $prUrl = $pr.url
    } elseif ($merged) {
      $reason = "merged-into-base"
      $prUrl = ""
    } else {
      $reason = "stale-pushed-unmerged"
      $prUrl = ""
    }

    $action = if ($Apply) { "delete" } else { "would-delete" }
    $result = ""
    if ($Apply) {
      $prev = Get-Location
      try {
        Set-Location -LiteralPath $repoPath
        & git branch -D $branch 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) {
          $action = "deleted"
          $result = "ok"
        } else {
          $action = "failed"
          $result = "git branch -D failed"
        }
      } finally {
        Set-Location $prev
      }
    }

    $candidates += [pscustomobject]@{
      Family  = $entry.Value.Family
      RepoPath = $repoPath
      Branch  = $branch
      Sha     = $sha
      AgeDays = $ageDays
      Reason  = $reason
      PrUrl   = $prUrl
      Action  = $action
      Result  = $result
    }
  }
}

if ($Limit -gt 0) {
  $candidates = @($candidates | Select-Object -First $Limit)
}

$generated = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
$lines = @(
  "# Prune Stale Local Branches",
  "",
  "Generated: $generated",
  "Mode: $(if ($Apply) { 'APPLY' } else { 'DRY-RUN' })",
  "Family: $Family",
  "StaleDays: $StaleDays",
  "",
  "Only considers branches that are pushed (upstream or remote head exists).",
  "",
  "| Action | Reason | Age | Branch | Repo |",
  "| --- | --- | ---: | --- | --- |"
)

foreach ($c in $candidates) {
  $lines += '| {0} | {1} | {2} | `{3}` | `{4}` |' -f `
    $c.Action,
    $c.Reason,
    $(if ($null -eq $c.AgeDays) { "?" } else { $c.AgeDays }),
    $c.Branch,
    $c.RepoPath
}

$lines += @(
  "",
  "## Summary",
  "",
  "- Candidates: $($candidates.Count)",
  "- Deleted/would-delete: $((@($candidates | Where-Object { $_.Action -in @('would-delete','deleted') })).Count)",
  "- Failed: $((@($candidates | Where-Object Action -eq 'failed')).Count)",
  ""
)

if (-not $NoWrite) {
  $outPath = if ([System.IO.Path]::IsPathRooted($Output)) { $Output } else { Join-Path (Get-Location) $Output }
  Write-Report -Path $outPath -Lines $lines
  Write-Host "Wrote $outPath"
}

if (-not $candidates) {
  Write-Host "No branch prune candidates."
} else {
  $candidates | Format-Table Action, Reason, AgeDays, Branch, RepoPath -AutoSize
}
