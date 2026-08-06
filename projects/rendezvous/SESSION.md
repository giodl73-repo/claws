# Rendezvous Session Context

## Agent Start

1. Read this file.
2. Read `projects/rendezvous/README.md`.
3. Read the owning project session for the issue being advanced.
4. Check the live issue and linked PR state before posting an update.

## Baseline

- Area: Gio-owned Lobster M5 Rendezvous commitments due July 31.
- Primary repo: `microsoft.ghe.com/bic/lobster`.
- Local worktree: implementation varies by linked PR; tracking lives here.
- Current branch: none.
- Main tracking file: `projects/rendezvous/README.md`.
- Skills to use: `project-session`, `lobster-pr-ops`, and the owning project
  skill.

## Current Session

- Last updated: 2026-07-22.
- Last agent: Codex.
- Current focus: drive ready exec-observability/safety slice #5491, draft
  structured-workspace slice #5505, current-head node invocation #4648, and
  offline-node remediation #5460 while continuing the corrected profile-free
  #5336 convergence series.
- Active branches / PRs: Lobster #4648 at `59a3973ff2`; #5460 at
  `865df0ade7`; #5422 at `8feadccf92`; shared CI repair #5495 at
  `7d76d8ff68`; #5336 at `2f2644b0bb`; #5491 at `b5e5a25869`; draft #5505 at
  `7c0b20d633`; #5349 remains the native attachment integration follow-up, and
  #5350 has completed typed product-bug filing.
- Known dirty state: `claws-hapi` contains unrelated user/project changes; do
  not revert them.
- Blocking question: none at the design layer. #5336 now explicitly ships V1
  with no profile and one exact Lobster-owned `tools.allow`, then permits a
  separate migration to released/quarantine-cleared `productivity` only after
  delta, drift, atomicity, rollback, and deletion proof. The PR is mergeable;
  review was reset by the corrected push, `Lobster-Runtime-PullRequest` is
  queued, Build Validation is not yet attached, and `GitOps/GitHubPop` remains
  the known failing operational check.

### 2026-07-22 node and #551 execution

- Opened Lobster #5460 from current `main` for #862. It adds explicit
  offline-node recovery guidance and a focused regression; the 32-case
  catalog-inventory suite passes.
- Addressed #5460's deployable-bundle review blocker at `865df0ade7` by
  regenerating `nodes-code-mode/index.js` and asserting the runtime namespace
  prompt carries the same offline/reconnect stop rule. Catalog tests pass
  32/32, namespace tests 19/19, bundle syntax and generation parity pass, and
  `git diff --check` passes. Two local `codex review --uncommitted` attempts
  produced no findings but timed out without completing; refreshed PR review
  and CI are pending on the new head.
- Repaired Lobster #4648 after its runtime eval exposed `unknown_namespace`.
  The checked-in generated Nodes plugin bundle was syntactically invalid, so
  OpenClaw never registered the namespace and fell back to the native tool.
  Commit `fab956125d` regenerates a valid bundle and adds a Docker build-time
  `node --check`; merged current `main` and pushed exact head `b3b1399375`.
  Static packaging/wiring validation passes. Broader local plugin tests remain
  blocked by the incomplete sibling `agent-tools` checkout, and Rust tests by
  the missing private Cargo registry token; refreshed PR CI is authoritative.
- Closed draft Lobster #5211 and recorded the decision on #551. Outcome
  receipts are adjacent exploration, not an exit criterion for personal-skill
  creation or MCP registration/discovery/policy. #4982 and #5045 are merged;
  #551 now stays on the OpenClaw Claws landing, quarantine, promotion, and
  acceptance-validation path.
- Marked tenant-admin PR #5422 ready and repaired its exact ADO source
  failures at `00cad93f9f`: added the missing ECS settings inventory entry,
  removed `clone_on_copy`, and replaced unchecked `Instant` subtraction.
  ECS inventory, rustfmt parity/fmt, and diff checks pass. Local Rust
  compilation was abandoned after repeated silent Windows runner stalls; ADO
  PullRequest `173336513` and Build Validation `173336529` are queued on merge
  SHA `da84cfc78b` as authoritative proof.
- Addressed #5422's blocking review at `3ea5db5533`: when the explicit ECS
  availability gate is armed, a cold MOS3 error or missing resolver now fails
  closed with retryable `SCOUT_AVAILABILITY_UNAVAILABLE`; a later refresh
  failure still retains the caller's last-known decision. Added direct tests
  for missing resolver, cold failure, discovery/environment remap, token
  reacquisition, environment-specific title selection, fresh cache, and
  last-known fallback. Merged current `main` twice as it advanced and pushed
  `db566d456b`; its tree exactly matched PR merge `0342afec3e` at verification.
  Rustfmt and diff checks pass. The local runtime test build and Codex review
  runner timed out without findings. A current-head review then found one stale
  ECS schema comment; `8feadccf92` aligns it with the fail-closed/last-known
  contract. PullRequest `173354991` then failed only in auto-injected Component
  Detection amid infrastructure warnings; replacement `173385787` is queued on
  exact merge `b63b4647ac`. Build Validation `173355013` failed because the
  shared runtime image stage lacked `src/lobster_runtime/dist`, exactly matching
  current-main scheduled run `173356043`. This is not caused by #5422.
- Opened focused pipeline repair #5495 at `7d76d8ff68`. It restores the known-good
  `BuildWeb` dependency and published artifact download before the OneBranch
  Docker-pool runtime image task. Focused Build Validation contracts pass; the
  SDL validator and Python suites pass (117 tests, one skip), and diff checks
  are clean. Exact merge `f044795806` is queued in PullRequest `173387944` and
  Build Validation `173387953`. Merge #5495, merge/rebase current `main` into
  #5422, then obtain fresh required checks; both PRs still need GitHubPop user
  proof and review.
- Recovered the already-authored first #5336 implementation slice as Lobster
  #5491 rather than duplicating it. Current head `b5e5a25869` emits bounded,
  content-safe host-exec approval dimensions and prevents browser-local
  persistent auto-allow for `system.run`/`host_exec`. Its substantive review
  threads are resolved and Galin approved the exact head; it was promoted from
  draft to ready on 2026-07-22 and refreshed review was requested from edpiva
  and harryf. PullRequest `173385949` is queued; GitHubPop remains a user action.
- Live-head audit corrected stale handoff hashes: #5336 `2f2644b0bb` descends
  from recorded `be4b5f9402`, and #4648 `59a3973ff2` descends from recorded
  `ef505b0374`. No commits were lost. #4648 has an exact-head Galin approval;
  its sole unresolved inline is explicitly non-blocking forward hardening.
  #5460's blocking deployable-bundle feedback is fixed at `865df0ade7`, both
  threads are resolved, and Galin approved that head; displayed change requests
  are against the superseded pre-fix head and await reviewer refresh.
- Opened draft Lobster #5505 at rebased head `7c0b20d633` as the independent
  structured-workspace slice for #5336. It adds the profile-free, first-party
  `WorkspaceFiles.list/search/stat/gitStatus` namespace over the existing
  generic `execute_code` rail, plus its paired skill and image wiring. The
  implementation is read-only and bounded across traversal entries, per-file
  and aggregate bytes, matches, Git records, subprocess time, and code time;
  it rejects traversal, symlink/concurrent-replacement escapes, and external
  Git metadata. It uses GUID kill switch
  `550a4deb-fa81-4113-93d9-b857d7086cc9` rather than inventing an ECS profile
  or flag, with shared managed-start and `/shell`-first projection. Focused
  TypeScript tests pass 6/6, bundle drift, ECS inventory, rustfmt, and diff
  checks pass, and final `codex review --uncommitted` reported no actionable
  findings. Native-Windows aggregate Rust proof remains non-authoritative:
  existing Unix-only bridge targets fail and the cold runtime compile timed
  out; Linux PR CI is authoritative. The PR is currently mergeable/draft with
  FileAffordance passing, GitHubPop failing as the expected user-action gate,
  and no ADO checks attached yet. Do not manually queue ADO.

## Resume Checklist

- Run: refresh the four issues and linked PRs from `microsoft.ghe.com`.
- Verify: confirm whether posted July 21 issue updates remain current.
- Review: distinguish implementation already landed from plans, drafts, and
  merge-gated PRs.
- Update: this file and the live issue comment when scope, confidence, owner, or
  blocker changes.

## Guardrails

- Keep implementation work in the owning OpenClaw or Lobster worktree.
- Do not claim the broad #551 or #3897 acceptance criteria are complete based
  on a narrow proof of concept.
- Treat July 31 confidence as a delivery forecast, not a promise.
- Do not manually queue Lobster ADO; checks attach automatically unless the
  user explicitly requests a named exception.

## Open Threads

- #551: land Claws, then pick up and validate the first Claws-bearing release
  after quarantine through PromoteClaw. #4982/#5045 are merged and #5211 is
  closed as out of scope.
- #3897: reapprove and merge #5336 as the convergence brief/contract. The
  corrected design keeps `tools.profile` unset and generates one exact
  Lobster-owned `tools.allow` inventory for V1; no custom profile system is
  proposed. `productivity` is a post-V1 migration target, not a dependency.
  Drive ready PR #5491 as the first implementation slice and draft #5505 as the
  independent structured-workspace slice. Do not activate the exact
  profile-free configuration until #5336 is approved and normalized exec-mode
  policy support is released/pinned.
- #867: implement the MAC tenant availability control to enable/disable Scout;
  keep deployment administration separate from per-action user approval.
- #862: drive opened remediation PR #5460 through review and required checks.
