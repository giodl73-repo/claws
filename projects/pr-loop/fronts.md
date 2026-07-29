# Lobster PR Fronts

Last live refresh: 2026-07-29 10:13 PDT.

This is the durable queue for Gio-authored Lobster PRs. A **front** is the only
PR in a dependency chain that should consume merge attention or a fresh full
Runtime run. Children stay parked until the front lands.

## Operating rules

- Required checks are `Lobster-Runtime-PullRequest` and final-gate
  `GitOps/GitHubPop`.
- Do not manually queue Azure by default. Let natural Runtime attach after a
  deliberate publish.
- Ignore GitHubPop while repairing; run it only when review and Runtime are
  ready for merge.
- Treat exact-head approval plus zero actionable conversations as review-ready,
  even when stale requested-change state remains.
- Do not spend full CI on stacked children. Restack them after every parent
  head change and let their neutral checks remain parked.

## Active queue

| Priority | PR | Exact head / Runtime | Conversations | What is left |
| ---: | --- | --- | ---: | --- |
| 1 | [#6060](https://microsoft.ghe.com/bic/lobster/pull/6060) hosted Control UI design | `b393ba2fe2`; Runtime green | 0 | New exact head is mergeable and Runtime `174257841` is green, but approval is no longer current. Request exact-head review, then use `GitOps/GitHubPop` as the final gate. |
| 2 | [#5646](https://microsoft.ghe.com/bic/lobster/pull/5646) per-user Candidate flighting | `e08c89c9fd`; Runtime failed only Repo Validation | 0 | Exact-head approved. Runtime, unit, container, and every E2E lane passed; only the shared Repo Validation leg failed, matching #5491. Do not churn or manually rerun. |
| 3 | [#5491](https://microsoft.ghe.com/bic/lobster/pull/5491) approval observability | `e3ee308ffa`; Runtime failed only Repo Validation | 0 | Runtime `174155644` is terminal with 40 substantive lanes green; only the shared Repo Validation leg and resulting aggregate are red. Exact-head re-review requested; do not churn or manually rerun. |
| 4 | [#6086](https://microsoft.ghe.com/bic/lobster/pull/6086) image promotion cleanup | `380510a1cf`; Runtime pending attachment | 0 | Current main is merged and the PR is conflict-free/mergeable. Both blocking review findings are fixed with exact-head proof posted; requested-change state awaits Harry's re-review. Let Runtime attach naturally. |
| 5 | [#5402](https://microsoft.ghe.com/bic/lobster/pull/5402) OpenClaw 2026.7.1 | `57dac11ab9`; Runtime failed; conflicting | 0 | Two local promotion worktrees contain concurrent dirty work, so do not overwrite them; coordinate the conflict and exact-head branch-owned failures before another publish. |
| 6 | [#4648](https://microsoft.ghe.com/bic/lobster/pull/4648) governed node invoke | `41c0201f44`; Runtime failed | 0 | Exact-head review residue remains; classify the failed Runtime before branch churn. |
| 7 | [#5422](https://microsoft.ghe.com/bic/lobster/pull/5422) MAC/MOS3 availability | `d55f3487c0`; Runtime missing | 0 | Exact-head approved. Natural Runtime still has not attached; do not manually queue. |
| 8 | [#5460](https://microsoft.ghe.com/bic/lobster/pull/5460) offline-node recovery | `c3b799c2e6`; Runtime failed | 0 | Exact-head approved and mergeable. Classify the failed Runtime before branch churn. |
| 9 | [#5481](https://microsoft.ghe.com/bic/lobster/pull/5481) RFC 0013 handoff | `2778124583`; Runtime missing | 0 | Mergeable but requested-change state remains and required Runtime is absent. Preserve the internal-head requirement before treating it as a merge candidate. |
| 10 | [#5947](https://microsoft.ghe.com/bic/lobster/pull/5947) MOS3 Builder metadata | `c0583cf6bf`; Runtime failed | 0 | Draft, approved, and mergeable; retain the MOS3 `ScoutCloud` enum/AppID rollout gate and classify Runtime before advancing #6169. |
| 11 | [#6088](https://microsoft.ghe.com/bic/lobster/pull/6088) hosted Control UI runtime | `904090781f`; Runtime missing | 0 | Draft root for the implementation stack. It is mergeable but has no approval or required Runtime; keep the approved children parked. |

## Dependency chains

| Chain | Order | Current pointer |
| --- | --- | --- |
| Scout standard | **#5491** -> #5506 -> #5571 -> #5572 | Published stack is `e3ee308ffa` -> `afa6de3478` -> `104fb86337` -> `299a6fbd25`. #5491 Runtime `174155644` passed 40 substantive lanes and failed only shared Repo Validation. #5506 is approved; updated children are mergeable and awaiting exact-head review/check attachment. |
| OpenClaw 2026.7.1 | **#5402** | #5681 merged; #5402 is now exposed but has concurrent dirty repair worktrees and a failed exact-head Runtime to diagnose. |
| Candidate user flighting | **#5646** | #5681 merged. #5646 is published at `e08c89c9fd`, conversation-clean, and awaiting its natural Runtime plus exact-head review. |
| Hosted Control UI runtime | **#6088** -> #6113 -> (#6116, #6121) | #6088 is the draft main-based root. The three approved children are mergeable with neutral Runtime and remain parked until the root is reviewed and validated. |
| MOS3 packaging | **#5947** -> #6169 | #5947 remains the draft front with failed Runtime. #6169 is an approved, mergeable draft child with neutral Runtime. |

## Parked stacked children

| PR | Head | State |
| --- | --- | --- |
| #5506 | `afa6de3478` | Base #5491; narrowed typed-capability delta; Runtime neutral; approved; zero conversations. |
| #5571 | `104fb86337` | Base #5506; zero conversations; exact-head re-review requested; natural stacked checks have not attached yet. |
| #5572 | `299a6fbd25` | Base #5571; zero conversations; exact-head re-review requested; natural stacked checks have not attached yet. |
| #6113 | `331d5eb59d` | Base #6088; draft, approved, mergeable, Runtime neutral. |
| #6116 | `3c2e1f7110` | Base #6113; draft, approved, mergeable, Runtime neutral. |
| #6121 | `c2b8f9e786` | Base #6113; draft, approved, mergeable, Runtime neutral. |
| #6169 | `64ced9b60a` | Base #5947; draft, approved, mergeable, Runtime neutral. |

## Held local commits

| PR | Local worktree | Held work |
| --- | --- | --- |
| #5402 | `C:\src\lobster-pr5402-refresh`, `C:\src\lobster-promoteclaw-2026.7.1` | Concurrent dirty persistence/lifecycle work exists; preserve it and coordinate before editing or publishing. |

## Refresh recipe

1. Query every open authored PR and its exact-head Runtime conclusion.
2. Count unresolved GraphQL review threads, not flat comments.
3. Compare each worktree with the PR head and label held commits.
4. Advance a chain only after its current front merges.
5. Use GitHubPop only as the final merge gate.
