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

## ADO Queue Fallback

If either `Lobster-Runtime-PullRequest` or `Lobster-Runtime-Build-Validation`
is missing, pending forever, or excluded by path filters, trigger the exact ADO
pipelines directly. Do this for docs-only PRs too. The `/azp run` comment can
fail with `No pipelines are associated with this pull request` or `pipeline
triggers exclude this branch/path`, so use `az pipelines run`.

ADO definitions:

- Project: `One`
- Pipeline id: `457333`
- Pipeline name: `Lobster-Runtime-PullRequest`
- Pipeline id: `463346`
- Pipeline name: `Lobster-Runtime-Build-Validation`

Commands:

```powershell
az pipelines run `
  --organization https://msazure.visualstudio.com `
  --project One `
  --id 457333 `
  --branch <source-branch>

az pipelines run `
  --organization https://msazure.visualstudio.com `
  --project One `
  --id 463346 `
  --branch <source-branch>
```

Record the returned ADO build ids in the relevant project/session notes and
watch `gh pr checks <number>` until both required contexts attach to the PR
head.

If `az pipelines run` fails with only `Could not queue the build because there
were validation errors or warnings`, treat the PR as not ready. The branch may
be too stale for the current pipeline YAML/ruleset; rebase or update the branch
against current `main`, push, then queue the missing required ADO context again.

## Build-Validation Fallback

If `Lobster-Runtime-Build-Validation` alone is missing while
`Lobster-Runtime-PullRequest` is already green, trigger only BuildValidation
with pipeline id `463346`.

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

Current durable admin notes live in:

```text
projects/admin/lobster-admin-spaces.md
```

Do not prototype Lobster implementation code in `claws-hapi`; use Lobster
worktrees under `C:\src\lobster*`.
