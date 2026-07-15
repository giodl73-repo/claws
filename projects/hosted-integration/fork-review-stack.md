# Hosted Integration Fork Review Stack

## Purpose

These five draft PRs are the reviewer-facing OpenClaw packaging of the
fine-grained hosted-integration implementation series.

They exist only in `giodl73-repo/openclaw`. They are preparation and repair
surfaces before any PR is filed against `openclaw/openclaw`.

The original fine-grained fork PRs remain available as commit-level evidence.
Do not close or rewrite them until the consolidated packages are accepted as
the durable review shape.

## Stack

| Package | Fork PR | Base | Size | Review thesis |
| --- | --- | --- | --- | --- |
| 1. Guarded dispatch core | [#71](https://github.com/giodl73-repo/openclaw/pull/71) | `main` | 3 commits, 8 files, +843/-11 | Extract one local redirect-disabled hop and a runtime-validated `network-guard/v1` boundary without adding hosted execution or credentials. |
| 2. CAPI owner and operations | [#72](https://github.com/giodl73-repo/openclaw/pull/72) | Package 1 | 14 commits, 16 files, +3211/-3 | Let the CAPI owner prepare exact semantics while cell-local bundle registration, Status, and Doctor expose inactive composition. |
| 3. Hosted CAPI execution | [#73](https://github.com/giodl73-repo/openclaw/pull/73) | Package 2 | 15 commits, 80 files, +7676/-114 | Add one cell-local bounded reverse carrier, least-privilege Gateway endpoint, traffic-policy intersection, exclusive package contribution, and inactive hosted CAPI binding as one end-to-end proof. |
| 4. Additional provider owners | [#74](https://github.com/giodl73-repo/openclaw/pull/74) | Package 3 | 7 commits, 24 files, +4743/-113 | Prove the owner model across Substrate, WebIQ, and Anthropic while preserving cell-local bundle incarnations, route invariants, cancellation, and narrow outbound header authority without a universal adapter registry. |
| 5. Microsoft interactions | [#75](https://github.com/giodl73-repo/openclaw/pull/75) | Package 3 | 2 commits, 57 files, +6349/-105 | Prove Channel- and mailbox-specific ownership for ACF and Graph without flattening those semantics into provider dispatch. |

Packages 4 and 5 are parallel. Neither is a prerequisite for the other.

## Branches And Worktrees

| Package | Branch | Worktree |
| --- | --- | --- |
| 1 | `user/giodl/hosted-integration-guarded-dispatch-core` | `C:\src\openclaw-hosted-package-1-guarded-dispatch` |
| 2 | `user/giodl/hosted-integration-capi-owner-operations` | `C:\src\openclaw-hosted-package-2-capi-owner` |
| 3 | `user/giodl/hosted-integration-hosted-capi-execution` | `C:\src\openclaw-hosted-package-3-capi-execution` |
| 4 | `user/giodl/hosted-integration-additional-provider-owners` | `C:\src\openclaw-hosted-package-4-providers` |
| 5 | `user/giodl/hosted-integration-microsoft-interactions` | `C:\src\openclaw-hosted-package-5-microsoft` |

## Fine-Grained Source PRs

| Package | Source PRs |
| --- | --- |
| 1 | #34, #35, #38 |
| 2 | #43, #45, #46, #47 |
| 3 | #48, #49, #50, #51, #52 |
| 4 | #53, #59, #62 |
| 5 | #63, #65 |

Package 4 required additive composition of three sibling branches. Its combined
`lobster/host` manifest is `1.3.0`, preserves provider/credential pairing, and
contains CAPI, Substrate, WebIQ, and Anthropic contributions.

## Lobster Evidence

| OpenClaw package | Current Lobster evidence |
| --- | --- |
| 1 | No activation counterpart by design; this package defines local contracts only. |
| 2 | [F1 PR 5](https://microsoft.ghe.com/giodl/lobster/pull/5) prepares inactive package/profile selection. |
| 3 | [F2 PR 14](https://microsoft.ghe.com/giodl/lobster/pull/14) contains the CAPI host peer, policy, canary, rollback, and mixed-version observation stack. |
| 4 | [Substrate PR 7](https://microsoft.ghe.com/giodl/lobster/pull/7), [WebIQ PR 9](https://microsoft.ghe.com/giodl/lobster/pull/9), and [Anthropic PR 10](https://microsoft.ghe.com/giodl/lobster/pull/10). |
| 5 | [ACF PR 11](https://microsoft.ghe.com/giodl/lobster/pull/11) and [Graph PR 13](https://microsoft.ghe.com/giodl/lobster/pull/13). |

The Lobster evidence remains fine-grained for now. Consolidating it is not a
prerequisite for reviewing the OpenClaw contract packages.

## Upstream Filing Gate

No package should target `openclaw/openclaw` until:

1. its fork PR has no unresolved high-confidence review finding;
2. the package thesis still matches its diff after consolidation;
3. targeted owner, contract, and representative consumer proof is green;
4. prerequisite package APIs are stable enough to avoid immediate restacking;
5. the PR body removes Lobster-internal framing and leads with reusable
   OpenClaw value; and
6. the user explicitly authorizes filing the upstream PR.

Package 1 is the first upstream candidate. Packages 2 and 3 should not be filed
merely because their fork checks become green.
