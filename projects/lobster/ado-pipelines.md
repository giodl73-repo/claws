# Lobster ADO Pipeline Operations

## Why This Exists

Some machines can inspect GitHub/GHE PR state but cannot queue the Lobster ADO
pipeline feeds. The working setup depends on both Azure CLI auth and the Azure
DevOps CLI extension. Use this note when another session says ADO pipeline
queueing is not available.

## Known Working Machine State

Last verified: 2026-06-22 on this Windows machine.

- Azure CLI: `2.86.0`
- Azure DevOps CLI extension: `azure-devops 1.0.4`
- Azure account: `giodl@microsoft.com`
- Tenant: Microsoft, `72f988bf-86f1-41af-91ab-2d7cd011db47`
- Default subscription shown by `az account show`: `gitops`
- GitHub Enterprise auth: `gh auth status --hostname microsoft.ghe.com` logged
  in as `giodl`

Do not store or copy tokens into this repo. Recreate auth on another machine
with interactive login.

## Required Local Tools

```powershell
az --version
az extension show --name azure-devops
gh auth status --hostname microsoft.ghe.com
```

If the Azure DevOps extension is missing:

```powershell
az extension add --name azure-devops
```

If Azure auth is missing or stale:

```powershell
az login --tenant 72f988bf-86f1-41af-91ab-2d7cd011db47
az account show
```

If GHE auth is missing:

```powershell
gh auth login --hostname microsoft.ghe.com
```

## Important Organization Detail

The local Azure DevOps defaults on this machine currently point at
`https://msfast.visualstudio.com`, but Lobster runtime checks are queued in the
`https://msazure.visualstudio.com` organization and `One` project. Always pass
the organization and project explicitly when queueing Lobster ADO checks.

Do not rely on `az devops configure --list` defaults for Lobster PRs.

## Lobster Required Checks

Every Lobster PR must have these checks visible on the PR head and green before
it is ready:

- `GitOps/GitHubPop`
- `Lobster-Runtime-PullRequest`
- `Lobster-Runtime-Build-Validation`

Inspect PR checks:

```powershell
gh pr checks <pr-number> --repo microsoft.ghe.com/bic/lobster
gh pr view <pr-number> --repo microsoft.ghe.com/bic/lobster --json headRefName,headRefOid,statusCheckRollup,mergeStateStatus,mergeable,reviewDecision
```

## Queue Required ADO Pipelines

Use the PR source branch, not the PR number.

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

Pipeline ids:

- `457333`: `Lobster-Runtime-PullRequest`
- `463346`: `Lobster-Runtime-Build-Validation`

Example:

```powershell
az pipelines run `
  --organization https://msazure.visualstudio.com `
  --project One `
  --id 457333 `
  --branch user/giodl/scout-feeds-admin-composition

az pipelines run `
  --organization https://msazure.visualstudio.com `
  --project One `
  --id 463346 `
  --branch user/giodl/scout-feeds-admin-composition
```

Record the returned build ids in `projects/lobster/SESSION.md` or the relevant
project session note.

## Common Failures

If `az pipelines run` says the build cannot be queued because of validation
errors or warnings, the branch may be stale relative to current pipeline YAML or
rules. Rebase/update the branch against current `main`, push, then queue again.

If `/azp run` comments say no pipeline is associated with the PR or path filters
exclude the branch, use the explicit `az pipelines run` commands above.

If another computer cannot queue at all, check in this order:

1. `az --version` includes the `azure-devops` extension.
2. `az account show` is logged into the Microsoft tenant as `giodl@microsoft.com`.
3. The command explicitly uses `--organization https://msazure.visualstudio.com`.
4. The command explicitly uses `--project One`.
5. The branch name exists in `microsoft.ghe.com/bic/lobster`.
6. The signed-in user has permission to queue those ADO definitions.

## Watch After Queue

After queueing, wait for the checks to attach to the PR head:

```powershell
gh pr checks <pr-number> --repo microsoft.ghe.com/bic/lobster
```

If the check details URL points at an ADO build, record that build id in the
session note. Do not mark the PR ready until both ADO contexts are attached to
the current head and green.
