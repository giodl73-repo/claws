# Lobster PR Fronts

Last live refresh: 2026-07-27 16:42 PDT.

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
| 1 | [#5681](https://microsoft.ghe.com/bic/lobster/pull/5681) Candidate staging | Remote `927d196a4d`; natural Runtime `174019444` queued | 2 | Local reviewed commit `0682e07b97` makes every non-main validation/deploy run annotation-only yellow; 43/43 focused tests pass. Publish after the active Runtime reaches terminal state, then resolve both threads and request exact-head review. |
| 2 | [#5491](https://microsoft.ghe.com/bic/lobster/pull/5491) approval observability | `9ae570a15d`; natural Runtime queued | 0 | Forward-compatible admitted-outcome inventory is published and Codex-clean. Await Runtime and exact-head review; GitHubPop is the final merge gate. |
| 3 | [#4648](https://microsoft.ghe.com/bic/lobster/pull/4648) governed node invoke | `f14774648f`; natural Runtime queued | 0 | Code/review conversations are clean with exact-head Galin approval. Await Runtime; stale requested-change state remains review-policy residue. |
| 4 | [#5422](https://microsoft.ghe.com/bic/lobster/pull/5422) MAC/MOS3 availability | `d55f3487c0`; Runtime missing | 0 | TitleId repair is published and exact-head approved. Natural Runtime still has not attached. Whole-resolution timeout/background refresh, singleflight, and configurable budgets are recorded as pre-broad-enablement gates, not changes to this default-off slice. |
| 5 | [#5947](https://microsoft.ghe.com/bic/lobster/pull/5947) MOS3 Builder metadata | Remote `d2e1a37a14`; natural Runtime `174023112` queued | 1 | Local reviewed `64e62449c4` removes the unused metadata lifetime; focused publish test passes. Publish after the active Runtime reaches terminal state, resolve the thread, and retain the MOS3 `ScoutCloud` enum/AppID rollout gate. |
| 6 | [#5402](https://microsoft.ghe.com/bic/lobster/pull/5402) OpenClaw 2026.7.1 | Remote `b56aa6dd0a`; old Runtime failed | 1 | Conflicts with current `main` and depends on #5681 landing. Reconcile only after #5681, preserving local caller-scope proof and obsolete `memorySearch.store.path` removal, then publish once. |
| 7 | [#5424](https://microsoft.ghe.com/bic/lobster/pull/5424) marketplace discovery | `6529e0a9e5`; old Runtime failed on shared Playwright noise | 0 | Reconcile current `main`, revalidate the exact 10-file rollback-aware delta, and request exact-head review. |
| 8 | [#5460](https://microsoft.ghe.com/bic/lobster/pull/5460) offline-node recovery | `7d8b506022`; old Runtime failed on shared E2E noise | 0 | Exact-head approved and source-clean. Reconcile only if required; no branch code issue is indicated. |
| 9 | [#5481](https://microsoft.ghe.com/bic/lobster/pull/5481) RFC 0013 handoff | `dcaead38b3`; Runtime missing on fork | 0 | Identity-to-hash/path-safety hardening is published. Request exact-head review; fork topology still prevents the required Runtime context. |
| 10 | [#5646](https://microsoft.ghe.com/bic/lobster/pull/5646) per-user Candidate flighting | Remote `55f3cdbd58`; Runtime green | 0 | Keep the dirty implementation unpublished until process/user eligibility is one atomic fresh fail-closed policy snapshot bound to role generation/build identity, with explicit established-route drain/reap behavior. |

## Dependency chains

| Chain | Order | Current pointer |
| --- | --- | --- |
| Scout standard | **#5491** -> #5506 -> #5571 -> #5572 | Published stack is `9ae570a15d` -> `cd0ba302be` -> `dddb602595` -> `e3be95fb04`. Children are cleanly restacked; #5506 remains exact-head approved, while #5571/#5572 need review refresh after their final heads. |
| OpenClaw 2026.7.1 | **#5681** -> #5402 | #5681 must land before the OpenClaw image promotion is reconciled and published. |
| Candidate user flighting | **#5681** -> #5646 | #5681 provides safe dark Candidate staging. #5646 remains design-only until atomic fresh user/process policy and route lifecycle semantics are complete. |

## Parked stacked children

| PR | Head | State |
| --- | --- | --- |
| #5506 | `cd0ba302be` | Base #5491; Runtime neutral; approved; zero conversations. |
| #5571 | `dddb602595` | Base #5506; Runtime neutral; zero conversations; exact-head review requested after template/test repair. |
| #5572 | `e3be95fb04` | Base #5571; Runtime neutral; zero conversations; catalog inventory tests 34/34 after final restack. |

## Held local commits

| PR | Local worktree | Held work |
| --- | --- | --- |
| #5681 | `C:\src\lobster-promoteclaw-stage-candidate` | `0682e07b97`, ahead 1; non-main validate-only annotation coverage. Hold until Runtime `174019444` is terminal. |
| #5947 | `C:\src\lobster-feeds-builder-name` | `64e62449c4`, ahead 1; static MOS3 metadata type cleanup. Hold until Runtime `174023112` is terminal. |
| #5402 | `C:\src\lobster-pr5402-refresh` | Caller-scope patcher proof and obsolete memory-store-path removal await post-#5681 reconciliation. |
| #5646 | `C:\src\lobster-openclaw-per-user-flighting` | Dirty exact-user prototype intentionally unpublished pending policy-snapshot redesign. |

## Refresh recipe

1. Query every open authored PR and its exact-head Runtime conclusion.
2. Count unresolved GraphQL review threads, not flat comments.
3. Compare each worktree with the PR head and label held commits.
4. Advance a chain only after its current front merges.
5. Use GitHubPop only as the final merge gate.
