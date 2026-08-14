## Summary

Run the existing dependency pin guard in required CI, not only through the
developer-oriented changed-file helper.

## Problem to solve

OpenClaw already defines `deps:pins:check` and `scripts/check-changed.mts`
selects it when dependency files change. The required CI boundary lane runs
`deps:root-ownership:check`, but current `main` does not invoke
`deps:pins:check` from a workflow or the required boundary-check manifest.

That leaves the strongest repository-native check for mutable or disallowed
dependency pins dependent on contributors running `pnpm check:changed`
locally.

## Desired outcome

Dependency pin policy is enforced by a required CI path whenever relevant
dependency inputs change. The maintainers can choose whether that belongs in
the existing boundary shard, a path-conditioned dependency lane, or another
required check.

The existing script should remain the source of truth; this issue should not
introduce a second pin policy.

## Alternatives considered

- Keep relying on `pnpm check:changed`: useful locally, but not an enforcement
  boundary.
- Duplicate the logic in workflow YAML: weaker than reusing the tested script.

## Impact

Affected: dependency and release maintainers.

Severity: medium. A missed pin violation can enter the release graph despite a
repository-native check already existing.

Frequency: whenever relevant dependency inputs change without the local helper
being run.

## Evidence

Verified on OpenClaw `main` at
`493a3e46b3f2921269cfb0af5dfc86efb569ceaa`:

- `package.json` defines `deps:pins:check`;
- `scripts/check-changed.mts` selects it for dependency changes;
- `.github/workflows/ci.yml` runs
  `scripts/run-additional-boundary-checks.mts`;
- that required boundary manifest includes `deps:root-ownership:check`, but not
  `deps:pins:check`; and
- no workflow references `deps:pins:check` or
  `scripts/check-dependency-pins.mts`.

## Implementation intent

Maybe, with maintainer guidance.
