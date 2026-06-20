param(
    [ValidateSet("msit", "prod", "msitprv")]
    [string]$Environment = "msit",
    [string]$OutDir = (Join-Path $PSScriptRoot "mos3-personal-output"),
    [string]$Query = "",
    [string]$TokenFile = "",
    [switch]$NoInteractive,
    [switch]$UseAzureCliToken,
    [switch]$ShowMarketplace,
    [switch]$OpenOutput
)

$ErrorActionPreference = "Stop"

function Get-Mos3Environment {
    param([string]$Name)

    switch ($Name) {
        "msit" {
            return [ordered]@{
                BaseUrl = "https://titles.msit.mos.microsoft.com"
                Scope = "https://titles.msit.mos.microsoft.com/.default"
            }
        }
        "msitprv" {
            return [ordered]@{
                BaseUrl = "https://titles.msitprv.mos.microsoft.com"
                Scope = "https://titles.msitprv.mos.microsoft.com/.default"
            }
        }
        "prod" {
            return [ordered]@{
                BaseUrl = "https://titles.prod.mos.microsoft.com"
                Scope = "https://titles.prod.mos.microsoft.com/.default"
            }
        }
    }
}

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

function Get-FirstProperty {
    param(
        [Parameter(Mandatory = $true)]$Object,
        [Parameter(Mandatory = $true)][string[]]$Names
    )

    foreach ($name in $Names) {
        if ($null -ne $Object.PSObject.Properties[$name] -and $null -ne $Object.$name) {
            return $Object.$name
        }
    }
    return $null
}

function Get-TitleDefinition {
    param($Acquisition)
    return Get-FirstProperty $Acquisition @("titleDefinition", "TitleDefinition")
}

function Get-ElementDefinitions {
    param($TitleDefinition)
    if ($null -eq $TitleDefinition) {
        return $null
    }
    return Get-FirstProperty $TitleDefinition @("elementDefinitions", "ElementDefinitions")
}

function Get-ElementArray {
    param(
        $ElementDefinitions,
        [string[]]$Names
    )
    if ($null -eq $ElementDefinitions) {
        return @()
    }
    $value = Get-FirstProperty $ElementDefinitions $Names
    if ($null -eq $value) {
        return @()
    }
    return @($value)
}

function Add-PersonalEntry {
    param(
        [System.Collections.Generic.List[object]]$Entries,
        [string]$Kind,
        $Acquisition,
        $TitleDefinition,
        $Element
    )

    $titleId = Get-FirstProperty $Acquisition @("titleId", "TitleId")
    if ([string]::IsNullOrWhiteSpace($titleId)) {
        $titleId = Get-FirstProperty $TitleDefinition @("titleId", "TitleId", "id")
    }

    $elementId = Get-FirstProperty $Element @("id", "Id", "name", "folder")
    if ([string]::IsNullOrWhiteSpace($elementId)) {
        $elementId = $titleId
    }

    $displayName = Get-FirstProperty $Element @("displayName", "DisplayName", "name")
    if ([string]::IsNullOrWhiteSpace($displayName)) {
        $displayName = Get-FirstProperty $TitleDefinition @("name", "displayName", "shortDescription")
    }

    $description = Get-FirstProperty $Element @("description", "Description", "shortDescription")
    if ([string]::IsNullOrWhiteSpace($description)) {
        $description = Get-FirstProperty $TitleDefinition @("shortDescription", "description")
    }

    $version = Get-FirstProperty $TitleDefinition @("version", "manifestVersion", "Version")
    if ([string]::IsNullOrWhiteSpace($version)) {
        $version = Get-FirstProperty $Acquisition @("version", "Version")
    }
    if ([string]::IsNullOrWhiteSpace($version)) {
        $version = "0.0.0"
    }

    $publisher = Get-FirstProperty $TitleDefinition @("developerName", "publisherName", "DeveloperName")
    $acquisitionState = Get-FirstProperty $Acquisition @("acquisitionState", "AcquisitionState")
    $acquisitionContext = Get-FirstProperty $Acquisition @("acquisitionContext", "AcquisitionContext")
    $publicSkillPath = $null
    if ($Kind -eq "skill") {
        $microsoftMatter = Get-FirstProperty $Element @("microsoftmatter", "microsoftMatter")
        if ($null -ne $microsoftMatter) {
            $publicSkillPath = Get-FirstProperty $microsoftMatter @("public_skill_path", "publicSkillPath")
        }
        if ([string]::IsNullOrWhiteSpace($publicSkillPath)) {
            $publicSkillPath = Get-FirstProperty $Element @("public_skill_path", "publicSkillPath")
        }
    }

    $metadata = [ordered]@{
        "mos3.titleId" = [string]$titleId
        "mos3.acquisitionState" = [string]$acquisitionState
        "mos3.acquisitionContext" = [string]$acquisitionContext
    }
    if (-not [string]::IsNullOrWhiteSpace($publicSkillPath)) {
        $metadata["mos3.publicSkillPath"] = [string]$publicSkillPath
    }

    $Entries.Add([ordered]@{
        id = "mos3.$Kind.$elementId"
        kind = $Kind
        version = [string]$version
        title = [string]$displayName
        description = [string]$description
        publisher = [string]$publisher
        source = [ordered]@{
            registry = "mos3"
            package = [string]$titleId
        }
        metadata = $metadata
    })
}

function Write-Step {
    param([string]$Text)
    Write-Host ""
    Write-Host "== $Text ==" -ForegroundColor Cyan
}

function Get-Mos3Token {
    param(
        [Parameter(Mandatory = $true)][string]$BaseUrl,
        [Parameter(Mandatory = $true)][string]$Scope,
        [string]$TokenFile,
        [switch]$NoInteractive,
        [switch]$UseAzureCliToken
    )

    if (-not [string]::IsNullOrWhiteSpace($env:MOS3_TOKEN)) {
        Write-Host "Using token from MOS3_TOKEN."
        return $env:MOS3_TOKEN.Trim()
    }

    if (-not [string]::IsNullOrWhiteSpace($TokenFile) -and (Test-Path -LiteralPath $TokenFile)) {
        Write-Host "Using token from $TokenFile."
        return (Get-Content -Raw -LiteralPath $TokenFile).Trim()
    }

    if ($UseAzureCliToken) {
        Write-Host "Using Azure CLI token path."
        return (az account get-access-token --scope $Scope --query accessToken -o tsv).Trim()
    }

    $helper = "C:\src\aether\scripts\msal_mos3_token_server.py"
    if (-not (Test-Path -LiteralPath $helper)) {
        throw "Aether MOS3 token helper not found at $helper. Set MOS3_TOKEN or pass -TokenFile."
    }

    New-Item -ItemType Directory -Force -Path (Join-Path $HOME ".fx\account") | Out-Null
    Write-Host "Using Aether MOS3 token helper. This may open a browser once if the local MSAL cache is not primed."
    $args = @($helper, "--once", "--resource", $BaseUrl)
    if ($NoInteractive) {
        $args += "--no-interactive"
    }
    $tokenLog = Join-Path $env:TEMP "mos3-token-helper.log"
    $tokenOut = Join-Path $env:TEMP "mos3-token-helper.out"
    if (Test-Path -LiteralPath $tokenLog) {
        Remove-Item -LiteralPath $tokenLog -Force
    }
    if (Test-Path -LiteralPath $tokenOut) {
        Remove-Item -LiteralPath $tokenOut -Force
    }
    $process = Start-Process -FilePath "python" -ArgumentList $args -Wait -NoNewWindow -PassThru -RedirectStandardOutput $tokenOut -RedirectStandardError $tokenLog
    $rawToken = if (Test-Path -LiteralPath $tokenOut) { Get-Content -Raw -LiteralPath $tokenOut } else { "" }
    $token = ([string]$rawToken).Trim()
    if ($process.ExitCode -ne 0 -or [string]::IsNullOrWhiteSpace($token)) {
        throw "Aether MOS3 token helper did not return a token. Run once without -NoInteractive to complete browser sign-in. Log: $tokenLog"
    }
    Write-Host "Token helper log: $tokenLog"
    return $token
}

$envInfo = Get-Mos3Environment $Environment
$baseUrl = $envInfo.BaseUrl
$scope = $envInfo.Scope
$endpoint = "$baseUrl/catalog/v1/users/acquisitions/get"

$outFull = [System.IO.Path]::GetFullPath($OutDir)
New-Item -ItemType Directory -Force -Path $outFull | Out-Null

Write-Step "1. Azure account"
$account = az account show --query "{name:name, tenantId:tenantId, user:user.name}" -o json | ConvertFrom-Json
Write-Host "Account: $($account.name)"
Write-Host "User: $($account.user)"
Write-Host "Tenant: $($account.tenantId)"

Write-Step "2. Acquire MOS3 token"
Write-Host "Environment: $Environment"
Write-Host "Scope: $scope"
$token = Get-Mos3Token -BaseUrl $baseUrl -Scope $scope -TokenFile $TokenFile -NoInteractive:$NoInteractive -UseAzureCliToken:$UseAzureCliToken
if ([string]::IsNullOrWhiteSpace($token)) {
    throw "Token acquisition returned an empty access token for $scope"
}
Write-Host "Token acquired. Token value is not printed."

Write-Step "3. Call MOS3 user acquisitions"
$body = [ordered]@{
    Filter = [ordered]@{
        supportedElementTypes = @("AgentSkills", "AgentConnectors")
    }
    SubstituteIds = @()
    ClientCacheEnabled = $false
} | ConvertTo-Json -Depth 10

$requestId = [guid]::NewGuid().ToString()
try {
    $response = Invoke-RestMethod `
        -Method Post `
        -Uri $endpoint `
        -Headers @{
            Authorization = "Bearer $token"
            Accept = "application/json"
            "Content-Type" = "application/json"
            "client-request-id" = $requestId
        } `
        -Body $body
}
catch {
    Write-Host "Request failed."
    Write-Host "Endpoint: $endpoint"
    Write-Host "client-request-id: $requestId"
    if ($_.Exception.Response) {
        Write-Host "HTTP status: $([int]$_.Exception.Response.StatusCode)"
    }
    throw
}

$rawPath = Join-Path $outFull "mos3-user-acquisitions.raw.json"
$response | ConvertTo-Json -Depth 80 | Set-Content -LiteralPath $rawPath -Encoding UTF8
Write-Host "Endpoint: $endpoint"
Write-Host "client-request-id: $requestId"
Write-Host "Raw response: $rawPath"

Write-Step "4. Flatten personal feed entries"
$acquisitions = @(Get-FirstProperty $response @("acquisitions", "Acquisitions"))
$entries = New-Object System.Collections.Generic.List[object]
foreach ($acquisition in $acquisitions) {
    $titleDefinition = Get-TitleDefinition $acquisition
    $elementDefinitions = Get-ElementDefinitions $titleDefinition
    foreach ($skill in Get-ElementArray $elementDefinitions @("AgentSkills", "agentSkills", "skills")) {
        Add-PersonalEntry -Entries $entries -Kind "skill" -Acquisition $acquisition -TitleDefinition $titleDefinition -Element $skill
    }
    foreach ($connector in Get-ElementArray $elementDefinitions @("AgentConnectors", "agentConnectors", "connectors")) {
        Add-PersonalEntry -Entries $entries -Kind "connector" -Acquisition $acquisition -TitleDefinition $titleDefinition -Element $connector
    }
}

$userHash = Get-Sha256Text ([string]$account.user)
$tenantHash = Get-Sha256Text ([string]$account.tenantId)
$entriesArray = @($entries.ToArray())
$personalFeed = [ordered]@{
    schemaVersion = 1
    feedId = "mos3-personal:${tenantHash}:${userHash}"
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
    scope = [ordered]@{
        kind = "personal"
        tenantIdHash = $tenantHash
        userIdHash = $userHash
    }
    source = [ordered]@{
        registry = "mos3"
        endpoint = "/catalog/v1/users/acquisitions/get"
        environment = $Environment
    }
    entries = $entriesArray
}
$feedHash = Get-Sha256Text (($personalFeed.entries | ConvertTo-Json -Depth 80) + $personalFeed.feedId)
$personalFeed.attestation = [ordered]@{
    type = "sha256"
    hash = $feedHash
    generatedBy = "mos3-personal-feed-demo"
}

$feedPath = Join-Path $outFull "mos3-personal.feed.json"
$personalFeed | ConvertTo-Json -Depth 80 | Set-Content -LiteralPath $feedPath -Encoding UTF8

$matches = @($entriesArray)
if (-not [string]::IsNullOrWhiteSpace($Query)) {
    $needle = $Query.ToLowerInvariant()
    $matches = @($entries | Where-Object {
        ([string]$_["id"]).ToLowerInvariant().Contains($needle) -or
        ([string]$_["title"]).ToLowerInvariant().Contains($needle) -or
        ([string]$_["description"]).ToLowerInvariant().Contains($needle) -or
        ([string]$_["publisher"]).ToLowerInvariant().Contains($needle)
    })
}

Write-Host "Acquisitions: $($acquisitions.Count)"
Write-Host "Personal feed entries: $($entriesArray.Count)"
Write-Host "Skills: $(($entriesArray | Where-Object { $_['kind'] -eq 'skill' }).Count)"
Write-Host "Connectors: $(($entriesArray | Where-Object { $_['kind'] -eq 'connector' }).Count)"
Write-Host "Personal feed: $feedPath"

Write-Step "5. Search results"
if ($matches.Count -eq 0) {
    if ([string]::IsNullOrWhiteSpace($Query)) {
        Write-Host "No personal MOS3 skills or connectors returned for this user."
    }
    else {
        Write-Host "No matches for query '$Query'."
    }
}
else {
    $matches |
        Select-Object @{Name="kind";Expression={$_["kind"]}},
            @{Name="title";Expression={$_["title"]}},
            @{Name="version";Expression={$_["version"]}},
            @{Name="publisher";Expression={$_["publisher"]}},
            @{Name="id";Expression={$_["id"]}} |
        Format-Table -AutoSize
}

if ($ShowMarketplace) {
    Write-Step "6. MOS3 marketplace browse source for tenant feeds"
    $marketplaceEndpoint = "$baseUrl/marketplace/v1/users/titles/query"
    $marketplaceBody = [ordered]@{
        filter = [ordered]@{
            supportedElementTypes = @("AgentSkills", "AgentConnectors")
            scopes = @("public", "tenant")
        }
        verbosity = "LaunchInfo"
    } | ConvertTo-Json -Depth 10
    $marketplaceRequestId = [guid]::NewGuid().ToString()
    try {
        $marketplace = Invoke-RestMethod `
            -Method Post `
            -Uri $marketplaceEndpoint `
            -Headers @{
                Authorization = "Bearer $token"
                Accept = "application/json"
                "Content-Type" = "application/json"
                "client-request-id" = $marketplaceRequestId
            } `
            -Body $marketplaceBody
    }
    catch {
        Write-Host "Marketplace request failed."
        Write-Host "Endpoint: $marketplaceEndpoint"
        Write-Host "client-request-id: $marketplaceRequestId"
        if ($_.Exception.Response) {
            Write-Host "HTTP status: $([int]$_.Exception.Response.StatusCode)"
        }
        throw
    }

    $marketplaceRawPath = Join-Path $outFull "mos3-marketplace.raw.json"
    $marketplace | ConvertTo-Json -Depth 80 | Set-Content -LiteralPath $marketplaceRawPath -Encoding UTF8
    $titles = @(Get-FirstProperty $marketplace @("titles", "Titles", "Agents", "agents"))
    $skillTitles = @($titles | Where-Object {
        $types = @()
        if ($null -ne $_.elementTypes) {
            $types += @($_.elementTypes)
        }
        if ($null -ne $_.elementSummaries) {
            $types += @($_.elementSummaries | ForEach-Object { $_.elementType })
        }
        $types -contains "AgentSkills" -or $types -contains "agentSkills"
    })
    $connectorTitles = @($titles | Where-Object {
        $types = @()
        if ($null -ne $_.elementTypes) {
            $types += @($_.elementTypes)
        }
        if ($null -ne $_.elementSummaries) {
            $types += @($_.elementSummaries | ForEach-Object { $_.elementType })
        }
        $types -contains "AgentConnectors" -or $types -contains "agentConnectors"
    })

    Write-Host "Endpoint: $marketplaceEndpoint"
    Write-Host "client-request-id: $marketplaceRequestId"
    Write-Host "Raw response: $marketplaceRawPath"
    Write-Host "Marketplace titles: $($titles.Count)"
    Write-Host "Titles with skills: $($skillTitles.Count)"
    Write-Host "Titles with connectors: $($connectorTitles.Count)"
    Write-Host ""
    Write-Host "Sample marketplace results for tenant feed composition:"
    $titles |
        Select-Object -First 10 `
            @{Name="name";Expression={$_.name}},
            @{Name="state";Expression={$_.acquisitionState}},
            @{Name="scope";Expression={$_.scope}},
            @{Name="blocked";Expression={$_.blockStatus}},
            @{Name="titleId";Expression={$_.titleId}} |
        Format-Table -AutoSize
}

if ($OpenOutput) {
    Invoke-Item $outFull
}

Write-Host ""
Write-Host "Meeting command:"
$meetingCommand = "powershell -ExecutionPolicy Bypass -File `"$PSCommandPath`" -Environment $Environment"
if ($ShowMarketplace) {
    $meetingCommand += " -ShowMarketplace"
}
Write-Host "  $meetingCommand"
