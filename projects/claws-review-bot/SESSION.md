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
- Experimental lane: ClawPilot issue classification in `gim-home/m`.
- Local notes repo: `C:\src\claws-hapi`.
- Related checkout: `C:\src\clawpilot`.
- Main tracking files: `projects/claws-review-bot/rules.md`,
  `projects/clawpilot/SESSION.md`.
- Relevant skill: `clawpilot-issue-loop` for live GitHub issue work.

## Current Session

- Last updated: 2026-07-23.
- Last agent: Copilot.
- Current focus: review guidance now checks that dangerous features have
  independently operable kill switches and that flighting is exceptional,
  bounded, and removed after stability.
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
- Active branch / PR: `claws-hapi` local `main`; no PR recorded for the runtime
  guidance update.
- Known dirty state: pre-existing unrelated project notes remain; this update
  touches only `packages/claws-review-bot/voice/{voice,code,watches}.md`,
  `packages/claws-review-bot/tests/voice.test.ts`, and this session note.
- Blocking question: none.

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
