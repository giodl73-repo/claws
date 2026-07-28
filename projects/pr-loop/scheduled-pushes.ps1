$ErrorActionPreference = 'Stop'

$repository = 'microsoft.ghe.com/bic/lobster'
$logPath = 'C:\src\claws-hapi\.craft\pr-loop-scheduled-pushes.log'

$slots = @(
    @{
        At = [DateTimeOffset]::Parse('2026-07-26T09:22:00-07:00')
        Pr = 5491
        Worktree = 'C:\src\lobster-scout-exec-observability'
        Branch = 'agent/scout-exec-observability-safety'
        LocalHead = '7e079446af62f7bf4889adff2a807f8931f00e41'
        RemoteHead = '37359b5e6b5c7898322a6a8bcce38584578e3f4f'
        Body = 'C:\src\claws-hapi\projects\pr-loop\pr-5491-body.md'
        ThreadIds = @('PRRT_kwDOAA_wH84DFhIS', 'PRRT_kwDOAA_wH84DFhLz', 'PRRT_kwDOAA_wH84DFhL4')
    },
    @{
        At = [DateTimeOffset]::Parse('2026-07-26T09:52:00-07:00')
        Pr = 5057
        Worktree = 'C:\src\lobster-plugin-acquisition-contract'
        Branch = 'user/giodl/scout-plugin-acquisition-contract'
        LocalHead = '96280c9df3a363bdca9a8b02c652c7725230e034'
        RemoteHead = '0f946e99624ef766f999e2502418c4072a996d8f'
        Body = 'C:\src\claws-hapi\projects\pr-loop\pr-5057-body.md'
        ThreadIds = @()
    },
    @{
        At = [DateTimeOffset]::Parse('2026-07-26T10:22:00-07:00')
        Pr = 5424
        Worktree = 'C:\src\lobster-feeds-marketplace-default-on'
        Branch = 'user/giodl/scout-feeds-marketplace-default-on'
        LocalHead = 'a5d80c61b3e0aa181e7bc1f5066074863cd7586e'
        RemoteHead = 'db72f05267603eef0dc9e7869a86792d93c3aed8'
        Body = 'C:\src\claws-hapi\projects\pr-loop\pr-5424-body.md'
        ThreadIds = @()
    },
    @{
        At = [DateTimeOffset]::Parse('2026-07-26T10:52:00-07:00')
        Pr = 5460
        Worktree = 'C:\src\lobster-offline-node-remediation'
        Branch = 'user/giodl/scout-offline-node-remediation'
        LocalHead = '3e00858f98269938fcc7f81ddd1311b6a58b4337'
        RemoteHead = '865df0ade7c46fa468bc3573913f85c67fa06bc2'
        Body = 'C:\src\claws-hapi\projects\pr-loop\pr-5460-body.md'
        ThreadIds = @()
    },
    @{
        At = [DateTimeOffset]::Parse('2026-07-26T11:22:00-07:00')
        Pr = 5505
        Worktree = 'C:\src\lobster-workspace-files'
        Branch = 'user/giodl/scout-workspace-files'
        LocalHead = 'ac68f8834124be65a9260a5a20d5990993346677'
        RemoteHead = '3cc4bb652c9988026f14456dba17fefc929ac512'
        Body = 'C:\src\claws-hapi\projects\pr-loop\pr-5505-body.md'
        ThreadIds = @()
    }
)

function Write-ScheduleLog([string]$Message) {
    $timestamp = [DateTimeOffset]::Now.ToString('o')
    Add-Content -LiteralPath $logPath -Value "$timestamp $Message"
}

foreach ($slot in $slots) {
    while ([DateTimeOffset]::Now -lt $slot.At) {
        $remaining = [Math]::Ceiling(($slot.At - [DateTimeOffset]::Now).TotalSeconds)
        Start-Sleep -Seconds ([Math]::Min(30, [Math]::Max(1, $remaining)))
    }

    try {
        $dirty = @(& git -C $slot.Worktree status --porcelain)
        if ($LASTEXITCODE -ne 0 -or $dirty.Count -ne 0) {
            throw "worktree is not clean"
        }

        $localHead = (& git -C $slot.Worktree rev-parse HEAD).Trim()
        if ($LASTEXITCODE -ne 0 -or $localHead -ne $slot.LocalHead) {
            throw "local head changed: expected $($slot.LocalHead), got $localHead"
        }

        $remoteLine = @(& git -C $slot.Worktree ls-remote origin "refs/heads/$($slot.Branch)")
        if ($LASTEXITCODE -ne 0 -or $remoteLine.Count -ne 1) {
            throw "could not resolve exact remote branch head"
        }
        $remoteHead = ($remoteLine[0] -split "`t")[0]
        if ($remoteHead -ne $slot.RemoteHead) {
            throw "remote head changed: expected $($slot.RemoteHead), got $remoteHead"
        }

        $livePrHead = (& gh pr view $slot.Pr -R $repository --json headRefOid --jq .headRefOid).Trim()
        if ($LASTEXITCODE -ne 0 -or $livePrHead -ne $slot.RemoteHead) {
            throw "PR head changed: expected $($slot.RemoteHead), got $livePrHead"
        }

        & git -C $slot.Worktree push origin "HEAD:$($slot.Branch)"
        if ($LASTEXITCODE -ne 0) {
            throw "git push failed"
        }

        $publishedHead = (& gh pr view $slot.Pr -R $repository --json headRefOid --jq .headRefOid).Trim()
        if ($LASTEXITCODE -ne 0 -or $publishedHead -ne $slot.LocalHead) {
            throw "published PR head did not converge to expected local head"
        }

        & gh pr edit $slot.Pr -R $repository --body-file $slot.Body
        if ($LASTEXITCODE -ne 0) {
            throw "PR body update failed"
        }

        $comment = "Published prepared exact head ``$($slot.LocalHead.Substring(0, 10))`` on the controlled 30-minute cadence. The PR body now carries exact-head scope and validation evidence. @Galin-Iliev @harryf please re-review this head. Natural CI only; no ADO run was manually queued."
        & gh pr comment $slot.Pr -R $repository --body $comment | Out-Null
        if ($LASTEXITCODE -ne 0) {
            throw "PR summary comment failed"
        }

        foreach ($threadId in $slot.ThreadIds) {
            $mutation = "mutation { resolveReviewThread(input:{threadId:`"$threadId`"}) { thread { isResolved } } }"
            & gh api graphql --hostname microsoft.ghe.com -f "query=$mutation" | Out-Null
            if ($LASTEXITCODE -ne 0) {
                throw "review thread resolution failed for $threadId"
            }
        }

        Write-ScheduleLog "PUSHED PR #$($slot.Pr) $($slot.LocalHead)"
    }
    catch {
        Write-ScheduleLog "SKIPPED PR #$($slot.Pr): $($_.Exception.Message)"
    }
}
