param(
  [Parameter(Mandatory = $true)]
  [string]$Project,

  [Parameter(Mandatory = $true)]
  [string]$Branch,

  [string]$Name = "",
  [string]$Path = "",
  [string]$Repo = "",
  [string]$Base = "main",
  [ValidateSet("project", "merge")]
  [string]$Kind = "project",
  [string]$Pr = "",
  [switch]$CreateBranch,
  [switch]$RegisterOnly,
  [switch]$NoInstall,
  [switch]$Force,
  [switch]$AutoReleaseOldest
)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot\worktree-lib.ps1"

$budget = Get-BudgetStatus
$profile = $budget.Profile
$registry = $budget.Registry

if (-not $Name -and -not $Path) {
  $safeProject = ($Project -replace "[^a-zA-Z0-9-]+", "-").ToLowerInvariant()
  $safeBranch = ($Branch -replace ".*/", "" -replace "[^a-zA-Z0-9-]+", "-").ToLowerInvariant()
  $Name = "openclaw-$safeProject-$safeBranch"
  if ($Name.Length -gt 60) { $Name = $Name.Substring(0, 60).TrimEnd("-") }
}

$target = Resolve-AllocatePath -Path $Path -Name $Name -WorktreeRoot $profile.WorktreeRoot

# Already registered?
if (Test-PathInRegistry -Registry $registry -Path $target) {
  $existing = @($registry.slots | Where-Object {
      [System.IO.Path]::GetFullPath([string]$_.path) -eq [System.IO.Path]::GetFullPath($target)
    }) | Select-Object -First 1
  $existing.lastUsedAt = (Get-Date).ToUniversalTime().ToString("o")
  if ($Project) { $existing.project = $Project }
  if ($Branch) { $existing.branch = $Branch }
  if ($Pr) { $existing.pr = $Pr }
  if ($Kind) { $existing.kind = $Kind }
  Save-ActiveRegistry -Registry $registry
  Write-Host "Already allocated: $target"
  Write-Host ("slots {0}/{1}" -f @($registry.slots).Count, $profile.MaxActiveSlots)
  return
}

# Slot budget
$projectCount = @($registry.slots | Where-Object { $_.kind -ne "merge" }).Count
$mergeCount = @($registry.slots | Where-Object { $_.kind -eq "merge" }).Count
$needRelease = $false
if ($Kind -eq "merge") {
  if ($mergeCount -ge $profile.MergeSlots -and -not $Force) { $needRelease = $true }
} else {
  if ($projectCount -ge $profile.ActiveProjectSlots -and -not $Force) { $needRelease = $true }
}
if (@($registry.slots).Count -ge $profile.MaxActiveSlots -and -not $Force) {
  $needRelease = $true
}

if ($needRelease) {
  if (-not $AutoReleaseOldest) {
    throw ("No free slot on profile '{0}' (active {1}/{2}, projects {3}/{4}, merge {5}/{6}). Release one or pass -AutoReleaseOldest/-Force." -f `
        $profile.Name, @($registry.slots).Count, $profile.MaxActiveSlots,
        $projectCount, $profile.ActiveProjectSlots, $mergeCount, $profile.MergeSlots)
  }

  $candidates = @($registry.slots | Sort-Object {
      if ($_.lastUsedAt) { [datetime]$_.lastUsedAt } else { [datetime]"2000-01-01" }
    })
  $released = $false
  foreach ($cand in $candidates) {
    if ($Kind -eq "merge" -and $cand.kind -eq "merge") { continue }
    $candPath = [string]$cand.path
    if (-not (Test-Path -LiteralPath $candPath)) {
      $registry.slots = @($registry.slots | Where-Object { $_.id -ne $cand.id })
      $released = $true
      Write-Host "Dropped missing registry slot: $candPath"
      break
    }
    $st = Get-GitText -Repo $candPath -GitArgs @("status", "--porcelain")
    if ($st) {
      Write-Host "Skip auto-release dirty: $candPath"
      continue
    }
    $res = Remove-WorktreeSafe -Path $candPath
    if ($res.Ok) {
      $registry.slots = @($registry.slots | Where-Object { $_.id -ne $cand.id })
      Write-Host "Auto-released oldest clean slot: $candPath ($($res.Message))"
      $released = $true
      break
    }
  }
  if (-not $released -and -not $Force) {
    throw "Auto-release failed; all slots dirty or protected. Free a slot manually."
  }
  Save-ActiveRegistry -Registry $registry
}

# Free space gate
$freeGB = Get-FreeGBSystemDrive
if ($freeGB -lt $profile.CriticalFreeGB -and -not $Force) {
  throw ("Refusing allocate: free space {0} GB is below critical {1} GB. Reclaim first." -f $freeGB, $profile.CriticalFreeGB)
}
if ($freeGB -lt $profile.WarnFreeGB) {
  Write-Warning ("Free space {0} GB is below warn threshold {1} GB." -f $freeGB, $profile.WarnFreeGB)
}

# Create or register path
if ($RegisterOnly) {
  if (-not (Test-Path -LiteralPath $target)) {
    throw "RegisterOnly requires existing path: $target"
  }
} else {
  if (-not (Test-Path -LiteralPath $target)) {
    if (-not $Repo) {
      $Repo = Get-DefaultBaseRepo -Product "openclaw"
      if (-not $Repo) { throw "Could not find base openclaw repo. Pass -Repo." }
    }
    $setup = Join-Path (Get-DiskMgmtRepoRoot) "tools\worktrees\setup-worktree.ps1"
    $setupArgs = @{
      Path   = $target
      Branch = $Branch
      Repo   = $Repo
      Base   = $Base
    }
    if ($CreateBranch) { $setupArgs.CreateBranch = $true }
    if ($NoInstall) { $setupArgs.NoInstall = $true }
    Write-Host "Creating worktree via setup-worktree.ps1 ..."
    & $setup @setupArgs
  } else {
    Write-Host "Path exists; registering as active slot: $target"
  }
}

$slot = [pscustomobject]@{
  id          = New-SlotId
  path        = $target
  name        = Split-Path -Leaf $target
  project     = $Project
  branch      = $Branch
  pr          = $Pr
  kind        = $Kind
  repo        = $Repo
  allocatedAt = (Get-Date).ToUniversalTime().ToString("o")
  lastUsedAt  = (Get-Date).ToUniversalTime().ToString("o")
}

$registry = Get-ActiveRegistry
$registry.slots = @($registry.slots) + @($slot)
Save-ActiveRegistry -Registry $registry

$after = Get-BudgetStatus
Write-Host ""
Write-Host "Allocated $($slot.kind) slot for project='$Project'"
Write-Host "  path:   $target"
Write-Host "  branch: $Branch"
if ($Pr) { Write-Host "  pr:     $Pr" }
Write-Host ("  slots:  {0}/{1}  free C: {2} GB ({3})" -f `
    $after.ActiveSlots, $after.MaxActiveSlots, $after.FreeGB, $after.FreeState)
Write-Host ("  budget: active ~{0}/{1} GB" -f $after.PlannedActiveGB, $after.ActiveBudgetGB)
