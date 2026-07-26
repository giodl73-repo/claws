# Localization Project Session

## Agent Start

1. Read this file.
2. Read `projects/localization/README.md`.
3. Read `projects/localization/source-audit.md`.
4. Check live OpenClaw source and issue state before acting.

## Baseline

- Area: OpenClaw localization
- Primary repo: `openclaw/openclaw`
- Local worktree: `C:\src\openclaw-localization`
- RFC repo/worktree: `C:\src\openclaw-rfcs-localization`
- Current branch: `user/giodl/rfc-0024-localization-runtime`
- Main tracking file: `projects/localization/rfc-0024-pitch.md`
- Skill to use: `faces-development-loop`

## Current Session

- Last updated: 2026-07-26
- Last agent: Codex
- Current focus: RFC 0024 is accepted and merged. Patrick Erichsen
  (`Patrick-Erichsen`) remains the primary reviewer for the correctness-clean
  implementation stack. Vince and Peter remain requested only on their narrower
  Gateway/Control UI and trusted-automation decision surfaces. Land the
  foundation and PK0 dependencies, supervise the first credentialed refresh,
  and do not start another registry package if that rollout gate fails. The
  projected 47-entry registry is an editable source audit, not a fixed PR quota
  or a runtime registry.
- Active branches / PRs: accepted RFC
  [#42](https://github.com/openclaw/rfcs/pull/42), implementation tracker
  [#113105](https://github.com/openclaw/openclaw/issues/113105), authoring exemplar
  `user/giodl/localization-authoring-exemplar`
  ([#112784](https://github.com/openclaw/openclaw/pull/112784)); surface gate
  `user/giodl/localization-surface-adoption-gate`
  ([#112801](https://github.com/openclaw/openclaw/pull/112801)).
- RFC revision checkpoint: commit `ff8d1afd438` was pushed on 2026-07-21. It
  removes the fixed cumulative ten-PR landing arc, treats #111541-#111545 as
  implementation evidence, separates RFC acceptance/foundation/product gates,
  scopes review evidence to message families (including descriptor fallback
  templates), defines selector-compatible Gateway English projection, and adds
  deterministic localized-metadata limits. The PR overview was republished and
  ClawSweeper re-review requested at the exact head; PR #42 remains draft.
- Projected-slice checkpoint: RFC 0024 now carries
  `rfcs/0024/projected-owner-slice-registry.md`, with 44 unique entries across
  foundation evidence, operator surfaces, runtime safety, metadata/channels,
  UI/native/docs, and completion evidence. It applies the Doctor registry
  lesson without turning Doctor's 44 tracked checks into 44 localization
  implementations: each slice follows a real locale authority and owner
  boundary, may split or combine before implementation, and must delete or
  replace visible hardcoded or duplicated authority. The main RFC, runtime and
  coverage specs, implementation plan, and issue catalog all point at the same
  planning model. Relative links, unique-ID counting, `git diff --check`, and
  the independent dirty-patch review pass clean. Commit `07650588b77` is
  pushed to the RFC branch; PR #42's overview was updated and exact-head
  ClawSweeper re-review requested while keeping the PR draft.
- Patrick review checkpoint: Patrick agreed with surface-owned catalogs, one
  shared context contract, and locale-invariant machine semantics; he asked for
  a clearer problem statement and post-merge end state, and recommended
  replacing the custom ICU formatting portion with `intl-messageformat`. The
  RFC main text, runtime specification, and implementation plan now delegate
  shared JS/TS ICU formatting to that library, distinguish RFC acceptance from
  the concrete F01-F05 result, defer aggregate language-by-surface reporting to
  E43/E44, and describe the 44 projected slices as a Doctor-style queue worked
  down over time rather than 44 required PRs. Commit `67045fecdfc` is pushed;
  RFC PR #42's overview reflects the same end state and remains draft.
- Authoring-loop clarification: Patrick's CI and async-translation questions
  exposed two obligations that the RFC described but the projected registry did
  not name. `G45` is the
  credential-free blocking authoring/drift gate for explicitly adopted scopes,
  and `G46` is the trusted exact-source generation, validation, evidence, and
  generated-PR lane. Follow-up discussion exposed a third obligation: `G47`
  prevents newly enumerated product-string surfaces from remaining
  unclassified. The current audit therefore has 47 entries. `G47` is a
  build-time owner-adapter/disposition gate, not a repository-wide literal
  scanner; existing debt is baselined and new scopes must be adopted, mapped to
  a conforming pipeline, or explicitly dispositioned with an owner and reason.
- Final RFC proof: `git diff --check` and relative Markdown link validation
  pass. The final `codex review --uncommitted` closeout reported no contradictory
  or unimplementable contract after fixes for selector-sensitive English
  fallback, metadata limits, review-hash scope, and the attestation example.
- PR #111541 re-slice checkpoint: fresh current-main branch
  `user/giodl/localization-kernel-reslice` is pushed at `d610106d6c7`. It cuts
  the draft from 67 files/5,487 additions to 18 files/1,274 additions and 44
  deletions: the dependency-light locale/context/catalog kernel, package/build
  wiring, and the existing onboarding wizard as the sole production consumer.
  Coverage generation, Gateway, CLI, approval/safety, and Control UI migration
  are absent and remain later owner slices.
- PR #111541 proof: Node 24.15 WSL formatting is clean; 43 kernel, 16 wizard,
  and 19 dev-watch tests pass; the package emits all four `.mjs`/`.d.mts`
  entries; and `codex review --base origin/main` reports no actionable
  correctness regressions. Root `tsgo` reached two unrelated baseline/dependency
  errors in diagnostics-otel and `libphonenumber-js/min`, with no localization
  diagnostics. Windows hydration remains blocked by the configured feed lacking
  `@earendil-works/pi-tui@0.80.9`.
- Published PR #111541 was rewritten with the explicitly authorized
  `--force-with-lease` from `fe46c86b1f3` to `d610106d6c7`. The live PR is 18
  files/1,274 additions/44 deletions, remains draft, has an exact-head body and
  source-harness transcript, and passes the Real behavior proof gate. Stale
  Gateway/Web UI labels were removed by automation. ClawSweeper current-head
  review is active under the lease started 2026-07-22T00:48:51Z; do not call the
  PR ready until that edited-in-place review is checked.
- PR #111542 replacement checkpoint: fresh stacked branch
  `user/giodl/localization-updater-reslice` is pushed at `799fe933ca4`, based on
  #111541 head `d610106d6c7`. It replaces the 74-file/6,595-addition cumulative
  draft with a six-file updater dry-run vertical slice (315 additions, 28
  deletions): a process-scoped CLI adapter, bounded English/`zh-CN` catalogs,
  and localized human `openclaw update --dry-run` presentation. Canonical JSON
  actions/notes and operational values remain locale-invariant. Formatting and
  198 focused CLI/runtime tests pass; root `tsgo` has only the same two
  unrelated diagnostics-otel and `libphonenumber-js/min` errors; direct source
  proof renders the Chinese dry-run transcript and reports
  `JSON_INVARIANT=true`; `codex review --base d610106d6c7` found no actionable
  defects. The live #111542 branch remains untouched at `5e6a9c090e4` pending
  explicit authorization for the exact `--force-with-lease` rewrite.
- PR body repair: RFC #42 and implementation PRs #111541-#111545 were
  republished from real Markdown body files on 2026-07-21. Live bodies exactly
  match the formatted source files and preserve headings, lists, tables, code
  fences, exact-head proof, ownership evidence, and translation automation
  alignment. The canonical RFC body source is
  `files/pr-body-repair/fixed-rfc-42.md` in the active Copilot session state.
- Shared translation-run alignment: RFC #42 is published at `27d381accb5`.
  The RFC, runtime spec, coverage spec, implementation plan, and local
  completion-wave plan now define one source-pinned generation-evidence record
  while preserving owner-specific extraction, publication, and review policy.
  PR #111543 carries the contributor guidance at `c2663645370`, propagated to
  #111544 `446c381c4da` and #111545 `a45301919d2`. Their live bodies were
  republished from real Markdown files and exact-compared after publication.
- Pitch framing lesson: describe RFC 0024 as a shared localization capability
  around Vincent's working translation pipeline, not as a central platform
  taking ownership. Lead with the working owner system, state the missing
  reusable capability, and explicitly preserve each area's catalogs,
  workflows, rendering, publication, and review policy.
- PR 1 implementation: `user/giodl/localization-core` in
  `C:\src\openclaw-localization`; open as
  https://github.com/openclaw/openclaw/pull/109456.
- PR 2 implementation: `user/giodl/localization-runtime-safety` in
  `C:\src\openclaw-localization-runtime`, stacked from PR 1 commit
  `dcec9d09f7c`.
- PR 3 implementation: `user/giodl/localization-cli-runtime` in
  `C:\src\openclaw-localization-cli`, stacked from PR 2 commit `35654b88283`.
- Known dirty state: PR 1, PR 2, PR 3, and RFC implementation worktrees are
  clean. The recovered WSL Completion A worktree
  `/root/src/openclaw-completion-a-foundation` on
  `work/completion-a-foundation-5` has 11 modified files. Coordination notes
  under `projects/localization/` remain local to `claws-hapi`.
- Blocking question: owner confirmation for the semantics and ownership of
  Gateway localization metadata, channel-recipient locale storage, localized
  command metadata, and skill manifest fields. The wire-compatibility shape no
  longer requires a new top-level Gateway field.
- Review state: branch review against `origin/main` is clean after adding
  per-surface maturity rows, derived mandatory checks, comprehensive bidi
  control rejection, optional Gateway metadata, v1 scope boundaries,
  inferred-locale matching, and per-artifact catalog revisions.
- Final role closeout: all `.craft/roles/claws` tension clusters reviewed the
  current RFC. Accepted findings tightened recipient fallback, immutable
  catalog snapshots, safety evidence binding, rollback/drift status,
  plural/select support, TUI/runtime/setup coverage, and plugin boundaries.
  Final branch review reported no actionable issues.
- Implementation state: PR 1 is locally complete. The first vertical slice adds
  `@openclaw/localization-core` with the 22-locale registry, strict/inferred
  matching, immutable contexts and catalog snapshots, plural/select rendering,
  validation, Control UI `lang`/`dir`, stale-preference recovery, concurrent
  locale isolation, wizard consumption, and a generated explicit
  15-surface-by-22-locale coverage baseline with content-derived checks and
  deterministic registry/catalog revisions.
- Windows validation: Win32 MUI APIs return ordered BCP 47-style UI language
  names, while Node can expose the effective Windows locale through
  `navigator`/`Intl` even when `LANG` and `LC_*` are absent. The implementation
  now consumes the full browser preference list and falls back to runtime
  platform locale signals for process surfaces after explicit/environment
  precedence.
- Final `.craft/roles/claws` PR review: gateway runtime, platform operations,
  security, founder/simplicity, and maintainer lenses reviewed the actual
  uncommitted implementation. Accepted findings removed coverage governance
  from the runtime barrel, moved fallback interpolation into the renderer,
  cached plural rules, downgraded unsupported onboarding completeness claims,
  and added localization-core to dev watch paths. Deferred concerns about
  native OS adapters, protected-token semantics, dynamic bidi isolation, and
  deterministic runtime revision IDs remain later-slice design work rather than
  PR 1 blockers.
- Local proof: 78 focused core, coverage, revision, wizard, and Control UI tests
  plus 18 dev-watch tests pass; narrow core/UI type checks pass; package artifact
  build emits the declared `.mjs`/`.d.mts` exports. Final
  `codex review --uncommitted` reported no actionable findings after the role
  review fixes.
- Earlier fixes also reject candidate-only catalog keys, scope documentation
  revisions away from committed docs symlinks, cover Windows runtime locale
  signals, and wire coverage drift checking into the standard repository check
  graph. Full dependency reconciliation remains blocked by configured feed
  versions unavailable from the current package proxy.
- PR 2 prototype: the internal approval view-model boundary now uses stable
  `approval.*` keys for product-owned titles, labels, severity names, and
  decisions. Production remains English. Test-only Chinese and Arabic catalogs
  prove pending/resolved/expired phase selection, missing-key emergency English,
  bidi-control rejection, and exact preservation of commands, approval IDs,
  paths, decisions, and typed actions.
- Gateway compatibility audit: `ConnectParamsSchema` already has optional
  `locale`, and the Control UI sends `navigator.language`; do not add another
  connection locale field. Runtime TypeScript frame guards accept additive
  data, Swift `Codable` ignores unknown keys, and Android Gateway JSON explicitly
  sets `ignoreUnknownKeys = true`. Old strict `ResponseFrameSchema` validators
  would reject new top-level error fields, so the internal prototype stores
  optional `messageKey` and bounded scalar `messageParams` under the existing
  opaque `ErrorShape.details.localization` envelope while retaining reviewed
  English `message`. Both permissive and strict current validators accept this
  shape.
- Control UI prototype: an allowlisted Gateway error resolver consumes only
  recognized `details.localization` keys, bounds scalar parameters, and falls
  back to the server English message for unknown, malformed, or untranslated
  descriptors. Approval history now uses this resolver, but no production
  Gateway path emits localization metadata yet.
- RFC model update: the RFC branch now specifies
  `details.localization` rather than additive top-level `messageKey` and
  `messageParams` fields. The refinement commit is pushed to the fork branch.
- PR 2 Codex closeout: `codex review --uncommitted` is clean after regenerating
  the Control UI catalog-fallback baseline. Review-confirmed production Gateway
  emission and recipient-specific approval renderers remain intentional owner
  gates, not prototype omissions.
- PR 2 role closeout: Gateway runtime, CISO/security, founder/simplicity, and
  maintainer lenses reviewed the complete local model. Accepted fixes now
  reject bidi controls in English source catalogs, force incomplete approval
  safety catalogs to one reviewed English snapshot, preserve parameter
  forwarding, make known-error decoration idempotent, and share one Gateway
  message-key constant across server and Control UI. Broader PR 1 observations
  were rejected as outside the PR 2 uncommitted diff.
- Final post-role `codex review --uncommitted` reports no actionable correctness
  issues.
- Owner-decision package: the local RFC now states that
  `ConnectParams.locale` belongs only to the connected client, Gateway metadata
  uses one shared reviewed key registry with bounded parameters and idempotent
  projection, and incomplete safety catalogs collapse the entire presentation
  to one reviewed English snapshot.
- Owner provenance: `@steipete` authored and merged #103579 (durable Gateway
  operator approvals), #103679 (typed cross-channel approval actions), #108776
  (Control UI approval history), and #106441 (closed Gateway schemas). Treat
  him as the primary approval/Gateway/channel contract owner for the three PR 2
  decisions.
- Security review provenance: generic approval implementation files are not
  SecOps CODEOWNED, but `/docs/cli/approvals.md` is owned by
  `@openclaw/openclaw-secops`. Require approval-owner review plus SecOps
  attestation before shipping production non-English safety copy.
- Channel locale audit: the generic approval registry/runtime carries no
  reviewer locale. Microsoft Teams stores `activity.locale` in proactive
  conversation references and Telegram receives `language_code`, but these are
  adapter-specific hints, not a common recipient preference. Keep
  server-rendered channel approvals English in v1 unless an adapter owner
  explicitly approves its existing recipient locale.
- PR 2 commit `35654b88283` is pushed to
  `giodl73-repo/user/giodl/localization-runtime-safety`; no pull request has
  been opened. No production non-English catalog, Gateway schema change,
  Plugin SDK contract, or recipient-locale persistence has been added.
- PR 1 verifier follow-up: `scripts/control-ui-i18n-verify.ts` now compares the
  Control UI locale configuration with `OPENCLAW_LOCALES` minus Swedish instead
  of requiring literal union members in `ui/src/i18n/lib/types.ts`. This
  preserves the derived `Locale = Exclude<OpenClawLocale, "sv">` model. The
  verifier passes with zero fallback drift, and its focused tooling test passes
  12 tests with 2 skipped. Commit `e5cb283b032` is pushed to the existing PR 1
  fork branch.
- PR 3 first slice: added a process-scoped CLI localization adapter with
  reviewed English fallback and a production `zh-CN` catalog, then migrated
  `openclaw agent` validation, progress, attachment labels, in-flight/no-reply
  status, transient retry guidance, compact-command recovery, and embedded
  fallback diagnostics. Exact flags, commands, IDs, paths, URLs, upstream
  errors, `EMBEDDED FALLBACK:` markers, and JSON payloads remain literal.
- PR 3 coverage: `scripts/generate-localization-coverage.ts` now records the
  CLI catalog source under `src/cli/i18n/locales`, with English `source`,
  `zh-CN` `partial`, and every other locale `unsupported`.
- PR 3 proof: native Linux Node 24.15 source, source-test, and scripts type
  checks pass. Focused proof passes 3 CLI catalog tests, 78 agent-command
  tests, 4 localization coverage tests, and 103 cross-OS release-check tests.
  Final `codex review --uncommitted` reports no actionable findings.
- PR 3 ACP/capability slice: invalid ACP `--provenance`, the product-owned ACP
  bridge failure wrapper, and unknown capability IDs now use the same
  process-scoped CLI localization context. English behavior remains compatible;
  `zh-CN` renders translated guidance while preserving provenance mode tokens,
  capability IDs, and formatted upstream error details. Capability JSON output
  remains unchanged.
- PR 3 latest proof: native WSL Node 24.15 core, source-test, and scripts type
  checks pass. The CLI runtime, ACP, capability, and agent command suites pass
  204 tests total, the generated coverage manifest is current, and the final
  Codex uncommitted review reports no accepted or actionable findings.
- PR 3 shared validation slice: status/health timeout validation, tasks audit
  limit validation, and sessions compact inherited-option, max-lines, and
  timeout validation now use the process-scoped CLI catalog. Exact English
  punctuation remains compatible, while commands, flags, `<key>`, dynamic
  option ordering, and structured command output remain literal.
- PR 3 current proof: native WSL Node 24.15 core, source-test, and scripts type
  checks pass. The expanded runtime/CLI/agent set passes 240 tests, coverage is
  current, and the final Codex uncommitted review reports no actionable
  findings.
- Completion A recovery: resumed the existing WSL worktree
  `/root/src/openclaw-completion-a-foundation` at `0df14f7fb81`. Repaired a
  stale Gateway schema-validator test, a stale singular approval-error test,
  missing updater localization imports/context propagation, and an unused TUI
  footer helper that depended on the retired root `tui` config surface.
- Completion A focused proof: 437 Gateway, updater, TUI, Control UI, and skill
  presentation tests pass on Node 24.15; all 11 changed files pass
  `oxfmt --check`, and `git diff --check` is clean. The broad remote changed gate is
  blocked because Blacksmith lacks access to the `openclaw` organization and
  brokered AWS Crabbox is not logged in from WSL. Direct core `tsgo` produced
  no diagnostics but exceeded both the two-minute and five-minute local
  ceilings, so broad static proof remains inconclusive rather than green.
- Stack replacement checkpoint (2026-07-22): OpenClaw drafts #111541 through
  #111545 are bounded and remain draft. `F02` through `F05` now branch
  independently from the exact `F01` head rather than carrying one another.
- #111541 foundation head: `d610106d6c780f243d9fa0ad3ed5901bc018ae26`.
  Intended delta: the internal catalog/context kernel and onboarding wizard.
- #111542 updater head: `799fe933ca4b86944c51c5b8cbf8b1216e02b07a`.
  Intended delta: six files, updater dry-run localization, JSON invariance, 198
  focused tests.
- #111543 contributor-guide head:
  `e5fc30ec87af88b18c70ee1fa5844d35b2c864d5`. Intended delta: five files and
  201 additions; GitHub shows 23 files with `F01`. Mandatory coverage APIs and
  gates were removed.
- #111544 TUI status head: `b4487a43ef4f9c5c923de06838fe7ba36c55d0c6`.
  Intended delta: eight files, 363 additions, and 38 deletions. Sixty-one
  focused tests freshly pass; the earlier 22-test fake-backend PTY proof showed
  localized labels and ages with literal operational values. GitHub shows 26
  files with `F01`. The current PTY startup timeout reproduces on both the old
  and independent heads, so the earlier PTY proof remains historical rather
  than being represented as freshly green.
- #111545 Gateway descriptor head:
  `d31ad7a984194465e2670f632f60d692f9b7b3e4`. Intended delta: 14 files, 543
  additions, and 18 deletions. It owns only the reviewed
  `(INVALID_REQUEST, APPROVAL_NOT_FOUND)` descriptor and approval-page consumer.
  One hundred ten focused tests, the Gateway protocol build, and Control UI
  source verification pass directly on `F01`; GitHub shows 32 files. The
  generated `zh-CN` edit was removed after Codex
  review because locale-refresh owns generated catalogs; the final review is
  clean.
- PR body evidence files are under `projects/localization/pr-bodies/`. Every
  replacement was pushed with an exact force-with-lease and a current-head
  `@clawsweeper re-review` request. Do not mark the stack ready without owner
  feedback.
- Authoring exemplar checkpoint (2026-07-22): draft OpenClaw PR
  [#112784](https://github.com/openclaw/openclaw/pull/112784) is open from
  `user/giodl/localization-authoring-exemplar` at
  `0ff68aabbe2fc37fd239848a9f0fa6351d6b1090`. It implements RFC slices `G45`
  and `G46` together: a registry-scoped credential-free drift/malformed-catalog
  gate, strict enforcement for generated edits and manual runs, an exact-source
  trusted refresh workflow, validated source evidence, and a generated PR with
  auto-merge disabled. Wizard completion is the first adopted family and keeps
  its existing English, `zh-CN`, and `zh-TW` runtime copy.
- Authoring exemplar proof: catalog detect/check are green; 40 focused catalog,
  wizard, completion, and native-translation tests pass; actionlint and
  `git diff --check` are clean; final `codex review --uncommitted` found no
  actionable regressions. Full local Zizmor was unavailable because the WSL
  image lacks `python3-venv`. Blacksmith Testbox was blocked by organization
  authentication and brokered AWS Crabbox by missing login, so hosted proof is
  delegated to PR CI rather than represented as complete. The first hosted
  Zizmor run exposed template interpolation inside the YAML-anchored CI shell;
  follow-up commit `cdc2a516dd7` replaced it with `GITHUB_EVENT_NAME`, passed
  both local branch-selection paths, and triggered a fresh workflow audit.
- RFC PR #42 now points to #112784 and #112801 at head
  `23273611780c7f827008964e23d6a0b3cc094e73`. Every later product-string slice
  must bring both its scoped gate and owner-owned async refresh path, or prove
  that its existing workflow conforms. The RFC, implementation plan, coverage
  spec, issue catalog, projected registry, and live PR overview now define
  `G47`; validation found 47/47 unique IDs, all relative links resolve,
  `git diff --check` is clean, and `codex review --uncommitted` found no
  contradictory or unbounded requirement.
- Surface-adoption checkpoint (2026-07-22): draft OpenClaw PR
  [#112801](https://github.com/openclaw/openclaw/pull/112801) is open from
  `user/giodl/localization-surface-adoption-gate` at
  `358cf900b2fcbab7563c95585df5b70cddd66068`. It implements `G47` as a
  build-time owner-adapter registry, with the wizard catalog source as the first
  adopted disposition. New resources under an enumerated product-facing root
  fail until adopted, mapped to a conforming pipeline, or explicitly deferred,
  English-only, or platform-constrained with matching owner evidence. It does
  not scan arbitrary literals or add runtime state.
- Review topology checkpoint: #112784 now contains `F01`, the exact five-file
  `F03` contributor-ownership delta, and its 17-file exemplar (39 files shown
  by GitHub). #112801 adds the seven-file `G47` delta (42 files total). The
  previous F02/F04/F05 updater, TUI, Gateway, and approval ancestry was removed
  with atomic force-with-lease updates; all exemplar and G47 blobs are identical
  to the previously reviewed heads. #112784 shares the exact #111543 head, so
  the F03 dependency collapses normally after that PR merges.
- Independent foundation Workflow Sanity runs passed at the new heads:
  `29970266436` (#111543), `29970265729` (#111544), and `29970266562`
  (#111545).
- Surface-adoption proof: the live registry check, 14 focused surface/catalog
  tests, targeted strict TypeScript checking, actionlint, formatting, and
  `git diff --check` pass; final `codex review --uncommitted` found no actionable
  findings. Hosted Workflow Sanity runs `29969236537` (#112784) and
  `29969237178` (#112801) passed actionlint, Zizmor, interpolation,
  conflict-marker, and no-tabs checks. Broad CI is intentionally skipped while
  the fork PRs remain draft.
- Exact-head review checkpoint (2026-07-22): ClawSweeper generated complete
  review artifacts for RFC #42, #111543, #111544, #111545, #112784, and
  #112801, although its durable comment publication remained delayed. It found
  no code defect in the RFC, F04, G45/G46, or G47. F03's body now names the
  correct F01 comparison SHA and shows the exact five-file documentation delta
  so the cumulative GitHub stack is not mistaken for hidden runtime scope.
  G47's body now includes a fresh 2/2 fail-to-fix gate transcript. G45/G46's
  body explicitly records the security boundary: provider and write credentials
  are unavailable to untrusted PR code, and the first credentialed generated-PR
  run after merge is a rollout blocker for subsequent owner slices. F05 still
  requires an explicit Gateway/Control UI owner decision; that is not a code
  repair. Targeted same-head re-reviews were queued for #111543, #112784, and
  #112801 after these body-only evidence corrections; the command router
  acknowledged all three while durable review publication remained delayed.
- Follow-up review checkpoint (2026-07-22): refreshed ClawSweeper artifacts mark
  RFC #42, F03, F05, G45/G46, and G47 correctness-clean; G47's fail-to-fix proof
  is now sufficient. F04's reviewer correctly found that its PR body mentioned
  only `OPENCLAW_LOCALE` while the implementation also follows the RFC's
  `LC_ALL`/`LC_MESSAGES`/`LANG` precedence. The implementation is unchanged:
  RFC head `23273611780c7f827008964e23d6a0b3cc094e73` now explicitly limits that
  process-locale contract to owner-approved human CLI/TUI prose, and F04's body
  names the full precedence, structured-output boundary, merge gate, and tests.
  Re-reviews are queued for the new RFC head and unchanged F04 head. No local or
  WSL translation-provider credential is available, so G45/G46's first real
  write-capable generated-PR run remains a supervised post-merge rollout gate.
- F04 closeout: ClawSweeper run `29974022300` reviewed the unchanged exact head
  against the clarified RFC and corrected body, removed the earlier P1, marked
  the patch correct, and marked live-output proof sufficient. Its remaining
  gates are maintainer product approval and final rebase/integration review
  after F01, not a code change.
- Formal review routing (2026-07-22): RFC #42 now requests `vincentkoc` and
  `steipete`; F01 #111541 and F05 #111545 request `steipete`; G45/G46 #112784
  requests `vincentkoc`. All remain draft. G47 #112801 intentionally has no
  separate request until its exemplar is accepted. The first `gh pr edit`
  attempt hit GitHub's classic-project GraphQL deprecation on OpenClaw, so the
  implementation requests were applied and verified through the narrow REST
  requested-reviewers endpoint.
- Primary reviewer routing: Gio confirmed Patrick will review the whole stack.
  GitHub collaborator data maps him to `Patrick-Erichsen`; he is now requested
  on RFC #42, #111541-#111545, #112784, and #112801. Existing Vince/Peter
  requests remain as scoped owner decisions rather than co-ownership of every
  slice.
- Stakeholder status (2026-07-22): Patrick and Vince are aligned with the RFC
  direction and first exemplar. Record this as tacit stakeholder approval, not
  formal GitHub approval; RFC #42 remains draft until its review/merge state is
  explicitly changed.
- September 1 delivery forecast (2026-07-22): RFC head
  `6353740a02342aa57cbabb3c14569b8fdee39fc6` assigns all 47 projected registry
  entries exactly once across 16 dependency-safe packages from July 22 through
  September 1. The target cadence is about three completed packages per full
  week, with at most three active implementation packages. Packages reuse the
  shared per-repository authoring, disposition, and trusted-refresh machinery;
  they are not one PR each and do not create one gate per slice. Product
  completion counts only landed entries, source-proven deletions, or current
  conforming owner-pipeline evidence. Drafts, open generated follow-ups, and
  schedule-only deferrals do not count. RFC #42's body points at this exact
  head, Patrick remains the primary stack reviewer, and a ClawSweeper re-review
  was requested in comment `5053996993`.
- PK0 exact-head refresh (2026-07-22): the dependency chain is now F01
  [#111541](https://github.com/openclaw/openclaw/pull/111541)
  `8db13b6a306c0559a6a627143058cf349ecdfe74` -> F03
  [#111543](https://github.com/openclaw/openclaw/pull/111543)
  `0842d2a659b19db4eb767c1fdd5c9c2255860b49` -> G45/G46
  [#112784](https://github.com/openclaw/openclaw/pull/112784)
  `b2f01940080aee32775a02e15941e605970351d0` -> G47
  [#112801](https://github.com/openclaw/openclaw/pull/112801)
  `24b0d243d9fccb706bbbb12fcfd2396ba2ab3c8c`. All four branches were rebased
  in order with guarded force-with-lease pushes and remain draft. Patrick is
  requested on every PR; no Patrick review has landed yet.
- PK0 refreshed proof: F01 passed 78 focused tests and the full monorepo build.
  F03 passed the full documentation gate and explicit glossary comparison. The
  17-file exemplar passed 23 focused tests, clean and fail-to-repair catalog
  checks, direct and hosted actionlint, the full documentation gate, and the
  full monorepo build. The seven-file G47 delta passed the live registry check,
  14 focused tests, the two-case new-source fail-to-fix proof, actionlint, and
  the full documentation gate. GitHub reported no failed checks on any exact
  head at reconciliation time; broad CI remains intentionally skipped for the
  draft fork PRs.
- Proof boundary: Blacksmith Testbox rejected the authenticated organization
  and brokered AWS Crabbox returned HTTP 401, so exact-head code proof used the
  documented trusted-source WSL-local fallback. The aggregate workflow checker
  could not bootstrap Zizmor because this WSL image lacks Python `venv`; direct
  actionlint and hosted Workflow Sanity passed. The credentialed G45/G46
  translation-and-publication run remains a supervised post-merge acceptance
  gate because provider and write credentials are deliberately unavailable to
  pull-request code. Do not start the next owner package if that first trusted
  run fails.
- Exact-head re-review comments: F01 `5054099468`, F03 `5054166140`, G45/G46
  `5054255188`, and G47 `5054279577`.
- Full original runtime-stack refresh (2026-07-22): final topology inspection
  found F02/F04/F05 still based on the superseded F01 commit, so their unchanged
  owner deltas were also rebased onto exact F01 `8db13b6a306`. F02
  [#111542](https://github.com/openclaw/openclaw/pull/111542) is now
  `644cde0069b0662b54420098e642db286f322ef1`; 4 adapter and 202 updater tests
  pass. F04 [#111544](https://github.com/openclaw/openclaw/pull/111544) is now
  `70bacd6a553853c9880eaa050b37d85e71eab72d`; 61 focused and all 22 PTY tests
  pass. F05 [#111545](https://github.com/openclaw/openclaw/pull/111545) is now
  `55dd8249e94f77431fc107e1504a36aaf5b0b773`; 110 focused tests, the Gateway
  protocol declaration build, and Control UI source verification pass. All
  changed-file format and diff checks pass. Guarded force-with-lease pushes and
  exact-head PR-body refreshes completed; re-review comments are F02
  `5054343634`, F04 `5054348376`, and F05 `5054351044`.
- RFC acceptance (2026-07-23): Patrick confirmed in Discord that the clarified
  RFC and rollout model “all makes sense” with a thumbs-up reaction. The
  acceptance lifecycle created implementation tracker
  [#113105](https://github.com/openclaw/openclaw/issues/113105), changed RFC
  0024 to `status: accepted`, linked the tracker, and merged RFC PR
  [#42](https://github.com/openclaw/rfcs/pull/42) at exact head
  `267e575a67e74c6181438a74ae6199e7e3313168`. The squash commit on `main` is
  `faf2a3a5b1acf545a9ceaa80664c0caf8bdabcfb`. GitHub `main` was verified to
  contain the accepted status and issue URL. This is recorded as Discord
  product-direction approval, not a fabricated GitHub review.
- F01 ready-for-review refresh (2026-07-23): PR
  [#111541](https://github.com/openclaw/openclaw/pull/111541) is ready at exact
  head `80c986a800af28aea9f8af35d710e6436022b53f`. The follow-up commits replace
  the earlier custom plural/select evaluator with ICU catalog strings rendered
  by `intl-messageformat` 11.2.12, matching Patrick's central RFC feedback while
  retaining OpenClaw's bounded-profile validation, immutable snapshots,
  fallback, and bidi controls. Exact-head proof passes 45 core, 16 wizard, and
  19 watch tests (80 total), package build, lockfile supply-chain validation,
  the full monorepo build, and the three-line source-renderer demonstration.
  The dependency report records four added FormatJS packages, zero removals,
  and zero version changes. A fresh type-aware oxlint run is clean after the
  final static-analysis-only correction. Full current-head GitHub CI is green,
  including the aggregate `openclaw/ci-gate`; Dependency Guard is the sole
  expected policy-only failure pending a current admin/secops override requested
  from `@steipete`. Patrick remains the primary code reviewer. Final exact-head
  ClawSweeper re-review was acknowledged from comment `5064292765` and is queued
  behind the intermediate-head review lease.
- F01 multi-model repair (2026-07-23): GPT-5.5, Claude Opus 4.7, and Gemini 3.1
  Pro reviewed the 18-file foundation diff. Two GPT findings were reproduced and
  fixed at `80c986a800a`: process locale resolution again honors first-nonblank
  `LC_ALL`/`LC_MESSAGES`/`LANG` precedence (including `C`/`POSIX` English), and
  boolean message parameters are normalized before `intl-messageformat` so
  `false` cannot disappear and `true` cannot force whole-message fallback.
  Forty-two focused kernel/Wizard tests, direct runtime probes, formatting,
  oxlint, and `git diff --check` pass. Full exact-head GitHub CI is pending.
- Progressive slice guidance refresh (2026-07-24): merged RFC #42 remains
  unchanged; follow-up RFC PR [#49](https://github.com/openclaw/rfcs/pull/49)
  is ready at `a6bb5d727543793b03e40ec91c9548017a32aa26` with Patrick requested. It
  makes checked-in inventory, the public workflow index, nearest owner guidance,
  and required `CLAUDE.md` aliases part of each adoption slice instead of a
  final cleanup. The same PR now defines a change-type-to-gate matrix and a
  two-phase slice lifecycle: source enrollment is not completion while required
  generated artifacts or named review remain open, and `G47` is explicitly not
  a repository-wide raw-string scanner. The main RFC and #49 body now share a
  two-dimensional Mermaid adoption map using searchable implementation names.
  All 15 current product surfaces have separate boxes and converge on one
  adoption node. That node fans out to the owner source,
  `localization/surfaces.json`, and the disposition-specific third record:
  `localization/catalogs.json`, a named conforming owner pipeline, or an explicit
  exception rationale. The same slice also shows its public workflow index and
  nearest `AGENTS.md`/`CLAUDE.md` owner guidance. Shared-catalog and existing
  owner-pipeline maintenance remain visibly separate.
  A second, vertical example traces the real `wizard.completion.enable` message
  from reviewed English through the two registry records, source-PR detection,
  generated `zh-CN` validation, `catalogFamily`, `LocalizationContext`, and the
  final parameterized wizard output. It explicitly identifies the checked-in
  translation as human `bootstrap-reviewed`; the credentialed refresh remains
  a supervised post-merge rollout gate.
  The main RFC was reduced from 7,431 to 1,677 words by moving reference-level
  mechanics behind the normative sidecars. Its end state is now explicit:
  English plus 21 translation targets across 15 required surfaces means 315
  target cells, and only 315/315 is product-complete. The prior 313-cell
  exception was removed from the implementation and coverage sidecars;
  platform constraints remain visible blockers rather than reducing the goal.
  The runtime, coverage, and metadata sidecars now open with concise contract
  and ownership summaries and reflect the RFC's accepted status. The coverage
  spec enumerates the exact 15 implementation release-row IDs and distinguishes
  those fixed product rows from finer-grained owner/delivery registries. The
  main adoption diagram uses the same IDs; 15/15 match
  `REQUIRED_LOCALIZATION_SURFACES` in the implementation evidence branch.
  The wizard example now names every Git event: an English-only source PR runs
  credential-free registration and drift detection; its merge to protected
  `main` automatically starts the credentialed refresh; automation opens a
  separate generated translation PR; strict catalog checks and review precede
  merge and runtime rendering. This matches #112784's warning-only source-drift
  detection and strict generated-path validation without exposing provider or
  publisher credentials to untrusted PR code.
  A FACES role panel using `new-hire`, `power-user`, `platform-eng`,
  `gateway-eng`, `founder`, `ciso`, and `lorant-reviewer` found four clarity
  gaps and no architecture contradiction. The applied fixes state that 315 is
  the target rather than current shipped state, add generation/validation/review
  failure behavior, preserve distinct conforming owner workflows, and place
  owner artifact shipment between generated-PR merge and runtime rendering.
  Durable findings are in `rfc-0024-role-review-2026-07-24.md`.
  Exact-head validation reports 13 relative links with 0 broken, 47 unique slice
  IDs, a clean diff check, and two recognized GitHub Mermaid render targets. Codex
  inspected the full branch and reported no discrete correctness issue, but its
  wrapper timed out with exit 124, so no clean-exit claim is made. ClawSweeper
  re-review is queued; Patrick's GitHub review remains the explicit decision on
  mandatory slice-completion wording. G47
  [#112801](https://github.com/openclaw/openclaw/pull/112801)
  is `1a76a2b8cc9b54496ac9acd1a0dbf68d4a9b5d6a`; F02
  [#111542](https://github.com/openclaw/openclaw/pull/111542) is
  `6340a469c86e7f27ee6f78d870a4771ab843f0ed`; F04
  [#111544](https://github.com/openclaw/openclaw/pull/111544) is
  `a2ae362a6051193f9006d0da2421d216fc1177f4`; and F05
  [#111545](https://github.com/openclaw/openclaw/pull/111545) is
  `69e08dd0cf1879f2d1291293dac06d0241ff17da`. Focused runtime tests, registry
  validation, 6,163-link audit, formatting/lint, and final local Codex reviews
  pass. Current exact-head OpenClaw CI is otherwise healthy but is blocked by
  the expected dependency approval and a repository-wide Zizmor baseline on
  newly changed `main` workflows; localization branches do not change those
  flagged workflows.

- Hybrid authoring exemplar refresh (2026-07-24): RFC follow-up
  [#49](https://github.com/openclaw/rfcs/pull/49) is pushed at exact head
  `0e19881be5a456bfcbf29a81bcc87dbcaf471b08`. It replaces the earlier
  post-merge-only example with the accepted hybrid contract: drafts run no
  localization lane; ready forks and non-default-base PRs receive advisory
  drift detection; ready same-repository PRs targeting the default branch get a
  blocking, credential-free catalog gate; and a maintainer may dispatch trusted
  protected-main tooling to refresh the exact PR head in place. The publisher
  validates an open/ready/same-repo/default-base lease before generation and
  again before a force-with-lease push, stages only registry-owned generated
  paths, never executes PR-supplied scripts/actions/dependencies, and never
  approves or merges. Forks and cross-repository PRs retain the isolated
  post-merge generated-PR path.
- The executable exemplar
  [#112784](https://github.com/openclaw/openclaw/pull/112784) is pushed at exact
  head `7eb523febadf014dde2a8a28d7c5f4bc1fd71d04`. Its PR body, contributor/CI
  docs, nearest script guidance, workflow, CLI, and tests describe the same
  contract. Focused validation passes 238 tests with one Windows symlink test
  skipped, exact formatting and lint, Bash syntax for all changed workflow
  blocks, YAML parsing, current-catalog strict check and blocking drift probe,
  and `git diff --check`. Two independent review findings were fixed: blocking
  was narrowed to default-base PRs, and draft behavior was aligned with the
  repository preflight. The final bounded Codex review reported no actionable
  findings. The first hosted test-type run found optional YAML step inputs were
  dereferenced without narrowing in the new workflow test; commit
  `7eb523febadf` uses optional access, and its focused test and formatting proof
  pass locally; the exact-head hosted `check-test-types` rerun is green. Hosted
  `actionlint`, `localization-catalogs`, `native-i18n`, and `control-ui-i18n`
  checks are green; the remaining `dependency-guard` failure
  is the intentional addition of `localization-core` through `package.json`,
  `packages/localization-core/package.json`, and `pnpm-lock.yaml`, so it needs a
  current admin/secops approval rather than a code workaround. Vincent is
  already requested and is a configured dependency approver; Patrick remains
  the primary correctness reviewer. The branch is currently behind fast-moving
  `main`, and other hosted shards are still running.

- Current stack closeout (2026-07-24): PR #112784 remains at exact head
  `7eb523febadf014dde2a8a28d7c5f4bc1fd71d04`; its accidentally flattened PR
  body was rebuilt and now records the accepted hybrid contract and exact-head
  hosted proof. G47 PR #112801 was restacked onto that head and is now
  `21ac6762497217eca75670207bfa324aa8f0b126`. Review found and fixed an
  ownership-boundary bug: one surface can no longer exclude another complete
  declared root through an overlapping `excludedRoots` entry. Its exact-head
  suite passes 251 tests plus surface/catalog validation, formatting, lint, and
  diff checks; the final bounded review found no remaining actionable issue.
  Downstream owner slices were restacked onto the corrected G47 head and pushed
  with force-with-lease: F02 #111542 is
  `60e0de9afa141563c51d5d99d3b7ec5be4e7ce5f` (218 focused tests), F04
  #111544 is `acd71c77f6a1849abbeb5365bd31bf535db2c39d` (169 focused tests),
  and F05 #111545 is `987100503e47c8f0778893073af6cf66562ceedb`
  (51 focused tests plus Gateway protocol build). Their final bounded reviews
  are clean. F03 #111543 remains at
  `9f0e3e5be859517f0c230e9ddbb974c45d7048a4`; its PR body now makes the
  progressive acceptance boundary explicit: contributor guidance only, with
  runtime, registry, gate, and product-coverage work owned by the other named
  slices. All seven implementation PR bodies are readable and Patrick is
  requested as the primary reviewer. Current GitHub CI is complete on F01,
  F03, and #112784 and still rerunning on the four freshly restacked heads.
  `dependency-guard` is the shared expected policy failure; the additional
  `dispatch`, `label`, `auto-response`, and `Real behavior proof` results on
  older heads are repository automation/metadata lanes, not failed localization
  tests. RFC follow-up #49 remains ready at
  `0e19881be5a456bfcbf29a81bcc87dbcaf471b08` and is the normative source for
  the ready-PR in-place refresh contract and the progressive slice roadmap.

- Progressive landing decision (2026-07-24): keep all seven current PR
  boundaries rather than restacking solely to absorb F03 into the automation
  exemplar. The priority is a working system in flight: F01 runtime, F03 owner
  guidance, G45/G46 same-PR authoring/refresh, G47 new-surface enforcement,
  then the independent updater, TUI, and Gateway/Control UI owner slices.
  Because these are cumulative contributor-fork PRs whose GitHub base must be
  upstream `main`, downstream bot reviews currently see inherited prerequisite
  files. Review and land one dependency, restack the next onto current `main`,
  then rerun exact-head proof and bot review; do not treat inherited foundation
  findings as defects in the unique owner delta. Current-head GitHub CI is
  complete across all seven PRs with only the expected shared
  `dependency-guard` policy decision on the code stack. ClawSweeper artifacts
  confirm #112784 and #112801 are structurally correct but require human
  authorization for the dependency/trusted-workflow boundary; downstream
  artifacts mostly report the expected cumulative-stack ownership issue.
  G47 #112801 now includes an inspectable exact-head verbose transcript proving
  unregistered-source rejection and accepted adopted/deferred/conforming
  dispositions (12/12 tests), plus a live one-disposition repository check.
  Tracker #113105 was updated from the obsolete post-merge-only generated-PR
  story to the accepted hybrid loop, the exact progressive landing/restack
  order, the same-repository in-place rollout proof, the fork fallback, and the
  315-cell product target.

- F01 landing started (2026-07-24): #111541 remains mergeable at exact head
  `80c986a800af28aea9f8af35d710e6436022b53f`. All 142 hosted checks are
  complete; `openclaw/ci-gate` is green and `dependency-guard` is the sole
  failure. The current 18-file body already includes the scoped wizard source
  transcript, 80 focused tests, full build, and dependency report. The visible
  `status: needs proof` label comes from the superseded 67-file cumulative
  review rather than this head. A fresh exact-head `@clawsweeper re-review` was
  acknowledged at comment `5074608769` and remains queued behind bot capacity.
  A current exact-head dependency-approval request was sent to `@steipete` at
  comment `5074609836`; Patrick remains requested as primary correctness
  reviewer. Do not restack F03 until F01 actually lands.

- O08 authoring started (2026-07-24): draft PR
  [#113427](https://github.com/openclaw/openclaw/pull/113427) is open at exact
  head `d7813971de1b43b31708a7e04e4d414246aeb440`, stacked from G47
  `21ac6762497217eca75670207bfa324aa8f0b126`. Its unique 10-file delta adopts
  four `wizard.postInstallMigration` messages while preserving provider labels,
  paths, raw errors, commands, prompt defaults, migration execution, and config
  results. The slice exposed and fixed the source-PR lag contract: reviewed
  English families remain required, generated locale adapters may be empty
  until trusted refresh, and runtime uses whole-message English fallback rather
  than throwing. Fourteen focused tests pass; catalog detection exits 0 and
  reports exactly the two stale wizard targets. Fresh Codex autoreview found no
  actionable defect. Hosted changed checks could not acquire an OpenClaw
  Blacksmith lease; the trusted local fallback reached pre-existing base noise
  in the env-name ratchet (533 names versus budget 530), and O08 adds no
  production env name. Tracker #113105 now links the slice. Keep the PR draft
  and do not request Patrick until G47 lands and O08 is restacked onto main;
  because this is a fork source PR, generated translations arrive in one
  trusted post-merge follow-up PR.

- Review and ancestry checkpoint (2026-07-25): no Patrick review, dependency
  approval, or merge has landed. F01 #111541 remains mergeable at exact head
  `80c986a800af28aea9f8af35d710e6436022b53f`; `dependency-guard` is its sole
  substantive failing check, and its current-head ClawSweeper review remains
  queued. G47 #112801 received an exact-head review that accepts its owner-gate
  behavior proof and finds no G47-specific defect; it remains blocked on the
  inherited dependency authorization and trusted-workflow owner decision. O08
  #113427 received no code finding, remains draft, and needs a real exact-head
  wizard run showing English output and generated-locale English fallback before
  it is marked ready. Git ancestry confirms #112784 already contains current
  F01, and #112801 contains both current F01 and #112784. Rebasing those two
  before F01 lands would not clear Dependency Guard because their fork PRs are
  still compared with upstream `main`; restack them mechanically after each
  prerequisite lands.

## Resume Checklist

- Run: `git -C C:\src\openclaw-localization status --short --branch`
- Verify: `git -C C:\src\openclaw-rfcs-localization status --short --branch`
- Review: RFC 0024 sidecars and live issue state before changing slice order
- Compare: `lobster-localization-comparator.md` for OneLoc target scale versus
  actual product coverage
- Preserve: Lobster is a pipeline comparator, not OpenClaw's locale target
- Address: Arabic and Persian catalogs exist, but Control UI document language
  and direction do not currently follow locale
- Separate: release-locale ownership from representative script, shaping,
  segmentation, plural, expansion, and bidirectional conformance fixtures
- Foundation: PR 1 now specifies a browser/server-safe internal localization
  kernel with adapters and production consumers, not a type-only framework
- Plugin boundary: bundled plugins prove namespaced runtime catalogs; external
  metadata supports exact BCP 47 tags, while an external runtime-catalog seam
  requires Plugin SDK owner approval
- Update: this session file, `rfc-0024-pitch.md`, and the RFC implementation
  plan

## Guardrails

- Keep implementation work in an isolated OpenClaw fork branch, not
  `claws-hapi`.
- Do not translate protocol codes, command names, config keys, provider IDs, or
  model IDs.
- Do not replace structured error codes with translated free-form text.
- Treat safety prompts as product behavior requiring explicit fallback and
  compatibility semantics.
- Update this file at the end of a meaningful session.
- Do not overwrite active user changes or unrelated worktree state.

## Open Threads

- Obtain owner review for the `G47` follow-up in #112801, then use its adapter
  pattern when each later owner slice adopts a new product-facing source root.
- Obtain `@steipete` decisions on the prepared PR 2 contract questions:
  approve `details.localization` plus approval-not-found as the first emitter;
  confirm English-only cross-channel approval rendering for v1 unless an
  adapter owns an explicit recipient locale; and identify any additional
  approval-copy reviewer.
- Inventory user-visible runtime strings separately from logs, developer
  diagnostics, tests, and model-authored text.
- Compare extending the wizard catalog with introducing a runtime message
  catalog.
- Seek owner approval for `details.localization` as the backward-compatible
  Gateway error descriptor: stable code, reviewed English message, namespaced
  key, and bounded scalar interpolation parameters.
- Wire the approved locale source into the internal approval renderer only
  after recipient ownership is explicit; requester locale must not be assumed
  to equal reviewer locale.
- Decide whether the first production emitter should be approval lookup only,
  then wire `attachKnownGatewayErrorLocalization` at that owner boundary after
  Gateway/security-copy approval.
- Security-copy decision: ask `@openclaw/openclaw-secops` to define the
  attestation process for the first production non-English approval catalog.
- Collect formal owner reviews on RFC PR #42 and the exact-head implementation
  slices; keep them draft until those decisions are recorded.
