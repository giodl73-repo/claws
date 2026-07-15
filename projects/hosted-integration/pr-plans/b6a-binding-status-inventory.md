# B6a: Hosted Binding Status Inventory

## Outcome

Project desired and effective hosted bindings into one OpenClaw status
inventory.

## Repository And Dependencies

- Repository: `openclaw/openclaw`
- Depends on: A3 and B5

## Change

- Join config provenance, desired/resolved IDs, owner, interface, and version.
- Keep config, owner, bundle, and carrier generations separate.
- Show readiness posture, degradation, reload disposition, and authority mode.
- Reuse owner evidence without activating or probing bindings.

## Proof And Exit

- Ready, degraded, unavailable, stale, and unresolved snapshots are covered.
- Protected values remain redacted.
- Status work is bounded independently from Doctor repair UX.

## Implementation Status

- Fork draft PR: https://github.com/giodl73-repo/openclaw/pull/46
- Branch: `user/giodl/hosted-integration-b6a-status-inventory`
- Head: `1dbbe1adfa1`
- Base: B5 head `facdc99dc48`
- Added `host-integration-status/v1` as a read-only projection over the current
  B5 bundle snapshot and an atomic owner-evidence snapshot.
- Owner evidence is explicitly bound to a bundle generation. A mismatch is
  projected as `stale` rather than accepted as current readiness.
- `status --json` includes the inventory only when a host bundle is registered.
- No binding activation, owner probing, host-written health, config surface, or
  Doctor remediation was added.
- Proof passed 17 focused tests, formatting, focused lint, core TypeScript,
  diff checks, and final Codex review.
