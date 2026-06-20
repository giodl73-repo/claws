param(
    [string]$DemoRoot = (Join-Path $PSScriptRoot "demo-output"),
    [string]$TenantId = "contoso-demo",
    [int]$Port = 8787,
    [switch]$KeepServer
)

$ErrorActionPreference = "Stop"

function Get-Sha256Text {
    param([Parameter(Mandatory = $true)][AllowEmptyString()][string]$Text)

    $sha = [System.Security.Cryptography.SHA256]::Create()
    try {
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($Text.Trim().ToLowerInvariant())
        $hash = $sha.ComputeHash($bytes)
        return "sha256:" + ([System.BitConverter]::ToString($hash).Replace("-", "").ToLowerInvariant())
    }
    finally {
        $sha.Dispose()
    }
}

function Get-Sha256File {
    param([Parameter(Mandatory = $true)][string]$Path)

    $sha = [System.Security.Cryptography.SHA256]::Create()
    try {
        $stream = [System.IO.File]::OpenRead($Path)
        try {
            $hash = $sha.ComputeHash($stream)
            return "sha256:" + ([System.BitConverter]::ToString($hash).Replace("-", "").ToLowerInvariant())
        }
        finally {
            $stream.Dispose()
        }
    }
    finally {
        $sha.Dispose()
    }
}

function Get-DemoFeedHash {
    param([Parameter(Mandatory = $true)]$Feed)

    $parts = New-Object System.Collections.Generic.List[string]
    $parts.Add([string]$Feed.schemaVersion)
    $parts.Add([string]$Feed.feedId)
    $parts.Add([string]$Feed.scope.kind)
    $parts.Add([string]$Feed.scope.tenantIdHash)

    foreach ($entry in @($Feed.entries | Sort-Object id, version)) {
        $parts.Add([string]$entry.id)
        $parts.Add([string]$entry.kind)
        $parts.Add([string]$entry.version)
        $parts.Add([string]$entry.source.feed)
        $parts.Add([string]$entry.artifact.sha256)
        $parts.Add([string]$entry.governance.state)
        $parts.Add([string]$entry.governance.updatePolicy)
    }

    return Get-Sha256Text ($parts -join "|")
}

function New-SkillPackage {
    param(
        [Parameter(Mandatory = $true)][string]$Root,
        [Parameter(Mandatory = $true)][string]$Id,
        [Parameter(Mandatory = $true)][string]$Title,
        [Parameter(Mandatory = $true)][string]$Body
    )

    $dir = Join-Path $Root $Id
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    $skillPath = Join-Path $dir "SKILL.md"
    Set-Content -LiteralPath $skillPath -Encoding UTF8 -Value @"
# $Title

$Body
"@

    return [ordered]@{
        path = $dir
        sha256 = Get-Sha256File $skillPath
    }
}

function Write-Step {
    param([string]$Text)
    Write-Host ""
    Write-Host "== $Text ==" -ForegroundColor Cyan
}

function Invoke-DemoRequest {
    param(
        [Parameter(Mandatory = $true)][string]$Url,
        [Parameter(Mandatory = $true)][string]$Tenant
    )

    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -Headers @{ "X-Demo-Tenant" = $Tenant }
        return [ordered]@{
            status = [int]$response.StatusCode
            cacheControl = [string]$response.Headers["Cache-Control"]
            body = $response.Content
        }
    }
    catch {
        $status = 0
        $body = $_.Exception.Message
        if ($_.Exception.Response) {
            $status = [int]$_.Exception.Response.StatusCode
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            try {
                $body = $reader.ReadToEnd()
            }
            finally {
                $reader.Dispose()
            }
        }

        return [ordered]@{
            status = $status
            cacheControl = ""
            body = $body
        }
    }
}

$demoRootFull = [System.IO.Path]::GetFullPath($DemoRoot)
$scriptRootFull = [System.IO.Path]::GetFullPath($PSScriptRoot)
if ((Test-Path -LiteralPath $demoRootFull) -and $demoRootFull.StartsWith($scriptRootFull, [System.StringComparison]::OrdinalIgnoreCase)) {
    Remove-Item -LiteralPath $demoRootFull -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $demoRootFull | Out-Null
$packageRoot = Join-Path $demoRootFull "packages"
$feedRoot = Join-Path $demoRootFull "feeds"
$targetRoot = Join-Path $demoRootFull "openclaw-target"
New-Item -ItemType Directory -Force -Path $packageRoot, $feedRoot, $targetRoot | Out-Null

Write-Step "1. Build source contributions"
$excelPackage = New-SkillPackage -Root $packageRoot -Id "excel-review" -Title "Excel Review" -Body "Reviews workbook formulas, pivots, and stale references."
$sharePointPackage = New-SkillPackage -Root $packageRoot -Id "sharepoint-summary" -Title "SharePoint Summary" -Body "Summarizes SharePoint pages and policy notes."
$blockedPackage = New-SkillPackage -Root $packageRoot -Id "unreviewed-admin-script" -Title "Unreviewed Admin Script" -Body "This package stays blocked by tenant policy."

$sourceFeed = [ordered]@{
    schemaVersion = 1
    feedId = "clawhub-public-and-ms-curated"
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
    entries = @(
        [ordered]@{
            id = "clawhub.openclaw.excel-review"
            kind = "skill"
            version = "1.4.2"
            title = "Excel Review"
            source = [ordered]@{ feed = "clawhub.community"; publisher = "openclaw" }
            artifact = [ordered]@{ type = "file"; path = $excelPackage.path; sha256 = $excelPackage.sha256 }
        },
        [ordered]@{
            id = "microsoft.scout.sharepoint-summary"
            kind = "skill"
            version = "2.0.0"
            title = "SharePoint Summary"
            source = [ordered]@{ feed = "microsoft.curated"; publisher = "microsoft" }
            artifact = [ordered]@{ type = "file"; path = $sharePointPackage.path; sha256 = $sharePointPackage.sha256 }
        },
        [ordered]@{
            id = "clawhub.community.unreviewed-admin-script"
            kind = "skill"
            version = "0.9.0"
            title = "Unreviewed Admin Script"
            source = [ordered]@{ feed = "clawhub.community"; publisher = "unknown" }
            artifact = [ordered]@{ type = "file"; path = $blockedPackage.path; sha256 = $blockedPackage.sha256 }
        }
    )
}
$sourceFeedPath = Join-Path $feedRoot "source-contributions.json"
$sourceFeed | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $sourceFeedPath -Encoding UTF8
Write-Host "Source feed: $sourceFeedPath"
Write-Host "Source entries: $($sourceFeed.entries.Count)"

Write-Step "2. Compose tenant-approved effective feed"
$tenantHash = Get-Sha256Text $TenantId
$approvedFeed = [ordered]@{
    schemaVersion = 1
    feedId = "tenant-approved:$tenantHash"
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
    scope = [ordered]@{
        kind = "tenantApproved"
        tenantIdHash = $tenantHash
    }
    entries = @(
        [ordered]@{
            id = "clawhub.openclaw.excel-review"
            kind = "skill"
            version = "1.4.2"
            title = "Excel Review"
            source = [ordered]@{ feed = "clawhub.community"; publisher = "openclaw" }
            artifact = [ordered]@{ type = "file"; path = $excelPackage.path; sha256 = $excelPackage.sha256 }
            governance = [ordered]@{ state = "approved"; updatePolicy = "notify"; pinned = $false }
        },
        [ordered]@{
            id = "microsoft.scout.sharepoint-summary"
            kind = "skill"
            version = "2.0.0"
            title = "SharePoint Summary"
            source = [ordered]@{ feed = "microsoft.curated"; publisher = "microsoft" }
            artifact = [ordered]@{ type = "file"; path = $sharePointPackage.path; sha256 = $sharePointPackage.sha256 }
            governance = [ordered]@{ state = "approved"; updatePolicy = "pinned"; pinned = $true }
        }
    )
}
$approvedFeed.attestation = [ordered]@{
    type = "sha256"
    hash = Get-DemoFeedHash $approvedFeed
    generatedBy = "scout-feeds-vteam-demo"
}

$approvedFeedPath = Join-Path $feedRoot "tenant-approved.feed.json"
$approvedFeed | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $approvedFeedPath -Encoding UTF8

$badFeed = [ordered]@{
    schemaVersion = 1
    feedId = "tenant-approved-missing-scope"
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
    scope = [ordered]@{ kind = "tenantApproved" }
    entries = $approvedFeed.entries
}
$badFeed.attestation = [ordered]@{ type = "sha256"; hash = Get-DemoFeedHash $badFeed; generatedBy = "scout-feeds-vteam-demo" }
$badFeedPath = Join-Path $feedRoot "tenant-approved-missing-tenant-hash.feed.json"
$badFeed | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $badFeedPath -Encoding UTF8

Write-Host "Approved feed: $approvedFeedPath"
Write-Host "Tenant: $TenantId"
Write-Host "Tenant hash: $tenantHash"
Write-Host "Approved entries: $($approvedFeed.entries.Count)"
Write-Host "Blocked by policy: clawhub.community.unreviewed-admin-script"

Write-Step "3. Start local hosted approved-feed endpoint"
$job = Start-Job -ScriptBlock {
    param($Root, $Port)

    function Get-Sha256Text {
        param([Parameter(Mandatory = $true)][AllowEmptyString()][string]$Text)
        $sha = [System.Security.Cryptography.SHA256]::Create()
        try {
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($Text.Trim().ToLowerInvariant())
            $hash = $sha.ComputeHash($bytes)
            return "sha256:" + ([System.BitConverter]::ToString($hash).Replace("-", "").ToLowerInvariant())
        }
        finally {
            $sha.Dispose()
        }
    }

    function Get-DemoFeedHash {
        param([Parameter(Mandatory = $true)]$Feed)
        $parts = New-Object System.Collections.Generic.List[string]
        $parts.Add([string]$Feed.schemaVersion)
        $parts.Add([string]$Feed.feedId)
        $parts.Add([string]$Feed.scope.kind)
        $parts.Add([string]$Feed.scope.tenantIdHash)
        foreach ($entry in @($Feed.entries | Sort-Object id, version)) {
            $parts.Add([string]$entry.id)
            $parts.Add([string]$entry.kind)
            $parts.Add([string]$entry.version)
            $parts.Add([string]$entry.source.feed)
            $parts.Add([string]$entry.artifact.sha256)
            $parts.Add([string]$entry.governance.state)
            $parts.Add([string]$entry.governance.updatePolicy)
        }
        return Get-Sha256Text ($parts -join "|")
    }

    function Write-Response {
        param($Context, [int]$Status, [string]$Body, [string]$ContentType)
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($Body)
        $Context.Response.StatusCode = $Status
        $Context.Response.ContentType = $ContentType
        $Context.Response.Headers["Cache-Control"] = "no-store"
        $Context.Response.ContentLength64 = $bytes.Length
        $Context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
        $Context.Response.OutputStream.Close()
    }

    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://localhost:$Port/")
    $listener.Start()

    try {
        while ($listener.IsListening) {
            $ctx = $listener.GetContext()
            $path = $ctx.Request.Url.AbsolutePath
            if ($path -eq "/__stop") {
                Write-Response $ctx 200 "stopped" "text/plain"
                break
            }

            if ($path -ne "/v1/scout/feeds/approved.json") {
                Write-Response $ctx 404 "not found" "text/plain"
                continue
            }

            $feedFile = Join-Path $Root "feeds\tenant-approved.feed.json"
            if ($ctx.Request.QueryString["bad"] -eq "missing-scope") {
                $feedFile = Join-Path $Root "feeds\tenant-approved-missing-tenant-hash.feed.json"
            }

            $tenant = $ctx.Request.Headers["X-Demo-Tenant"]
            if ([string]::IsNullOrWhiteSpace($tenant)) {
                Write-Response $ctx 401 "missing tenant claim" "text/plain"
                continue
            }

            $feedJson = Get-Content -Raw -LiteralPath $feedFile
            $feed = $feedJson | ConvertFrom-Json
            $callerTenantHash = Get-Sha256Text $tenant
            if ($feed.scope.kind -ne "tenantApproved" -or [string]::IsNullOrWhiteSpace($feed.scope.tenantIdHash)) {
                Write-Response $ctx 403 "feed is missing tenant-approved scope" "text/plain"
                continue
            }

            if ($feed.scope.tenantIdHash -ne $callerTenantHash) {
                Write-Response $ctx 403 "tenant scope mismatch" "text/plain"
                continue
            }

            $expectedHash = Get-DemoFeedHash $feed
            if ($feed.attestation.type -ne "sha256" -or $feed.attestation.hash -ne $expectedHash) {
                Write-Response $ctx 403 "feed attestation failed" "text/plain"
                continue
            }

            Write-Response $ctx 200 $feedJson "application/json"
        }
    }
    finally {
        $listener.Stop()
        $listener.Close()
    }
} -ArgumentList $demoRootFull, $Port

Start-Sleep -Milliseconds 700
$url = "http://localhost:$Port/v1/scout/feeds/approved.json"
Write-Host "Endpoint: $url"

Write-Step "4. Fetch as the right tenant"
$ok = Invoke-DemoRequest -Url $url -Tenant $TenantId
Write-Host "HTTP status: $($ok.status)"
Write-Host "Cache-Control: $($ok.cacheControl)"
$fetchedFeed = $ok.body | ConvertFrom-Json
Write-Host "Fetched feed: $($fetchedFeed.feedId)"
Write-Host "Fetched entries: $($fetchedFeed.entries.Count)"

Write-Step "5. Prove wrong tenant and missing tenant scope fail closed"
$wrong = Invoke-DemoRequest -Url $url -Tenant "wrong-tenant"
Write-Host "Wrong tenant status: $($wrong.status)"
Write-Host "Wrong tenant body: $($wrong.body)"
$missingScope = Invoke-DemoRequest -Url "$url?bad=missing-scope" -Tenant $TenantId
Write-Host "Missing tenant scope status: $($missingScope.status)"
Write-Host "Missing tenant scope body: $($missingScope.body)"

Write-Step "6. Install approved skill into an OpenClaw-style target"
$entry = @($fetchedFeed.entries | Where-Object { $_.kind -eq "skill" -and $_.governance.state -eq "approved" })[0]
$installDir = Join-Path $targetRoot ("skills\" + $entry.id)
New-Item -ItemType Directory -Force -Path $installDir | Out-Null
Copy-Item -LiteralPath (Join-Path $entry.artifact.path "SKILL.md") -Destination (Join-Path $installDir "SKILL.md")
$provenance = [ordered]@{
    installedAt = (Get-Date).ToUniversalTime().ToString("o")
    feedId = $fetchedFeed.feedId
    feedAttestation = $fetchedFeed.attestation.hash
    entryId = $entry.id
    version = $entry.version
    tenantIdHash = $fetchedFeed.scope.tenantIdHash
    sourceFeed = $entry.source.feed
}
$provenance | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $installDir ".scout-feed-provenance.json") -Encoding UTF8
Write-Host "Installed: $installDir"
Write-Host "Target tree:"
Get-ChildItem -LiteralPath $targetRoot -Recurse | ForEach-Object {
    $relative = $_.FullName.Substring($targetRoot.Length).TrimStart("\")
    Write-Host "  $relative"
}

Write-Step "Demo files"
Write-Host "Source feed: $sourceFeedPath"
Write-Host "Approved feed: $approvedFeedPath"
Write-Host "OpenClaw target: $targetRoot"

if ($KeepServer) {
    Write-Host ""
    Write-Host "Server kept running. Stop it with:"
    Write-Host "  Invoke-WebRequest -UseBasicParsing http://localhost:$Port/__stop"
    Write-Host "  Stop-Job $($job.Id); Remove-Job $($job.Id)"
}
else {
    try {
        Invoke-WebRequest -UseBasicParsing "http://localhost:$Port/__stop" | Out-Null
    }
    catch {
    }
    Wait-Job $job -Timeout 5 | Out-Null
    Remove-Job $job -Force
}

Write-Host ""
Write-Host "Meeting command:"
Write-Host "  powershell -ExecutionPolicy Bypass -File `"$PSCommandPath`""
