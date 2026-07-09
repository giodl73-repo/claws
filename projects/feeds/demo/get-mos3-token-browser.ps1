param(
  [ValidateSet("msit", "prod", "msitprv")]
  [string]$Environment = "msit",
  [string]$Search = "skill",
  [string]$TenantId = "72f988bf-86f1-41af-91ab-2d7cd011db47",
  [string]$ClientId = "7acd1687-fdfb-43f1-814d-f3e8bb8d604a",
  [int]$Port = 38473,
  [string]$TokenEnvName = "SCOUT_MOS3_LIVE_TOKEN",
  [string]$OutDir = "",
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

function New-Base64UrlRandom {
  param([int]$ByteCount)

  $bytes = New-Object byte[] $ByteCount
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try {
    $rng.GetBytes($bytes)
  } finally {
    $rng.Dispose()
  }
  return [Convert]::ToBase64String($bytes).TrimEnd("=").Replace("+", "-").Replace("/", "_")
}

function ConvertTo-Base64UrlSha256 {
  param([string]$Value)

  $bytes = [System.Text.Encoding]::ASCII.GetBytes($Value)
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    $hash = $sha.ComputeHash($bytes)
  } finally {
    $sha.Dispose()
  }
  return [Convert]::ToBase64String($hash).TrimEnd("=").Replace("+", "-").Replace("/", "_")
}

function Find-Edge {
  $candidates = @(
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
  )
  foreach ($candidate in $candidates) {
    if (Test-Path -LiteralPath $candidate) {
      return $candidate
    }
  }
  return "msedge.exe"
}

function UrlEncode {
  param([string]$Value)

  return [System.Uri]::EscapeDataString($Value)
}

function Get-QueryParam {
  param(
    [string]$Query,
    [string]$Name
  )

  $trimmed = $Query.TrimStart("?")
  if ([string]::IsNullOrWhiteSpace($trimmed)) {
    return $null
  }

  foreach ($part in $trimmed.Split("&")) {
    if ([string]::IsNullOrWhiteSpace($part)) {
      continue
    }
    $pair = $part.Split("=", 2)
    $key = [System.Uri]::UnescapeDataString($pair[0].Replace("+", " "))
    if ($key -ne $Name) {
      continue
    }
    if ($pair.Length -lt 2) {
      return ""
    }
    return [System.Uri]::UnescapeDataString($pair[1].Replace("+", " "))
  }

  return $null
}

function Receive-AuthCode {
  param(
    [string]$RedirectUri,
    [string]$ExpectedState,
    [string]$AuthUrl
  )

  $listener = [System.Net.HttpListener]::new()
  $prefix = $RedirectUri.TrimEnd("/") + "/"
  $listener.Prefixes.Add($prefix)

  try {
    $listener.Start()
  } catch {
    throw "Could not listen on $prefix. Try a different -Port. Details: $($_.Exception.Message)"
  }

  try {
    $edge = Find-Edge
    Start-Process -FilePath $edge -ArgumentList @("--new-window", $AuthUrl) | Out-Null
    Write-Host "Opened Edge for MOS3 sign-in."
    Write-Host "Waiting for localhost callback on $prefix ..."

    $contextTask = $listener.GetContextAsync()
    if (-not $contextTask.Wait([TimeSpan]::FromMinutes(10))) {
      throw "Timed out waiting for auth callback."
    }

    $context = $contextTask.Result
    $request = $context.Request
    $code = Get-QueryParam -Query $request.Url.Query -Name "code"
    $state = Get-QueryParam -Query $request.Url.Query -Name "state"
    $errorCode = Get-QueryParam -Query $request.Url.Query -Name "error"
    $errorDescription = Get-QueryParam -Query $request.Url.Query -Name "error_description"

    $responseText = if ($code -and $state -eq $ExpectedState) {
      "MOS3 token acquired. You can close this browser tab."
    } else {
      "MOS3 sign-in did not complete. Return to the terminal for details."
    }
    $responseBytes = [System.Text.Encoding]::UTF8.GetBytes($responseText)
    $context.Response.ContentType = "text/plain; charset=utf-8"
    $context.Response.ContentLength64 = $responseBytes.Length
    $context.Response.OutputStream.Write($responseBytes, 0, $responseBytes.Length)
    $context.Response.OutputStream.Close()

    if ($errorCode) {
      throw "Auth callback returned error ${errorCode}: $errorDescription"
    }
    if (-not $code) {
      throw "Auth callback did not include an authorization code."
    }
    if ($state -ne $ExpectedState) {
      throw "Auth callback state mismatch."
    }
    return $code
  } finally {
    $listener.Stop()
    $listener.Close()
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
  $OutDir = Join-Path $env:TEMP "mos3-browser-token-$stamp"
}
$OutDir = [System.IO.Path]::GetFullPath($OutDir)
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$baseUrl = Get-Mos3BaseUrl $Environment
$scope = "$baseUrl/.default offline_access openid profile"
$redirectUri = "http://localhost:$Port/callback"
$authorizeUri = "https://login.microsoftonline.com/$TenantId/oauth2/v2.0/authorize"
$tokenUri = "https://login.microsoftonline.com/$TenantId/oauth2/v2.0/token"
$state = New-Base64UrlRandom -ByteCount 24
$codeVerifier = New-Base64UrlRandom -ByteCount 64
$codeChallenge = ConvertTo-Base64UrlSha256 $codeVerifier

$authUrl = $authorizeUri + "?" + `
  "client_id=$(UrlEncode $ClientId)" + `
  "&response_type=code" + `
  "&redirect_uri=$(UrlEncode $redirectUri)" + `
  "&response_mode=query" + `
  "&scope=$(UrlEncode $scope)" + `
  "&state=$(UrlEncode $state)" + `
  "&code_challenge=$(UrlEncode $codeChallenge)" + `
  "&code_challenge_method=S256" + `
  "&prompt=select_account"

Write-Host "Environment: $Environment"
Write-Host "MOS3 base URL: $baseUrl"
Write-Host "Scope: $scope"
Write-Host "Redirect URI: $redirectUri"

$code = Receive-AuthCode -RedirectUri $redirectUri -ExpectedState $state -AuthUrl $authUrl

$token = Invoke-RestMethod -Method Post -Uri $tokenUri -Body @{
  client_id = $ClientId
  grant_type = "authorization_code"
  code = $code
  redirect_uri = $redirectUri
  code_verifier = $codeVerifier
  scope = $scope
}

Set-Item -Path "Env:$TokenEnvName" -Value $token.access_token
$tokenPath = Join-Path $OutDir "$TokenEnvName.txt"
Set-Content -LiteralPath $tokenPath -Value $token.access_token -NoNewline -Encoding ascii

Write-Host ""
Write-Host "MOS3 access token acquired."
Write-Host "Token env var set in this PowerShell process: $TokenEnvName"
Write-Host "Token file: $tokenPath"
Write-Host ""
Write-Host "To use it from another PowerShell window:"
Write-Host "`$env:$TokenEnvName = Get-Content -Raw `"$tokenPath`""

if ($RunMarketplaceProof) {
  Set-OpenSslEnv
  $scout = "C:\src\lobster-feeds-validation\src\lobster_runtime\target\debug\scout.exe"
  if (-not (Test-Path -LiteralPath $scout)) {
    Push-Location "C:\src\lobster-feeds-validation\src\lobster_runtime"
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
}
