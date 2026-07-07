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
  throw "Pass -Script '<python>' or -File <script-path>."
}

$Script = $Script.Replace("`r`n", "`n").Replace("`r", "")
$bash = "cd $(Quote-BashSingle $Path) && tr -d '\r' | python3 -"
$Script | wsl.exe -d $Distro -u $User -- bash -lc $bash
exit $LASTEXITCODE
