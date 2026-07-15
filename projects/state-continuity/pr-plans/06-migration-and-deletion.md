# Stage 6: Migration And Deletion

## Outcome

Cut Lobster continuity authority over to RFC 0021 contracts and delete the
superseded private persistence, restore-ordering, and lifecycle machinery.

## Repository And Dependencies

- PR 6A, only if required: `openclaw/openclaw` or deployment tooling when
  existing Hosted Integration telemetry is insufficient
- PR 6B: `bic/lobster`
- Depends on: PR 5, minimum supported OpenClaw release, and all required Hosted
  Integration migrations

## PR 6A: Optional Observation Support

- Land only when existing Hosted Integration status, audit, and deployment
  telemetry cannot express a required shadow comparison fact.
- Add the smallest missing redacted observation; do not add migration authority
  or continuity side effects to OpenClaw.
- Skip this PR entirely when the existing surfaces suffice.

## PR 6B: Lobster Change

- Define old-authoritative, shadow, new-authoritative, rollback, and expired
  states per runtime.
- Compare old workspace/artifact selection with the RFC 0021 manifest and
  restore result using recorded fixtures, offline copies, and replay-safe
  observation.
- Record version, generation, checkpoint lineage, mismatch, old-path use, and
  rollback telemetry with redaction.
- Cut each runtime to one authority only after parity and compatibility gates.
- Enforce the minimum OpenClaw release before selecting the new authority.
- Delete Lobster path discovery, opportunistic copy, duplicate restore
  ordering, private checkpoint/shutdown frames, and superseded tests.
- Update deployment, runbook, disaster recovery, and rollback-expiry
  documentation.

## Non-Goals

- No duplicate live side-effecting capture or restore.
- Shadow mode cannot publish authority, grant destruction, deliver work, or
  advance lineage.
- No permanent dual path or silent fallback after expiry.
- No unrelated Lobster storage or lifecycle cleanup.

## Proof And Exit

- Representative install, restart, replacement, hibernate/wake, upgrade,
  fallback, and quarantine cases match the declared behavior.
- Mixed old/new versions fail or degrade predictably.
- Shadow mismatch is actionable and below the declared cutover threshold.
- Per-runtime rollback fences and stops the new generation before restoring a
  mutually readable recovery point under the old authority; it never permits
  two authorities or forks lineage.
- Cutover is blocked when no mutually readable rollback point exists and policy
  still requires rollback.
- Old-path use reaches zero for the declared observation window.
- The deletion ledger names every removed private path and shows net deletion.
- Compatibility code, config, telemetry, and rollback controls are removed
  after expiry.

## Rollback

Before expiry, return a runtime to the old authority using the recorded
checkpoint lineage and generation fence. After expiry, rollback means deploying
a supported release, not silently reactivating deleted private paths.
