param(
  [string]$WslDistro = "Ubuntu-24.04",
  [string]$OpenClawPath = "",
  [switch]$Fix,
  [switch]$Json
)

$ErrorActionPreference = "Stop"
$results = New-Object System.Collections.Generic.List[object]

function Sanitize-Text {
  param([string]$Text)

  if (-not $Text) {
    return ""
  }

  $clean = $Text -replace "`0", ""
  $clean = $clean -replace 'gh[opsu]_[A-Za-z0-9_]+', '[redacted-token]'
  $clean = $clean -replace '(?m)^(\s*-\s*Token:\s*).+$', '${1}[redacted]'
  return $clean
}

function Add-Result {
  param(
    [string]$Name,
    [string]$Status,
    [string]$Detail = "",
    [string]$FixHint = ""
  )

  $results.Add([pscustomobject]@{
      name = $Name
      status = $Status
      detail = $Detail
      fix = $FixHint
    }) | Out-Null
}

function Invoke-Capture {
  param([string[]]$Command)

  try {
    $output = & $Command[0] @($Command | Select-Object -Skip 1) 2>&1
    [pscustomobject]@{
      exit = $LASTEXITCODE
      text = (Sanitize-Text (($output | Out-String).Trim()))
    }
  } catch {
    [pscustomobject]@{
      exit = 1
      text = (Sanitize-Text $_.Exception.Message)
    }
  }
}

function Invoke-Wsl {
  param([string]$Script)

  Invoke-Capture @("wsl.exe", "-d", $WslDistro, "--", "bash", "-lc", $Script)
}

function Test-Command {
  param(
    [string]$Name,
    [string[]]$Command,
    [string]$FixHint = ""
  )

  $result = Invoke-Capture $Command
  if ($result.exit -eq 0) {
    Add-Result $Name "ok" $result.text
  } else {
    Add-Result $Name "fail" $result.text $FixHint
  }
}

function Test-WslCommand {
  param(
    [string]$Name,
    [string]$Command,
    [string]$FixHint = ""
  )

  $result = Invoke-Wsl $Command
  if ($result.exit -eq 0) {
    Add-Result $Name "ok" $result.text
  } else {
    Add-Result $Name "fail" $result.text $FixHint
  }
}

function Get-WslOpenClawPath {
  if ($OpenClawPath) {
    return $OpenClawPath
  }

  $probe = Invoke-Wsl "find /root/src /mnt/c/src -maxdepth 2 -name package.json -print 2>/dev/null | grep -E '/(openclaw[^/]*|claws[^/]*)/package.json' | sort -r | head -n 1 | xargs -r dirname"

  if ($probe.exit -eq 0 -and $probe.text) {
    return ($probe.text -split "`n")[0].Trim()
  }

  return ""
}

function Install-WslCrabboxIfSafe {
  if (-not $Fix) {
    return
  }

  $install = Invoke-Wsl @'
set -e
if command -v crabbox >/dev/null 2>&1; then
  crabbox --version
  exit 0
fi
if [ -x /mnt/c/src/crabbox/bin/linux-amd64/crabbox ]; then
  install -D -m 0755 /mnt/c/src/crabbox/bin/linux-amd64/crabbox /usr/local/bin/crabbox
elif [ -x /root/src/crabbox/bin/crabbox ]; then
  install -D -m 0755 /root/src/crabbox/bin/crabbox /usr/local/bin/crabbox
elif [ -x /root/src/openclaw-branches/crabbox/bin/crabbox ]; then
  install -D -m 0755 /root/src/openclaw-branches/crabbox/bin/crabbox /usr/local/bin/crabbox
else
  echo "no sibling crabbox binary found"
  exit 2
fi
crabbox --version
'@

  if ($install.exit -eq 0) {
    Add-Result "wsl.crabbox.fix" "fixed" $install.text
  } else {
    Add-Result "wsl.crabbox.fix" "warn" $install.text "Build or install the peer Crabbox repo, then rerun with -Fix."
  }
}

function Enable-WslCorepackIfSafe {
  if (-not $Fix) {
    return
  }

  $enable = Invoke-Wsl "command -v node >/dev/null 2>&1 && corepack enable && corepack --version"
  if ($enable.exit -eq 0) {
    Add-Result "wsl.corepack.fix" "fixed" $enable.text
  } else {
    Add-Result "wsl.corepack.fix" "warn" $enable.text "Install Node 22 in WSL first."
  }
}

Test-Command "windows.powershell" @("pwsh", "-NoProfile", "-Command", '$PSVersionTable.PSVersion.ToString()')
Test-Command "windows.git" @("git", "--version") "Install Git for Windows."
Test-Command "windows.gh" @("gh", "--version") "Install or update GitHub CLI with winget upgrade --id GitHub.cli."
Test-Command "windows.gh.auth" @("gh", "auth", "status") "Run gh auth login."
Test-Command "windows.wsl" @("wsl.exe", "--list", "--verbose") "Install WSL and the expected distro."

$wslPing = Invoke-Wsl "printf '%s\n' ok"
if ($wslPing.exit -ne 0) {
  Add-Result "wsl.$WslDistro" "fail" $wslPing.text "Install or start WSL distro $WslDistro."
} else {
  Add-Result "wsl.$WslDistro" "ok" "reachable"
  Test-WslCommand "wsl.os" "uname -a"
  Test-WslCommand "wsl.git" "git --version" "sudo apt update && sudo apt install git"
  Test-WslCommand "wsl.node" "node --version" "Install Node 22 in WSL."
  $nodeVersion = Invoke-Wsl "node --version 2>/dev/null || true"
  if ($nodeVersion.text -and ($nodeVersion.text -notmatch '^v22\.')) {
    Add-Result "wsl.node.version" "warn" $nodeVersion.text "OpenClaw runtime expects Node 22; install/switch to Node 22 before release-grade proof."
  }
  Test-WslCommand "wsl.corepack" "corepack --version" "corepack enable"
  Enable-WslCorepackIfSafe
  Test-WslCommand "wsl.pnpm" "pnpm --version" "corepack enable && corepack prepare pnpm@latest --activate"
  Test-WslCommand "wsl.gh" "gh --version" "Install GitHub CLI in WSL from https://cli.github.com/packages."
  Test-WslCommand "wsl.gh.auth" "gh auth status" "Run gh auth login inside WSL."
  Test-WslCommand "wsl.gitcrawl" "gitcrawl --version || gitcrawl --help | head -n 1" "Install or expose gitcrawl in WSL PATH."
  Test-WslCommand "wsl.crabbox" "crabbox --version" "Install Crabbox from the peer repo, or rerun redshell with -Fix."
  Install-WslCrabboxIfSafe

  $repoPath = Get-WslOpenClawPath
  if (-not $repoPath) {
    Add-Result "openclaw.checkout" "fail" "No OpenClaw checkout found under /root/src/openclaw*, /root/src/claws*, /mnt/c/src/openclaw*, or /mnt/c/src/claws*." "Pass -OpenClawPath /path/to/openclaw."
  } else {
    Add-Result "openclaw.checkout" "ok" $repoPath
    $quotedRepoPath = $repoPath.Replace("'", "'\''")
    Test-WslCommand "openclaw.git.status" "cd '$quotedRepoPath' && git status --short --branch"
    Test-WslCommand "openclaw.package" "cd '$quotedRepoPath' && test -f package.json && echo package.json"
    Test-WslCommand "openclaw.vitest.wrapper" "cd '$quotedRepoPath' && test -f scripts/run-vitest.mjs && { test -f node_modules/vitest/package.json || ls node_modules/.pnpm/vitest@*/node_modules/vitest/package.json >/dev/null 2>&1; } && echo ok" "Run pnpm install in the OpenClaw checkout."
    Test-WslCommand "openclaw.crabbox.wrapper" "cd '$quotedRepoPath' && test -f scripts/crabbox-wrapper.mjs && command -v crabbox >/dev/null && echo ok" "Install Crabbox and OpenClaw dependencies."
  }
}

if ($Json) {
  $results | ConvertTo-Json -Depth 4
  exit 0
}

$maxName = [Math]::Max(20, (($results | ForEach-Object { $_.name.Length } | Measure-Object -Maximum).Maximum))
foreach ($item in $results) {
  $status = $item.status.ToUpperInvariant().PadRight(5)
  $name = $item.name.PadRight($maxName)
  $detail = ($item.detail -replace "\r?\n", " | ")
  Write-Host "$status $name $detail"
  if ($item.fix) {
    Write-Host ("      fix: " + $item.fix)
  }
}

$failCount = @($results | Where-Object { $_.status -eq "fail" }).Count
$warnCount = @($results | Where-Object { $_.status -eq "warn" }).Count
if ($failCount -gt 0) {
  Write-Host "redshell: $failCount failing check(s), $warnCount warning(s)."
  exit 1
}

Write-Host "redshell: ready, $warnCount warning(s)."
