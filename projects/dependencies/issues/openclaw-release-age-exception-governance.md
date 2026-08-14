## Summary

Make minimum-release-age exclusions reviewable exceptions with explicit
ownership and lifecycle context.

## Problem to solve

OpenClaw uses pnpm's two-day `minimumReleaseAge`, which is a useful default
supply-chain control. The current `minimumReleaseAgeExclude` list in
`pnpm-workspace.yaml` contains bare package names, patterns, and exact versions
without a machine-checkable owner, reason, or review/expiry date.

An emergency or compatibility exception can therefore remain indefinitely
after its original need has passed, and reviewers cannot distinguish a
temporary release unblock from a permanent compatibility policy.

## Desired outcome

Every release-age exclusion has reviewable context:

- responsible owner;
- reason for bypassing the default hold;
- date added; and
- expiry date or next-review date.

CI should fail when exclusions and their metadata drift. The maintainers should
choose whether the metadata lives in a companion file, structured comments, or
another repository-native mechanism that keeps `pnpm-workspace.yaml` valid.

This should preserve the ability to add urgent exceptions; it should not remove
the escape hatch or add downstream-specific approval policy.

## Alternatives considered

- Remove all exclusions: too disruptive and does not support urgent release
  needs.
- Leave rationale only in PR history: difficult to audit and easy to lose as
  the list evolves.

## Impact

Affected: dependency, security, and release maintainers.

Severity: medium. Permanent silent bypasses weaken the intended release-age
control.

Frequency: every install for each active exclusion.

## Evidence

Verified on OpenClaw `main` at
`493a3e46b3f2921269cfb0af5dfc86efb569ceaa`:

- `pnpm-workspace.yaml` sets `minimumReleaseAge: 2880`; and
- `minimumReleaseAgeExclude` is a plain list with no owner, reason, or lifecycle
  metadata.

## Implementation intent

Maybe, with maintainer guidance.
