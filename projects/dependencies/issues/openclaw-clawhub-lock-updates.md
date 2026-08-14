## Summary

Create an owner-reviewed refresh path for the trusted ClawHub release CLI lock
and its exact identity pins.

## Problem to solve

`.github/release/clawhub-cli/package-lock.json` is a separate npm graph used by
plugin release workflows and beta verification. OpenClaw's Dependabot
configuration has an npm updater for the repository root, but no updater for
this isolated release-tool directory.

The release materializer also hard-pins the lock SHA-256, ClawHub package
integrity, and ClawHub version, with tests preserving those values as one
trusted-release invariant. Because the graph is outside the root pnpm graph,
updates require a coordinated manual edit across the package, lock,
materializer, and tests.

## Desired outcome

Provide one owner-reviewed command or workflow that:

- selects the intended ClawHub CLI version;
- regenerates the isolated package lock;
- derives and updates the expected lock SHA-256, package integrity, and version
  pins;
- runs the trusted-publisher command-contract and release workflow tests; and
- produces one reviewable diff for the complete trusted identity change.

Automated discovery may initiate this flow, but a generic Dependabot lock
update is not sufficient because the materializer correctly rejects a graph
that does not match its reviewed pins.

## Alternatives considered

- Add generic Dependabot coverage for the nested directory: it can update the
  package and lock, but the resulting change is unusable until the fail-closed
  materializer pins and tests are refreshed together.
- Regenerate only during release incidents: leaves known release tooling
  outside the routine update loop.

## Impact

Affected: plugin release and security maintainers.

Severity: medium. This graph executes in trusted release workflows.

Frequency: whenever ClawHub CLI or one of its transitives publishes a security
or maintenance update.

## Evidence

Verified on OpenClaw `main` at
`493a3e46b3f2921269cfb0af5dfc86efb569ceaa`:

- `.github/release/clawhub-cli/package.json` and `package-lock.json` define an
  isolated npm graph;
- `plugin-clawhub-new.yml` materializes that exact lock for release work;
- `scripts/lib/release-beta-verifier.ts` treats it as trusted tooling;
- `scripts/materialize-clawhub-cli.sh` rejects mismatched lock SHA-256,
  package integrity, or ClawHub version before `npm ci`; and
- `test/scripts/plugin-clawhub-new-workflow.test.ts` preserves those values as
  one invariant.

## Implementation intent

Maybe, with maintainer guidance.
