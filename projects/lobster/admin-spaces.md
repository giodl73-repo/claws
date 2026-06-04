# Lobster Admin Spaces

Track Lobster admin-space PRs here. Implementation belongs in Lobster
worktrees; this file is the operator index.

## Current Stack

| PR | Branch | Purpose | Status |
| --- | --- | --- | --- |
| #2210 | `user/giodl/lobster-admin-spaces` | Design doc for Lobster admin spaces. | Merged |
| #2211 | `user/giodl/lobster-admin-spaces-runtime` | Runtime authorization primitives for deployment and tenant admins. | Ready; waiting on PoP/merge |
| #2275 | `user/giodl/lobster-admin-policy-state` | Policy baseline state primitives stacked on #2211. | Ready; waits for #2211 |
| #2270 | `user/giodl/lobster-admin-policy-bootstrap` | OpenClaw container policy baseline bootstrap stacked on #2275. | Ready; waits for #2275 |

## Merge Order

1. #2211
2. #2275
3. #2270

## Proof Notes

- #2211 ADO runtime pipeline passed after the EmmBot cleanup commit.
- #2211 GitOps PoP passed after opening the proof URL for head
  `9ea875c24acea488cb05419880f5daa61bb6a89b`.
- #2211 required `Lobster-Runtime-Build-Validation` did not attach from
  `/azp run`; direct ADO trigger was required.
- #2275 and #2270 are marked ready, approved, and stacked.

## Required Build-Validation Trigger

The repository ruleset requires both Azure contexts:

- `Lobster-Runtime-PullRequest`
- `Lobster-Runtime-Build-Validation`

If `Lobster-Runtime-Build-Validation` is pending/missing on a PR even after
`Lobster-Runtime-PullRequest` is green, trigger the exact ADO definition
directly:

```powershell
az pipelines run `
  --organization https://msazure.visualstudio.com `
  --project One `
  --id 463346 `
  --branch <source-branch>
```

For #2211, the branch was:

```powershell
az pipelines run `
  --organization https://msazure.visualstudio.com `
  --project One `
  --id 463346 `
  --branch user/giodl/lobster-admin-spaces-runtime
```

Notes:

- ADO definition id `463346` is `Lobster-Runtime-Build-Validation`.
- YAML path is `.pipelines/lobster_runtime/BuildValidation.yml`.
- `/azp run Lobster-Runtime-Build-Validation` can reply
  `No pipelines are associated with this pull request`; use the direct
  `az pipelines run` fallback in that case.

## Follow-Up Topics

- Durable admin storage is still a product/architecture decision.
- Redis is acceptable for testing/bootstrap/projection state, not final durable
  customer admin configuration.
- Partner Center registration can proceed before the final durable store choice,
  as long as we do not present Redis-only state as the final customer authority.
