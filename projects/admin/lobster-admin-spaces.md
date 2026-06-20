# Lobster Admin Spaces

Track Lobster admin-space PRs here. Implementation belongs in Lobster
worktrees; this file is the operator index.

## Current Stack

| PR | Branch | Purpose | Status |
| --- | --- | --- | --- |
| #2210 | `user/giodl/lobster-admin-spaces` | Design doc for Lobster admin spaces. | Merged |
| #2211 | `user/giodl/lobster-admin-spaces-runtime` | Runtime authorization primitives for deployment and tenant admins. | Merged 2026-06-04 as `a45e8328caf8566868dce1253d84b907b704c0c6` |
| #2275 | `user/giodl/lobster-admin-policy-state` | Policy baseline state primitives. | Open; mergeable after refresh at `0d7cbfac8`; waits for PoP, CI, and re-review |
| #2270 | `user/giodl/lobster-admin-policy-bootstrap` | OpenClaw container policy baseline bootstrap stacked on #2275. | Open; waits for #2275 refresh |

## Merge Order

1. #2275
2. #2270

## Next Admin Action

1. Clear GitOps PoP for #2275 head `0d7cbfac8`.
2. Watch ADO builds `166825922` (`Lobster-Runtime-PullRequest`) and
   `166825926` (`Lobster-Runtime-Build-Validation`).
3. Confirm stale review findings are addressed and get re-review.
4. After #2275 is clean, update #2270 on top of the refreshed #2275 branch.

## Proof Notes

- #2211 ADO runtime pipeline passed after the EmmBot cleanup commit.
- #2211 GitOps PoP passed after opening the proof URL for head
  `9ea875c24acea488cb05419880f5daa61bb6a89b`.
- #2211 required `Lobster-Runtime-Build-Validation` did not attach from
  `/azp run`; direct ADO trigger was required.
- #2275 was rebased/restacked onto `main` after #2211 merged and force-pushed
  at signed head `0d7cbfac83fb963de76e0b7b53327a138a32a969`.
- #2275 review feedback about content-addressed policy baseline documents was
  addressed by validating `sha256` against `contentJsonc` before accepting,
  selecting, or bootstrapping baseline content.
- Local proof for #2275 head `0d7cbfac8`: `just cargo test
  admin_policy_baselines --no-fail-fast` passed 14 tests, `just cargo fmt
  --check` passed through `cargo.sh`, and `git diff --check` passed. `just
  rust-fmt` remains blocked locally because the CI msrustup `ms-prod-1.93`
  toolchain is not installed.
- #2275 ADO builds manually queued: `166825922`
  (`Lobster-Runtime-PullRequest`) and `166825926`
  (`Lobster-Runtime-Build-Validation`).
- #2270 remains stacked on #2275 and should not be treated as ready until #2275
  is refreshed.

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
