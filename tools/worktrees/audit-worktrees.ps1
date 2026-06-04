param(
  [string[]]$Roots = @("C:\src", "C:\tmp"),
  [string]$Output = "projects\prs\worktrees.md",
  [int]$StaleDays = 21,
  [switch]$NoWrite
)

$ErrorActionPreference = "Stop"

function Get-GitValue {
  param(
    [string]$Repo,
    [string[]]$GitArgs
  )

  $previous = Get-Location
  try {
    Set-Location -LiteralPath $Repo
    $result = & git @GitArgs 2>$null
    if ($LASTEXITCODE -ne 0) {
      return $null
    }
    return ($result -join "`n").Trim()
  } finally {
    Set-Location $previous
  }
}

function Get-RemotePrUrl {
  param(
    [string]$Repo,
    [string]$Branch
  )

  if (-not $Branch -or $Branch -eq "(detached)") {
    return ""
  }

  $remoteNames = @("origin", "openclaw", "giodl73-repo", "gim-home", "claws")
  foreach ($remote in $remoteNames) {
    $ref = Get-GitValue -Repo $Repo -GitArgs @("config", "--get", "branch.$Branch.remote")
    if (-not $ref) {
      $ref = $remote
    }

    $url = Get-GitValue -Repo $Repo -GitArgs @("config", "--get", "remote.$ref.url")
    if (-not $url) {
      continue
    }

    if ($url -match "github\.com[:/](?<owner>[^/]+)/(?<name>[^/.]+)(\.git)?$") {
      $owner = $Matches["owner"]
      $name = $Matches["name"]
      return "https://github.com/$owner/$name/pull/head/$Branch"
    }
    if ($url -match "microsoft\.ghe\.com[:/](?<owner>[^/]+)/(?<name>[^/.]+)(\.git)?$") {
      $owner = $Matches["owner"]
      $name = $Matches["name"]
      return "https://microsoft.ghe.com/$owner/$name/pull/head/$Branch"
    }
  }

  return ""
}

function Classify-Worktree {
  param(
    [bool]$Dirty,
    [datetime]$LastCommit,
    [string]$Branch
  )

  $ageDays = [math]::Floor(((Get-Date).ToUniversalTime() - $LastCommit.ToUniversalTime()).TotalDays)
  if ($Dirty) {
    return "active-dirty"
  }
  if ($Branch -eq "main" -or $Branch -eq "master") {
    return "base"
  }
  if ($ageDays -ge $StaleDays) {
    return "stale-review"
  }
  return "active-clean"
}

$repos = @()

foreach ($root in $Roots) {
  if (-not (Test-Path -LiteralPath $root)) {
    continue
  }

  $candidates = Get-ChildItem -LiteralPath $root -Directory -Force |
    Where-Object {
      $_.Name -match "openclaw|lobster|claws-hapi|claws" -and
      (Test-Path -LiteralPath (Join-Path $_.FullName ".git"))
    }

  foreach ($candidate in $candidates) {
    $repo = $candidate.FullName
    $branch = Get-GitValue -Repo $repo -GitArgs @("branch", "--show-current")
    if (-not $branch) {
      $branch = "(detached)"
    }

    $sha = Get-GitValue -Repo $repo -GitArgs @("rev-parse", "--short=10", "HEAD")
    $subject = Get-GitValue -Repo $repo -GitArgs @("log", "-1", "--format=%s")
    $dateText = Get-GitValue -Repo $repo -GitArgs @("log", "-1", "--format=%cI")
    if (-not $sha -or -not $dateText) {
      continue
    }

    $status = Get-GitValue -Repo $repo -GitArgs @("status", "--porcelain")
    $dirty = [bool]$status
    try {
      $lastCommit = [datetime]::Parse($dateText).ToUniversalTime()
    } catch {
      continue
    }

    $classification = Classify-Worktree -Dirty $dirty -LastCommit $lastCommit -Branch $branch
    $repos += [pscustomobject]@{
      Name = $candidate.Name
      Path = $repo
      Branch = $branch
      Sha = $sha
      LastCommit = $lastCommit.ToString("yyyy-MM-dd")
      Dirty = if ($dirty) { "yes" } else { "no" }
      Class = $classification
      Subject = $subject
      PrHint = Get-RemotePrUrl -Repo $repo -Branch $branch
    }
  }
}

$repos = $repos | Sort-Object Class, Name

$lines = @(
  "# Local Worktree Audit",
  "",
  "Generated: $((Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ"))",
  "",
  "Classification is conservative. Delete only after checking the branch or PR.",
  "",
  "| Class | Dirty | Last Commit | Name | Branch | SHA | Path |",
  "| --- | --- | --- | --- | --- | --- | --- |"
)

foreach ($repo in $repos) {
  $lines += "| {0} | {1} | {2} | {3} | ``{4}`` | ``{5}`` | ``{6}`` |" -f `
    $repo.Class,
    $repo.Dirty,
    $repo.LastCommit,
    $repo.Name,
    $repo.Branch,
    $repo.Sha,
    $repo.Path
}

$lines += @(
  "",
  "## Delete Candidate Review",
  "",
  "Start with `stale-review` rows that are clean and whose PR is merged or closed.",
  "Use `git worktree remove <path>` only after confirming no unpushed work remains.",
  "",
  "## PR Hints",
  ""
)

foreach ($repo in $repos | Where-Object { $_.PrHint }) {
  $lines += "- $($repo.Name): $($repo.PrHint)"
}

if (-not $NoWrite) {
  $outputPath = Join-Path (Get-Location) $Output
  $outputDir = Split-Path -Parent $outputPath
  New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
  Set-Content -LiteralPath $outputPath -Value $lines -Encoding UTF8
  Write-Host "Wrote $Output"
}

$repos | Format-Table Class, Dirty, LastCommit, Name, Branch, Sha -AutoSize
