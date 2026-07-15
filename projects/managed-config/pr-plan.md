# Managed Configuration PR Plan

## Execution status (2026-07-11)

- PR 0: fork RFC draft 4 open; upstream draft 34 closed pending readiness.
- PR 1: fork OpenClaw draft 33, exact-authority core.
- PR 2: fork OpenClaw draft 36, bounded allow/deny comparators.
- PR 3: fork OpenClaw draft 37, verified loading and atomic activation seam.
- PR 4: fork OpenClaw draft 39, writes, concurrency identities, inspection, and readiness journal.
- Integration: fork OpenClaw draft 40 connects the opt-in facade to existing
  config I/O and Gateway readiness.
- Local files: fork OpenClaw draft 44 adds concrete file loading and primary
  config persistence with CAS, atomic writes, replacement deletions, canonical
  reread/recomposition, ordinary includes, and post-composition environment
  resolution.
- Gateway controller: fork OpenClaw draft 60 adds the internal read-only
  controller, selected-primary pinning, and accepted-snapshot handoff.
- Gateway bootstrap: fork OpenClaw draft 61 exposes ordered layers at Gateway
  startup, before future-version guards and migrations, without changing the
  unused path.
- PR 5: fork Lobster draft 1 contains the source compiler and migration proof;
  production switch/deletion is gated on a released OpenClaw capability.

This is the local execution plan for RFC 0019. Keep each PR independently
reviewable and do not pull later-slice concerns into an earlier slice.

Detailed plans:

- `prs/pr-00-rfc.md`
- `prs/pr-01-exact-authority-core.md`
- `prs/pr-02-bounded-authority.md`
- `prs/pr-03-loading-activation.md`
- `prs/pr-04-writes-inspection.md`
- `prs/pr-05-lobster-migration.md`
- `prs/pr-06-gateway-controller.md`
- `prs/pr-07-gateway-bootstrap.md`

## PR 6: Gateway managed controller

Repository: `openclaw/openclaw` fork only

Depends on: fork PR 44

Scope:

- Adapt ordered local descriptors into one Gateway-owned controller.
- Require the live selected primary config to be one declared source.
- Block bypass mutations while the controller owns the process.
- Retain the exact accepted snapshot for startup handoff.
- Keep the controller internal; do not expose a half-wired CLI flag.

Proof:

- Three generic layers compose through the production Gateway startup loader.
- Duplicate IDs and missing primary selection fail closed.
- Managed-process writes fail before persistence.
- Ordinary Gateway startup has no call site and cannot observe the controller.

## PR 7: Gateway pre-migration bootstrap

Repository: `openclaw/openclaw` fork only

Depends on: fork PR 60

Scope:

- Add repeatable ordered `--config-layer <id=path>` flags.
- Activate and recheck the complete chain before startup migrations.
- Disable suspicious primary recovery, single-file reload, and primary backup
  promotion only for opted-in managed runs.
- Hand the exact accepted snapshot to initial and in-process Gateway starts.
- Allow the migration guard to replace the ordinary primary snapshot with the
  accepted composed snapshot for config-dependent migrations.
- Document the Scout global, tenant network, and operator example.

Bounded first-slice restriction:

- The selected primary must be declared.
- CLI managed startup is read-only.
- Top-level `env` in the managed chain is rejected; bootstrap environment must
  be supplied by the process or service manager.
- Source edits require a full process stop/start.

Proof:

- Nine focused test files / 303 tests are accounted for across the final review
  loop, including local I/O, core runtime/management, CLI bootstrap, and
  migration checkpoints.
- Focused `oxlint` is clean.
- Full `pnpm exec tsgo --noEmit --pretty false` is clean.
- Ordinary pre-action call shapes remain unchanged when no layer is supplied.
- Final `codex review --commit HEAD` reports no actionable correctness
  regressions after source/include generation and plugin metadata handoff fixes.

## PR 0: RFC 0019

Repository: `openclaw/rfcs`

Scope:

- Define generic ordered layers, exact authored-value authority, effective
  validation, provenance, access, and atomic activation.
- Document the Lobster allowed-origins case and the deletion target.
- Record the bounded implementation sequence below.

Exit criteria:

- Architecture and semantics are reviewable without implementation details.
- Layer names have no built-in roles.
- Exact authority is sufficient for the first release.

## PR 1: Exact-authority core

Repository: `openclaw/openclaw`

Scope:

- Pure recursive composition of ordered sparse documents.
- Exact authored-value conflict detection, including ancestor/descendant paths.
- Transactional admission per layer.
- Effective schema validation and runtime materialization after the fold.
- Provenance and structured findings.

Non-goals:

- No startup or `createConfigIO` integration.
- No persistence, mutation, status, or CLI surface.
- No bounded comparators.

Proof:

- Focused unit tests for scalar, object, array, null, empty, invalid, and
  cross-field cases.
- Existing single-config behavior is untouched because there is no call site.

## PR 2: Bounded-authority registry and first field set

Repository: `openclaw/openclaw`

Depends on: PR 1

Scope:

- Add a closed schema-owned comparator registry.
- Deliver the first demonstrated production fields, not an empty framework.
- Implement allow-set ceiling, deny-set floor, numeric-minimum, and/or
  numeric-maximum classes required by those fields.
- Prove deterministic, idempotent, associative recursive composition.

Non-goals:

- No host-defined comparators or policy expression language.
- No comparator selected without a documented field-level safety meaning.

Proof:

- Same, tighter, and weaker declarations for every selected field.
- Three-layer associativity and removal/reordering behavior.
- Schema evolution and unsupported-comparator findings.
- Exact authority remains the default for unregistered fields.

## PR 3: Opt-in loading and atomic activation

Repository: `openclaw/openclaw`

Depends on: PRs 1-2

Scope:

- Add one explicit ordered-source option at the existing config I/O boundary.
- Resolve opaque sources without changing declared order.
- Run the PR 1 fold and publish one candidate through the existing snapshot
  activation boundary.
- Preserve the current path exactly when the option is absent.

Non-goals:

- No new ordinary config key or implicit source discovery.
- No write routing or management UI.
- No host-specific names or source types in core.

Proof:

- One source is equivalent to today's config path.
- Two and three sources use the same repeated operation.
- Any resolution, authority, or effective-validation failure publishes nothing.
- A process not using the option cannot observe the feature.

## PR 4: Writes, inspection, and readiness

Repository: `openclaw/openclaw`

Depends on: PR 3

Scope:

- Target writes at one explicitly writable source.
- Recompose and reject authority violations before persistence.
- Expose redacted source identity, path provenance, advisories, and failed
  candidate readiness through existing inspection/status conventions.
- Keep the previous snapshot active after a failed reload.

Non-goals:

- No ownership transfer or reconciliation controller.
- No separate management service.
- No bounded comparators unless a concrete required field blocks migration.

Proof:

- Read-only sources cannot be mutated.
- Stale authority-chain writes fail without persistence.
- `NoDeclaredValues` is advisory, not an admission failure.
- Secrets do not appear in findings or identities.

## PR 5: Lobster migration and deletion

Repository: `bic/lobster`

Depends on: minimum OpenClaw release containing PRs 1-4

Scope:

- Express deployment-owned `gateway.controlUi.allowedOrigins` as a read-only
  source and customization as a writable source.
- Compare old and new effective Gateway config over representative deployments.
- Switch to the supported OpenClaw source seam.
- Delete the baked overlay writer, stale-value cleanup, related environment
  projection, and exact config-blob tests.

Proof:

- Effective runtime config matches the old supported cases.
- Conflicting customization is rejected visibly.
- Install, restart, reload, and upgrade retain the expected origins.
- The deletion ledger records net removed Lobster machinery.

## OpenClaw local-file integration slice

Repository: `openclaw/openclaw`

Depends on: fork PR 40

Scope:

- Resolve ordered local JSON5 sources using ordinary include semantics.
- Use the primary OpenClaw config as the one writable layer.
- Persist through existing snapshot, CAS, unset-path, and atomic-write APIs.
- Reread canonical committed bytes and recompose before publication.
- Resolve environment references once after the complete ordered composition.

Proof:

- Replacement writes delete authored values omitted by the proposal.
- Injected environment, lower-precedence environment, filesystem, and home
  dependencies are honored.
- Focused lint is clean; 7 test files / 79 tests pass on current upstream main.
- Final Codex review reports no actionable correctness issues.

## Follow-ups after RFC delivery

- Broader CLI or admin UX beyond the minimum inspection/status surface.
- Additional host migrations after Lobster proves the contract.
