# Local OpenClaw Switch-Over PR79: Managed Package and Reliability Envelope

Planned PR: #79
Branch: `user/giodl/local-openclaw-switch-pr79-package-reliability`
Base: PR78

## Objective

Make the Local OpenClaw runtime package lifecycle reviewable: acquire, verify,
launch, reconnect, restart, diagnose, and stop the runtime with rollback.

## Code Surfaces

- Add package descriptor verification for version, signature/fingerprint,
  protocol compatibility, and source identity.
- Add managed launch/reconnect/restart state machine with bounded retries.
- Add stale sidecar, crash, timeout, and multi-session routing diagnostics.
- Add rollback controls that return Scout to the existing provider path.

## Acceptance Criteria

- Scout can distinguish package missing, incompatible, unsigned/stale,
  unhealthy, and policy-disabled states.
- Runtime launch and reconnect are bounded and observable.
- Crashes and stale transports do not strand sessions or leak local capability
  access.
- Rollback to the current provider path is explicit and tested.

## Expected Validation

- Focused package descriptor, lifecycle, reconnect, crash, timeout, and rollback
  tests.
- A dogfood launch proof using the package descriptor path.
- `pnpm run typecheck`.
- Focused type-aware `oxlint`.
- Focused `oxfmt --check`.
- `git diff --check`.

## Non-Goals

No new local capability family and no production updater rollout.
