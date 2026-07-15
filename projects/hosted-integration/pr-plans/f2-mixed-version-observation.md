# F2: Mixed-Version Observation

## Outcome

Collect safe parity and rollout evidence before changing authority or deleting
compatibility paths.

## Repository And Dependencies

- Repository: `bic/lobster`
- Depends on: F1 and the adopted binding

## Change

- Start with one exact CAPI observer on D2b rather than a generic fleet
  framework.
- Define old-authoritative, synthetic-shadow, new-authoritative, and
  compatibility-expired states while accepting authority only as an observed
  input from `CapiCanaryAuthority`.
- Compare SHA-256 fingerprints from recorded fixtures, synthetic probes, and
  explicitly replay-safe traffic; retain no request or response bytes.
- Record candidate OpenClaw version, owner/bundle generations, parity,
  old-path-use count, rollback-window state, compatibility expiry, and
  deterministic removal blockers.
- Set the minimum OpenClaw release to `2026.6.11`, the first D2a owner-contract
  version.
- Keep the compatibility expiry unconfigured and removal blocked until the
  OpenClaw promotion owner selects a real fleet deadline.

## Non-Goals

- No duplication of live side-effecting provider, Channel, or approval work.
- Observation cannot silently become authority.
- No generic observation registry before a second binding proves the same
  evidence shape.

## Proof And Exit

- Mixed old/new versions fail or degrade predictably.
- Mismatch telemetry is redacted and actionable.
- Old-path traffic reaches the declared deletion threshold.
- F3 removal remains blocked by any authority, version, request/response,
  old-path, expiry, rollback, or rollout-phase inconsistency.
