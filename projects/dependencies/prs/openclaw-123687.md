Closes #123687

## What Problem This Solves

OpenClaw has a repository-native dependency pin guard, but required CI did not
run it. Pin violations could therefore be missed when contributors did not run
the changed-file helper locally.

## Why This Change Was Made

Adds the existing `deps:pins:check` command to the required additional boundary
check manifest, next to the existing root dependency ownership check.

This keeps `scripts/check-dependency-pins.mts` as the single policy owner and
adds a focused manifest regression test.

## User Impact

No direct user-visible change. Dependency changes now fail required CI when a
direct dependency pin violates the repository's existing policy.

## Evidence

- `node scripts/run-vitest.mjs test/scripts/run-additional-boundary-checks.test.ts`
  - 22 tests passed.
- `node --import tsx scripts/check-dependency-pins.mts`
  - checked 616 direct specs across 179 tracked package manifests;
  - zero violations.
- `git diff --check`
