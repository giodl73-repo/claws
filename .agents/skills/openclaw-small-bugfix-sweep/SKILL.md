---
name: openclaw-small-bugfix-sweep
description: Fix only small, high-certainty OpenClaw bugs from a pasted issue/PR list after deep code review.
---

# OpenClaw Small Bugfix Sweep

Batch workflow for pasted OpenClaw issue/PR refs.
Execute, do not summarize.
Triage reviews, proves, and patches local fixes first; publishing waits for Peter's manual review.

## Peter Review Gate

Peter always wants to review code before commits.
Default flow:
1. Review each issue deeply enough to prove current behavior and root cause.
2. Fix only easy, high-confidence bugs with narrow ownership and focused proof.
3. Stop with the dirty diff summary, touched files, and test/gate output for Peter's manual review.
4. After Peter approves shipping, make one commit per accepted fix, with a changelog entry for each user-facing fix.
5. Pull/rebase, push, then comment and close only the fixed or explicitly triaged-closed issues.

Do not batch unrelated issue fixes into one commit. Do not push, create PRs, comment, close, label, land, merge, or otherwise publish during the review/prove phase.

## Companion Skills

Use `$gitcrawl` first, `$openclaw-pr-maintainer` for live GitHub hygiene, `$github-deep-review` posture for source tracing, and `$openclaw-testing` for proof. If `gitcrawl` is missing, use the `$gitcrawl` install bootstrap before falling back to live `gh`.

## Loop

For each ref:

1. Read live target with `gh`.
2. Target-refresh `gitcrawl` for the ref, then check related, duplicate, closed, or already-fixed threads.
3. Read body, comments, linked refs, changed files, current code, adjacent tests, and dependency contracts when relevant.
4. Trace the real runtime path.
5. For issues: fix locally only if this is a bug, current code proves root cause, the implicated path is clear, and a narrow patch is cleaner than refactor.
6. For PRs: decide `ready-to-merge`, `needs-fixup`, or `skip`; do not alter PR branches unless explicitly asked.
7. Add focused regression proof when practical for local issue fixes or PR readiness checks.
8. Run the smallest meaningful gate.
9. Continue until every pasted ref is fixed or classified.

No subagents unless explicitly requested.

## Skip If

- not a bug
- config/docs/workflow/release/support/dependency/product work
- repro or root cause is uncertain
- larger refactor or owner-boundary change is cleaner
- fix requires a new config key, manifest field, plugin/plugin SDK hook, provider/channel contract, CLI flag, env var, migration path, compatibility shim, fallback API, or cross-owner runtime seam without explicit maintainer approval
- already fixed on current `main`
- dependency behavior is guessed
- no focused proof is feasible

Skip with terse reason. Do not pad with low-confidence fixes.

## Maintainer Alert

Before implementing, approving, or shipping any scary surface change, stop and alert Peter explicitly. Include: the proposed new surface, affected owner boundary, why the issue cannot be fixed inside existing contracts, compatibility/blast-radius risk, and the owner who should confirm. Default owner alert to `@steipete` unless another maintainer is clearly responsible.

Treat config and plugin surfaces as sticky contracts. Do not smuggle them into a small bugfix because the code diff is short. If a candidate needs a new config key, plugin manifest field, SDK API, CLI/env knob, doctor/update migration behavior, or compatibility shim, mark it `needs-human` and wait for confirmation.

## Fix Rules

- owner module first; generic seam only when required
- existing patterns/helpers/types
- no drive-by refactors
- tests near failing surface
- docs only for changed public behavior
- no commit during the review/prove phase
- after Peter approves shipping, one commit plus changelog per accepted user-facing fix
- no push/create PR/comment/close/label/land/merge until Peter approves shipping after review

## PR Rules

- `ready-to-merge`: code is good, current head checked, required proof is green or clearly pending only external CI; list for maintainer merge or `@clawsweeper automerge`
- `needs-fixup`: small bug is clear, but PR branch needs changes; list exact files/tests and wait for explicit fix/push/automerge instruction
- `skip`: broad, stale, speculative, config/product/security/release, owner-boundary, or refactor-sized
- if source PR is untrusted/uneditable, do not create a replacement PR during sweep

## Output Shape

Ledger: `fixed-local`, `ready-to-merge`, `needs-fixup`, `skipped`, `needs-human`.
Final: issue files left on disk, PRs ready for merge/automerge, tests/gates, skip reasons.
