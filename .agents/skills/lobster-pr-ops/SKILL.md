---
name: lobster-pr-ops
description: Use for Lobster PR status, CI gates, Azure Pipelines required checks, admin-space stacks, Scout/feed stacks, Partner Center notes, and Lobster PR readiness/merge blocking diagnosis.
---

# Lobster PR Ops

Use this skill for Lobster PR operations and CI/status diagnosis.

## Required Checks

Main branch rules currently require these Azure/GitOps contexts:

- `GitOps/GitHubPop`
- `Lobster-Runtime-PullRequest`
- `Lobster-Runtime-Build-Validation`

Treat this as mandatory for every Lobster PR, including docs-only PRs. The repo
ruleset requires the two Lobster runtime ADO contexts even when normal pipeline
path filters do not attach them automatically. Do not declare a Lobster PR ready
until all three required contexts are visible on the PR head and green.

Inspect live PR checks with:

```powershell
gh pr checks <number> --repo microsoft.ghe.com/bic/lobster
gh pr view <number> --repo microsoft.ghe.com/bic/lobster --json statusCheckRollup,mergeStateStatus,reviewDecision,mergeable
```

If the rollup is confusing, inspect the ruleset and check-runs:

```powershell
gh api repos/bic/lobster/rules/branches/main --hostname microsoft.ghe.com
gh api repos/bic/lobster/commits/<sha>/check-runs --hostname microsoft.ghe.com --paginate
```

The active ruleset can be checked with:

```powershell
gh api repos/bic/lobster/rules/branches/main --hostname microsoft.ghe.com
```

As of 2026-06-05 it includes repository-required checks:

- `Lobster-Runtime-PullRequest` (`integration_id: 136`)
- `Lobster-Runtime-Build-Validation` (`integration_id: 136`)

## ADO Queue Policy

Do not manually queue ADO pipelines by default. For Lobster PR checks, report
whether the required contexts are attached, pending, running, missing, failed,
or stale. Only queue or rerun ADO jobs when the user explicitly asks for a
specific branch or PR.

## Admin Spaces Stack

Current durable admin notes live in:

```text
projects/admin/lobster-admin-spaces.md
```

Do not prototype Lobster implementation code in `claws-hapi`; use Lobster
worktrees under `C:\src\lobster*`.
