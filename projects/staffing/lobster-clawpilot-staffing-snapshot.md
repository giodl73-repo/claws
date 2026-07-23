# Lobster / ClawPilot Staffing Snapshot

Last refreshed: 2026-06-26

## Sources

- Local Git: `C:\src\lobster`, `C:\src\clawpilot` after
  `fetch --all --prune`.
- GitHub/GHE: `gh issue list` and `gh pr list` for
  `microsoft.ghe.com/bic/lobster` and `gim-home/m`.
- Planning baseline:
  `C:\src\lobster\project-lobster-vault\Weekly Status Updates\2026-04-10 Project Lobster Weekly Status - Week 1.md`.
- Prior BOM / role map: `docs/audits/project-lobster-bom.md`.

## Executive Read

The work is not evenly staffed by area. Runtime and cloud execution have strong
hands-on coverage in Lobster. ClawPilot/Scout has high throughput in desktop
UX/runtime, permissions, backend abstraction, automations, and M365 auth.
Admin/product-governance surfaces are less cleanly staffed: the explicit Lobster
`area/admin` tracker is mostly Adam-owned logistics and decision issues, while
recent admin-like implementation pressure is showing up inside Gio's policy,
feeds, marketplace, and Partner Center work rather than under a named admin DRI.

The admin gap hypothesis is supported, with a caveat: the gap is not "no one is
working near admin." It is "admin is not staffed as a coherent product and
engineering surface with a clear owner, even though multiple critical workstreams
depend on it."

## Sourced Team Baseline

From the 2026-04-10 Lobster Week 1 status:

| Squad                                                     | Named people                                                                       | Stated focus                                                                         |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Seed                                                      | Omar Shahine, Adam Sheppard, Kathy Keith                                           | Lobster lead / seed operations                                                       |
| Lobster Redmond                                           | Eduardo Piva, Daron Spektor, Galin Iliev, Brad Cleaver, Harry Ferguson, Ryan Gregg | WorkIQ/cloud execution, architecture, governance, systems, full-stack, extensibility |
| Teams                                                     | Alex Acebo, Steven Ickman, Alex Weingart                                           | Teams surface / integration                                                          |
| ClawPilot Oslo                                            | Jakob Werner, Stanislaw Wilczynski, Tom Underhill, Carmen Pfeil                    | Desktop runtime, Teams surface, security, workflows, scenario integration            |
| Cowork                                                    | Emmanuel Miranda-Steiner                                                           | Cloud host/runtime and infra alignment, listed as about 50 percent time              |
| Skills / plugins / evals / marketplace / self-improvement | Gio Della-Libera                                                                   | CraftWorks, skills toolchain, evals, marketplace, self-improvement                   |

Important constraint: this source establishes project squads, not formal HR
reporting lines. "People reporting under Omar" still needs an authoritative org
source before being used as a factual reporting-chain claim.

## Repo Statistics

### Lobster

Commit authors on `origin/main`, all currently visible history:

| Person / alias       | Commits |
| -------------------- | ------: |
| Harry Ferguson       |     467 |
| Ryan Gregg           |     271 |
| Eduardo Piva         |     206 |
| Brad Cleaver         |     116 |
| Adam Sheppard        |     100 |
| Galin Iliev          |      87 |
| Jesse Francisco      |      85 |
| Gio Della-Libera     |      78 |
| Daron Spektor        |      57 |
| Omar Shahine aliases |      64 |

GitHub issue authors, all issues:

| Login             | Issues |
| ----------------- | -----: |
| `harryf`          |    841 |
| `adamsheppard`    |    334 |
| `Ryan-Gregg`      |    158 |
| `Jesse-Francisco` |    102 |
| `dspektor`        |     89 |
| `edpiva`          |     66 |
| `Galin-Iliev`     |     40 |
| `Jakob-Werner`    |     15 |
| `carmen-pfeil`    |     14 |
| `Omar-Shahine`    |      6 |

GitHub PR authors, all PRs:

| Login             | PRs |
| ----------------- | --: |
| `harryf`          | 803 |
| `Ryan-Gregg`      | 322 |
| `edpiva`          | 238 |
| `bcleaver`        | 128 |
| `Jesse-Francisco` | 104 |
| `giodl`           |  85 |
| `dspektor`        |  65 |
| `Galin-Iliev`     |  63 |
| `adamsheppard`    |  56 |
| `Omar-Shahine`    |  18 |

Recent path pressure since 2026-04-01:

| Path prefix                       | Changed-file mentions |
| --------------------------------- | --------------------: |
| `src/lobster_runtime`             |                  4374 |
| `src/lobster_web`                 |                  2532 |
| `src/openclaw_container`          |                  2066 |
| `.pipelines/lobster_runtime`      |                   585 |
| `project-lobster-vault/Tech`      |                   577 |
| `src/dev`                         |                   440 |
| `project-lobster-vault/Knowledge` |                   386 |
| `.claude/skills`                  |                   311 |

Top issue labels:

| Label              | Count |
| ------------------ | ----: |
| `bug`              |   148 |
| `prod-error-scan`  |   133 |
| `needs-triage`     |    91 |
| `help wanted`      |    86 |
| `eng`              |    76 |
| `area/card-canvas` |    74 |
| `area/backend`     |    49 |
| `web`              |    47 |
| `codeclaw`         |    40 |
| `area/heartbeat`   |    34 |
| `Openclaw Parity`  |    27 |
| `area/admin`       |     7 |

Admin-specific issue signal:

| Issue                   | State  | Owner signal              | Title                                                                             |
| ----------------------- | ------ | ------------------------- | --------------------------------------------------------------------------------- |
| #686                    | Open   | Adam assigned             | Decide whether we need an admin experience built into an M365 or other 1P surface |
| #96                     | Open   | Adam assigned             | Obtain additional YubiKeys for the engineering team                               |
| #27, #26, #20, #19, #16 | Closed | Mostly Adam, #19 also Gio | Teams channels, vault access, ServiceTree/GitHub permissions, cross-repo tracking |

### ClawPilot / Scout (`gim-home/m`)

Commit authors on `origin/main`, all currently visible history. Aliases are not
fully normalized:

| Person / alias               | Commits |
| ---------------------------- | ------: |
| `github-actions[bot]`        |    1291 |
| Carmen Pfeil aliases         |    1872 |
| Stanislaw Wilczynski aliases |    1140 |
| Jakob Werner aliases         |     439 |
| Tom Underhill aliases        |     438 |
| Dino Ilic aliases            |     419 |
| Cyrus Mushira                |     116 |
| Victor Chakraborty           |      48 |
| PVRC Subhash aliases         |      61 |
| Omar Shahine aliases         |      40 |
| Lorant Domokos               |      25 |

Recent commits since 2026-04-01:

| Person / alias               | Commits |
| ---------------------------- | ------: |
| `github-actions[bot]`        |     830 |
| Carmen Pfeil aliases         |    1238 |
| Stanislaw Wilczynski aliases |     545 |
| Tom Underhill aliases        |     313 |
| Dino Ilic aliases            |     266 |
| Lorant Domokos               |      25 |
| Omar Shahine aliases         |      40 |
| Jakob Werner                 |      20 |

GitHub issue authors, all issues:

| Login                    | Issues |
| ------------------------ | -----: |
| `jawerne_microsoft`      |    311 |
| `carmenberndt_microsoft` |    223 |
| `tomun_microsoft`        |    146 |
| `stwilczy_microsoft`     |     78 |
| `erholt_microsoft`       |     72 |
| `diilic_microsoft`       |     71 |
| `elchang_microsoft`      |     68 |
| `lodomoko_microsoft`     |     62 |
| `giodl_microsoft`        |     21 |
| `omars_microsoft`        |     19 |

GitHub PR authors, all PRs:

| Login                    | PRs |
| ------------------------ | --: |
| `carmenberndt_microsoft` | 409 |
| `stwilczy_microsoft`     | 287 |
| `diilic_microsoft`       | 136 |
| `jawerne_microsoft`      | 123 |
| `tomun_microsoft`        | 109 |
| `omars_microsoft`        |  57 |
| `lodomoko_microsoft`     |  46 |
| `pasubhas_microsoft`     |  29 |
| `matthewlehew_microsoft` |  27 |
| `giodl_microsoft`        |  11 |

Recent path pressure since 2026-04-01:

| Path prefix              | Changed-file mentions |
| ------------------------ | --------------------: |
| `src/features`           |                  2879 |
| `electron/backend`       |                  1386 |
| `electron/ipc`           |                   704 |
| `docs/architecture`      |                   648 |
| `src/shell`              |                   346 |
| `common/ipc-contract.ts` |                   279 |
| `electron/sessions.ts`   |                   272 |
| `electron/m365`          |                   245 |
| `electron/auth`          |                   184 |
| `electron/onedrive`      |                   154 |

Top issue labels:

| Label                    | Count |
| ------------------------ | ----: |
| `needs-triage`           |  1320 |
| `bug`                    |   462 |
| `needs-human-validation` |   317 |
| `enhancement`            |   307 |
| `resolved-by-sweep`      |   237 |
| `partially-done`         |   146 |
| `p1`                     |   143 |
| `needs-investigation`    |   133 |
| `security`               |   123 |
| `area: permissions`      |    25 |
| `gateway`                |    29 |
| `area: automations`      |    10 |
| `area: m365-auth`        |     9 |

## Area Map

| Area                                        | Evidence                                                                                                                                                               | Current coverage read                | Gap read                                                                                                                                                                    |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lobster runtime / cloud execution           | Lobster path pressure led by `src/lobster_runtime`; Eduardo, Harry, Ryan, Brad, and Daron appear repeatedly in runtime/cloud PR and issue activity                     | Strong coverage                      | Risk is coordination and integration priority, not lack of hands                                                                                                            |
| OpenClaw container / adapter                | Lobster `src/openclaw_container` high churn; BOM maps adapter/container to Omar/Adam, later runtime work to Eduardo/Harry/Ryan/Gio                                     | Active but spread across many owners | Needs clearer DRI for adapter/container product contract and default config/policy posture                                                                                  |
| ClawPilot desktop runtime / local node host | ClawPilot top commit/PR owners Carmen, Stanislaw, Tom, Jakob, Dino; active IPC/backend/features paths                                                                  | Strong throughput                    | Risk is review/merge bandwidth and cross-platform validation, not staffing volume                                                                                           |
| Permissions / policy / governance           | Lobster Galin/Ryan/Gio/Omar signals; ClawPilot `area: permissions` and gateway labels; many policy PR stacks                                                           | Active but fragmented                | Needs named cross-repo owner for policy semantics across Lobster, ClawPilot, WorkIQ-related product mentions, and admin UI                                                  |
| M365 auth / Graph / WorkIQ mentions         | ClawPilot `area: m365-auth`; Lobster WorkIQ code-mode docs and gates; WorkIQ is useful as a search term inside Lobster/ClawPilot evidence                              | Good product/integration signal      | Product integration ownership is split; escalation path for auth/scope approval remains a gap                                                                               |
| Admin / tenant control / Partner Center     | Lobster explicit `area/admin` has only 7 issues, mostly Adam logistics; #686 remains open on M365/1P admin surface; admin requirements appear throughout product specs | Understaffed as a coherent area      | Clear staffing gap. Gio is currently filling implementation glue across policy, feeds, marketplace, and Partner Center-adjacent work without a named admin product/eng pair |
| Skills / marketplace / feeds                | Gio Lobster PR stack and project notes; ClawPilot issue/PR work around CLI and cloud architecture; Lobster feeds/policy stacks                                         | Strong Gio-driven push               | Bus-factor risk if no second owner is assigned for marketplace/admin-state integration                                                                                      |
| Observability / PR operations / CI          | Lobster Harry/Ryan/Eduardo/Brad/Daron PR activity; many open CI/runtime PRs                                                                                            | Strong reactive coverage             | Needs triage discipline and stale PR closure, but not the first staffing gap                                                                                                |
| Design / user-facing product surface        | Jesse and ClawPilot frontend contributors active; issue labels include design-owned / needs-design                                                                     | Some coverage                        | Admin UX and enterprise control-plane UX are less covered than consumer chat/shell UX                                                                                       |

## Staffing Gaps

1. Admin control plane: needs a named product DRI and engineering DRI. Scope
   includes tenant/global settings, M365/1P admin surface decision, Partner
   Center registration, managed policy baselines, skill/feed approvals, and
   admin-visible audit/override state.
2. Cross-repo policy semantics: governance exists in pieces, but the same
   policy concepts span Lobster runtime gates, ClawPilot local execution,
   WorkIQ-related product mentions, skill marketplace approval, and admin UX.
3. Marketplace/feed admin state: current work is concentrated in Gio's Lobster
   PR stack. Assign a second engineer or reviewer who owns the admin-state
   contract, not just runtime review.
4. Org evidence: repo data shows contributors and squads, but not who formally
   reports to Omar. Do not overstate reporting lines until confirmed.
5. Label hygiene: Lobster admin work is under-labeled. `area/admin` undercounts
   actual admin/control-plane pressure because much of it appears under policy,
   feeds, runtime, and product specs.

## Recommended Next Pass

1. Normalize people aliases into a canonical roster.
2. Build a matrix by area: commits, PRs, issues filed, issues assigned, open PRs,
   review load, and named DRI.
3. Pull current open issues for admin/policy/permissions/gateway/m365-auth and
   classify them as product decision, implementation, compliance, release, or
   support.
4. Confirm reporting lines from an authoritative source before saying "under
   Omar" in a leadership-facing artifact.
5. Turn the admin gap into an ask: one product owner, one engineering owner, and
   one backup reviewer for the Lobster admin/control-plane surface.
