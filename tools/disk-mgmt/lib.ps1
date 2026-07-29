# Shared helpers for disk-mgmt scripts.

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-DiskFreeSummary {
  Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3" |
    Select-Object DeviceID,
      @{N = "TotalGB"; E = { [math]::Round($_.Size / 1GB, 1) } },
      @{N = "FreeGB"; E = { [math]::Round($_.FreeSpace / 1GB, 1) } },
      @{N = "UsedPct"; E = {
          if ($_.Size -le 0) { 0 }
          else { [math]::Round((($_.Size - $_.FreeSpace) / $_.Size) * 100, 1) }
        }
      }
}

function Get-PathSizeBytes {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path)) { return 0L }
  $item = Get-Item -LiteralPath $Path -Force -ErrorAction SilentlyContinue
  if (-not $item) { return 0L }
  if (-not $item.PSIsContainer) { return [int64]$item.Length }

  # robocopy /L lists without copying; summary includes total bytes.
  $output = & robocopy $Path NULL /L /S /NJH /NJS /NDL /NFL /NC /NJS /BYTES /R:0 /W:0 2>&1 |
    Out-String
  if ($output -match "Bytes\s*:\s*([0-9,]+)") {
    $raw = $Matches[1] -replace ",", ""
    $parsed = 0L
    if ([int64]::TryParse($raw, [ref]$parsed)) {
      return $parsed
    }
  }

  try {
    $sum = (Get-ChildItem -LiteralPath $Path -Recurse -Force -File -ErrorAction SilentlyContinue |
      Measure-Object Length -Sum).Sum
    if ($sum) { return [int64]$sum }
  } catch {
    return 0L
  }
  return 0L
}

function Get-TopLevelSizes {
  param(
    [string[]]$Roots,
    [int]$Top = 40
  )

  $rows = @()
  foreach ($root in $Roots) {
    if (-not (Test-Path -LiteralPath $root)) { continue }
    $items = Get-ChildItem -LiteralPath $root -Force -ErrorAction SilentlyContinue
    foreach ($item in $items) {
      $bytes = Get-PathSizeBytes -Path $item.FullName
      $rows += [pscustomobject]@{
        Root   = $root
        Name   = $item.Name
        Path   = $item.FullName
        SizeGB = [math]::Round(($bytes / 1GB), 2)
        Bytes  = [int64]$bytes
        Kind   = if ($item.PSIsContainer) { "dir" } else { "file" }
      }
    }
  }

  $rows | Sort-Object Bytes -Descending | Select-Object -First $Top
}

function Test-IsGitCheckout {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) { return $false }
  $gitDir = Join-Path $Path ".git"
  return (Test-Path -LiteralPath $gitDir)
}

function Get-GitText {
  param(
    [string]$Repo,
    [string[]]$GitArgs
  )
  $prev = Get-Location
  try {
    Set-Location -LiteralPath $Repo
    $out = & git @GitArgs 2>$null
    if ($LASTEXITCODE -ne 0) { return $null }
    return ($out -join "`n").Trim()
  } finally {
    Set-Location $prev
  }
}

function Test-IsProtectedCheckoutName {
  param([string]$Name)

  # True long-lived product homes only. Feature tool checkouts must be allocated.
    $protected = @(
      "claws-hapi",
      "lobster",
      "openclaw",
      "srcopenclaw"
    )
    return $protected -contains $Name.ToLowerInvariant()
  }

function Get-RepoFamily {
  param(
    [string]$Name,
    [string]$RemoteUrl = ""
  )

  $blob = ("{0} {1}" -f $Name, $RemoteUrl).ToLowerInvariant()
  if ($blob -match "openclaw|lobster|claws-hapi|\bclaws\b|clawpilot|resonance|gitcrawl|discrawl|slacrawl|notcrawl|graincrawl|clawhub|promoteclaw|typeclaw") {
    return "claws"
  }
  if ($blob -match "craftworks|craft-") { return "craft" }
  if ($blob -match "maxim-agent") { return "maxim" }
  return "other"
}

function Get-RemoteGithubSlug {
  param([string]$Repo)

  foreach ($remote in @("origin", "openclaw", "claws", "upstream", "giodl73-repo", "gim-home")) {
    $url = Get-GitText -Repo $Repo -GitArgs @("config", "--get", "remote.$remote.url")
    if (-not $url) { continue }
    if ($url -match "(?:github\.com|microsoft\.ghe\.com)[:/](?<owner>[^/]+)/(?<name>[^/.]+)") {
      return [pscustomobject]@{
        Host  = if ($url -match "microsoft\.ghe\.com") { "microsoft.ghe.com" } else { "github.com" }
        Owner = $Matches["owner"]
        Name  = $Matches["name"]
        Remote = $remote
        Url   = $url
      }
    }
  }
  return $null
}

function Get-ManagedCheckouts {
  param(
    [string[]]$Roots = @("C:\src", "C:\tmp"),
    [string]$Family = "all",
    [int]$Limit = 0
  )

  $rows = @()
  foreach ($root in $Roots) {
    if (-not (Test-Path -LiteralPath $root)) { continue }
    $dirs = Get-ChildItem -LiteralPath $root -Directory -Force -ErrorAction SilentlyContinue
    foreach ($dir in $dirs) {
      if (-not (Test-IsGitCheckout -Path $dir.FullName)) { continue }

      $branch = Get-GitText -Repo $dir.FullName -GitArgs @("branch", "--show-current")
      if (-not $branch) { $branch = "(detached)" }
      $sha = Get-GitText -Repo $dir.FullName -GitArgs @("rev-parse", "--short=10", "HEAD")
      $subject = Get-GitText -Repo $dir.FullName -GitArgs @("log", "-1", "--format=%s")
      $dateText = Get-GitText -Repo $dir.FullName -GitArgs @("log", "-1", "--format=%cI")
      $status = Get-GitText -Repo $dir.FullName -GitArgs @("status", "--porcelain")
      $dirty = [bool]$status
      $slug = Get-RemoteGithubSlug -Repo $dir.FullName
      $remoteUrl = if ($slug) { $slug.Url } else { "" }
      $familyName = Get-RepoFamily -Name $dir.Name -RemoteUrl $remoteUrl

      if ($Family -ne "all" -and $familyName -ne $Family) { continue }

      $ageDays = $null
      if ($dateText) {
        try {
          $last = [datetime]::Parse($dateText).ToUniversalTime()
          $ageDays = [int][math]::Floor(((Get-Date).ToUniversalTime() - $last).TotalDays)
        } catch {
          $ageDays = $null
        }
      }

      $rows += [pscustomobject]@{
        Family     = $familyName
        Name       = $dir.Name
        Path       = $dir.FullName
        Branch     = $branch
        Sha        = $sha
        LastCommit = if ($dateText) { ([datetime]::Parse($dateText)).ToString("yyyy-MM-dd") } else { "" }
        AgeDays    = $ageDays
        Dirty      = $dirty
        Host       = if ($slug) { $slug.Host } else { "" }
        Owner      = if ($slug) { $slug.Owner } else { "" }
        Repo       = if ($slug) { $slug.Name } else { "" }
        Remote     = if ($slug) { $slug.Remote } else { "" }
        Subject    = $subject
      }
    }
  }

  $rows = $rows | Sort-Object Family, Name
  if ($Limit -gt 0) {
    return $rows | Select-Object -First $Limit
  }
  return $rows
}

function Write-Report {
  param(
    [string]$Path,
    [string[]]$Lines
  )
  $dir = Split-Path -Parent $Path
  if ($dir -and -not (Test-Path -LiteralPath $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }
  Set-Content -LiteralPath $Path -Value $Lines -Encoding UTF8
}

function Test-BranchPushed {
  param(
    [string]$Repo,
    [string]$Branch
  )
  if (-not $Branch -or $Branch -eq "(detached)") { return $false }
  $upstream = Get-GitText -Repo $Repo -GitArgs @("rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}")
  if ($upstream) { return $true }
  # Fallback: same-named remote branch on origin/openclaw/claws.
  foreach ($remote in @("origin", "openclaw", "claws", "upstream")) {
    $ref = Get-GitText -Repo $Repo -GitArgs @("ls-remote", "--heads", $remote, $Branch)
    if ($ref) { return $true }
  }
  return $false
}

function Get-GhPrStateForBranch {
  param(
    [string]$RepoPath,
    [string]$Branch,
    [string]$HostName,
    [string]$Owner,
    [string]$RepoName
  )

  if (-not $Branch -or $Branch -in @("main", "master", "(detached)")) {
    return $null
  }
  if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    return $null
  }

  $repoSlug = if ($Owner -and $RepoName) { "$Owner/$RepoName" } else { $null }
  $args = @("pr", "list", "--head", $Branch, "--state", "all", "--json", "number,state,mergedAt,url,title", "--limit", "5")
  if ($repoSlug) {
    $args += @("--repo", $repoSlug)
  }
  if ($HostName -eq "microsoft.ghe.com") {
    $args = @("--hostname", "microsoft.ghe.com") + $args
  }

  $prev = Get-Location
  try {
    Set-Location -LiteralPath $RepoPath
    $json = & gh @args 2>$null
    if ($LASTEXITCODE -ne 0 -or -not $json) { return $null }
    $items = $json | ConvertFrom-Json
    if (-not $items) { return $null }
    # Prefer merged, then closed, then open.
    $merged = @($items | Where-Object { $_.state -eq "MERGED" }) | Select-Object -First 1
    if ($merged) { return $merged }
    $closed = @($items | Where-Object { $_.state -eq "CLOSED" }) | Select-Object -First 1
    if ($closed) { return $closed }
    return @($items)[0]
  } catch {
    return $null
  } finally {
    Set-Location $prev
  }
}

function Remove-WorktreeSafe {
  param(
    [string]$Path,
    [switch]$ForceDirty
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    return [pscustomobject]@{ Ok = $false; Message = "missing path" }
  }

  $status = Get-GitText -Repo $Path -GitArgs @("status", "--porcelain")
  if ($status -and -not $ForceDirty) {
    return [pscustomobject]@{ Ok = $false; Message = "dirty; skipped" }
  }

  # Prefer git worktree remove when this path is a linked worktree.
  $gitFile = Join-Path $Path ".git"
  $isLinked = $false
  if (Test-Path -LiteralPath $gitFile -PathType Leaf) {
    $isLinked = $true
  }

  if ($isLinked) {
    $common = Get-GitText -Repo $Path -GitArgs @("rev-parse", "--path-format=absolute", "--git-common-dir")
    if ($common) {
      $main = Split-Path -Parent $common
      if ($main -and (Test-Path -LiteralPath $main)) {
        $prev = Get-Location
        try {
          Set-Location -LiteralPath $main
          if ($ForceDirty) {
            & git worktree remove --force -- $Path 2>$null | Out-Null
          } else {
            & git worktree remove -- $Path 2>$null | Out-Null
          }
          if ($LASTEXITCODE -eq 0) {
            return [pscustomobject]@{ Ok = $true; Message = "worktree removed via git" }
          }
        } finally {
          Set-Location $prev
        }
      }
    }
  }

  try {
    Remove-Item -LiteralPath $Path -Recurse -Force -ErrorAction Stop
    return [pscustomobject]@{ Ok = $true; Message = "directory removed" }
  } catch {
    return [pscustomobject]@{ Ok = $false; Message = $_.Exception.Message }
  }
}
