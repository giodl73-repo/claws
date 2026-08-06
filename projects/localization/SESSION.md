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

- Last updated: 2026-07-22
- Last agent: Codex
- Current focus: Patrick Erichsen (`Patrick-Erichsen`) is the primary reviewer
  for RFC #42 and the complete correctness-clean implementation stack. Vince and
  Peter remain requested only on their narrower architecture, Gateway/Control
  UI, and trusted-automation decision surfaces. Do not start another registry
  slice until its recorded owner and dependency gates are satisfied. The
  projected 47-entry registry is an editable source audit, not a fixed PR quota
  or a runtime registry.
- Active branches / PRs: RFC `user/giodl/rfc-0024-localization-runtime`
  ([#42](https://github.com/openclaw/rfcs/pull/42)); authoring exemplar
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
