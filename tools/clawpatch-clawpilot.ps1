param(
  [ValidateSet("doctor", "init", "map", "status", "review", "report", "next", "show")]
  [string]$Command = "status",
  [string]$Repo = "C:\src\clawpilot",
  [string]$StateDir = "C:\tmp\clawpatch-runs\clawpilot",
  [int]$Limit = 10,
  [string]$Feature = "",
  [string]$Since = "",
  [switch]$IncludeDirty,
  [string[]]$ExtraArgs = @()
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command clawpatch -ErrorAction SilentlyContinue)) {
  throw "clawpatch is not on PATH. Install it with: npm install -g clawpatch"
}

New-Item -ItemType Directory -Force -Path $StateDir | Out-Null

$argsList = @("--root", $Repo, "--state-dir", $StateDir, $Command)

if ($Command -eq "review") {
  $argsList += @("--limit", "$Limit")
  if ($Feature) {
    $argsList += @("--feature", $Feature)
  }
  if ($Since) {
    $argsList += @("--since", $Since)
  }
  if ($IncludeDirty) {
    $argsList += "--include-dirty"
  }
}

$argsList += $ExtraArgs

Write-Host "clawpatch $($argsList -join ' ')"
& clawpatch @argsList
exit $LASTEXITCODE
