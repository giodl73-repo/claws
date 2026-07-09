param(
  [string]$LobsterRuntime = "C:\src\lobster-feeds-validation\src\lobster_runtime",
  [string]$Scout = "",
  [string]$ClientId = "7acd1687-fdfb-43f1-814d-f3e8bb8d604a",
  [string]$BaseUrl = "https://titles.prod.mos.microsoft.com",
  [string]$Scope = "https://titles.prod.mos.microsoft.com/.default",
  [string]$Search = "skill",
  [switch]$Login,
  [switch]$Publish,
  [string]$SkillPath = "",
  [string]$PublishScope = "PersonalSource",
  [string]$WorkDir = "$env:TEMP\scout-mos3-live-validation"
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
$FeedOut = Join-Path $WorkDir "mos3-root.feed.json"

if ($Login -or !(Test-Path -LiteralPath $AuthCache)) {
  & $Scout auth login --scope $Scope --client-id $ClientId --auth-cache $AuthCache
}

& $Scout auth status --auth-cache $AuthCache

& $Scout feed import mos3-live `
  --base-url $BaseUrl `
  --auth-scope $Scope `
  --auth-cache $AuthCache `
  --discover-environment `
  --out $FeedOut

& $Scout feed verify $FeedOut
& $Scout feed search $Search --feed $FeedOut --type skill --json

if ($Publish) {
  if ([string]::IsNullOrWhiteSpace($SkillPath)) {
    $SkillPath = Join-Path $WorkDir "SKILL.md"
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    @"
---
name: scout-mos3-validation-$stamp
description: Temporary Scout MOS3 validation skill.
---

# Scout MOS3 Validation $stamp

This temporary skill validates Scout CLI publishing to MOS3.
"@ | Set-Content -LiteralPath $SkillPath -Encoding utf8
  }

  & $Scout feed publish-mos3 `
    --base-url $BaseUrl `
    --auth-scope $Scope `
    --auth-cache $AuthCache `
    --skill $SkillPath `
    --scope $PublishScope `
    --should-block false

  & $Scout feed import mos3-live `
    --base-url $BaseUrl `
    --auth-scope $Scope `
    --auth-cache $AuthCache `
    --discover-environment `
    --out $FeedOut

  & $Scout feed search "scout-mos3-validation" --feed $FeedOut --type skill --json
}

Write-Host "MOS3 validation artifacts: $WorkDir"
