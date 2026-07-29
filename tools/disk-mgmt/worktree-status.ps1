param(
  [string[]]$Roots,
  [string]$Output = "projects\disk-mgmt\last-worktree-status.md",
  [switch]$NoWrite,
  [switch]$SkipGh
)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot\worktree-lib.ps1"

$budget = Get-BudgetStatus
$profile = $budget.Profile
if (-not $Roots) { $Roots = $profile.Roots }

$registry = $budget.Registry
$regPaths = @(Get-RegistrySlotPaths -Registry $registry | ForEach-Object { [System.IO.Path]::GetFullPath($_) })

Write-Host "Scanning claws checkouts..."
$checkouts = @(Get-ManagedCheckouts -Roots $Roots -Family claws)

$rows = @()
foreach ($c in $checkouts) {
  $full = [System.IO.Path]::GetFullPath($c.Path)
  $protected = Test-IsProtectedCheckoutName -Name $c.Name
  $active = $regPaths -contains $full
  $slot = $null
  if ($active) {
    $slot = @($registry.slots | Where-Object {
        [System.IO.Path]::GetFullPath([string]$_.path) -eq $full
      }) | Select-Object -First 1
  }

  $role = if ($protected) { "base" }
  elseif ($active) { "active-slot" }
  else { "unallocated" }

  $prState = ""
  $prUrl = ""
  if (-not $SkipGh -and -not $protected -and $c.Branch -notin @("main", "master", "(detached)")) {
    $pr = Get-GhPrStateForBranch -RepoPath $c.Path -Branch $c.Branch -HostName $c.Host -Owner $c.Owner -RepoName $c.Repo
    if ($pr) {
      $prState = [string]$pr.state
      $prUrl = [string]$pr.url
    }
  }

  $keep = $false
  $action = "none"
  if ($role -eq "base") {
    $keep = $true
    $action = "keep-base"
  } elseif ($role -eq "active-slot") {
    $keep = $true
    $action = "keep-active"
    if ($prState -in @("MERGED", "CLOSED")) {
      $action = "release-terminal-pr"
      $keep = $false
    }
  } else {
    # unallocated
    if ($c.Dirty) {
      $action = "review-dirty"
      $keep = $true
    } elseif ($prState -in @("MERGED", "CLOSED")) {
      $action = "remove-terminal-pr"
      $keep = $false
    } elseif ($c.Branch -in @("main", "master")) {
      $action = "review-extra-base"
      $keep = $true
        } elseif ($c.Branch -eq "(detached)") {
          $action = "remove-detached"
      $keep = $false
        } else {
          $action = "remove-unallocated"
          $keep = $false
        }
  }

  $rows += [pscustomobject]@{
    Role     = $role
    Action   = $action
    Keep     = $keep
    Dirty    = $c.Dirty
    AgeDays  = $c.AgeDays
    Name     = $c.Name
    Branch   = $c.Branch
    Project  = if ($slot) { [string]$slot.project } else { "" }
    Kind     = if ($slot) { [string]$slot.kind } else { "" }
    PrState  = $prState
    PrUrl    = $prUrl
    Path     = $c.Path
  }
}

$unallocated = @($rows | Where-Object { $_.Role -eq "unallocated" })
$removable = @($rows | Where-Object { -not $_.Keep -and -not $_.Dirty })
$bases = @($rows | Where-Object Role -eq "base")
$actives = @($rows | Where-Object Role -eq "active-slot")

$generated = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
$lines = @(
  "# Worktree Allocator Status",
  "",
  "Generated: $generated",
  "",
  "## Laptop Budget",
  "",
  ("- Profile: **{0}** — {1}" -f $profile.Name, $profile.Description),
  ("- Free C: **{0} GB** ({1}); target>={2}, warn<{3}, critical<{4}" -f `
      $budget.FreeGB, $budget.FreeState, $profile.MinFreeGB, $profile.WarnFreeGB, $profile.CriticalFreeGB),
  ("- Active slots: **{0}/{1}** (projects {2}/{3}, merge {4}/{5})" -f `
      $budget.ActiveSlots, $profile.MaxActiveSlots,
      $budget.ProjectSlots, $profile.ActiveProjectSlots,
      $budget.MergeSlots, $profile.MergeSlots),
  ("- Planned active GB: **{0}/{1}** (about {2} GB each)" -f `
      $budget.PlannedActiveGB, $budget.ActiveBudgetGB, $profile.PerWorktreeBudgetGB),
  ("- Claws checkout budget: bases~{0} + active set~{1} => plan floor ~{2}, cap **{3} GB**" -f `
      $profile.ProtectedBasesBudgetGB, $profile.ActiveWorkingSetBudgetGB,
      $budget.PlannedClawsFloorGB, $profile.ClawsCheckoutBudgetGB),
  "",
  "## Counts",
  "",
  ("- Claws checkouts scanned: **{0}**" -f $rows.Count),
  ("- Bases kept: **{0}**" -f $bases.Count),
  ("- Active allocated slots: **{0}**" -f $actives.Count),
  ("- Unallocated: **{0}**" -f $unallocated.Count),
  ("- Removable now (clean): **{0}**" -f $removable.Count),
  "",
  "## Active Registry Slots",
  "",
  "| Kind | Project | Branch | Path |",
  "| --- | --- | --- | --- |"
)

if ($registry.slots.Count -eq 0) {
  $lines += "| _none_ | | | |"
} else {
  foreach ($s in @($registry.slots)) {
    $lines += '| {0} | {1} | `{2}` | `{3}` |' -f $s.kind, $s.project, $s.branch, $s.path
  }
}

$lines += @(
  "",
  "## Checkout Classification",
  "",
  "| Role | Action | Dirty | Age | Name | Branch | PR | Path |",
  "| --- | --- | --- | ---: | --- | --- | --- | --- |"
)

foreach ($r in ($rows | Sort-Object @{e = {
      switch ($_.Role) {
        "base" { 0 }
        "active-slot" { 1 }
        default { 2 }
      }
    }
  }, Name)) {
  $lines += '| {0} | {1} | {2} | {3} | `{4}` | `{5}` | {6} | `{7}` |' -f `
    $r.Role,
    $r.Action,
    $(if ($r.Dirty) { "yes" } else { "no" }),
    $(if ($null -eq $r.AgeDays) { "?" } else { $r.AgeDays }),
    $r.Name,
    $r.Branch,
    $(if ($r.PrUrl) { $r.PrUrl } elseif ($r.PrState) { $r.PrState } else { "" }),
    $r.Path
}

$lines += @(
  "",
  "## Recommended Commands",
  "",
  '```powershell',
  '.\tools\disk-mgmt\laptop.ps1',
  '.\tools\disk-mgmt\worktree-allocate.ps1 -Project doctor -Branch user/giodl/x -Name openclaw-doctor-x',
  '.\tools\disk-mgmt\worktree-release.ps1 -Name openclaw-doctor-x',
  '.\tools\disk-mgmt\worktree-enforce.ps1',
  '.\tools\disk-mgmt\worktree-enforce.ps1 -Apply',
  '```',
  ""
)

if (-not $NoWrite) {
  $outPath = if ([System.IO.Path]::IsPathRooted($Output)) { $Output } else { Join-Path (Get-Location) $Output }
  Write-Report -Path $outPath -Lines $lines
  Write-Host "Wrote $outPath"
}

Write-Host ("Profile={0} FreeGB={1}({2}) slots={3}/{4} unallocated={5} removable={6}" -f `
    $profile.Name, $budget.FreeGB, $budget.FreeState, $budget.ActiveSlots,
    $profile.MaxActiveSlots, $unallocated.Count, $removable.Count)

$rows |
  Sort-Object Role, Name |
  Format-Table Role, Action, Dirty, AgeDays, Name, Branch, PrState -AutoSize
