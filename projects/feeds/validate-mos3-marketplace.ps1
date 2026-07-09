param(
  [string]$LobsterRuntime = "C:\src\lobster-feeds-validation\src\lobster_runtime",
  [string]$Scout = "",
  [string]$ClientId = "7acd1687-fdfb-43f1-814d-f3e8bb8d604a",
  [ValidateSet("msit", "prod", "msitprv")]
  [string]$Environment = "msit",
  [string]$Search = "skill",
  [switch]$Login,
  [string]$WorkDir = "$env:TEMP\scout-mos3-marketplace-validation"
)

$ErrorActionPreference = "Stop"

function Set-OpenSslEnv {
  $OpenSslDir = "C:\Program Files\OpenSSL-Win64"
  if (Test-Path -LiteralPath $OpenSslDir) {
    $env:OPENSSL_DIR = $OpenSslDir
    $env:OPENSSL_LIB_DIR = Join-Path $OpenSslDir "lib\VC\x64\MD"
    $env:OPENSSL_INCLUDE_DIR = Join-Path $OpenSslDir "include"
    $env:PATH = "$(Join-Path $OpenSslDir "bin");$env:PATH"
  }
}

function Get-Mos3Scope {
  param([string]$Name)

  switch ($Name) {
    "msit" { return "https://titles.msit.mos.microsoft.com/.default" }
    "msitprv" { return "https://titles.msitprv.mos.microsoft.com/.default" }
    "prod" { return "https://titles.prod.mos.microsoft.com/.default" }
  }
}

Set-OpenSslEnv

if ([string]::IsNullOrWhiteSpace($Scout)) {
  $Scout = Join-Path $LobsterRuntime "target\debug\scout.exe"
}

if (!(Test-Path -LiteralPath $Scout)) {
  Push-Location $LobsterRuntime
  try {
    cargo build --bin scout
  } finally {
    Pop-Location
  }
}

if (!(Test-Path -LiteralPath $Scout)) {
  throw "Scout CLI not found at $Scout. Build it first: cd $LobsterRuntime; cargo build --bin scout"
}

New-Item -ItemType Directory -Force -Path $WorkDir | Out-Null
$AuthCache = Join-Path $WorkDir "auth-cache.json"
$FeedOut = Join-Path $WorkDir "mos3-marketplace.feed.json"
$Scope = Get-Mos3Scope $Environment

if ($Login -or !(Test-Path -LiteralPath $AuthCache)) {
  & $Scout auth login --scope $Scope --client-id $ClientId --auth-cache $AuthCache
}

& $Scout auth status --auth-cache $AuthCache

& $Scout feed import mos3-marketplace `
  --environment $Environment `
  --auth-scope $Scope `
  --auth-cache $AuthCache `
  --out $FeedOut

& $Scout feed verify $FeedOut
& $Scout feed search $Search --feed $FeedOut --type skill --source mos3 --json

Write-Host "MOS3 marketplace validation artifacts: $WorkDir"
