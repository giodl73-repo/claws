param(
  [string]$Distro = "Ubuntu",
  [string]$User = "root",
  [string]$Root = "/root/src",
  [string]$Repo,
  [string]$Path,
  [string]$Script,
  [string]$File
)

$ErrorActionPreference = "Stop"

function Quote-BashSingle([string]$Value) {
  return "'" + $Value.Replace("'", "'\''") + "'"
}

if (-not $Path) {
  if (-not $Repo) {
    throw "Pass either -Repo <name> or -Path <absolute-wsl-path>."
  }
  $Path = "$Root/$Repo"
}

if ($File) {
  $Script = Get-Content -LiteralPath $File -Raw
}

if (-not $Script) {
  throw "Pass -Script '<bash>' or -File <script-path>."
}

$body = @(
  "set -euo pipefail",
  "cd $(Quote-BashSingle $Path)",
  $Script
) -join "`n"

$body = $body.Replace("`r`n", "`n").Replace("`r", "")
$body | wsl.exe -d $Distro -u $User -- bash -lc "tr -d '\r' | bash -s"
exit $LASTEXITCODE
