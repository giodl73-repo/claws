# PR-1 Staging Discipline

How this PR moves from this branch to `merged` upstream. Written so
the upstream reviewer's experience is predictable and so the work
log on this side stays clean.

## Pre-submission checklist

Run from the wave-hosting branch (`feature/hapi-the-bringer`) before
opening the PR:

- [ ] `git fetch upstream && git rebase upstream/main` — branch sits
  on the latest main with no merge commit.
- [ ] All three packages typecheck clean:
  `for pkg in oc-paths-substrate oc-paths-lint oc-paths-doctor; do
   (cd packages/$pkg && npx tsc --noEmit) || break; done`
- [ ] All three test suites green:
  `for pkg in oc-paths-substrate oc-paths-lint oc-paths-doctor; do
   (cd packages/$pkg && npx vitest run) || break; done`
- [ ] No `--no-verify` in `git log --reverse upstream/main..HEAD`.
- [ ] Every commit on the branch has a Co-Authored-By trailer
  acknowledging the AI assistance (per upstream PR_WORKFLOW.md).
- [ ] PR-1 body (`pr-drafts/PR-1.md`) numbers are current — test
  counts match what the suites report, no stale "X passing" lines.
- [ ] Review pack (`pr-drafts/PR-1-review-pack.md`) links resolve.

## Branch shape

The branch is a linear chain of small, single-purpose commits. Each
commit:

  - passes typecheck + tests on its own
  - has a one-line subject + structured body
  - follows the convention: `<type>(<scope>): <PANEL-LETTER><N> — <subject>`
    e.g. `fix(oc-paths-doctor): A3 — redact-secret-literal: setOcPath`

Panel-finding letters (`A`, `B`, `C`, `D`) map to severity tiers:
critical → improvements → care-and-feeding → nits. The reviewer can
read the branch as the response to the multi-persona review.

## Submission flow

1. **Open as draft**.
   Mark `[DRAFT]` in the title until pre-submission checklist is
   green. Lets the upstream maintainer see direction without
   committing review time.

2. **Self-review pass**.
   Read every line of the diff in the GitHub UI before flipping to
   ready-for-review. AI-assisted disclosure (D2) commits to this
   posture explicitly; honor it.

3. **Flip to ready-for-review**.
   Drop the `[DRAFT]` prefix. Add a short post-comment summarizing
   what changed since the last meaningful update (if any).

4. **CI must be green BEFORE asking for review**.
   The upstream `PR_WORKFLOW.md` explicitly notes "broken CI ==
   author hasn't finished." Honor it.

## During review

- **Inline review comments**: respond inline. If a finding requires
  a code change, push a new commit prefixed with `review:` (don't
  amend / force-push existing commits). Keeps review history
  intact.
- **Architectural concerns**: open a GitHub Discussion linked from
  the PR. Don't try to thread architectural debate inside an
  inline comment.
- **Out-of-scope requests**: politely decline + open a follow-up
  issue. The PR is scope-locked to what its title claims.
- **Force-push policy**: only after explicit reviewer ack. If a
  rebase becomes necessary (upstream main shifted, conflicts), do
  it as a single rebase + force-push with a comment explaining what
  changed. No silent force-pushes.

## Post-merge

- [ ] Drop the local `feature/hapi-the-bringer` branch only after
  upstream confirms the squash-merge SHA is in `main`.
- [ ] Document the merged SHA in
  `.craft/waves/.../PROGRESS.md` checkpoint.
- [ ] Close any wave-internal tasks tagged "blocks PR-1 merge".
- [ ] Schedule the follow-up PR-2 + PR-3 issues (referenced in
  `issue-drafts/`) into the next planning cycle.

## What "discipline" means here

The shape above isn't bureaucracy — every step exists because a
specific failure mode occurred at least once during the design
phase. The pre-submission checklist guards against the "stale
test-count in PR body" failure (which happened twice during this
wave, both caught by the panel review). The "no force-push without
ack" guard is direct from the upstream `PR_WORKFLOW.md` and is the
single most-violated rule for AI-authored contributions.
