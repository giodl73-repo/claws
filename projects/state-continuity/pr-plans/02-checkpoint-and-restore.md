# PR 2: Checkpoint And Restore

## Outcome

Deliver a complete local-volume Archived round trip: online capture, immutable
publication, retrieval, explicit restore, validation, retention, and fallback.

## Repository And Dependencies

- Repository: `openclaw/openclaw`
- Branch base: latest upstream `main`
- Depends for merge on: PR 1 and any required SQLite snapshot primitive
- Work may begin against current `main`; rebase and consume the landed
  prerequisite rather than maintaining a long-lived stacked branch

## Change

- Implement native online capture for each required captured core surface.
- Keep scheduling and bulk I/O off message, agent, tool-call, and event-loop hot
  paths; permit only one bounded capture per runtime.
- Reconstruct or validate surfaces classified accordingly in PR 1.
- Emit a closed core-only artifact obligation record for sanitized auth-profile
  runtime state, omitted plugin dependency trees, config secret references,
  external auth credentials, and runtime transients. Do not derive executable
  actions from the broad state-surface inventory.
- Reject remaining authoritative legacy outbound/session delivery-queue files
  before capture; current queue rows remain captured through shared SQLite.
- Build an immutable manifest with exact artifact digests, component
  provenance, compatibility identity, and dependency treatment.
- Add the local-volume publication binding with idempotent acceptance receipts.
- Add explicit startup/maintenance restore into a clean destination with
  ordered compatibility, integrity, and dependency validation; never mutate a
  live admitted runtime.
- Keep Archived same-platform and exact-path. Artifact source paths are
  provenance, not write authorization: trusted local policy approves every
  canonical target, and a launcher-owned restore hold fences restart through
  commit.
- Use a crash-durable forward-only journal, exclusive root claims, exact
  same-identity repair of journal-owned partial output, and quarantine on
  conflict; do not claim atomic visibility or transactional multi-root
  rollback.
- Feed one continuity condition into existing startup admission/readiness.
  Conventional startup performs no continuity scan when no restore receipt is
  supplied.
- Add checkpoint RPO, retention, fallback, and degraded-recovery status.
- Bound capture concurrency, timeout, cancellation, temporary memory/disk,
  I/O, and event-loop impact.
- Confine restore writes to the selected destination and reject path traversal,
  unsafe links, duplicate targets, decompression/size-limit violations, and
  unexpected overwrite.
- Expose stable Status and Doctor evidence for latest capture, accepted point,
  actual RPO, selected restore, fallback, and failure.

## Non-Goals

- No hosted publication binding.
- No fresh-compute automatic replacement or generation authority.
- No path remapping, config rewriting, chroot, mount namespace, or activation
  hooks; those are not required for exact-path Archived.
- No final handoff, hibernate, wake, or retained ingress.
- No stronger consistency than each existing state owner already provides.
- No third-party capture registration.

## Proof And Exit

- Complete the `slice-2-local-archived-roundtrip.md` fixture.
- Restore a representative state set into a clean directory and prove semantic
  equivalence for every required surface.
- Host-managed credentials are absent from artifacts.
- Runtime-owned identity is either reconstructable, explicitly protected and
  authorized, or a blocking unsupported dependency.
- Exact replay returns the same result; digest conflict fails visibly.
- Publication uncertainty retries only the same checkpoint identity and digest.
- Corruption, missing dependency, incompatible version, quota, retention, and
  exhausted fallback produce stable failures.
- Capture saturation or timeout degrades actual RPO without crashing, stalling,
  or closing ordinary Gateway admission.
- Measured capture memory, disk, I/O, event-loop, and user-latency results stay
  within an agreed budget recorded in the PR; an unmeasured budget does not
  pass.
- Restore confinement tests prove malicious archive paths and oversized
  artifacts cannot escape or exhaust the destination.
- Capture tests prove legacy queue entries cannot race into an eligible
  artifact and unknown obligation owner/ID/treatment/readiness pairs fail
  verification.
- Restore planning tests prove target-policy authorization and zero
  Conventional startup work. Later execution proof must cover restore-hold
  authority loss, cross-volume staging, journal crash points, same-identity
  resume, and foreign target rejection before any original-path publication is
  implemented.
- Conventional remains unchanged and Archived can be disabled reversibly.

## Rollback

Disable Archived and retain local artifacts for manual recovery. No host or
Lobster authority has changed.
