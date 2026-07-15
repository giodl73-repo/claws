# State Continuity Session

**Last updated:** 2026-07-14

**Last agent:** GitHub Copilot

**Current focus:** The E5b continuity publication owner contract is implemented
and review-clean in a fork-only OpenClaw worktree. The next bounded layer is the
concrete `lobster-host` contribution plus a targeted managed bootstrap that
loads only the selected host package, publishes the exact E5a artifact, and
verifies it through a fresh provider instance before Lobster gains durable
`safeToDestroy` authority.

**Blocking question:** E5b still has no concrete production publication
provider or managed publication operation. Extend `lobster-host` from five to
six contributions, bind the new provider contract without starting Gateway or
unrelated plugins, then add Lobster publication/finalization authority. Avoid a
broad merge of the provisional stacks. E5a production integration still
requires promotion of the OpenClaw managed capture and
`gateway.suspend.prepare` surfaces into the Lobster image baseline.

## Active Work

- RFC worktree:
  `C:\src\openclaw-rfcs-state-continuity`
- Branch:
  `user/giodl/rfc-0021-state-continuity`
- Fork PR:
  `giodl73-repo/rfcs#5`
- Draft:
  `rfcs/0021-runtime-state-continuity.md`
- Known state:
  RFC 0021 includes the restore hold, forward-only claim/assembly, and typed
  pre-Gateway executor binding, same-boot execution fencing, and strict
  allocation attestation. E4c now also requires exact per-file materialization
  inventory and stable plan identity across journal replay at `9f36a8d`; it is
  pushed to fork draft PR `giodl73-repo/rfcs#5`.
- OpenClaw implementation worktree:
  `/root/src/openclaw-state-continuity-pr1`
- OpenClaw branch:
  `user/giodl/state-continuity-owner-model`
- OpenClaw fork PR:
  `giodl73-repo/openclaw#41`
- OpenClaw implementation state:
  Commit `0fa278b45f1`; clean fork-only draft targeting
  `base/upstream-main-d0764f356603`, with 18 changed files.
- OpenClaw PR 2 worktree:
  `/root/src/openclaw-state-continuity-pr2`
- OpenClaw PR 2 branch:
  `user/giodl/state-continuity-local-archived`
- OpenClaw PR 2 state:
  Clean at `c3eb9a29fc9`, packaged as a fork-only stack:
  PR 55 verified assets, PR 56 credential-safe capture, PR 57 offline
  materialization, and PR 58 exact-target preview.
- OpenClaw E4c worktree:
  `/root/src/openclaw-state-continuity-e4c`, branch
  `user/giodl/state-continuity-e4c-executor`, clean at
  `34e767caf4f`, fork draft PR `giodl73-repo/openclaw#64`, stacked on PR 58.
- OpenClaw E5a worktree:
  `C:\src\openclaw-state-continuity-e5a-final-capture`, branch
  `user/giodl/state-continuity-e5a-final-capture`, clean at `203ecf95a70`, fork
  draft PR `giodl73-repo/openclaw#101`, stacked on PR 64.
  Implements strict managed final capture, durable atomic journaling,
  same-incarnation replay, concurrency reconciliation, credential-safe archive
  creation, and fsynced publication/cleanup. Fork real-behavior proof and
  workflow sanity pass; fork-only `auto-response` and `label` fail before
  repository code because the fork lacks the GitHub App private-key secret.
- OpenClaw E5b owner-contract worktree:
  `C:\src\openclaw-state-continuity-e5b-publication-owner`, branch
  `user/giodl/state-continuity-e5b-publication-owner`, dirty and uncommitted on
  Hosted Integration package 3 base `df1e3c6a724`. Defines the type-only
  streaming publication provider contract, registry/captured-runtime wiring,
  exact provenance and generation fencing, immutable acceptance, fresh
  retrieval integrity verification, and structured provider failures. Seventy-five
  focused tests pass; direct source/test type checks add no errors beyond the
  inherited package-3 baseline. Final Codex review reports no actionable
  correctness findings.
- E4c proof:
  53 focused tests, core source/test typechecks, targeted Oxlint/Oxfmt, and
  `git diff --check` pass. Final autoreview accepted no actionable findings;
  launcher authority, atomic publication, and crash-window availability
  proposals remain consciously outside the bounded E4c contract.
- E4c fork CI:
  real-behavior proof and workflow sanity pass. Fork-only `auto-response` and
  `label` jobs fail before repository code because the fork lacks the GitHub
  App private-key secret.
- OpenClaw E4a worktree:
  `/root/src/openclaw-hosted-integration-e4a-restore-hold`, branch
  `user/giodl/hosted-integration-e4a-continuity-restore-hold`, implementation
  commit `81c396e1a33`, CI type-fix head `6c86b760d76`, fork PR
  `giodl73-repo/openclaw#54`.
- Lobster E4b worktree:
  `C:\src\lobster-hosted-integration-e4b-restore-hold`, branch
  `user/giodl/hosted-integration-e4b-continuity-restore-hold`, commit
  `8ffc1317e4`, fork PR `giodl/lobster#8`.
- Lobster E5a worktree:
  `C:\src\lobster-state-continuity-e5a-final-capture`, branch
  `user/giodl/state-continuity-e5a-final-capture`, clean at `10307555f9`, fork
  draft PR `giodl/lobster#16`, stacked on PR 15.
  Durable handoff authority, exact-route attestation/replay, adapter admission
  and writer fencing, async Teams completion tracking, Gateway cooperative
  suspension, clean stop, workspace checkpoint, and managed capture are
  implemented. Final Codex review reports no accepted/actionable findings.
- Architectural prerequisite:
  RFC 0020 Hosted Integration on `user/giodl/rfc-duplex-transport`,
  fork PR `giodl73-repo/rfcs#2`.

## Current Model

- Runtime State Continuity is checkpoint/recovery/lifecycle architecture, not a
  storage redesign.
- One Fleet-style tenant cell is one continuity owner, publication, restore,
  and lifecycle authority domain. Session IDs and continuity namespacing are
  not tenant isolation.
- Fleet auth-profile keys and other host-managed credentials remain external
  reconstruction obligations; they are never checkpointed.
- `safeToDestroy` can authorize one generation-fenced compute/container action
  but never tenant-state purge, external-key deletion, or Fleet registry
  deletion.
- CAPE is the operator-facing setting and conformance projection:
  Conventional, Archived, Portable, Elastic.
- Periodic checkpoints use native online component capture.
- Final handoff closes admission, drains work and writable owners, completes
  clean shutdown, then captures closed persisted state.
- Hosted Integration owns bundle registration, owner references, activation,
  Hosting Profiles readiness, Status/Doctor patterns, generations, and
  carriers.
- Continuity owns manifests, immutable publication, restore, final handoff,
  hibernate, wake, retained ingress semantics, and CAPE guarantees.
- Portable requires dependency and credential capability closure, not secret
  byte backup.
- Elastic V1 is limited to durable Teams ingress, host/API requests, and cron;
  resident-only Channels block Elastic.
- Generation loss, restore/publication uncertainty, destruction authorization,
  and quarantine fail closed.
- Claim/assembly uses only immutable intent, verified, and committed records;
  per-file progress is reconstructed from the materialization inventory.
- Linux Node can sync file and directory entries. Windows Node file sync works,
  but directory sync returns `EPERM`; inconsistent post-crash evidence therefore
  quarantines instead of being adopted.
- The macOS Crabbox probe is blocked by absent static-host configuration and
  missing coordinator admin authorization for no-spend EC2 Mac quota/allocation
  preflight. No macOS durability result is claimed.
- E4 consumption needs no OpenClaw-to-Lobster authority transport. Lobster owns
  acquire/publication-start/commit/quarantine and invokes an explicit OpenClaw
  claim/assembly command with immutable held-authority context.
- `lobster_plex` cannot directly access worker-mounted state. The minimal
  physical carrier is a strict Gateway-role adapter operation after
  `resolve -> allocate` and before E4 commit or Gateway start.
- Post-publication transport loss, timeout, malformed output, or worker
  uncertainty remains held for identical-request replay only on the same
  adapter boot. Worker replacement, adapter restart, or stale routing
  quarantines because not all source, journal, and target paths are
  replacement-durable.
- E4d must extend publication-start evidence with an opaque execution
  incarnation derived from owner ID and the adapter `boot_id` returned by
  `/allocate`; advisory `workerinstancename` is not part of the identity.
- Restore allocation must use a strict response parser. The current generic
  allocation/start parser treats malformed successful bodies as a default
  response, which is correct for best-effort proxy hints but unsafe for
  lifecycle attestation.
- The current materialization receipt does not yet contain the per-file
  identities previously assumed by claim/assembly. E4c requires one sorted
  `{ archivePath, sha256, size, executable }` entry per copied payload file;
  older receipts remain previewable but cannot execute.
- Deterministic plan identity must not depend on current target absence.
  Initial execution requires absent roots, while replay reproduces the same
  plan and uses journal evidence to classify existing roots.
- Directory-root replay now has one exact claim-marker schema binding owner
  generation, hold revision, restore and execution identities, plan, intent,
  and root component. Prior-incarnation or malformed markers quarantine.
- The plan maps flat receipt entries to components with the materializer's
  existing state/config/workspace ownership rules; assembly never recursively
  copies overlapping component roots.

## Completed This Session

- Implemented the E5b continuity publication owner contract in the fork-only
  OpenClaw worktree. The contract now enforces lowercase namespaced provider
  IDs, canonical generations, exact bundle provenance, class-safe provider
  registration, immutable durability evidence, normalized malformed-response
  failures, streamed size/SHA-256 verification, and captured bundled-capability
  propagation. Final full-access Codex review found no actionable correctness
  issues.
- Published the OpenClaw E5a managed final-capture layer as fork draft PR 101,
  stacked on E4c PR 64. Final review fixes made staging cleanup durable before
  immutable publication, extended concurrent-winner reconciliation, canonicalized
  request paths before journaling, and atomically published complete intent/result
  records through fsynced same-directory temporary files and hard links. Final
  Codex review was clean with no accepted/actionable findings.
- Closed E5a's remaining Gateway-native-work gap by invoking
  `gateway.suspend.prepare` before Gateway stop with a stable request identity,
  bounded contract-respecting retry, strict ready-response validation, and a
  typed hold on timeout, malformed evidence, RPC failure, or remaining work.
  The suspension lease atomically pauses cron scheduling, closes Gateway work
  admission, and proves the authoritative queue/reply/embedded-run/background
  exec/root-request/task counters are idle.
- Proved the suspension authority with 90 focused OpenClaw tests and the Lobster
  adapter path with 8 final-capture tests. Targeted adapter and schema checks,
  formatting, and diff checks pass. The final Codex closeout review accepted no
  actionable findings.
- Completed the broader E5a runtime slice: durable Redis CAS handoff authority,
  exact existing-worker boot/execution attestation, same-route byte-identical
  replay, restart-safe `HeldUnknown`, strict quarantine, production ingress,
  adapter writer and destructive-operation fencing, and asynchronous Teams turn
  completion tracking.
- Added `fleet-cell-boundary.md` and integrated it into E5a/E5b. The design now
  binds one tenant trust domain and Gateway cell to one continuity lineage,
  keeps Fleet registry/sibling-cell/external-key roots outside capture, requires
  cell-scoped publication identity, and forbids interpreting `safeToDestroy` as
  `fleet rm --purge-data`.

- Ran FACES on E5b and added `final-handoff-publication.md`.
  `safeToDestroy` is now explicitly a durable Lobster CAS conclusion, not a
  container signal. The design reuses the Stage 3 continuity publication
  capability and E4-style authority state, rejects the buffered cron Blob
  client and provider-dispatch reverse carrier as archive data planes, requires
  streaming conditional publication plus fresh retrieval verification, and
  adds strict passport release before provider destruction.
- Completed E5b's cheapest source feasibility check against fork PR 50 at
  `fa8fbc2d8e7`. Ordinary backup CLI commands use the default no-plugin startup
  policy, while D1a registers `lobster/host` only during plugin-service
  lifetime. The existing service runner is not Gateway-bound and accepts an
  explicit registry/config/workspace, so the corrected slice uses a targeted
  managed bootstrap that loads and starts only the trusted selected host
  package. It must prove no Gateway or unrelated plugin service starts.
- Completed the E5b implementation seam audit. D1a's `lobster-host` manifest
  contains only the five model/provider-request contributions, and neither D1a
  nor the current Hosted Integration consolidation defines continuity
  publication provider types, registration, acceptance, or retrieval. The
  OpenClaw E5a and D1a histories also have no direct stack relationship. The
  corrected implementation order is a bounded continuity owner-contract layer,
  then a fork-only E5a/Hosted Integration synthesis proof, then Lobster durable
  publication/finalization authority.
- Confirmed the Lobster-side additive seams: the current Blob helper has useful
  workload-identity and conditional-write patterns but buffers `Vec<u8>` and is
  not the archive data plane; strict passport release exists only as a private
  Git-store method; and current lifecycle policy permits pause/destroy from
  `IdleReady` or `ShutdownReady` without durable handoff state. E5b must expose a
  separate strict final-handoff release method and add durable
  `SafeToDestroy` as a policy input for Portable/Elastic only.

- Ran FACES on final safe-shutdown capture and added
  `final-handoff-capture.md`. The audit found that current `shutdown_ready`
  precedes warning-tolerant workspace flush/passport release and cannot
  authorize destruction. The revised E5a slice keeps the adapter alive, closes
  and cleanly exits only the Gateway, strictly flushes adapter-owned writers,
  reuses `createContinuityArchive`, and returns exact local artifact evidence.
  Host-carrier publication and `safeToDestroy` remain E5b.

- Implemented and published E4c as fork draft PR 64. Materialization receipts
  now carry exact sorted per-file identities; restore planning binds those
  identities with bounded verification while keeping target observation out of
  stable `planId`.
- Added strict `backup activate --managed --json` execution with bounded stdin,
  canonical source/journal separation, forward-only intent/verified/committed
  evidence, exact directory/file-root claims, empty-directory reconstruction,
  typed fail-closed filesystem errors, same-incarnation replay, and committed
  receipts.
- Reserved restore claim evidence from future continuity capture, left live
  markers untouched, and rejected legacy payload collisions before mutation.
- Closed the autoreview loop by fixing accepted symlink-parent, durability,
  oversized-input, redaction, bounded-concurrency, empty-directory,
  source/journal overlap, typed-error, marker-collision, and canonical-alias
  findings.
- Added `e4c-executor-fixture.md` with the exact directory/file-root topology,
  five-file inventory, accepted committed receipt, untouched foreign-target
  quarantine, and same-adapter interruption replay.
- Audited PR 58 and found two design corrections before implementation: the
  materialization receipt currently lacks exact per-file evidence, and the
  planner's target-absence check must be separated from stable plan identity
  for journal replay.
- Reused the materializer's single-owner component assignment so overlapping
  state/config/workspace source roots cannot cause duplicate recursive copies.
- Closed the review blockers by moving target-absence enforcement out of the
  pure plan builder, defining the exact directory-root marker, making the
  materialization blocker conditional on receipt evidence, and fixing the
  fixture result count to five files.
- Disproved transparent worker-replacement replay: Plex logical routing and git
  rehydration do not prove continuity for ignored generated config, live
  SQLite, journal, materialization, and all targets.
- Revised E4d to bind publication to an allocation-time adapter boot
  attestation. Same-boot unknown outcomes may replay; adapter restart,
  stale-worker routing, or replacement quarantines.
- Audited the E4 execution gap through Lobster's real
  `resolve -> allocate -> worker route -> Gateway start` source path.
- Defined E4c/E4d in `restore-executor-binding.md`: one strict worker operation,
  fixed OpenClaw child invocation, typed result, exact-request replay, and no
  authority carrier, sidecar, Job, or generic command bus.
- Audited cross-store behavior and removed global consistency assumptions.
- Reframed scale-to-zero around the scale-from-zero user promise.
- Defined lifecycle vocabulary and clean-shutdown/final-capture ordering.
- Defined CAPE features and operator configuration.
- Audited Lobster Teams wake, cron, credentials, and current persistence.
- Made RFC 0020 Hosted Integration an explicit implementation prerequisite.
- Added decision history, capability-based conformance, Status/Doctor, fencing,
  failure, quarantine, and implementation sequencing.
- Reviewed through Gateway engineer, Lobster container engineer, platform
  operator, CISO, founder, and maintainer roles.
- Updated the role-review record and local Archived evidence slice.
- Marked the original readiness-shaped provider slice superseded.
- Added six bounded implementation PR plans under `pr-plans/`.
- Reviewed the PR plans through six roles and corrected repository boundaries,
  final-capture ownership, restore security, absent-runtime races, and rollback
  lineage.
- Expanded RFC 0021 and fork PR #5 with the Lobster problem statement, the
  OpenClaw/Lobster ownership split, and current-state, target-state, and CAPE
  diagrams.
- Clarified first-class lifecycle behavior: OpenClaw performs checkpoint and
  restore orchestration; hosts propose hibernate and perform physical
  removal/provisioning and zero-process wake.
- Reviewed the fork PR body as a maintainer-facing pitch and moved community
  value before Lobster evidence, made the no-default-tax and deletion payoff
  explicit, and added five concrete architecture review questions.
- Strengthened the authority argument: Lobster cannot safely infer state
  completeness, capture validity, handoff safety, restore compatibility, or
  restored readiness from files and processes outside OpenClaw.
- Adopted main-first branch policy: PR 1 and local Archived work can start from
  current OpenClaw `main` and rebase as prerequisites land; only direct
  compile-time dependencies justify temporary stacking.
- Added a validation-first track covering state inventory, shutdown ordering,
  local recovery, runtime budgets, failure fixtures, Lobster wake/cold-start,
  and migration/deletion evidence.
- Audited current OpenClaw `main` and confirmed native online SQLite backup
  primitives already exist, while a continuity owner contract and restore
  guarantee do not.
- Implemented the fork-only PR 1 owner model: stable CAPE vocabulary,
  `continuity.level`, path-free state-surface treatments, desired/effective
  Status, cold-start parity, and human Status warnings.
- Proved the slice with focused tests, core/source-test typechecks, formatting,
  diff checks, and a clean final Codex review.
- Created fork-only OpenClaw draft PR #41 without changing or targeting
  `openclaw/openclaw`.
- Rebased PR 1 onto current upstream `main` at `d0764f356603`, force-updated
  only the fork branch, and retargeted fork PR #41 to the matching clean fork
  base.
- Started PR 2 from the rebased PR 1 contract and audited current backup
  creation, verification, manifest, credential, SQLite, and volatile-state
  behavior.
- Confirmed current backup is reusable capture substrate but is not an Archived
  recovery point: it lacks content identity, restore ordering, dependency
  treatment, and restore, while credential-bearing state requires an explicit
  policy boundary.
- Added the first PR 2 evidence commit: `backup verify` now hashes the exact
  archive and exact embedded manifest bytes in the same stream that structural
  verification consumes, and `backup create --verify` exposes both identities.
- Kept default backup creation unchanged; exact identity is paid only on the
  explicit verification path.
- Added exact-byte and bounded oversized-manifest regressions and completed a
  clean Codex re-review.
- Added `openclaw backup retrieve`: it snapshots and verifies the source
  archive, enforces compressed, expanded-byte, raw-entry, and materialized-path
  limits, rejects links and unsafe entries, and extracts only into a new
  private staging directory.
- Kept retrieval explicitly non-active: it does not overwrite or activate live
  OpenClaw state, removes incomplete destinations on failure, and reports exact
  archive and manifest identities.
- Added a streaming verifier entry cap so metadata floods are rejected before
  the verifier retains an unbounded entry list.
- Proved the retrieval seam with focused backup/CLI tests, docs indexing,
  formatting, diff checks, and a clean final Codex review; committed it locally
  as `27a17bb418f`.
- Added additive backup-asset component metadata to new manifests: path-free
  source-stable IDs, explicit dependency arrays, and deterministic restore
  order. Legacy schema-1 manifests without component metadata remain valid.
- Verification now rejects partial, duplicate, non-contiguous, missing, or
  forward-dependent component graphs and reports the verified component count;
  retrieval propagates that evidence.
- Kept this metadata at the backup-asset level rather than claiming complete
  continuity-state coverage. The clean final Codex review found no remaining
  findings; committed locally as `7dec3671cfc`.
- Added a fail-closed Archived assessment to new backup manifests. Ordinary
  backups now report stable capture-policy/scope blockers for excluded legacy
  transcripts, OAuth capture scope, global/per-agent auth rows, partial
  capture, workspace omission, and unresolved config-secret classification.
- Verification rejects malformed or success-shaped continuity metadata;
  retrieval preserves the assessment without activation. Global
  `auth_profile_stores`, symlinked OAuth paths, and cleanup-error preservation
  are covered. The final Codex review was clean; committed locally as
  `8a266817226`.
- Audited the blocker-resolution path and recorded
  `continuity-capture-treatment.md`: credential stores and OAuth are external,
  auth-profile runtime state is reconstructed, sanitation happens only on
  copied SQLite snapshots, legacy transcripts fail capture, and config capture
  must preserve SecretRefs while rejecting literal sensitive values across the
  complete guarded include closure.
- Implemented the first read-only config dependency classifier slice locally:
  guarded nested include resolution, path-free SecretRef source counts,
  supported environment-placeholder treatment, literal-sensitive-value
  blockers, malformed/include/extension-metadata fail-closed results, and
  symlink-escape rejection.
- Proved the classifier with 10 focused tests, targeted formatting and lint,
  and core source/test `tsgo` checks. Two fallback full `tsc` attempts exhausted
  WSL memory; the authoritative targeted checks passed.
- Committed the config dependency classifier locally as `45d7e7cfad9` after a
  clean Codex review.
- Added copy-only SQLite sanitation with source-alias checks, owner-private
  staging, file-handle permission hardening, case-insensitive schema matching,
  trigger rejection, sqlite-vec-aware compaction, and post-sanitation row-count
  proof. Live source databases remain unchanged and credential/reconstructed
  auth-state rows are removed from the copied artifact.
- Accepted and fixed autoreview findings for trigger exfiltration, path and
  permission races, case-variant credential tables, and extension-backed
  virtual tables. The final Codex review was clean; committed locally as
  `58a3a845734`.
- Confirmed the current Lobster Snapshot sync boundary allowlists completed
  `snapshots/<id>/database.sqlite` artifacts even though live `*.sqlite*` files
  are ignored. Those snapshot artifacts can contain auth-profile credential
  rows, so credential-safe continuity capture addresses an existing persisted
  artifact boundary rather than only a future concern.
- Added a distinct continuity archive plan that keeps ordinary backup
  unchanged, captures the guarded authored-config closure separately, excludes
  OAuth/config/workspaces from recursive state capture, requires copied SQLite
  sanitation, and fails closed on missing/overlapping sources, scan failures,
  and authoritative legacy transcripts.
- Accepted and fixed autoreview findings for config files nested in workspaces
  and config sources nested in the excluded OAuth directory. Eighteen focused
  tests, core source/test `tsgo`, targeted lint, and the final Codex review
  passed; committed locally as `23a95e554fd1`.
- Added owner-private continuity staging that materializes only eligible plans,
  reuses native `VACUUM INTO` state snapshots, sanitizes every copied state
  database, preserves exact classified config bytes by SHA-256, excludes OAuth
  and volatile/reconstructed state, and removes incomplete staging on failure.
- Staging rejects source overlap before mutation, links and special files,
  hard-link aliases, newly appearing legacy transcripts or SQLite, and config
  changes after classification. The canonical global SQLite symlink is replaced
  by its regular sanitized snapshot.
- Accepted and fixed autoreview findings for preflight staging containment,
  canonical SQLite symlink ordering, and the hard-link lstat/open race. Focused
  continuity and native backup tests, core source/test `tsgo`, targeted lint,
  and the final Codex review passed; committed locally as `e68255e8a584`.
- Added dedicated immutable continuity artifacts with strict successful-capture
  evidence, explicit state/config/workspace ownership, exact config identities,
  bounded selected-content extraction, and read-only packaged-SQLite sanitation
  proof.
- Verification now rejects unowned state files, listed SQLite sidecars,
  overlapping ownership, malformed capture inventories, content tampering, and
  overwrite publication while preserving explicit and legacy ordinary-backup
  manifests.
- Accepted and fixed final review findings for state-owned SQLite inventory,
  SQLite sidecar replay, and explicit `artifactType: "backup"` compatibility.
  Focused continuity/backup tests, core source/test `tsgo`, targeted lint, and
  final autoreview passed; committed locally as `ebcc93bb8df`.
- Added `openclaw backup materialize` for verified continuity artifacts. It
  consumes the declared dependency order, writes every owned state, config, and
  workspace file into a new owner-private offline filesystem root, preserves
  executable bits, and emits an exact-identity materialization receipt.
- Materialization rejects ordinary backups, existing or source-overlapping
  destinations, ambiguous ownership, links, hard links, unsafe path changes,
  archive growth beyond limits, and incomplete output. It never writes original
  source paths, activates live state, or claims effective Archived.
- Accepted and fixed review findings for source/destination overlap, canonical
  symlink aliases, pinned archive and payload reads, executable modes, real
  post-extraction tree validation, generated-receipt byte accounting, and
  concurrent archive growth. Final autoreview was clean; committed locally as
  `e76135a87b6`.
- Added fail-closed compatibility validation before offline-root creation.
  Materialization now rejects malformed or newer artifact runtime identities,
  cross-platform artifacts, corrupt packaged SQLite, and newer exact-path
  shared or agent schemas while leaving arbitrary plugin/workspace schemas
  outside core policy.
- The receipt now records exact runtime/platform/schema evidence plus the
  reconstructed, external, and ephemeral obligations that remain. It explicitly
  reports `activationReady: false`; no reconstruction, host resolution,
  transient creation, activation, or effective Archived claim occurs.
- Proved current compatibility, malformed/newer runtime rejection, platform
  rejection, global and agent newer-schema rejection, plugin/workspace schema
  isolation, sanitation preservation, and destination non-creation on failure.
  Focused tests, source/test `tsgo`, lint, formatting, diff checks, and final
  autoreview passed; committed locally as `b8e51cf2fc1`.
- Ran FACES on the next local Archived boundary and recorded
  `local-archived-activation-contract.md`. Archived remains exact-path and
  same-platform; Portable owns remapping. Restore publication stays separate
  from normal startup and contributes one condition to existing
  readiness/admission rather than creating another framework.
- Audited current startup and found two blockers before activation:
  `derived-state` is not concrete enough to execute, and authoritative legacy
  delivery-queue JSON can still be omitted even though current queues are
  SQLite-owned.
- Reviewed the contract through Gateway, Lobster container, CISO, and skeptical
  maintainer lenses. Added trusted target policy, a launcher-owned lease,
  forward-only crash recovery, startup-consumed owner migration semantics, and
  admission-before-service ordering. Activation remains design-only.
- Replaced the broad `derived-state` activation inference with a design for a
  closed artifact-specific obligation record. Auth-profile runtime state uses a
  safe empty default, current queues/plugin index/memory state remain captured,
  owner migrations stay owner-owned, and external credentials are evaluated by
  existing owners.
- Defined the legacy queue closure: continuity capture must fail read-only when
  pending, failed, or delivered-marker files remain under either legacy queue,
  recheck before staging, and require the existing migration outside capture.
- A focused obligation-model review found and corrected stale queue treatment,
  made the core V1 owner/ID/treatment/readiness allowlists normative, separated
  safe-empty auth state from external credential readiness, and added the
  omitted installed-plugin dependency-tree obligation.
- Closed continuity capture completeness for legacy delivery queues. Planning
  now rejects pending, failed, and delivered-marker migration inputs under both
  legacy queue roots, including symlink/scan failures; staging rechecks before
  ordinary volatile filtering can omit a newly appearing queue entry.
- Added a closed, path-free artifact obligation record for safe-empty
  auth-profile runtime state, omitted plugin dependency trees, config SecretRef
  dependencies, excluded auth credentials, and runtime transients. Verification
  rejects unknown or success-shaped ownership/treatment/readiness records and
  cross-checks exact capture counts.
- Materialization now projects immutable artifact-specific obligations instead
  of synthesizing work from the broad runtime state inventory. It remains
  offline and reports `activated: false`, `activationReady: false`, and
  `effectiveArchived: false`.
- Proved queue blockers and post-plan races, exact plugin dependency omission,
  closed obligation parsing, ordinary-backup separation, tamper rejection, and
  receipt projection with 49 focused tests, core source/test `tsgo`, targeted
  lint/formatting, and a clean final autoreview. Committed locally as
  `884f6aa94e7` plus file-mode normalization `328152580ef`.
- Ran FACES on exact-target restore planning and found that Node's ordinary
  rename cannot prove cross-platform atomic no-replace directory publication.
  Narrowed the first slice from a mutable journal to an immutable,
  non-publishable plan receipt; launcher-owned execution journals remain
  separate. The later restore-hold audit replaced the native publication
  requirement with exclusive claim-and-assemble.
- Reviewed the plan through Gateway runtime, Lobster operator, enterprise
  security, and skeptical maintainer lenses. Publication roots must be actual
  outermost manifest assets, nested assets inherit an explicitly authorized
  directory root, plan identity is deterministic, and execution generation is
  deferred to the launcher.
- Prototyped the pure restore plan seam: canonical grouping, exact root
  authorization, fail-closed target/materialization containment, deterministic
  identity, closed parsing, same-plan replay, explicit execution blockers, and
  path-free projection. No filesystem writes, command, lease, publication,
  Gateway, readiness, or startup wiring was added.
- Accepted and fixed autoreview findings for materialization escape,
  file-descendant conflicts, locale-dependent plan identity, and existing
  unmodeled target descendants. Fifteen focused tests, core source/test
  `tsgo`, targeted lint/formatting, and final autoreview passed; committed
  locally as `886ed03a7a7`.
- Challenged the pure prototype against Peter-style minimalism. The review
  found that a 631-line parser/replay lifecycle around synthetic canonical
  paths was premature and proved no operator-facing hard path.
- Deleted the persistent plan parser, replay, projection, and related tests.
  Replaced them with one concrete read-only command:
  `openclaw backup plan-restore`.
- The command re-verifies a real continuity archive, matches the non-active
  materialization receipt, validates safe tree/asset shape, resolves exact
  original targets without creating them, requires explicit publication-root
  authorization, and prints deterministic groups.
- Kept the result honestly non-executable. It now names three blockers:
  per-file materialized content identity, launcher lease, and atomic
  no-replace publication. No target, staging, saved plan, Gateway, readiness,
  or startup state is changed. Those are the command's current blocker names;
  the later design deletes the rename requirement rather than making this
  preview executable.
- Twenty-two focused tests, core source/test `tsgo`, targeted lint/formatting,
  and review passed with no accepted actionable findings. Committed locally as
  `c3eb9a29fc9`.
- Audited the publication prerequisites without adding implementation. The
  smallest materialization identity is one sorted
  `{ archivePath, sha256, size, executable }` entry per copied payload file,
  produced by the existing copy loop and rechecked before publication.
- Proved Linux directory-relative `renameat2(RENAME_NOREPLACE)` against absent
  and existing directory targets. Collision returned `EEXIST` and preserved
  both trees.
- Confirmed Node 24/libuv exposes only replacement rename and OpenClaw has no
  first-party native-addon seam. No addon, helper binary, executor, or new
  receipt lifecycle was added.
- Audited actual Lobster launch ownership. Runtime chat, Teams, diagnostics,
  scheduler, and warm-up starts converge on `PlexAdapter`; HTTP and gRPC
  container starts converge on adapter `start_openclaw_if_needed`, which may
  respawn an unhealthy Gateway while Plex may replace the container.
- Rejected reuse of Lobster's proxy-pipe owner lease because it is advisory,
  TTL-based, and fail-open on Redis uncertainty.
- Narrowed the launcher requirement to one non-expiring restore-hold state in
  Hosted Integration's existing owner generation. Unknown authority and stale
  generations block start; commit binds one exact restore receipt rather than
  deleting the hold.
- Kept PR 2 unchanged. Managed execution waits for that prerequisite instead
  of introducing a continuity lease service.
- Revisited the native no-replace blocker after establishing the durable
  launcher hold. Atomic visibility is unnecessary while startup is fenced;
  atomic root ownership is sufficient.
- Proved concurrent non-recursive `mkdir` and file `open("wx")` claims produce
  one winner and one `EEXIST` loser without overwriting either target.
- Reused the existing retrieve/materialize incomplete-marker model: fsync
  journal intent, claim the final root, assemble directly, reverify content,
  and resume only exact journal-owned partial output.
- Deleted the proposed native-addon/helper requirement from the design. Direct
  target parents must exist and be trusted; unsupported network filesystem and
  platform durability semantics remain explicit proof gates.
- Added the restore hold to RFC 0021 using Hosted Integration's existing
  lifecycle-owner generation: `runnable -> restore-held -> restore-committed
  -> one admitted restored start`.
- Made the hold non-expiring and fail-closed, distinguished it from the
  TTL-renewed active generation and Lobster's advisory proxy-pipe lease, bound
  commit to the exact restore receipt, and limited cancellation to before the
  first target claim.
- Added the paired OpenClaw lifecycle-owner/Lobster adopter implementation
  wave and conformance proof before managed replacement or Elastic restore.
- Added E4a/E4b to the Hosted Integration roadmap rather than waiting on a
  separate owner. E4a is the OpenClaw continuity lifecycle-owner contract;
  E4b is Lobster enforcement across runtime-side and adapter-side start fan-in.
- Added exact one-repository PR plans and a Gateway/container/security/platform/
  maintainer role review. E4a can follow A3/B5/B6a/B6b; E4b additionally needs
  F1 and can proceed alongside D2.
- Implemented E4b as one non-expiring Redis CAS record in `lobster_plex`, with
  runtime admission at `PlexAdapter`, exact restored-receipt consumption,
  retry-stable restored admission, adapter HTTP latching, and spawn/respawn
  enforcement.
- Registered `lobster/continuity` in the inactive `lobster-host@1.1.0`
  snapshot and composition. Synthetic diagnostics starts now fail closed when
  continuity is selected instead of bypassing admission.
- E4b proof includes touched-crate tests, `lobster-runtime` compilation,
  lifecycle/wire/adapter/runtime focused tests, and final
  `codex review --uncommitted` with no accepted findings. Four unrelated
  `openclaw-adapter` Windows tests remain repeatable baseline failures.
- Fixed the remaining accepted E4d findings in
  `C:\src\lobster-state-continuity-e4d` (uncommitted, not pushed): unknown
  `execute_continuity_restore` outcomes now get exactly one same-route/
  same-execution replay (shared with the typed `retry-same-restore` bound)
  before falling back to an explicit held-hold error instead of an immediate
  quarantine; added an adapter-side `ContinuityRestoreFence` in
  `AdapterState` (established pre-child, receipt recorded on success,
  consumed only by an exact Restored `ContinuityStartAdmission`, re-checked
  inside the same `openclaw_started` write-lock a cold spawn uses) closing
  the admitted-before/during-restore spawn race; added
  `start_committed_restore_on_exact_route` in `PlexAdapter` so post-commit
  Gateway start never re-resolves/reallocates and quarantines (via a new
  `quarantine_consumed_restored_admission` hold-store transition) on any
  post-commit start failure instead of retrying elsewhere;
  `mark_publication_started` is now idempotent on an identical replay and
  never rebinds to a different execution incarnation;
  `RestoreAllocationEnvelope.status`/`.service` are required exact-literal
  strings; and the `Command::new("openclaw")` executor comment now states
  the E4c fork-PR image dependency explicitly. Touched-crate targeted tests
  (`lobster-sandbox-schema`, `lobster-plex`, `openclaw-adapter`
  continuity/adapter_state/gateway_start) and `cargo fmt` all pass; the same
  four pre-existing Windows baseline failures remain, unrelated. Package/
  feed pins (`openclaw@2026.5.28`) deliberately left unchanged.
- Fixed the two final accepted E4d review findings in
  `C:\src\lobster-state-continuity-e4d` (uncommitted, not pushed):
  `AdapterState::accept_continuity_start_admission` now holds
  `continuity_restore_fence` and `continuity_start_admission` together for
  the whole validate/latch/consume decision (documented lock order: fence
  then admission) instead of clearing the fence and then separately taking
  the admission lock — closing the window where a concurrent ordinary
  admission could slip in before the exact restored admission actually
  latched. Added a durable `ContinuityPhase::RestoreStarting` intermediate
  in `continuity_restore_hold` (`restore_identity`, `receipt_identity`,
  `execution_incarnation_identity`, `admission_identity`) plus three
  dedicated methods — `begin_exact_restored_start` (CAS
  `RestoreCommitted` -> `RestoreStarting`), `complete_exact_restored_start`
  (CAS to `Runnable` only after the exact-route Gateway start succeeds), and
  `quarantine_exact_restored_start` (CAS to `RestoreQuarantined` on any
  failure, including a `build_options` failure, which previously bypassed
  quarantine entirely) — so consuming a committed restore never exposes
  `Runnable` before the exact-route start actually succeeds; `admit_start`
  now fails closed with a new `RestoreStartInProgress` error for both
  ordinary and generic restored admission while `RestoreStarting` is
  active. `PlexAdapter::start_committed_restore_on_exact_route` now uses
  the new state machine; the legacy generic `admit_start(Restored)` path
  (`resolve_and_start_restored_gateway_with_options`, E4b) is unchanged.
  Added identity-mismatch, ordinary-fan-in-blocked, build-options-failure,
  and deterministic concurrency regression tests in both crates. Touched-
  crate targeted tests (`lobster-plex`, `openclaw-adapter`
  adapter_state/gateway_start) and `cargo fmt`/`clippy` all pass; the same
  four pre-existing Windows baseline failures remain, unrelated.
- Published E4d from
  `C:\src\lobster-state-continuity-e4d` on branch
  `user/giodl/state-continuity-e4d-operation` at commit `94aa73959c`.
  Fork draft PR:
  `https://microsoft.ghe.com/giodl/lobster/pull/15`, stacked on Lobster fork
  PR 8. The slice adds strict restore DTOs, allocation boot attestation, the
  fixed Gateway-role adapter operation, same-route/same-boot replay, durable
  `RestoreStarting` fencing, exact-route restored startup, adapter admission
  fencing, execution-incarnation binding, and confirmed durable completion.
  Final proof covered the schema, Lobster Plex, OpenClaw adapter, and
  `lobster-runtime`; targeted formatting and clippy checks passed. The
  remaining review observation that the operation has no production caller
  is intentional: E4d is the inactive operation carrier, and retrieval
  coordination is a later boundary. The Lobster image remains intentionally
  dependent on the separate OpenClaw E4c fork build in PR 64.
- OpenClaw E5a worktree:
  `C:\src\openclaw-state-continuity-e5a-final-capture`, branch
  `user/giodl/state-continuity-e5a-final-capture`, dirty with intended,
  uncommitted managed-capture changes stacked on E4c.
- Lobster E5a worktree:
  `C:\src\lobster-state-continuity-e5a-final-capture`, branch
  `user/giodl/state-continuity-e5a-final-capture`, dirty with intended,
  uncommitted adapter-side changes stacked on E4d. The slice adds strict E5a
  DTOs, an exact-request same-boot fence, admission/drain and destructive-command
  exclusion, adapter-writer closure/drain, clean Gateway-only stop, strict
  passport-owned workspace checkpoint, and the fixed managed capture route.
  Focused capture, remember-cron, hook/lifecycle, schema, and compile proof pass.

## Open Threads

1. Keep fork PRs `giodl73-repo/openclaw#54` and `giodl/lobster#8` stacked on
   D2a and F1 respectively; do not build a continuity lease or activate either
   implementation upstream.
2. Keep fork PRs 55-58 and E4c PR 64 as the reviewable Local Archived stack on
   PR 41.
3. Complete the remaining claim/assembly crash matrix in
   `claim-assembly-journal.md`; the accepted, foreign-target, and
   same-incarnation interruption cases are now fixed by
   `e4c-executor-fixture.md`.
4. Review E4c PR 64 against RFC PR 5 without adding a provider, authority
   client, rollback, or ordinary-startup journal scan.
5. Review Lobster fork PR 15 together with OpenClaw E4c PR 64; do not add a
   generic restore trigger or bypass the existing continuity selection gate.
6. Complete the macOS durability probe when a static host or coordinator admin
   preflight becomes available.
7. Obtain owner review of the `continuity.level` public config contract and
   core state-surface classifications.
8. Restore remote `check:changed` authentication and run the broad gate.
9. Set bounded online capture memory, disk, I/O, timeout, and latency budgets.
10. Complete the local Archived round-trip paper proof.
11. Measure Lobster cold restore and startup phase budgets.
12. Add the Lobster runtime-side E5a authority/caller on the exact existing
   worker route; do not add publication, passport release, provider
   pause/destroy, or `safeToDestroy` in this slice.
13. Threat-model any runtime-owned non-reconstructable identity artifact.
14. Define mixed-version shadow migration and private-path deletion proof.
15. Reconcile the local PR plans with the exact Hosted Integration seams after
   that stack lands.
16. Run a final RFC de-duplication and internal-consistency pass without
   removing the decision history.
17. Add the bounded Hosted Integration continuity-publication owner contract
    before creating the E5b managed-operation worktree.

## Resume Order

1. Read `CONTEXT.md`.
2. Read this file and `README.md`.
3. Read `frame.md`, `role-review-2026-07-11.md`,
   `slice-2-local-archived-roundtrip.md`, and `pr-plans/README.md`.
4. Read RFC 0021 in the RFC worktree.
5. Read RFC 0020 and the Hosted Integration project before changing wiring,
   readiness, status, generation, or carrier language.
6. Check both worktrees for dirty state before editing.

## Guardrails

- Keep implementation fork-only until the user explicitly authorizes an
  upstream proposal.
- Do not prototype OpenClaw or Lobster code in `claws-hapi`.
- Do not introduce a global writer barrier, `/synced`, mutation generations, a
  generic provider bus, or continuity-specific composition machinery.
- Do not checkpoint host-managed credentials or claim universal Elastic
  support.
- Keep CAPE operator-facing; structure implementation by capabilities.
- Keep changes and PRs fork-only unless explicitly authorized.
