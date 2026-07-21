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

- Last updated: 2026-07-17
- Last agent: GitHub Copilot CLI
- Current focus: Continue PR 3 after validating the `openclaw agent`, ACP,
  capability-inspection, and shared status/health/tasks/sessions validation
  slices.
- Active branch / PR: `user/giodl/rfc-0024-localization-runtime`;
  https://github.com/openclaw/rfcs/pull/42
- PR 1 implementation: `user/giodl/localization-core` in
  `C:\src\openclaw-localization`; open as
  https://github.com/openclaw/openclaw/pull/109456.
- PR 2 implementation: `user/giodl/localization-runtime-safety` in
  `C:\src\openclaw-localization-runtime`, stacked from PR 1 commit
  `dcec9d09f7c`.
- PR 3 implementation: `user/giodl/localization-cli-runtime` in
  `C:\src\openclaw-localization-cli`, stacked from PR 2 commit `35654b88283`.
- Known dirty state: PR 1, PR 2, and RFC implementation worktrees are clean.
  PR 3 has local uncommitted CLI catalog, agent-command, coverage, and test
  edits. Coordination notes under `projects/localization/` remain local to
  `claws-hapi`.
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

- Continue PR 3 by selecting the next bounded CLI/TUI command group after the
  shared validation slice; preserve structured output and avoid claiming
  unsupported locale coverage.
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
- Collect owner feedback on RFC PR #42 and revise the v1 contract before any
  OpenClaw implementation branch.
