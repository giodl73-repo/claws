param(
    [string]$Repo = "C:\src\lobster-feeds-validation",
    [string]$WebNodeModulesSource = "C:\src\lobster-scout-feeds-web-ux\src\lobster_web\node_modules",
    [switch]$SkipRust,
    [switch]$SkipWeb
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Text)
    Write-Host ""
    Write-Host "== $Text ==" -ForegroundColor Cyan
}

function Import-CargoAuth {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        Write-Host "Cargo auth file not found. Running just rust-auth..."
        Push-Location $Repo
        try {
            just rust-auth
        }
        finally {
            Pop-Location
        }
    }

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Cargo auth file was not created at $Path"
    }

    Get-Content -LiteralPath $Path | ForEach-Object {
        if ($_ -match '^([^#=]+)="(.*)"$') {
            [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
        }
    }
}

function Set-OpenSslEnv {
    $opensslRoot = "C:\Program Files\OpenSSL-Win64"
    $opensslLib = Join-Path $opensslRoot "lib\VC\x64\MD"
    $opensslInclude = Join-Path $opensslRoot "include"
    $opensslBin = Join-Path $opensslRoot "bin"

    if ((Test-Path -LiteralPath $opensslLib) -and (Test-Path -LiteralPath $opensslInclude)) {
        $env:OPENSSL_DIR = $opensslRoot
        $env:OPENSSL_LIB_DIR = $opensslLib
        $env:OPENSSL_INCLUDE_DIR = $opensslInclude
        if (Test-Path -LiteralPath $opensslBin) {
            $env:PATH = "$opensslBin;$env:PATH"
        }
        Write-Host "Using OpenSSL from $opensslRoot"
        return
    }

    if ([string]::IsNullOrWhiteSpace($env:OPENSSL_DIR)) {
        throw "OpenSSL was not found at $opensslRoot and OPENSSL_DIR is not set. Install OpenSSL or set OPENSSL_DIR, OPENSSL_LIB_DIR, and OPENSSL_INCLUDE_DIR."
    }
}

$repoFull = [System.IO.Path]::GetFullPath($Repo)
if (-not (Test-Path -LiteralPath $repoFull)) {
    throw "Repo path does not exist: $repoFull"
}

Write-Step "Repository"
git -C $repoFull status --short --branch
git -C $repoFull rev-parse --short HEAD

if (-not $SkipWeb) {
    Write-Step "Web feeds UX/API tests"
    $webDir = Join-Path $repoFull "src\lobster_web"
    $nodeModules = Join-Path $webDir "node_modules"
    if (-not (Test-Path -LiteralPath $nodeModules)) {
        if (Test-Path -LiteralPath $WebNodeModulesSource) {
            cmd /c mklink /J "$nodeModules" "$WebNodeModulesSource" | Out-Host
        }
        else {
            throw "node_modules missing at $nodeModules. Run npm install in $webDir or pass -SkipWeb."
        }
    }

    Push-Location $webDir
    try {
        npm run test:unit -- tests/services/scoutFeedsApi.unit.test.ts tests/pages/FeedsPage.unit.test.tsx
    }
    finally {
        Pop-Location
    }
}

if (-not $SkipRust) {
    Write-Step "Rust feed tests"
    Import-CargoAuth (Join-Path $repoFull ".env.cargo-auth")
    Set-OpenSslEnv
    $runtimeDir = Join-Path $repoFull "src\lobster_runtime"
    Push-Location $runtimeDir
    try {
        cargo +1.95.0 test scout_feed_cli --lib
        cargo +1.95.0 test scout_feed --lib
        cargo +1.95.0 test scout_mos3_marketplace --lib
    }
    finally {
        Pop-Location
    }
}

Write-Step "Result"
Write-Host "Validation completed."
