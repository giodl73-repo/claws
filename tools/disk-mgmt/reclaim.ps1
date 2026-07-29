param(
  [string[]]$Roots = @("C:\src", "C:\tmp"),
  [switch]$Apply,
  [switch]$IncludePackageCaches,
  [switch]$IncludeGitGc,
  [switch]$IncludeRetiredTrees,
  [switch]$AllTechniques,
    [int]$TempMaxAgeDays = 14,
    [string]$Output = "projects\disk-mgmt\last-reclaim.md",
    [switch]$NoWrite
  )

$ErrorActionPreference = "Stop"
. "$PSScriptRoot\lib.ps1"

if ($AllTechniques) {
  $IncludePackageCaches = $true
  $IncludeGitGc = $true
  $IncludeRetiredTrees = $true
}

# If user passed bare -Apply with no technique switches, enable the safe defaults.
if ($Apply -and -not ($IncludePackageCaches -or $IncludeGitGc -or $IncludeRetiredTrees)) {
  $IncludePackageCaches = $true
  $IncludeGitGc = $true
  $IncludeRetiredTrees = $true
}
if (-not $Apply -and -not ($IncludePackageCaches -or $IncludeGitGc -or $IncludeRetiredTrees)) {
  $IncludePackageCaches = $true
  $IncludeGitGc = $true
  $IncludeRetiredTrees = $true
}

$actions = @()

function Add-Action {
  param(
    [string]$Technique,
    [string]$Target,
    [string]$Detail,
    [scriptblock]$ApplyScript
  )
  $status = if ($Apply) { "apply" } else { "would-apply" }
  $result = ""
  if ($Apply) {
    try {
      & $ApplyScript
      $status = "applied"
      $result = "ok"
    } catch {
      $status = "failed"
      $result = $_.Exception.Message
    }
  }
  $script:actions += [pscustomobject]@{
    Technique = $Technique
    Target    = $Target
    Detail    = $Detail
    Status    = $status
    Result    = $result
  }
}

# Package manager caches
if ($IncludePackageCaches) {
  $pnpmStore = $null
  if (Get-Command pnpm -ErrorAction SilentlyContinue) {
    try { $pnpmStore = (& pnpm store path 2>$null | Select-Object -First 1) } catch { $pnpmStore = $null }
  }
  if ($pnpmStore) {
    Add-Action -Technique "pnpm-store-prune" -Target $pnpmStore -Detail "pnpm store prune" -ApplyScript {
      & pnpm store prune | Out-Null
    }
  }

  if (Get-Command npm -ErrorAction SilentlyContinue) {
    Add-Action -Technique "npm-cache-clean" -Target "npm" -Detail "npm cache clean --force" -ApplyScript {
      & npm cache clean --force | Out-Null
    }
  }

  $npmCache = Join-Path $env:LOCALAPPDATA "npm-cache"
  if (Test-Path -LiteralPath $npmCache) {
    Add-Action -Technique "npm-cache-dir" -Target $npmCache -Detail "optional residual cache dir presence" -ApplyScript {
      # npm cache clean already handles content; no hard delete of dir.
    }
  }

  if (Get-Command yarn -ErrorAction SilentlyContinue) {
    Add-Action -Technique "yarn-cache-clean" -Target "yarn" -Detail "yarn cache clean" -ApplyScript {
      & yarn cache clean | Out-Null
    }
  }

  $nuGet = Join-Path $env:USERPROFILE ".nuget\packages"
  if (Test-Path -LiteralPath $nuGet) {
    Add-Action -Technique "nuget-http-cache" -Target (Join-Path $env:LOCALAPPDATA "NuGet") -Detail "dotnet nuget locals http-cache --clear" -ApplyScript {
      if (Get-Command dotnet -ErrorAction SilentlyContinue) {
        & dotnet nuget locals http-cache --clear | Out-Null
      }
    }
  }

  $temp = $env:TEMP
  if ($temp -and (Test-Path -LiteralPath $temp)) {
      $age = $TempMaxAgeDays
      Add-Action -Technique "user-temp-old" -Target $temp -Detail "remove files older than $age days under %TEMP% (best effort)" -ApplyScript {
        Get-ChildItem -LiteralPath $temp -Force -ErrorAction SilentlyContinue |
          Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-1 * $age) } |
          ForEach-Object {
            Remove-Item -LiteralPath $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
          }
      }
    }
  }

# git gc on claws family mains
if ($IncludeGitGc) {
  $repos = @(Get-ManagedCheckouts -Roots $Roots -Family claws)
  $seen = @{}
  foreach ($r in $repos) {
    $common = Get-GitText -Repo $r.Path -GitArgs @("rev-parse", "--path-format=absolute", "--git-common-dir")
    if (-not $common -or $seen.ContainsKey($common)) { continue }
    $seen[$common] = $true
    $target = $r.Path
    Add-Action -Technique "git-gc" -Target $target -Detail "git gc --prune=now" -ApplyScript {
      $prev = Get-Location
      try {
        Set-Location -LiteralPath $target
        & git gc --prune=now 2>$null | Out-Null
      } finally {
        Set-Location $prev
      }
    }
  }
}

# Retired / archive trees under roots
if ($IncludeRetiredTrees) {
  foreach ($root in $Roots) {
    if (-not (Test-Path -LiteralPath $root)) { continue }
    $retired = Get-ChildItem -LiteralPath $root -Directory -Force -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -match '^_retired|^_trash|^archive$|\.old$|-retired-' }
    foreach ($dir in $retired) {
      $path = $dir.FullName
      Add-Action -Technique "retired-tree" -Target $path -Detail "remove retired/archive directory" -ApplyScript {
        Remove-Item -LiteralPath $path -Recurse -Force -ErrorAction Stop
      }
    }

    # Leftover non-git shells from partial worktree deletes (openclaw-*/claw* only).
    $shells = Get-ChildItem -LiteralPath $root -Directory -Force -ErrorAction SilentlyContinue |
      Where-Object {
        $_.Name -match '^(openclaw-|clawhub$|clawpilot$|claws-)' -and
        $_.Name -notin @('claws-hapi') -and
        -not (Test-Path -LiteralPath (Join-Path $_.FullName '.git'))
      }
    foreach ($dir in $shells) {
      $path = $dir.FullName
      Add-Action -Technique "nongit-claw-shell" -Target $path -Detail "remove non-git leftover claw directory" -ApplyScript {
        Remove-Item -LiteralPath $path -Recurse -Force -ErrorAction Stop
      }
    }
  }
}

$generated = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
$before = @(Get-DiskFreeSummary)
$lines = @(
  "# Disk Reclaim Techniques",
  "",
  "Generated: $generated",
  "Mode: $(if ($Apply) { 'APPLY' } else { 'DRY-RUN' })",
  "",
  "## Free Space Before",
  "",
  "| Drive | Free GB | Used % |",
  "| --- | ---: | ---: |"
)
foreach ($d in $before) {
  $lines += "| {0} | {1} | {2} |" -f $d.DeviceID, $d.FreeGB, $d.UsedPct
}

$lines += @(
  "",
  "## Actions",
  "",
  "| Status | Technique | Target | Detail | Result |",
  "| --- | --- | --- | --- | --- |"
)
foreach ($a in $actions) {
  $lines += '| {0} | {1} | `{2}` | {3} | {4} |' -f $a.Status, $a.Technique, $a.Target, $a.Detail, $a.Result
}

if ($Apply) {
  $after = @(Get-DiskFreeSummary)
  $lines += @(
    "",
    "## Free Space After",
    "",
    "| Drive | Free GB | Used % |",
    "| --- | ---: | ---: |"
  )
  foreach ($d in $after) {
    $lines += "| {0} | {1} | {2} |" -f $d.DeviceID, $d.FreeGB, $d.UsedPct
  }
}

$lines += @(
  '',
  '## Manual Techniques (not automated)',
  '',
  '- Windows Storage Sense / Temporary files cleanup',
  '- Aggressive temp: .\tools\disk-mgmt\reclaim.ps1 -Apply -IncludePackageCaches -TempMaxAgeDays 1',
  '- Docker: docker system prune -af --volumes (only if Docker disks are large; often 10+ GB)',
  '- Inspect large profile dirs: %LOCALAPPDATA%\Packages, .codex, .copilot, .rustup',
  '- Remove unused node_modules in abandoned non-git trees after review',
  '- Clear old browser profiles / Hyper-V / WSL distros you no longer use',
  '- Compress rarely used archives; move cold data off-system SSD',
  '- For huge monorepos: git worktree prune then git gc --aggressive sparingly',
  ''
)

if (-not $NoWrite) {
  $outPath = if ([System.IO.Path]::IsPathRooted($Output)) { $Output } else { Join-Path (Get-Location) $Output }
  Write-Report -Path $outPath -Lines $lines
  Write-Host "Wrote $outPath"
}

$before | Format-Table DeviceID, FreeGB, UsedPct -AutoSize
if ($actions.Count -eq 0) {
  Write-Host "No reclaim actions."
} else {
  $actions | Format-Table Status, Technique, Target -AutoSize
}
