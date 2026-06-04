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

## Build-Validation Fallback

If `Lobster-Runtime-Build-Validation` is pending or missing while
`Lobster-Runtime-PullRequest` is green, trigger the exact ADO pipeline directly.
The `/azp run Lobster-Runtime-Build-Validation` comment can fail with
`No pipelines are associated with this pull request`.

ADO definition:

- Project: `One`
- Pipeline id: `463346`
- Pipeline name: `Lobster-Runtime-Build-Validation`
- YAML: `.pipelines/lobster_runtime/BuildValidation.yml`

Command:

```powershell
az pipelines run `
  --organization https://msazure.visualstudio.com `
  --project One `
  --id 463346 `
  --branch <source-branch>
```

Example:

```powershell
az pipelines run `
  --organization https://msazure.visualstudio.com `
  --project One `
  --id 463346 `
  --branch user/giodl/lobster-admin-spaces-runtime
```

After triggering, wait for the `Lobster-Runtime-Build-Validation` check-run to
appear on the PR and follow its ADO build id from the check details URL.

## Admin Spaces Stack

Current durable notes live in:

```text
projects/lobster/admin-spaces.md
```

Do not prototype Lobster implementation code in `claws-hapi`; use Lobster
worktrees under `C:\src\lobster*`.
