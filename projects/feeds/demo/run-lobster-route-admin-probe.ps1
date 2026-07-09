param(
    [ValidateSet("prod-301eus", "prod-302us")]
    [string] $Environment = "prod-301eus",

    [int] $WaitSeconds = 300,

    [string] $EdgeProfile,

    [string] $OutDir
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
$probe = Join-Path $PSScriptRoot "probe-lobster-route-admin.mjs"

if (-not (Test-Path -LiteralPath $probe)) {
    throw "Probe script not found: $probe"
}

$env:LOBSTER_PROBE_ENV = $Environment
$env:LOBSTER_PROBE_WAIT_MS = [string]($WaitSeconds * 1000)

if ($EdgeProfile) {
    $env:LOBSTER_PROBE_EDGE_PROFILE = $EdgeProfile
} else {
    Remove-Item Env:\LOBSTER_PROBE_EDGE_PROFILE -ErrorAction SilentlyContinue
}

if ($OutDir) {
    $env:LOBSTER_PROBE_OUT_DIR = $OutDir
} else {
    Remove-Item Env:\LOBSTER_PROBE_OUT_DIR -ErrorAction SilentlyContinue
}

Push-Location $repoRoot
try {
    node $probe
} finally {
    Pop-Location
}
