# Lobster PR Fronts

Last live refresh: 2026-07-29 19:25 PDT.

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

| Priority | PR                                                                                         | Exact head / Runtime                                   | Conversations | What is left                                                                                                                                                                                              |
| -------: | ------------------------------------------------------------------------------------------ | ------------------------------------------------------ | ------------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|        1 | [#5646](https://microsoft.ghe.com/bic/lobster/pull/5646) per-user Candidate flighting      | `179a706745`; Runtime green `174398205`                |             0 | Exact-head approved and Runtime-green. Only GitHubPop remains; do not change the branch.                                                                                                                  |
|        2 | [#5491](https://microsoft.ghe.com/bic/lobster/pull/5491) approval observability            | `8aea172caa`; Runtime queued naturally                 |             0 | Current-main-restacked and mergeable. Harry's rollback concern is addressed through the existing broker ECS flag; exact-head review requested. Let Runtime drain naturally and do not manually queue ADO. |
|        3 | [#5460](https://microsoft.ghe.com/bic/lobster/pull/5460) offline-node recovery             | `3c11c572b4`; Runtime green                            |             0 | Exact-head Galin-approved and Runtime-green. Harry's approval is on the prior head; GitHubPop remains.                                                                                                    |
|        4 | [#5402](https://microsoft.ghe.com/bic/lobster/pull/5402) OpenClaw 2026.7.1                 | `57dac11ab9`; Runtime failed; conflicting              |             0 | Two local promotion worktrees contain concurrent dirty work, so do not overwrite them; coordinate the conflict and exact-head branch-owned failures before another publish.                               |
|        5 | [#4648](https://microsoft.ghe.com/bic/lobster/pull/4648) governed node invoke              | `41c0201f44`; Runtime failed; conflicting              |             0 | Current-main probe found nine semantic conflicts, including `gateway_lifecycle_tests.rs`, which overlaps protected dirty work in `C:\src\lobster-pr-4648`; coordinate before restacking.                  |
|        6 | [#5422](https://microsoft.ghe.com/bic/lobster/pull/5422) MAC/MOS3 availability             | live `d55f3487c0`; local `52b924b400`; Runtime missing |             0 | Validated restack is held locally only. Fork-backed and externally managed admin lane; do not publish or manually queue Runtime.                                                                          |
|        7 | [#5481](https://microsoft.ghe.com/bic/lobster/pull/5481) RFC 0013 handoff                  | `2778124583`; Runtime missing                          |             0 | Code-reviewed and approved at exact head, but fork-backed with required Runtime absent. Preserve the internal-head requirement before treating it as a merge candidate.                                   |
|        8 | [#5947](https://microsoft.ghe.com/bic/lobster/pull/5947) MOS3 Builder metadata             | `c0583cf6bf`; Runtime failed                           |             0 | Draft, approved, and mergeable; feeds is externally managed, so do not advance #5947 or child #6169.                                                                                                      |
|        9 | [#6121](https://microsoft.ghe.com/bic/lobster/pull/6121) hosted Control UI surgical routes | `aff75f4a4b`; Runtime queued                           |             0 | Externally managed lane; observe only.                                                                                                                                                                    |

## Dependency chains

| Chain                     | Order                                | Current pointer                                                                                                                                                                                             |
| ------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scout standard            | **#5491** -> #5506 -> #5571 -> #5572 | Published current-main stack is `8aea172caa` -> `ac56d9437d` -> `a85ba1f369` -> `d15ce58bec`. #5491 Runtime queued naturally; children are mergeable/neutral and await exact-head review/check progression. |
| OpenClaw 2026.7.1         | **#5402**                            | #5681 merged; #5402 is now exposed but has concurrent dirty repair worktrees and a failed exact-head Runtime to diagnose.                                                                                   |
| Candidate user flighting  | **#5646**                            | #5681 merged. #5646 is current-main-restacked at `179a706745`, exact-head approved, conversation-clean, and Runtime-green; only GitHubPop remains.                                                          |
| Hosted Control UI runtime | **#6121**; orphaned child #6116      | #6088 and #6113 closed. #6121 is now main-based with requested changes and queued Runtime. #6116 remains based on closed #6113. Externally managed: observe only.                                           |
| MOS3 packaging            | **#5947** -> #6169                   | #5947 remains the draft front with failed Runtime. #6169 is an approved, mergeable draft child with neutral Runtime.                                                                                        |

## Parked stacked children

| PR    | Head         | State                                                                                  |
| ----- | ------------ | -------------------------------------------------------------------------------------- |
| #5506 | `ac56d9437d` | Base #5491; approved; Runtime neutral; exact-head review refresh requested.            |
| #5571 | `a85ba1f369` | Base #5506; prior prose-pin nit remains addressed; exact-head re-review requested.     |
| #5572 | `d15ce58bec` | Base #5571; deny-alias dedupe preserved and validated; exact-head re-review requested. |
| #6116 | `3c2e1f7110` | Base #6113; draft, approved, mergeable, Runtime neutral.                               |
| #6169 | `64ced9b60a` | Base #5947; draft, approved, mergeable, Runtime neutral.                               |

## Held local commits

| PR    | Local worktree                                                         | Held work                                                                                                                             |
| ----- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| #5402 | `C:\src\lobster-pr5402-refresh`, `C:\src\lobster-promoteclaw-2026.7.1` | Concurrent dirty persistence/lifecycle work exists; preserve it and coordinate before editing or publishing.                          |
| #5422 | `C:\src\lobster-scout-tenant-availability`                             | Validated current-main restack at `52b924b400`; hold because the existing PR is fork-backed and the admin lane is externally managed. |

## Refresh recipe

1. Query every open authored PR and its exact-head Runtime conclusion.
2. Count unresolved GraphQL review threads, not flat comments.
3. Compare each worktree with the PR head and label held commits.
4. Advance a chain only after its current front merges.
5. Use GitHubPop only as the final merge gate.
