# Worktree allocator helpers (laptop-aware budgets + active registry).

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

. "$PSScriptRoot\lib.ps1"

function Get-DiskMgmtRepoRoot {
  # tools/disk-mgmt -> repo root
  return (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
}

function Get-DiskMgmtLocalDir {
  $root = Get-DiskMgmtRepoRoot
  $dir = Join-Path $root "projects\disk-mgmt\local"
  if (-not (Test-Path -LiteralPath $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }
  return $dir
}

function Get-ProfilesPath {
  Join-Path $PSScriptRoot "profiles.json"
}

function Get-LaptopConfigPath {
  Join-Path (Get-DiskMgmtLocalDir) "laptop.json"
}

function Get-ActiveRegistryPath {
  Join-Path (Get-DiskMgmtLocalDir) "active-worktrees.json"
}

function Read-JsonFile {
  param([string]$Path, $Default = $null)
  if (-not (Test-Path -LiteralPath $Path)) { return $Default }
  $raw = Get-Content -LiteralPath $Path -Raw -Encoding UTF8
  if (-not $raw) { return $Default }
  return ($raw | ConvertFrom-Json)
}

function Write-JsonFile {
  param([string]$Path, $Object)
  $dir = Split-Path -Parent $Path
  if ($dir -and -not (Test-Path -LiteralPath $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }
  $json = $Object | ConvertTo-Json -Depth 8
  Set-Content -LiteralPath $Path -Value $json -Encoding UTF8
}

function Get-ProfileCatalog {
  $path = Get-ProfilesPath
  $catalog = Read-JsonFile -Path $path
  if (-not $catalog) {
    throw "Missing profiles catalog: $path"
  }
  return $catalog
}

function Get-LaptopConfig {
  $path = Get-LaptopConfigPath
  $cfg = Read-JsonFile -Path $path
  if (-not $cfg) {
    $cfg = [pscustomobject]@{
      version    = 1
      profile    = "light"
      hostname   = $env:COMPUTERNAME
      updatedAt  = (Get-Date).ToUniversalTime().ToString("o")
      notes      = "Auto-created default profile (light = 1-2 projects + merge)."
    }
    Write-JsonFile -Path $path -Object $cfg
  }
  return $cfg
}

function Set-LaptopProfile {
  param(
    [ValidateSet("light", "heavy")]
    [string]$Profile,
    [string]$Notes = ""
  )
  $cfg = [pscustomobject]@{
    version   = 1
    profile   = $Profile
    hostname  = $env:COMPUTERNAME
    updatedAt = (Get-Date).ToUniversalTime().ToString("o")
    notes     = $Notes
  }
  Write-JsonFile -Path (Get-LaptopConfigPath) -Object $cfg
  return $cfg
}

function Get-ActiveProfile {
  param([string]$ProfileName = "")

  $catalog = Get-ProfileCatalog
  $laptop = Get-LaptopConfig
  $name = if ($ProfileName) { $ProfileName } else { [string]$laptop.profile }
  if (-not $name) { $name = "light" }
  if (-not $catalog.profiles.PSObject.Properties.Name -contains $name) {
    throw "Unknown profile '$name'. Valid: light, heavy"
  }
  $p = $catalog.profiles.$name
  return [pscustomobject]@{
    Name                      = $name
    Description               = [string]$p.description
    ActiveProjectSlots        = [int]$p.activeProjectSlots
    MergeSlots                = [int]$p.mergeSlots
    MaxActiveSlots            = [int]$p.maxActiveSlots
    PerWorktreeBudgetGB       = [double]$p.perWorktreeBudgetGB
    ActiveWorkingSetBudgetGB  = [double]$p.activeWorkingSetBudgetGB
    ProtectedBasesBudgetGB    = [double]$p.protectedBasesBudgetGB
    ClawsCheckoutBudgetGB     = [double]$p.clawsCheckoutBudgetGB
    MinFreeGB                 = [double]$p.minFreeGB
    WarnFreeGB                = [double]$p.warnFreeGB
    CriticalFreeGB            = [double]$p.criticalFreeGB
    StaleReleaseDays          = [int]$p.staleReleaseDays
    Roots                     = @($catalog.defaults.roots)
    WorktreeRoot              = [string]$catalog.defaults.worktreeRoot
    ProtectedBaseNames        = @($catalog.defaults.protectedBaseNames)
    # Keep Test-IsProtectedCheckoutName in lib.ps1 aligned with this list.
    Hostname                  = [string](Get-LaptopConfig).hostname
  }
}

function Get-ActiveRegistry {
  $path = Get-ActiveRegistryPath
  $reg = Read-JsonFile -Path $path
  if (-not $reg) {
    $reg = [pscustomobject]@{
      version   = 1
      hostname  = $env:COMPUTERNAME
      updatedAt = (Get-Date).ToUniversalTime().ToString("o")
      slots     = @()
    }
    Write-JsonFile -Path $path -Object $reg
  }
  if (-not $reg.slots) {
    $reg | Add-Member -NotePropertyName slots -NotePropertyValue @() -Force
  }
  # Normalize slots to array
  $slots = @($reg.slots)
  $reg.slots = $slots
  return $reg
}

function Save-ActiveRegistry {
  param($Registry)
  $Registry.hostname = $env:COMPUTERNAME
  $Registry.updatedAt = (Get-Date).ToUniversalTime().ToString("o")
  if (-not $Registry.slots) { $Registry.slots = @() }
  $Registry.slots = @($Registry.slots)
  Write-JsonFile -Path (Get-ActiveRegistryPath) -Object $Registry
}

function New-SlotId {
  return ([guid]::NewGuid().ToString("N").Substring(0, 10))
}

function Get-RegistrySlotPaths {
  param($Registry)
  $paths = @()
  foreach ($s in @($Registry.slots)) {
    if ($s.path) { $paths += [string]$s.path }
  }
  return $paths
}

function Test-PathInRegistry {
  param($Registry, [string]$Path)
  $full = [System.IO.Path]::GetFullPath($Path)
  foreach ($p in (Get-RegistrySlotPaths -Registry $Registry)) {
    if ([System.IO.Path]::GetFullPath($p) -eq $full) { return $true }
  }
  return $false
}

function Get-FreeGBSystemDrive {
  $d = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
  if (-not $d) {
    $all = @(Get-DiskFreeSummary)
    if ($all.Count -gt 0) { return [double]$all[0].FreeGB }
    return 0
  }
  return [math]::Round($d.FreeSpace / 1GB, 1)
}

function Get-BudgetStatus {
  param([string]$ProfileName = "")

  $profile = Get-ActiveProfile -ProfileName $ProfileName
  $registry = Get-ActiveRegistry
  $slots = @($registry.slots)
  $projectSlots = @($slots | Where-Object { $_.kind -ne "merge" })
  $mergeSlots = @($slots | Where-Object { $_.kind -eq "merge" })
  $freeGB = Get-FreeGBSystemDrive

  $freeState = "ok"
  if ($freeGB -lt $profile.CriticalFreeGB) { $freeState = "critical" }
  elseif ($freeGB -lt $profile.WarnFreeGB) { $freeState = "warn" }
  elseif ($freeGB -lt $profile.MinFreeGB) { $freeState = "below-target" }

  $activeUsed = $slots.Count
  $slotsRemaining = [math]::Max(0, $profile.MaxActiveSlots - $activeUsed)
  $plannedActiveGB = [math]::Round($activeUsed * $profile.PerWorktreeBudgetGB, 1)
  $plannedTotalClawsGB = [math]::Round($profile.ProtectedBasesBudgetGB + $profile.ActiveWorkingSetBudgetGB, 1)

  return [pscustomobject]@{
    Profile              = $profile
    Registry             = $registry
    FreeGB               = $freeGB
    FreeState            = $freeState
    ActiveSlots          = $activeUsed
    ProjectSlots         = $projectSlots.Count
    MergeSlots           = $mergeSlots.Count
    MaxActiveSlots       = $profile.MaxActiveSlots
    SlotsRemaining       = $slotsRemaining
    PlannedActiveGB      = $plannedActiveGB
    ActiveBudgetGB       = $profile.ActiveWorkingSetBudgetGB
    ClawsCheckoutBudgetGB = $profile.ClawsCheckoutBudgetGB
    PlannedClawsFloorGB  = $plannedTotalClawsGB
    OverSlotBudget       = ($activeUsed -gt $profile.MaxActiveSlots)
    OverActiveGBBudget   = ($plannedActiveGB -gt $profile.ActiveWorkingSetBudgetGB)
  }
}

function Get-DefaultBaseRepo {
  param([string]$Product = "openclaw")

  $candidates = switch ($Product) {
    "lobster" { @("C:\src\lobster") }
    "claws-hapi" { @("C:\src\claws-hapi") }
    default { @("C:\src\srcopenclaw", "C:\src\openclaw", "C:\src\openclaw-local") }
  }
  foreach ($c in $candidates) {
    if (Test-Path -LiteralPath $c) { return $c }
  }
  return $null
}

function Resolve-AllocatePath {
  param(
    [string]$Path = "",
    [string]$Name = "",
    [string]$WorktreeRoot = "C:\src"
  )
  if ($Path) {
    return [System.IO.Path]::GetFullPath($Path)
  }
  if (-not $Name) {
    throw "Provide -Path or -Name for allocation."
  }
  return [System.IO.Path]::GetFullPath((Join-Path $WorktreeRoot $Name))
}
