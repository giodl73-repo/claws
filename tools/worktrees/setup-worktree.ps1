param(
  [Parameter(Mandatory = $true)]
  [string]$Path,

  [Parameter(Mandatory = $true)]
  [string]$Branch,

  [string]$Repo = (Resolve-Path ".").Path,
  [string]$Base = "main",
  [switch]$CreateBranch,
  [switch]$NoFetch,
  [switch]$NoInstall,
  [switch]$ForceInstall,
  [ValidateSet("auto", "pnpm", "npm", "yarn")]
  [string]$PackageManager = "auto"
)

$ErrorActionPreference = "Stop"

function Resolve-FullPath {
  param([string]$InputPath)
  $executionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($InputPath)
}

function Invoke-InDirectory {
  param(
    [string]$Directory,
    [scriptblock]$Script
  )

  $previous = Get-Location
  try {
    Set-Location -LiteralPath $Directory
    & $Script
  } finally {
    Set-Location $previous
  }
}

function Get-PackageManager {
  param([string]$Directory)

  if ($PackageManager -ne "auto") {
    return $PackageManager
  }
  if (Test-Path -LiteralPath (Join-Path $Directory "pnpm-lock.yaml")) {
    return "pnpm"
  }
  if (Test-Path -LiteralPath (Join-Path $Directory "package-lock.json")) {
    return "npm"
  }
  if (Test-Path -LiteralPath (Join-Path $Directory "yarn.lock")) {
    return "yarn"
  }
  return ""
}

function Invoke-Install {
  param(
    [string]$Directory,
    [string]$Manager
  )

  if (-not $Manager) {
    Write-Host "No package lock found; skipping dependency install."
    return
  }

  if ((Test-Path -LiteralPath (Join-Path $Directory "node_modules")) -and -not $ForceInstall) {
    Write-Host "node_modules already exists; use -ForceInstall to reinstall."
    return
  }

  Invoke-InDirectory -Directory $Directory -Script {
    if (Get-Command corepack -ErrorAction SilentlyContinue) {
      corepack enable
    }

    switch ($Manager) {
      "pnpm" {
        if (Test-Path -LiteralPath "pnpm-lock.yaml") {
          pnpm install --frozen-lockfile
        } else {
          pnpm install
        }
      }
      "npm" {
        if (Test-Path -LiteralPath "package-lock.json") {
          npm ci
        } else {
          npm install
        }
      }
      "yarn" {
        if (Test-Path -LiteralPath "yarn.lock") {
          yarn install --immutable
        } else {
          yarn install
        }
      }
    }
  }
}

$repoPath = Resolve-FullPath $Repo
$worktreePath = Resolve-FullPath $Path

if (-not (Test-Path -LiteralPath (Join-Path $repoPath ".git"))) {
  throw "Repo does not look like a git checkout: $repoPath"
}

if (-not $NoFetch) {
  Invoke-InDirectory -Directory $repoPath -Script {
    git fetch --all --prune
  }
}

if (-not (Test-Path -LiteralPath $worktreePath)) {
  $parent = Split-Path -Parent $worktreePath
  New-Item -ItemType Directory -Force -Path $parent | Out-Null

  Invoke-InDirectory -Directory $repoPath -Script {
    if ($CreateBranch) {
      git worktree add -b $Branch $worktreePath $Base
    } else {
      git worktree add $worktreePath $Branch
    }
  }
} elseif (-not (Test-Path -LiteralPath (Join-Path $worktreePath ".git"))) {
  throw "Target path exists but is not a git worktree: $worktreePath"
} else {
  Write-Host "Worktree already exists: $worktreePath"
}

Invoke-InDirectory -Directory $worktreePath -Script {
  git status --short --branch
  if (Test-Path -LiteralPath ".gitmodules") {
    git submodule update --init --recursive
  }
}

if (-not $NoInstall) {
  $manager = Get-PackageManager -Directory $worktreePath
  Invoke-Install -Directory $worktreePath -Manager $manager
}

Write-Host "Ready: $worktreePath"
