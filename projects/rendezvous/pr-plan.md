# M5 Rendezvous PR Plan

This is the execution plan for Gio's four M5 Rendezvous issues due July 31.
It separates PRs that already exist, focused PRs that still need to be
authored, and the later OpenClaw release promotion into Lobster.

## Delivery Order

### 1. Land the OpenClaw Claws series

Drive the current OpenClaw stack bottom-up:

| Order | PR                                                          | Purpose                                           |
| ----- | ----------------------------------------------------------- | ------------------------------------------------- |
| 1     | [#101328](https://github.com/openclaw/openclaw/pull/101328) | Grouped Claw schema and read-only add plan.       |
| 2     | [#101755](https://github.com/openclaw/openclaw/pull/101755) | Create the Claw agent and root install record.    |
| 3     | [#101973](https://github.com/openclaw/openclaw/pull/101973) | Create Claw-managed workspace files.              |
| 4     | [#102228](https://github.com/openclaw/openclaw/pull/102228) | Install ClawHub packages for new Claw agents.     |
| 5     | [#102296](https://github.com/openclaw/openclaw/pull/102296) | Add plan-first Claw status and removal.           |
| 6     | [#102306](https://github.com/openclaw/openclaw/pull/102306) | Export installed agents as grouped Claw packages. |
| 7     | [#102383](https://github.com/openclaw/openclaw/pull/102383) | Manage Claw cron jobs through the Gateway.        |
| 8     | [#102406](https://github.com/openclaw/openclaw/pull/102406) | Manage Claw MCP server ownership.                 |
| 9     | [#102427](https://github.com/openclaw/openclaw/pull/102427) | Add experimental Claw lifecycle diagnostics.      |
| 10    | [#102959](https://github.com/openclaw/openclaw/pull/102959) | Plan grouped Claw agent updates.                  |
| 11    | [#102982](https://github.com/openclaw/openclaw/pull/102982) | Apply consented grouped Claw updates.             |
| 12    | [#111391](https://github.com/openclaw/openclaw/pull/111391) | Add `CLAW.md` manifest support.                   |

All twelve are open and non-draft. The July 21 readiness audit found exact-head
CI green; displayed change requests are predominantly against obsolete heads.
Landing must use the OpenClaw maintainer review, prepare, and merge workflow.

### 2. Drive the existing Lobster PRs

| Priority | Issue       | PR                                                       | Current role                                                                    | Required action                                                                                                                                                          |
| -------- | ----------- | -------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A        | #3897       | [#5336](https://microsoft.ghe.com/bic/lobster/pull/5336) | `scout-standard` exact capability configuration and convergence contract        | Drive the corrected architecture PR to merge; use it as the 1-3 page convergence brief and implementation-series contract.                                               |
| A        | #3897       | [#5491](https://microsoft.ghe.com/bic/lobster/pull/5491) | Privacy-safe host-exec friction inventory and persistent-auto-allow suppression | Ready at `b5e5a25869`; drive exact-head review and required checks as V1 implementation PR 1.                                                                            |
| A        | #3897, #862 | [#4297](https://microsoft.ghe.com/bic/lobster/pull/4297) | Code Mode node inventory and connection state                                   | Merged.                                                                                                                                                                  |
| A        | #551        | [#4982](https://microsoft.ghe.com/bic/lobster/pull/4982) | Shared skill publish contract                                                   | Merged.                                                                                                                                                                  |
| B        | #551        | [#5045](https://microsoft.ghe.com/bic/lobster/pull/5045) | Shared publish capability diagnostics                                           | Merged.                                                                                                                                                                  |
| B        | #3897       | [#4648](https://microsoft.ghe.com/bic/lobster/pull/4648) | Governed Code Mode node invocation                                              | Current head `59a3973ff2` includes the generated-bundle and reserved-command hardening; Galin approved the exact head. Drive remaining required checks/reviewer refresh. |
| C        | #551        | [#5211](https://microsoft.ghe.com/bic/lobster/pull/5211) | Auditable skills outcome-receipt proof                                          | Closed as out of scope: receipts do not satisfy a #551 acceptance criterion. Preserve the branch/RFC for a separate initiative.                                          |

### 3. Author the two missing focused PRs

| Issue | Planned PR                                               | Base                       | Scope                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----- | -------------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| #862  | [#5460](https://microsoft.ghe.com/bic/lobster/pull/5460) | Lobster `main` after #4297 | Review fix pushed at `865df0ade7`: the source and deployable Nodes bundle carry the offline/reconnect stop rule; catalog tests pass 32/32, namespace tests 19/19, and bundle parity passes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| #867  | MAC Scout availability control                           | Lobster `main`             | PR [#5422](https://microsoft.ghe.com/bic/lobster/pull/5422) is non-draft/mergeable at `8feadccf92`. The native MAC/MOS3 overlay composes after operator enrollment, fails retryably on cold/missing resolution only when its ECS gate is armed, and retains last-known decisions after successful resolution. PullRequest rerun `173385787` is queued. Build Validation's missing web bundle reproduces on current `main`; focused repair [#5495](https://microsoft.ghe.com/bic/lobster/pull/5495) is queued as `173387944` / `173387953`. Land #5495, merge/rebase `main` into #5422, then refresh required checks/review; GitHubPop remains a user action. |

### 4. Execute the #5336 convergence series

Lobster #5336 is the #3897 convergence brief and umbrella contract. It:

- defines the Lobster-owned `scout-standard` composition;
- replaces failure-driven exec workarounds with typed capabilities;
- reuses runtime MCP identity and approval rails;
- assigns ownership across OpenClaw, Lobster, WorkIQ, and Desktop;
- records migration/deletion and regression-proof requirements.

V1 leaves `tools.profile` unset and generates one exact Lobster-owned
`tools.allow`; it does not wait for `productivity`. A later migration may adopt
the released profile only after quarantine, reviewed tool-set delta, drift,
atomicity, rollback, and deletion proof.

Drive its implementation series as:

1. OpenClaw exec-mode policy guard and Lobster pin/patch integration.
2. Generated `scout-standard` inventory with one effective model-visible tool
   list assertion.
3. Bounded, profile-free structured workspace inspection via draft Lobster
   [#5505](https://microsoft.ghe.com/bic/lobster/pull/5505), using the existing
   generic `execute_code` namespace rail rather than shell recipes.
4. Native WorkIQ `M365.messages.saveAttachment(...)` integration, tracked by
   draft Lobster #5349 until the upstream package exposes it.
5. Typed `Diagnostics.fileBug(...)` over the existing consent-gated runtime
   rail, tracked by Lobster #5346.
6. Phase 2 exact acquired-connector/tool-selector binding plus governed GitHub
   Issues and Azure DevOps Work Items connector/skill pairs.
7. Post-V1 migration from duplicated core `tools.allow` entries to released
   OpenClaw `productivity`, retaining exact Lobster additions in `alsoAllow`.

#4297 and #4648 remain complementary node-mode convergence slices and should
reuse the same ownership, approval, diagnostics, and no-exec-workaround rules.

### 5. Promote the first Claws-bearing OpenClaw release

The existing Lobster [#4528](https://microsoft.ghe.com/bic/lobster/pull/4528)
promotes OpenClaw `2026.6.11`; it is not the Claws carrier.

After the Claws stack lands:

1. wait for an OpenClaw release containing the merged stack;
2. observe the required seven-day quarantine;
3. let PromoteClaw create or update the next version-bump PR;
4. validate patch deletion/carry-forward, image startup, Gateway, Teams, and
   version proof;
5. target Lobster pickup roughly two weeks after upstream landing.

## Issue Exit Plans

| Issue | Rendezvous exit                                                                                                                                                                |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| #551  | Claws merged upstream; #4982 and #5045 driven to merge; #5211 disposition recorded; next quarantine-cleared PromoteClaw pickup scheduled.                                      |
| #3897 | #5336 merged as the convergence brief/contract; its first implementation tracks opened or driven; #4297 and #4648 aligned as node-mode slices.                                 |
| #867  | Focused MAC Scout enable/disable PR [#5422](https://microsoft.ghe.com/bic/lobster/pull/5422) opened with tenant-admin authorization and state proof; next drive checks/review. |
| #862  | #4297 merged and the focused offline-node remediation PR opened and driven.                                                                                                    |

## Operating Rules

- Do not manually queue Lobster ADO; required checks attach automatically.
- Drive stacked PRs from the bottom.
- Use exact-head review and CI state; ignore obsolete-head review text only
  after proving the finding is addressed.
- Do not claim the Claws feature is present in Lobster until the
  quarantine-cleared OpenClaw promotion lands.
