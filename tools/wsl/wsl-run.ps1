param(
  [string]$Distro = "Ubuntu",
  [string]$User = "root",
  [string]$Root = "/root/src",
  [string]$Repo,
  [string]$Path,
  [Parameter(Mandatory = $true)]
  [string]$Command
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

$script = @(
  "set -euo pipefail",
  "cd $(Quote-BashSingle $Path)",
  $Command
) -join "`n"

$script = $script.Replace("`r`n", "`n").Replace("`r", "")
$script | wsl.exe -d $Distro -u $User -- bash -lc "tr -d '\r' | bash -s"
exit $LASTEXITCODE
