param(
  [string[]]$Repos = @("openclaw/openclaw", "lobster/lobster", "lobster/lobster-docs"),
  [string]$Author = "@me",
  [int]$FailureLimit = 8
)

$ErrorActionPreference = "Stop"

foreach ($repo in $Repos) {
  Write-Output ""
  Write-Output "== $repo =="

  $json = gh pr list `
    --repo $repo `
    --author $Author `
    --state open `
    --limit 50 `
    --json number,title,url,isDraft,mergeStateStatus,reviewDecision,headRefName,updatedAt

  $prs = $json | ConvertFrom-Json
  if (-not $prs -or $prs.Count -eq 0) {
    Write-Output "No open PRs."
    continue
  }

  foreach ($pr in $prs) {
    $checksJson = gh pr checks $pr.number --repo $repo --json name,state,bucket,link,startedAt,completedAt
    $checks = @($checksJson | ConvertFrom-Json)
    $failures = @($checks | Where-Object { $_.bucket -eq "fail" })
    $pending = @($checks | Where-Object { $_.bucket -eq "pending" })
    $draft = if ($pr.isDraft) { "draft" } else { "ready" }
    $review = if ($pr.reviewDecision) { $pr.reviewDecision } else { "no-review-decision" }

    Write-Output ("#{0} [{1}] {2} | {3} | {4} | checks: {5} failing, {6} pending" -f `
      $pr.number, $draft, $pr.title, $pr.mergeStateStatus, $review, $failures.Count, $pending.Count)
    Write-Output ("  {0}" -f $pr.url)

    foreach ($failure in $failures | Select-Object -First $FailureLimit) {
      Write-Output ("  FAIL: {0} ({1})" -f $failure.name, $failure.link)
    }
    if ($failures.Count -gt $FailureLimit) {
      Write-Output ("  ... {0} more failures" -f ($failures.Count - $FailureLimit))
    }
  }
}

