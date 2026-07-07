param(
  [string]$Distro = "Ubuntu",
  [string]$User = "root"
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSCommandPath
$run = Join-Path $root "wsl-run.ps1"
$script = Join-Path $root "wsl-script.ps1"
$python = Join-Path $root "wsl-python.ps1"
$repos = Join-Path $root "wsl-repos.ps1"

foreach ($path in @($run, $script, $python, $repos)) {
  if (-not (Test-Path -LiteralPath $path)) {
    throw "Missing wrapper: $path"
  }
}

function Invoke-Checked {
  param(
    [string]$Name,
    [scriptblock]$Command
  )

  Write-Host "== $Name =="
  & $Command
  if ($LASTEXITCODE -ne 0) {
    throw "$Name failed with exit code $LASTEXITCODE"
  }
}

Invoke-Checked "wsl-run" {
  & $run -Distro $Distro -User $User -Path "/root/src" -Command 'printf "wsl-run-ok\n"'
}

Invoke-Checked "wsl-script CRLF handling" {
  & $script -Distro $Distro -User $User -Path "/root/src" -Script @'
printf "line-one\r\nline-two\r\n" | tr -d "\r" | grep -q "line-two"
printf "wsl-script-ok\n"
'@
}

Invoke-Checked "wsl-python stdin" {
  & $python -Distro $Distro -User $User -Path "/root/src" -Script @'
from pathlib import Path
assert Path.cwd().as_posix() == "/root/src"
print("wsl-python-ok")
'@
}

Invoke-Checked "wsl-repos" {
  $output = & $repos -Distro $Distro -User $User
  if ($LASTEXITCODE -ne 0) {
    throw "wsl-repos failed with exit code $LASTEXITCODE"
  }
  if (-not $output -or @($output).Count -eq 0) {
    throw "wsl-repos returned no output"
  }
  $output | Select-Object -First 5
}

Write-Host "WSL tool tests passed."
