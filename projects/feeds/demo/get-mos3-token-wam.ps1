param(
  [ValidateSet("msit", "prod", "msitprv")]
  [string]$Environment = "msit",
  [string]$Search = "skill",
  [string]$ClientId = "7acd1687-fdfb-43f1-814d-f3e8bb8d604a",
  [string]$TokenEnvName = "SCOUT_MOS3_LIVE_TOKEN",
  [string]$LobsterRoot = "C:\src\lobster-feeds-validation",
  [string]$OutDir = "",
  [switch]$Force,
  [switch]$RunMarketplaceProof
)

$ErrorActionPreference = "Stop"

function Get-Mos3BaseUrl {
  param([string]$Name)

  switch ($Name) {
    "msit" { return "https://titles.msit.mos.microsoft.com" }
    "msitprv" { return "https://titles.msitprv.mos.microsoft.com" }
    "prod" { return "https://titles.prod.mos.microsoft.com" }
  }
}

function Set-OpenSslEnv {
  $openSslDir = "C:\Program Files\OpenSSL-Win64"
  if (Test-Path -LiteralPath $openSslDir) {
    $env:OPENSSL_DIR = $openSslDir
    $env:OPENSSL_LIB_DIR = Join-Path $openSslDir "lib\VC\x64\MD"
    $env:OPENSSL_INCLUDE_DIR = Join-Path $openSslDir "include"
    $env:PATH = "$(Join-Path $openSslDir "bin");$env:PATH"
  }
}

if ([string]::IsNullOrWhiteSpace($OutDir)) {
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $OutDir = Join-Path $env:TEMP "mos3-wam-token-$stamp"
}
$OutDir = [System.IO.Path]::GetFullPath($OutDir)
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$baseUrl = Get-Mos3BaseUrl $Environment
$scope = "$baseUrl/.default"
$devDir = Join-Path $LobsterRoot "src\lobster_runtime\dev"
$tok = Join-Path $devDir "tok.mjs"

if (-not (Test-Path -LiteralPath $tok)) {
  throw "Could not find Lobster token helper at $tok"
}

if (-not (Test-Path -LiteralPath (Join-Path $devDir "node_modules"))) {
  Push-Location $devDir
  try {
    npm install
  } finally {
    Pop-Location
  }
}

$args = @($tok, "--client-id", $ClientId, "--quiet")
if ($Force) {
  $args += "--force"
}
$args += $scope

Write-Host "Environment: $Environment"
Write-Host "MOS3 base URL: $baseUrl"
Write-Host "Scope: $scope"
Write-Host "Client id: $ClientId"
Write-Host "Acquiring token through Lobster tok.mjs and WAM/MSAL Node..."

$token = (& node @args) -join "`n"
$token = $token.Trim()
if ([string]::IsNullOrWhiteSpace($token)) {
  throw "Token acquisition returned an empty token."
}

Set-Item -Path "Env:$TokenEnvName" -Value $token
$tokenPath = Join-Path $OutDir "$TokenEnvName.txt"
Set-Content -LiteralPath $tokenPath -Value $token -NoNewline -Encoding ascii

Write-Host ""
Write-Host "MOS3 access token acquired."
Write-Host "Token env var set in this PowerShell process: $TokenEnvName"
Write-Host "Token file: $tokenPath"
Write-Host ""
Write-Host "To use it from another PowerShell window:"
Write-Host "`$env:$TokenEnvName = Get-Content -Raw `"$tokenPath`""

if ($RunMarketplaceProof) {
  Set-OpenSslEnv
  $scout = Join-Path $LobsterRoot "src\lobster_runtime\target\debug\scout.exe"
  if (-not (Test-Path -LiteralPath $scout)) {
    Push-Location (Join-Path $LobsterRoot "src\lobster_runtime")
    try {
      cargo build --bin scout
    } finally {
      Pop-Location
    }
  }

  $marketplaceFeed = Join-Path $OutDir "mos3-marketplace.feed.json"
  Write-Host ""
  Write-Host "Running live MOS3 marketplace import..."
  & $scout feed import mos3-marketplace `
    --environment $Environment `
    --token-env $TokenEnvName `
    --out $marketplaceFeed
  & $scout feed verify $marketplaceFeed
  & $scout feed search $Search --feed $marketplaceFeed --type skill --source mos3 --json

  Write-Host ""
  Write-Host "Proof artifacts: $OutDir"
}
