# PR 5: Scout/Lobster Migration and Overlay Deletion

## Objective

Adopt the supported OpenClaw source seam for Scout global posture, tenant
network facts, and operator customization, then delete the private baked-overlay
lifecycle it replaces.

## Dependency

- A released OpenClaw version containing PRs 1-4.
- Lobster minimum-version policy updated to that release.

## Audit before editing

- Current allowed-origins seed/generation path.
- Environment projection and config-file ownership.
- Post-seed repair or overlay writers.
- Upgrade stale-value cleanup.
- Exact config-blob fixtures and Gateway startup tests.
- User customization persistence location.

## Production scope

- Read-only Scout global source containing fleet-wide Gateway security posture.
- Read-only tenant source containing tenant URL, trusted proxy range, and
  Tailnet exposure.
- Writable operator source containing ordinary customization.
- Ordered source descriptors passed through the supported OpenClaw seam.
- Minimum compatible OpenClaw version and failure message.
- Source-contract capability preflight before Gateway activation.
- Removal of superseded overlay generation and cleanup code.

## Implementation steps

1. Capture representative old effective configs as migration fixtures.
2. Produce the Scout global, tenant network, and operator source documents.
3. Run bounded dual evaluation in tests, not dual production writes.
4. Prove effective runtime equivalence for supported deployments.
5. Switch Lobster startup to the OpenClaw source seam.
6. Ensure all source material and integrity evidence are ready before Gateway
   activation; keep readiness false until the effective snapshot publishes.
7. Delete the overlay writer, stale cleanup, redundant env projection, and
   exact-blob tests named in the deletion ledger.
8. Replace blob tests with behavioral config/provenance/conflict proof.

## Current fork evidence

- Real overlay versus compiled-source dual evaluation is encoded for loopback,
  external tenant, operator-sibling, and stale-removal cases.
- Managed Gateway argv construction requires a capability token issued only
  after exact installed-CLI help-surface detection.
- Source bundles publish as immutable generation directories: all bytes are
  staged first, one rename exposes the complete generation, identical retries
  verify/reuse it, and mutated generations fail closed.
- Neither path is selected in production while Lobster pins OpenClaw
  `2026.5.28`, which predates the managed configuration surface.

## Proof matrix

- Fresh install with default Control UI settings.
- Existing installation with user customization.
- Restart and config reload.
- Upgrade from the last overlay-based Lobster release.
- Conflicting user attempt to replace deployment origins.
- Loopback and configured external origin variants.
- Supported Linux/macOS/Windows packaging paths as applicable.
- Installed/package OpenClaw artifact at the minimum supported version, not
  workspace dependencies.
- Container boot ordering: sources ready, integrity verified, snapshot active,
  then readiness true.

## Rollout and rollback

- Gate on the minimum conformant OpenClaw version.
- Do not retain two active writers.
- Rollback means reverting to the prior Lobster/OpenClaw version pair, not
  silently bypassing authority in a current process.

## Exit criteria

- Lobster no longer writes deployment-owned leaves into user config.
- The deletion ledger shows net code and lifecycle removal.
- Effective behavior and upgrade proof pass.
- Packaged install, restart, readiness, and rollback proof pass for the declared
  Lobster/OpenClaw version pair.
- OpenClaw findings identify conflicts without Lobster-specific parsing.
