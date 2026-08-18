# Claws Review Bot Session Context

## Agent Start

1. Read this file.
2. Read `README.md`.
3. Read `rules.md`.
4. Check live issue/comment state in `gim-home/m` before making issue updates.

## Baseline

- Area: project wrapper for the existing `@bic/claws-review-bot`.
- Package path: `packages/claws-review-bot`.
- Azure job: `claws-review-bot-job`.
- Primary lane: Lobster PR review.
- Secondary lane: LobsterClaw PR review for non-`giodl` authors through
  `claws-review-bot-lobsterclaw-job`.
- Experimental lane: ClawPilot issue classification in `gim-home/m`.
- Local notes repo: `C:\src\claws-hapi`.
- Related checkout: `C:\src\clawpilot`.
- Escalation delivery runtime:
  `C:\src\lobsterclaw-runtime-2026.6.33`, pinned to LobsterClaw
  `release/2026.6.33` at `566fd90276b2b468387c012c5981ac30ac1581ea`.
- Main tracking files: `projects/claws-review-bot/rules.md`,
  `projects/clawpilot/SESSION.md`.
- Relevant skill: `clawpilot-issue-loop` for live GitHub issue work.

## Current Session

- Last updated: 2026-08-18.
- Last agent: Copilot.
- Current focus: operate the Lobster reviewer reliably while reducing
  low-value repeat reviews and token spend through prioritization, cooldowns,
  and deduplication; extend the same exact-head review behavior to
  LobsterClaw PRs filed by other authors, then deliver human-decision
  escalations through the pinned LobsterClaw OpenClaw runtime and Teams.
- 2026-08-17 escalation runtime decision:
  - Use LobsterClaw's immutable `release/2026.6.33` lineage rather than a newer
    upstream OpenClaw worktree.
  - Registered clean detached runtime worktree
    `C:\src\lobsterclaw-runtime-2026.6.33` at exact head `566fd90276`.
  - The pinned generation reports version `2026.6.33` and contains Microsoft
    Teams proactive messaging plus cron scheduling.
  - Restored dependencies with Node `24.19.0` and pnpm `11.2.2`, built the
    runtime, and built the Teams package-local CJS entrypoints required by the
    bundled channel loader.
  - Created isolated state at
    `C:\Users\giodl\.openclaw-claws-escalation`; config validation, secret
    audit, and Doctor lint are clean. Its loopback Gateway is live on port
    `18791`, with authenticated hooks restricted to `claws-escalation`.
  - Removed the incorrect personal GitHub Copilot model route. The escalation
    agent now uses corporate Microsoft Foundry deployment
    `microsoft-foundry/gpt-5.4-mini` from the `lobster-shared` Azure OpenAI
    resource in tenant `72f988bf-86f1-41af-91ab-2d7cd011db47`.
  - `giodl@microsoft.com` has management-plane Contributor access but lacks the
    OpenAI Responses data action for Entra bearer calls, so the runtime uses the
    corporate resource API key from the restricted state-local secret file.
    No personal GitHub or personal Azure model credential remains in this
    isolated runtime.
  - Direct OpenClaw and authenticated public-hook proofs both completed on
    `microsoft-foundry/gpt-5.4-mini`; the Gateway and public tunnel are live.
  - Installed Microsoft Teams CLI `3.1.0-preview.4`; no tenant login exists yet,
    so app registration, bot credentials, app installation, and the first DM
    conversation reference remain blocked on interactive Teams authentication.
  - Installed Microsoft Dev Tunnel CLI, authenticated through the Windows Entra
    session, and created persistent tunnel `claws-escalation.usw2`. The live
    endpoints are `https://6618nkpq-18791.usw2.devtunnels.ms` for authenticated
    OpenClaw hooks and `https://6618nkpq-3978.usw2.devtunnels.ms/api/messages`
    for the future Teams bot. External health succeeds and unauthenticated hook
    requests receive HTTP 401.
  - Added state-local `gateway.ps1`, `tunnel.ps1`, and interactive
    `complete-setup.ps1` launchers. The completion script refreshes the corporate
    Foundry key when Azure CLI auth is available, otherwise reuses the restricted
    state-local credential, probes the model, signs in to Teams, and verifies the
    existing managed-identity app and cloud endpoint. It no longer attempts to
    create a secret-backed app. `-ModelOnly` proves the model phase without
    starting the interactive Teams login.
  - The isolated plugin allowlist contains only `microsoft-foundry` and
    `msteams`. Config validation remains clean.
  - Deployed passwordless Teams delivery to corporate Azure:
    - Container App `ca-claws-escalation` in `lobster-team`, pinned to image
      `openclaw-claws-escalation:2026.6.33-566fd90`.
    - User-assigned identity `id-claws-escalation` is federated to Teams app
      `55e13c0b-d9e3-45ba-8955-3519b8669bfb`; no client secret or certificate is
      used.
    - One public HTTPS hostname routes `/api/messages` to the Teams listener and
      `/hooks/*` to the authenticated Gateway.
    - Live SQLite runs on container-local storage because Azure Files SMB locks
      the OpenClaw state database. A consistent SQLite backup is checkpointed to
      Azure Files every 15 seconds and restored on restart.
    - Managed-identity federation uses issuer
      `https://login.microsoftonline.com/72f988bf-86f1-41af-91ab-2d7cd011db47/v2.0`,
      subject `1f7eb201-c02d-47fd-8b45-e654ea6953af` (the identity principal
      ID, not client ID), and audience `api://AzureADTokenExchange`.
    - Revision `ca-claws-escalation--0000002` is healthy. Public health
      returns 200, unauthenticated hooks and Teams posts return 401, the
      authenticated hook completed a real `microsoft-foundry/gpt-5.4-mini` turn,
      and the durable snapshot exists.
    - Teams app endpoint version `1.0.1` targets the Container App. The personal
      app install and first DM created destination
      `user:d2f8c77b-c261-481f-9f38-0fe7b1c674d0`; its stored public-cloud
      conversation reference uses `https://smba.trafficmanager.net/teams`.
    - Federation recovery released several old model/tool retries and produced
      duplicate alerts for the same PR. Root cause: the agent could call the
      `message` tool while hook fallback delivery was also enabled.
      `ca-claws-escalation--0000002` removes all agent tools, so only the final
      hook response is delivered.
    - Controlled proof
      `deployment-proof-20260818-managed-teams-v4-single-send` produced exactly
      one Teams DM at 07:27:13 Pacific; replaying the same candidate deduped.
  - ACR run `chm` built
    `claws-review-bot:teams-single-send-20260818` and deployed it to both
    reviewer jobs. Manual executions `claws-review-bot-job-qwfyqmv` and
    `claws-review-bot-lobsterclaw-job-u6g2sho` succeeded. Scanning and Teams
    delivery are active.
  - Implemented deterministic human-feedback escalation in
    `C:\src\claws-hapi-review-bot-escalation` on
    `user/giodl/claws-review-bot-teams-escalation`: trusted-source detection,
    requested-reviewer detection, Azure Blob dedupe/retry state, and bounded
    authenticated OpenClaw hook publishing. Package tests pass 22/22; lint,
    build, diff check, and independent code review pass. Local commit:
    `b4a9927102431e82082bc297768ce2eda48b4201`.
- 2026-08-16 LobsterClaw reviewer lane:
  - Created scheduled Container Apps job
    `claws-review-bot-lobsterclaw-job` using the same proven image, managed
    identity, Key Vault secret references, and one-review poll budget as the
    primary Lobster lane.
  - It polls `bic/LobsterClaw` at `7,22,37,52 * * * *`, posts review results,
    and skips PRs authored by `giodl`.
  - Four initial manual/scheduled executions succeeded, including automatic
    execution `claws-review-bot-lobsterclaw-job-29781787`.
- 2026-08-15 operational baseline:
  - Reliability is healthy: 97 executions and model calls in the last 24
    hours, 673 executions and 672 model calls in seven days, with zero poll or
    review-post failures.
  - The scheduled lane uses essentially its full one-review budget every 15
    minutes: 96 scheduled reviews per day, plus targeted runs when needed.
  - Last-24-hour outcomes were 59 blocking reviews, 18 minor-only reviews, four
    non-finding comments, and 16 formal approvals across 57 PRs. The visible
    review comments contained zero Critical, 132 Major, and 94 Minor findings.
  - Of 55 explicit re-evaluations, eight advanced to formal approval and 20
    more resolved at least one prior finding while retaining open work.
  - Model usage was 5.23 million tokens over 97 calls in 24 hours and 32.87
    million over 672 calls in seven days. The next optimization target is
    suppressing unchanged/redundant reviews without weakening exact-head
    re-evaluation and approval recovery.
  - Azure billing period 2026-08-05 through 2026-09-04: usage records through
    2026-08-15 show $50.89 for the bot ($49.09 model inference and $1.79
    infrastructure) and $53.68 for the whole subscription. The prior invoice
    was $0.00, but the Visual Studio Enterprise subscription has its spending
    limit disabled; at the recent roughly $5/day bot pace, the period projects
    slightly above the included $150 monthly credit.
  - Historical billing confirms prior overages:
    - 2026-05-05 through 2026-06-04: $310.45 subscription usage, including
      $254.69 for the bot; final invoice was $173.09 including $12.67 tax.
    - 2026-06-05 through 2026-07-04: $209.78 subscription usage, including
      $201.12 for the bot; final invoice was $64.49 including $4.72 tax.
    - 2026-07-05 through 2026-08-04: $148.48 subscription usage, including
      $139.98 for the bot; final invoice was $0.00 because usage stayed within
      the monthly Visual Studio credit.
- 2026-08-15 targeted re-review on Dino's Lobster PR `#8016`:
  - Initial architect review on `ff8a55e41` raised one blocking rollout
    decision and three minor factoring findings.
  - Dino recorded the MEMBER-authoritative decision to reuse
    `lobster.openclaw_workiq_office_agent_enabled` and fixed all three code
    findings on `180b4f0d2d`.
  - Targeted execution `claws-review-bot-job-oxxv98e` succeeded and submitted
    formal approval `174055901` on the exact current head with no open or new
    findings.
- 2026-07-28 targeted review on Galin's Lobster PR `#6036`:
  - Waited for the active scheduled execution to finish, then started targeted
    execution `claws-review-bot-job-uga7swc` with
    `tick bic/lobster#6036 --post`, preserving the live job template, env, and
    secret references.
  - The execution succeeded and posted architect review comment `210375776` on
    exact head `b7529b75f5`; no blocking findings were reported.
  - PR #6036 was already formally approved by the peer reviewer on the same
    exact head.
- 2026-07-23 kill-switch and flighting review guidance:
  - Added non-negotiable W12 for high-blast-radius features that mutate external
    state, automate actions, affect auth/data, migrate or destroy state, alter
    routing/providers, create fan-out, or materially increase spend/load.
  - A valid kill switch must halt the effect without a build/deploy, operate
    independently from flight assignment, be checked at the effect boundary,
    document owner/safe state, and prove the disabled path with a test.
  - Flighting is explicitly by exception: every flight needs a rollout
    question, bounded cohort, owner, signals, expiry/review date, and removal
    target.
  - Stable features must remove flight assignment, fallback branches, and dead
    code; retaining a mature flight requires current evidence and a near-term
    removal date.
  - The guidance does not require flags for ordinary low-risk, revert-trivial
    changes.
- 2026-07-16 targeted check on Lobster PR `#4890`:
  - ClawsBot had already re-evaluated Galin's response on exact head
    `1f7e89a022` in comment `203893661`: prior findings F1-F4 are resolved and
    new Major/block finding F-new1 requires an explicit maintainer decision on
    the durable owner-profile and adapter-contract rollout posture.
  - Targeted execution `claws-review-bot-job-zl1297b` succeeded and correctly
    skipped without duplicating the review because no newer author or
    authoritative maintainer response existed.
- 2026-07-15 targeted validation on Lobster PR `#4616`:
  - Started execution `claws-review-bot-job-tklv3iv` with
    `tick bic/lobster#4616 --post`, preserving the live job's env and secret
    references.
  - The execution succeeded and correctly skipped head `98314d42a`: no new PR
    author or authoritative maintainer response had appeared since the latest
    VClaws reevaluation, which still has F1-F4 open.
  - Created Copilot schedule `#1` at 30-minute intervals to trigger a targeted
    VClaws reevaluation when eligible evidence appears, recover a missing
    formal approval from an approval-equivalent verdict, and stop once `giodl`
    formally approves the current head or the PR closes.
- 2026-07-15 maintainer-triggered re-review fix:
  - Root cause: same-SHA re-evaluation only inspected PR-author conversation
    comments. Maintainer comments were neither triggers nor model input, so a
    required maintainer decision could not clear the gate without another
    commit.
  - Commit `499f051779` reads conversation comments, formal review summaries,
    and inline review comments; accepts only `OWNER`/`MEMBER`/`COLLABORATOR`
    maintainer responses; excludes bots and outsiders; and uses source-qualified
    storage lock keys to avoid GitHub ID-namespace collisions.
  - Replaced unsafe `gh --paginate` JSON concatenation with explicit
    page-by-page parsing for open PRs and all review-ledger endpoints.
  - Validation: targeted tests passed 8/8, TypeScript lint and build passed,
    and final autoreview returned no accepted/actionable findings.
  - ACR run `chj` built
    `clawsreviewbotacr.azurecr.io/claws-review-bot:maintainer-rereview-20260715`.
    The live job now uses that image with cron `*/15 * * * *`,
    `POST_COMMENTS=true`, and `MAX_REVIEWS_PER_POLL=1`.
  - First scheduled execution `claws-review-bot-job-29735355` succeeded from
    2026-07-15T13:15:00Z to 13:16:37Z.
- 2026-07-07 Azure reviewer-bot guidance update:
  - Added `maintainer-decision` as a blocking finding category in
    `packages/claws-review-bot/voice/voice.md` and `voice/grammar.md`.
  - The bot must not emit `:approve` or submit formal GitHub `APPROVE` while an
    architectural maintainer decision is still open.
  - The gate requires an authoritative maintainer PR comment naming the
    decision, choosing an option or override, and accepting stated risk.
  - Validated with `pnpm -C packages/claws-review-bot test`, `lint`, and
    `build`.
- 2026-07-07 Azure deployment:
  - Built and pushed ACR image
    `clawsreviewbotacr.azurecr.io/claws-review-bot:maintainer-decision-20260707`
    from a minimal clean context; ACR run `chg` succeeded.
  - Updated Container Apps job `claws-review-bot-job` in
    `claws-review-bot-rg` to that image, preserving schedule `*/15 * * * *`,
    `POST_COMMENTS=true`, and `MAX_REVIEWS_PER_POLL=1`.
  - Manual proof execution `claws-review-bot-job-0cq4nic` succeeded; logs show
    AOAI usage, one review posted for `bic/lobster#4115`, and
    `review budget reached (1/1)`.
- 2026-07-07 targeted Lobster reviews for Galin:
  - Scheduled poll `claws-review-bot-job-29724675` spent its one-review budget
    on `bic/lobster#4118`, so targeted job starts were used for `#4076` and
    `#4142`.
  - Direct ARM start required preserving the existing container env/secret refs;
    executions without env failed because `GH_TOKEN` was absent.
  - Successful targeted executions: `claws-review-bot-job-8hhvieo` posted
    `#4076` comment `198631441`; `claws-review-bot-job-20if07u` posted `#4142`
    comment `198631391`.
- 2026-07-08 approve-reeval bugfix:
  - Debugged `#4076` and `#4142`: `#4076` emitted an approval-equivalent
    reeval (`Still open: <none>.`) but did not submit a formal `APPROVE`;
    `#4142` correctly stayed non-approve with open Major/block findings.
  - Root cause: `isApproveVerdict` only matched plain `Still open: <none>`
    without bold markdown or trailing punctuation, then saw the resolved `F1`
    header and treated the verdict as non-approve.
  - Local fix updates the matcher and adds same-SHA recovery so an existing
    clean reeval comment can submit the missing formal approval without another
    LLM call.
  - Validation: `pnpm -C packages/claws-review-bot test -- tests/tick.test.ts`,
    `pnpm -C packages/claws-review-bot lint`, and
    `pnpm -C packages/claws-review-bot build` passed.
  - ACR run `chh` built
    `clawsreviewbotacr.azurecr.io/claws-review-bot:approve-reeval-20260708`;
    the Azure CLI exited nonzero only because Windows log encoding failed after
    the successful run. Updated `claws-review-bot-job` to this image, preserving
    schedule `*/15 * * * *`, `POST_COMMENTS=true`, and
    `MAX_REVIEWS_PER_POLL=1`.
  - Recovery execution `claws-review-bot-job-0mch0yh` succeeded and submitted a
    formal `APPROVED` review on `#4076` head
    `fd45d41afe84393e4cfab7b42efe94abf6868209` without another AOAI call.
  - `#4142` advanced to head `018723f149f069220abd66ae3d8ce6330e6a6d41`; the
    latest bot reeval still has F1-F7 open and the PR remains
    `CHANGES_REQUESTED`, so no approval is expected there.
- 2026-07-08 daily email digest:
  - Created Copilot schedule `#1` at `0 8 * * *` to email
    `giodl@microsoft.com` a daily Lobster PR review-progress digest.
  - Digest scope: open `bic/lobster` PRs, recent Claws Review Bot markers,
    approvals / changes requested, maintainer comments, required checks, and
    PRs needing Gio attention.
  - Sent a proof email via WorkIQ `/me/sendMail` with subject
    `Claws Review Bot daily digest proof - Lobster PR reviews`; Graph returned
    `202 Accepted`.
  - User feedback: first proof email was too long. Stopped schedule `#1` and
    replaced it with schedule `#2`, still at `0 8 * * *`, with a compact
    aggregate-first format: counts at top, max 8 Gio-action items, max 8
    progress items, max 10 blocked/waiting items, no full PR dump.
- Findings from first live pass:
  - Across 26 issues updated on 2026-06-22, there were 18 comments created that
    day.
  - `github-actions` authored 12 of those comments.
  - Existing automation patterns: 2 `m-agent:triage` duplicate-hint comments,
    4 `m-agent:validity-sweep` comments asking humans to confirm validity, and
    6 vulnerability workflow notices on #2629.
  - Human comments provided acknowledgement, repro/version details, deeper
    investigation, or human validation.
- 2026-07-04 reviewer distribution snapshot:
  - `bic/lobster` merged PRs authored by `giodl`: 107.
  - Unique merged PR approvals for `giodl` PRs: `edpiva` 72, `dspektor` 67,
    `Galin-Iliev` 43, `adamsheppard` 15, `harryf` 9.
  - Last 500 Lobster PRs with Codeclaw/Synthesis/EmmBot review markers were
    concentrated on authors `harryf` 111 unique PRs, `Ryan-Gregg` 70,
    `giodl` 70, `bcleaver` 57, `edpiva` 42, `dspektor` 37,
    `Jesse-Francisco` 32, `Galin-Iliev` 16.
  - Marker review accounts in that sample: `edpiva` 1401 submissions,
    `Galin-Iliev` 608, `emiranda` 176.
  - Interpretation: `giodl` receives regular review from the core bot/human
    reviewer cluster, but the broader review automation also spends heavily on
    Harry/Ryan/Brian/Eduardo/Daron/Jesse PRs; it is not only reviewing `giodl`.
- Proposed ClawPilot lane: issue classification should focus on
  regression/severity assessment, issue clustering, owner-area routing, and
  concrete next-action comments. It should avoid duplicate one-liners and
  generic validity sweeps.
- First manual pass completed on 2026-06-22:
  - Posted assessment comments on #3749, #3739, #3616, #3601, #3518, #3068,
    and #2939.
  - Skipped #3747 because the issue body already reframed it as design-gap
    feedback and the existing bot had linked the duplicate/design context.
  - Skipped #3505 because PR #3713 is already open and an assistant had claimed
    the fix path in the issue.
  - Skipped #2974 because the existing validity sweep found the evidence likely
    belongs to a different codebase/version.
  - Early rule: comment when the classifier adds owner routing, related PR/issue
    context, severity normalization, or a concrete next action; skip when it
    would only restate an existing duplicate/validity/claimed-fix thread.
- Active branch / PR:
  `user/giodl/claws-review-bot-teams-escalation` in
  `C:\src\claws-hapi-review-bot-escalation`; no PR or deployment yet.
- Known dirty state: the implementation worktree is clean at `b4a99271`.
  `claws-hapi` has extensive pre-existing unrelated changes; preserve them.
- Blocking question: interactive GitHub Copilot and Microsoft Teams logins are
  required before the agent can complete a model turn or register/install the
  Teams bot.

## Resume Checklist

- Run: `gh auth switch --hostname github.com --user giodl_microsoft`.
- Verify: `gh api repos/gim-home/m --jq '{full_name, permissions}'`.
- Refresh today activity:
  - `gh issue list --repo gim-home/m --state all --search 'updated:>=YYYY-MM-DD' --limit 200 --json number,title,state,updatedAt,labels,author,url`
  - Fetch comments for the updated set with `gh issue view <number> --json comments`.
- Review `rules.md` before commenting on issues.

## Guardrails

- Keep the first lane limited. Do not run against all open issues.
- Prefer comments and label recommendations over closing issues.
- Do not duplicate `m-agent:triage` duplicate hints or
  `m-agent:validity-sweep` comments.
- Do not comment on vulnerability workflow issue #2629 unless a security owner
  asks for a focused assessment.
- Use problem-led language and leave implementation choices to ClawPilot owners.

## Open Threads

- Follow up on maintainer reactions to the seven assessment comments and adjust
  the issue-classifier rules before automating.
- Decide whether to create a `regression` label family:
  `regression: suspected`, `regression: confirmed`,
  `regression: needs-version`, `regression: fixed-needs-validation`.
- Decide whether the ClawPilot classifier should add labels directly or only
  recommend them in comments during the first week.
