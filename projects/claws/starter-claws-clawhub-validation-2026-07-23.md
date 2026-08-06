# Starter Claws And ClawHub Final-Branch Validation

Date: 2026-07-23

## Scope

- OpenClaw: merged `main` lifecycle plus the cron-default removal fix from
  [#113045](https://github.com/openclaw/openclaw/pull/113045).
- ClawHub: exact public head `a7e0b2d86c66` of final stack PR
  [#3092](https://github.com/openclaw/clawhub/pull/3092).
- Environment: Ubuntu 24.04 under WSL2 with an isolated OpenClaw profile and a
  real Gateway scheduler.
- Starter packages: incident response, finance analyst, and customer support.

## Proven

- All three starter packages pass ClawHub `package publish --family claw
--dry-run --json` at the exact PR #3092 head.
- ClawHub's native feed safety suite passes 5/5, with two expected platform
  skips.
- Exact-head ClawHub feed serialization, artifact extraction, and OpenClaw
  `claws add --dry-run --json` interoperate for all three packages.
- All three starters inspect, preview, apply, report healthy status, preview
  removal, and remove successfully through the real OpenClaw CLI.
- Finance installs the production ClawHub `yahoo-finance@1.0.0` skill and
  customer support installs `customer-support@1.0.0`; both are uninstalled on
  removal.
- Incident response creates and removes a real Gateway cron job. Final status
  contains zero Claws, package references, MCP references, or cron references.

## Trust And Cleanup Observations

- Several incident-response skill candidates produced suspicious-archive
  warnings during OpenClaw's release-level preflight even when catalog-level
  moderation appeared clean. Validation did not override the warning; the
  incident starter remained dependency-free.
- Skill-bearing starters retain otherwise empty workspace directory shells
  containing only ClawHub's canonical empty `.clawhub/lock.json`. The removal
  preview reports this conservatively because package-manager metadata is not
  a Claw-managed workspace file. The managed skill trees, agents, Claw
  provenance, and all runtime references are removed.

## Boundary Of This Proof

- Production ClawHub was used for skill search, exact release resolution,
  integrity/security checks, and installation.
- Production Convex was not modified because the experimental ClawHub stack is
  not deployed. The whole-Claw registry path was instead proven against an
  isolated local Convex deployment running the exact PR #3092 source.

## Authenticated Whole-Claw Registry Round Trip

- Signed in through local dev auth as `local-official-member`, created a real
  API token, and published a uniquely named finance starter owned by the
  `local-official-org` publisher through the ClawHub CLI.
- The publish returned the staged `pending-publication` contract. Mock
  prepublication workers completed the normal staged checks and finalized the
  release, after which `package explore` found it through registry search.
- Published the hosted Claws feed through `catalogFeed:publish`, selected the
  exact package candidate, fetched artifact metadata and bytes, and verified
  that the downloaded SHA-256 matched both metadata and feed integrity.
- The finalized release used the supported `legacy-zip` transport. Safe
  extraction produced the expected package root, which then passed real WSL
  OpenClaw preview, consent-bound apply, status, consent-bound remove, and
  final empty-status checks.
- Final proof package: `claw-roundtrip-mrxofhri`; artifact integrity:
  `sha256:bf48cf7bd716bbeed72a19470cbdcdb309c97069fad6af9dc77dafe633cc900d`.
- Windows-only harness accommodations covered Convex CLI/Node teardown, a
  stale shared dependency install, and browser/path selection. All temporary
  source changes were removed; both ClawHub worktrees are clean and local
  services are stopped.
