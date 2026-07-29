param(
  [string[]]$Roots,
  [switch]$Apply,
  [switch]$ForceDirty,
  [switch]$SkipGh,
  [int]$Limit = 0,
  [string]$Output = "projects\disk-mgmt\last-worktree-enforce.md",
  [switch]$NoWrite
)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot\worktree-lib.ps1"

$budget = Get-BudgetStatus
$profile = $budget.Profile
if (-not $Roots) { $Roots = $profile.Roots }
$registry = Get-ActiveRegistry
$regPaths = @(Get-RegistrySlotPaths -Registry $registry | ForEach-Object {
    try { [System.IO.Path]::GetFullPath($_) } catch { $_ }
  })

Write-Host ("Enforce budget profile={0} mode={1}" -f $profile.Name, $(if ($Apply) { "APPLY" } else { "DRY-RUN" }))
$checkouts = @(Get-ManagedCheckouts -Roots $Roots -Family claws)

# Drop registry entries whose paths vanished.
$missing = @()
foreach ($s in @($registry.slots)) {
  if (-not (Test-Path -LiteralPath ([string]$s.path))) {
    $missing += $s
  }
}
if ($missing.Count -gt 0) {
  foreach ($m in $missing) {
    Write-Host "Registry prune missing path: $($m.path)"
    if ($Apply) {
      $registry.slots = @($registry.slots | Where-Object { $_.id -ne $m.id })
    }
  }
  if ($Apply) { Save-ActiveRegistry -Registry $registry }
}

$actions = @()
foreach ($c in $checkouts) {
  $full = [System.IO.Path]::GetFullPath($c.Path)
  if (Test-IsProtectedCheckoutName -Name $c.Name) { continue }
  if ($regPaths -contains $full) {
    # Active slot: only remove if PR terminal.
    if ($SkipGh) { continue }
    $pr = Get-GhPrStateForBranch -RepoPath $c.Path -Branch $c.Branch -HostName $c.Host -Owner $c.Owner -RepoName $c.Repo
    if ($pr -and $pr.state -in @("MERGED", "CLOSED")) {
      $actions += [pscustomobject]@{
        Name   = $c.Name
        Path   = $c.Path
        Branch = $c.Branch
        Dirty  = $c.Dirty
        Reason = "active-slot-terminal-pr"
        Pr     = [string]$pr.url
        Action = if ($Apply) { "remove" } else { "would-remove" }
        Result = ""
      }
    }
    continue
  }

  # Extra main/master homes need review; detached abandoned trees are removable.
    if ($c.Branch -in @("main", "master")) {
    $actions += [pscustomobject]@{
      Name   = $c.Name
      Path   = $c.Path
      Branch = $c.Branch
      Dirty  = $c.Dirty
      Reason = "unallocated-extra-base"
      Pr     = ""
      Action = "review"
      Result = "manual"
    }
    continue
  }

    if ($c.Branch -eq "(detached)") {
      if ($c.Dirty -and -not $ForceDirty) {
        $actions += [pscustomobject]@{
          Name   = $c.Name
          Path   = $c.Path
          Branch = $c.Branch
          Dirty  = $true
          Reason = "unallocated-detached-dirty"
          Pr     = ""
          Action = "skip-dirty"
          Result = ""
        }
        continue
      }
      $actions += [pscustomobject]@{
        Name   = $c.Name
        Path   = $c.Path
        Branch = $c.Branch
        Dirty  = $c.Dirty
        Reason = "unallocated-detached"
        Pr     = ""
        Action = if ($Apply) { "remove" } else { "would-remove" }
        Result = ""
      }
      continue
    }

  if ($c.Dirty -and -not $ForceDirty) {
    $actions += [pscustomobject]@{
      Name   = $c.Name
      Path   = $c.Path
      Branch = $c.Branch
      Dirty  = $true
      Reason = "unallocated-dirty"
      Pr     = ""
      Action = "skip-dirty"
      Result = ""
    }
    continue
  }

  $reason = "unallocated-not-active"
  $prUrl = ""
  if (-not $SkipGh) {
    $pr = Get-GhPrStateForBranch -RepoPath $c.Path -Branch $c.Branch -HostName $c.Host -Owner $c.Owner -RepoName $c.Repo
    if ($pr) {
      $prUrl = [string]$pr.url
      if ($pr.state -in @("MERGED", "CLOSED")) { $reason = "unallocated-terminal-pr" }
      elseif ($pr.state -eq "OPEN") { $reason = "unallocated-open-pr-not-in-budget" }
    }
  }

  $actions += [pscustomobject]@{
    Name   = $c.Name
    Path   = $c.Path
    Branch = $c.Branch
    Dirty  = $c.Dirty
    Reason = $reason
    Pr     = $prUrl
    Action = if ($Apply) { "remove" } else { "would-remove" }
    Result = ""
  }
}

# Prefer removing terminal/unallocated oldest first when limiting.
$actions = @($actions | Sort-Object @{
    e = {
      switch -Regex ($_.Reason) {
        "terminal" { 0 }
        "not-active" { 1 }
        "open-pr" { 2 }
        default { 3 }
      }
    }
  }, Name)

if ($Limit -gt 0) {
  $actions = @($actions | Select-Object -First $Limit)
}

foreach ($a in $actions) {
  if ($a.Action -ne "remove") { continue }
  $res = Remove-WorktreeSafe -Path $a.Path -ForceDirty:$ForceDirty
  $a.Result = $res.Message
  if ($res.Ok) {
    $a.Action = "removed"
    # ensure unregistered
    $registry = Get-ActiveRegistry
    $full = [System.IO.Path]::GetFullPath($a.Path)
    $before = @($registry.slots).Count
    $registry.slots = @($registry.slots | Where-Object {
        try { [System.IO.Path]::GetFullPath([string]$_.path) -ne $full } catch { $true }
      })
    if (@($registry.slots).Count -ne $before) {
      Save-ActiveRegistry -Registry $registry
    }
  } else {
    $a.Action = "failed"
  }
}

$generated = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
$after = Get-BudgetStatus
$lines = @(
  "# Worktree Budget Enforce",
  "",
  "Generated: $generated",
  ("Mode: {0}" -f $(if ($Apply) { "APPLY" } else { "DRY-RUN" })),
  ("Profile: {0}" -f $profile.Name),
  ("Free C before/after note: after={0} GB ({1})" -f $after.FreeGB, $after.FreeState),
  ("Active slots: {0}/{1}" -f $after.ActiveSlots, $profile.MaxActiveSlots),
  "",
  "| Action | Reason | Dirty | Name | Branch | Path |",
  "| --- | --- | --- | --- | --- | --- |"
)
foreach ($a in $actions) {
  $lines += '| {0} | {1} | {2} | `{3}` | `{4}` | `{5}` |' -f `
    $a.Action, $a.Reason, $(if ($a.Dirty) { "yes" } else { "no" }), $a.Name, $a.Branch, $a.Path
}
$lines += @(
  "",
  "## Summary",
  "",
  ("- Actions: {0}" -f $actions.Count),
  ("- Removed/would-remove: {0}" -f @($actions | Where-Object { $_.Action -in @("removed", "would-remove") }).Count),
  ("- Skipped dirty: {0}" -f @($actions | Where-Object Action -eq "skip-dirty").Count),
  ("- Failed: {0}" -f @($actions | Where-Object Action -eq "failed").Count),
  "",
  "Policy: only registry-allocated PR/project worktrees stay (plus protected bases).",
  ""
)

if (-not $NoWrite) {
  $outPath = if ([System.IO.Path]::IsPathRooted($Output)) { $Output } else { Join-Path (Get-Location) $Output }
  Write-Report -Path $outPath -Lines $lines
  Write-Host "Wrote $outPath"
}

if ($actions.Count -eq 0) {
  Write-Host "No enforce actions."
} else {
  $actions | Format-Table Action, Reason, Dirty, Name, Branch -AutoSize
}
Write-Host ("FreeGB={0} slots={1}/{2}" -f $after.FreeGB, $after.ActiveSlots, $profile.MaxActiveSlots)
