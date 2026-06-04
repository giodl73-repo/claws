param(
  [string]$Author = "giodl73-repo",
  [int]$Port = 8787,
  [string]$Worktree = "C:\src\lobster-lobstertank"
)

$ErrorActionPreference = "Stop"

$toolDir = Join-Path $Worktree "tools\lobstertank"
$script = Join-Path $toolDir "lobstertank.py"

if (-not (Test-Path -LiteralPath $script)) {
  throw "LobsterTank not found at $script"
}

Write-Host "Starting LobsterTank from $toolDir"
Write-Host "URL: http://127.0.0.1:$Port/"

Push-Location $toolDir
try {
  python .\lobstertank.py --author $Author --port $Port
} finally {
  Pop-Location
}
