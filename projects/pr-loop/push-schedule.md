# Lobster PR Push Schedule

Cadence: use at most two active natural-CI lanes. Reconsider admission every 15
minutes, but preserve capacity for a priority repair: a corrective push replaces
that PR's lane before another prepared front is admitted. Each publication
requires a clean worktree, exact expected head, current body evidence, and no
manual ADO queue action.

Last updated: 2026-07-27 05:52 PDT.

The fixed one-shot scheduler PID `33100` was stopped after #5491 published. No
automatic publisher is currently alive. Future admissions are adaptive to the
two-lane budget; `.craft/pr-loop-scheduled-pushes.log` retains the old scheduler
record, and no workflow queues ADO manually.

| Slot (PDT) | PR    | Expected head | State                                                                                                                                                                                                                                            |
| ---------- | ----- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 09:51      | #5541 | `4a4c7e16c6`  | **reserved lane 1**; deterministic gates green in build `173849470`; only failure is unrelated Teams drain Playwright E2E noise; await natural/team rerun                                                                                        |
| 10:12      | #5491 | `0627fe046e`  | **terminal green**; build `173850780` passed all branch-owned gates; GitHubPop only                                                                                                                                                              |
| 11:20      | #5402 | `b9cf17abc8`  | priority current-main conflict repair; build `173853183` exposed one stale deleted-patch test include                                                                                                                                            |
| 11:39      | #5402 | `bc87c276bc`  | **priority corrective lane**; natural replacement build `173854035` attached and the previously failing Adapter gates are green; no manual queue                                                                                                 |
| 11:56      | #4648 | `812ef86cc7`  | **terminal shared noise**; branch-owned gates green; one claim-log Rust E2E miss plus unrelated meeting-negotiation eval judge failure; no source churn/manual rerun                                                                             |
| 12:24      | #5541 | `6060380ff6`  | **terminal green except Pop** in build `173855886`                                                                                                                                                                                               |
| 13:39      | #5541 | `c748ff3244`  | **active lane 1 corrective replacement**; CAS-exhaustion WARN published, last thread resolved, Galin/Harry re-requested; natural build `173859061` attached                                                                                      |
| 14:35      | #5422 | `f39323c39b`  | **reserved natural-CI lane**; published current-main + env-wiring coverage after #5541 reached terminal green; 11/11 focused Runtime tests and diff hygiene green; wait for Runtime attachment without manually queueing ADO                     |
| 13:56      | #5057 | `5968828fa1`  | **active lane 2**; merged current main, post-merge focused proof green, two Galin threads resolved, reviewers re-requested; natural build `173859540` attached                                                                                   |
| 15:01      | #5424 | `e160e526b9`  | **four-PR experiment; queued** as natural build `173861957`; body/reviewers refreshed and zero conversations                                                                                                                                     |
| 15:40      | #5424 | `cea2b4ff53`  | **priority corrective replacement active** as build `173864254`; prior build exposed two stale exhaustive marketplace-field response assertions, now updated. Prior WorkIQ E2E miss is shared live-LLM noise also seen on #5505                  |
| 15:55      | #5424 | `c3ee0a27a4`  | **priority review corrective replacement queued** as build `173864778`; preserves intentional default-on read-only discovery, adds explicit fail-open rationale across contracts/docs, and directly tests network-probe failure. No manual queue |
| 15:01      | #5460 | `981c9ca21c`  | **four-PR experiment; queued** as natural build `173861956`; body/reviewers refreshed and zero conversations                                                                                                                                     |
| 15:12      | #5460 | `7d8b506022`  | **priority corrective replacement active** as build `173862085`; prior build failed Repo validation because the prompt lacked the semantic kill-switch annotation. Exact fix passes policy + nodes 20/20; no replacement failure so far          |
| 15:01      | #5505 | `dca7bb68e2`  | **four-PR experiment; queued** as natural build `173861958`; body/reviewers refreshed and zero conversations                                                                                                                                     |
| 15:01      | #5646 | `cb69690adf`  | **four-PR experiment; Runtime neutral** because the child is design/docs-only; body/reviewers refreshed and zero conversations                                                                                                                   |
| 17:31      | #5422 | `70b96a084d`  | **lane 2 current-main refresh**; 11/11 focused availability tests, kill-switch policy, and diff hygiene green; published to the fork and waiting for natural Runtime attachment; no manual queue                                                 |
| 17:39      | #5481 | `52928053d5`  | **fork-only current-main refresh**; final-handoff 2/2 plus fmt/diff green; published after confirming its fork topology still has no active ADO lane; no manual queue                                                                            |
| 18:00      | #5424 | `6529e0a9e5`  | **terminal 31/32 green** in build `173871647`; every branch-owned gate and all five Rust E2E shards pass. Only unrelated Teams drain/log-observation Playwright noise remains; no manual rerun                                                   |
| 18:55      | #4648 | `6a1c25d03f`  | **active natural build `173897153`**; intended delta unchanged, nodes-code-mode 27/27 and fmt/diff green; Detect passed and Repo validation is running, no manual queue                                                                          |
| 00:15      | #5505 | `ad2ec20c3b`  | **active corrective lane 2**, natural build `173898056`; bounded linked-worktree fix passes plugin 7/7, Runtime 3/3, bundle 5/5, diff hygiene, and real linked-worktree smoke; no manual queue                                                   |
| 00:18      | #5681 | `556e6b781b`  | rebased unchanged child delta onto squash-merged `main`; focused EV2/PromoteClaw proof green, pushed with exact force lease; no manual queue                                                                                                     |
| 00:18      | #5646 | `55f3cdbd58`  | rebased unchanged docs/design delta onto squash-merged `main`; diff hygiene green, pushed with exact force lease; no manual queue                                                                                                                |
| 05:49      | #5402 | `49860af752`  | **active priority lane 1**, natural build `173930675`; current-main patch integrations preserve FTS memory, #5800 routing, and brokered attachments; 12/12 patch applicability and focused 60/60 green                                           |
| 05:51      | #5681 | `90c8b1263f`  | **active lane 2**, natural build `173930786`; bounded/labeled ADO error details published after focused 3/3 + diff hygiene; no manual queue                                                                                                      |

At 17:06 PDT Gio explicitly changed the prior stacked-publication hold and asked
to publish every remaining prepared PR commit. #5506, #5571, #5572, and #5681
were published in dependency order with exact force leases where required. All
four natural Runtime results are neutral; no ADO run was manually queued.

At 17:44 PDT #5505 build `173867201` completed fully green. #5422 and #5481
remain published on their fork PR heads and are waiting for natural Runtime
attachment; neither has an ADO build yet, and no run was manually queued.

At 18:50 PDT #5424 build `173871647` reached terminal 31/32 green, leaving no
active internal lane. #5422/#5481 remain fork-source structural exceptions
rather than active lanes.

At 18:57 PDT the free internal lane moved to #4648 current-main head
`6a1c25d03f`; natural build `173897153` attached.

At 00:15 PDT Harry's exact-head linked-worktree request on #5505 was repaired
and published as `ad2ec20c3b`. Its natural build `173898056` is lane two; no
Azure run was manually queued. #5541 merged, so #5681 and #5646 now advance as
independent `main`-based fronts.
