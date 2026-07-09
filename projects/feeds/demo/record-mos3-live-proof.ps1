param(
  [ValidateSet("msit", "prod", "msitprv")]
  [string]$Environment = "msit",
  [string]$Search = "skill",
  [switch]$Publish,
  [string]$ClientId = "7acd1687-fdfb-43f1-814d-f3e8bb8d604a",
  [string]$OutDir = ""
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

if ([string]::IsNullOrWhiteSpace($OutDir)) {
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $OutDir = Join-Path $env:TEMP "lobster-feeds-live-proof-$stamp"
}

$OutDir = [System.IO.Path]::GetFullPath($OutDir)
$marketplaceDir = Join-Path $OutDir "marketplace"
$personalDir = Join-Path $OutDir "personal"
$transcript = Join-Path $OutDir "live-proof.transcript.txt"
$scout = "C:\src\lobster-feeds-validation\src\lobster_runtime\target\debug\scout.exe"

New-Item -ItemType Directory -Force -Path $marketplaceDir, $personalDir | Out-Null

$feedsRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$marketplaceScript = Join-Path $feedsRoot "validate-mos3-marketplace.ps1"
$liveScript = Join-Path $feedsRoot "validate-mos3-live.ps1"
$baseUrl = Get-Mos3BaseUrl $Environment
$scope = "$baseUrl/.default"
$tokenEnvName = "SCOUT_MOS3_LIVE_TOKEN"

function Set-OpenSslEnv {
  $OpenSslDir = "C:\Program Files\OpenSSL-Win64"
  if (Test-Path -LiteralPath $OpenSslDir) {
    $env:OPENSSL_DIR = $OpenSslDir
    $env:OPENSSL_LIB_DIR = Join-Path $OpenSslDir "lib\VC\x64\MD"
    $env:OPENSSL_INCLUDE_DIR = Join-Path $OpenSslDir "include"
    $env:PATH = "$(Join-Path $OpenSslDir "bin");$env:PATH"
  }
}

function Ensure-Scout {
  if (Test-Path -LiteralPath $scout) {
    return
  }

  Push-Location "C:\src\lobster-feeds-validation\src\lobster_runtime"
  try {
    cargo build --bin scout
  } finally {
    Pop-Location
  }
}

function Get-DeviceCodeToken {
  param(
    [string]$TenantId,
    [string]$ClientId,
    [string]$Scope
  )

  $deviceCodeUri = "https://login.microsoftonline.com/$TenantId/oauth2/v2.0/devicecode"
  $tokenUri = "https://login.microsoftonline.com/$TenantId/oauth2/v2.0/token"
  $requestedScope = "$Scope offline_access openid profile"
  $device = Invoke-RestMethod -Method Post -Uri $deviceCodeUri -Body @{
    client_id = $ClientId
    scope = $requestedScope
  }

  Write-Host $device.message
  $deadline = (Get-Date).AddSeconds([int]$device.expires_in)
  $interval = 5
  if ($null -ne $device.interval) {
    $interval = [int]$device.interval
  }
  $interval = [Math]::Max(1, $interval)

  while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds $interval
    try {
      return Invoke-RestMethod -Method Post -Uri $tokenUri -Body @{
        grant_type = "urn:ietf:params:oauth:grant-type:device_code"
        client_id = $ClientId
        device_code = $device.device_code
      }
    } catch {
      $rawBody = $null
      if ($_.ErrorDetails -and -not [string]::IsNullOrWhiteSpace($_.ErrorDetails.Message)) {
        $rawBody = $_.ErrorDetails.Message
      } elseif ($_.Exception.Response) {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $rawBody = $reader.ReadToEnd()
      }
      if ([string]::IsNullOrWhiteSpace($rawBody)) {
        throw
      }
      $body = $rawBody | ConvertFrom-Json
      if ($body.error -eq "authorization_pending") {
        continue
      }
      if ($body.error -eq "slow_down") {
        $interval += 5
        continue
      }
      $detail = $body.error
      if ($null -ne $body.error_description) {
        $detail = $body.error_description
      }
      throw "Device-code auth failed: $detail"
    }
  }

  throw "Device-code auth expired before login completed."
}

Set-OpenSslEnv
Ensure-Scout

Start-Transcript -Path $transcript -Force | Out-Null
try {
  Write-Host "MOS3 live proof output: $OutDir"
  Write-Host "Environment: $Environment"
  Write-Host "Base URL: $baseUrl"
  Write-Host "Search: $Search"
  Write-Host ""
  Write-Host "Step 0: acquire MOS3 token with device-code auth"
  $token = Get-DeviceCodeToken `
    -TenantId "72f988bf-86f1-41af-91ab-2d7cd011db47" `
    -ClientId $ClientId `
    -Scope $scope
  Set-Item -Path "Env:$tokenEnvName" -Value $token.access_token
  Write-Host "Token acquired for $scope and stored in process env var $tokenEnvName."
  Write-Host ""
  Write-Host "Step 1: live MOS3 marketplace import and search"
  $marketplaceFeed = Join-Path $marketplaceDir "mos3-marketplace.feed.json"
  & $scout feed import mos3-marketplace `
    -Environment $Environment `
    --token-env $tokenEnvName `
    --out $marketplaceFeed
  & $scout feed verify $marketplaceFeed
  & $scout feed search $Search --feed $marketplaceFeed --type skill --source mos3 --json

  Write-Host ""
  Write-Host "Step 2: live MOS3 personal acquisitions import and search"
  $personalFeed = Join-Path $personalDir "mos3-root.feed.json"
  & $scout feed import mos3-live `
    --base-url $baseUrl `
    --token-env $tokenEnvName `
    --discover-environment `
    --out $personalFeed
  & $scout feed verify $personalFeed
  & $scout feed search $Search --feed $personalFeed --type skill --json

  if ($Publish) {
    Write-Host ""
    Write-Host "Step 3: live MOS3 personal publish and search"
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $skillPath = Join-Path $personalDir "SKILL.md"
    @"
---
name: scout-mos3-validation-$stamp
description: Temporary Scout MOS3 validation skill.
---

# Scout MOS3 Validation $stamp

This temporary skill validates Scout CLI publishing to MOS3.
"@ | Set-Content -LiteralPath $skillPath -Encoding utf8

    & $scout feed publish-mos3 `
      --base-url $baseUrl `
      --token-env $tokenEnvName `
      --skill $skillPath `
      --scope PersonalSource `
      --should-block false
    & $scout feed import mos3-live `
      --base-url $baseUrl `
      --token-env $tokenEnvName `
      --discover-environment `
      --out $personalFeed
    & $scout feed search "scout-mos3-validation" --feed $personalFeed --type skill --json
  } else {
    Write-Host ""
    Write-Host "Step 3 skipped: publish is disabled. Re-run with -Publish for write-path proof."
  }
} finally {
  Stop-Transcript | Out-Null
}

Write-Host ""
Write-Host "Recorded MOS3 live proof:"
Write-Host "  Transcript: $transcript"
Write-Host "  Marketplace artifacts: $marketplaceDir"
Write-Host "  Personal artifacts: $personalDir"
