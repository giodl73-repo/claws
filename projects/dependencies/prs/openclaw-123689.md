Progresses #123689. Supersedes the incomplete approach in #123692.

## Summary

- add daily Dependabot discovery for the isolated trusted ClawHub release-tool
  graph
- add `deps:clawhub-cli-pins:sync` to refresh the lock SHA-256, package
  integrity, and exact version together
- enforce `deps:clawhub-cli-pins:check` in required boundary CI
- preserve the materializer mode and atomically replace the synchronized pins
- run the same no-secret trusted-publisher command-and-flags proof for update
  PRs and releases

## Why

Generic Dependabot coverage alone was unsafe because
`scripts/materialize-clawhub-cli.sh` intentionally rejects any lock whose
SHA-256, ClawHub integrity, or version does not match its reviewed pins. This
keeps that invariant intact while making routine update PRs mechanically
refreshable and reviewable.

Identity synchronization alone was also insufficient because an updated
executable could retain valid bytes while dropping the trusted-publisher
command used later by the credential-bearing release path. The draft now keeps
both invariants intact: reviewed identity pins and pre-merge command-contract
proof. It remains draft for release/security-owner review of the trusted update
boundary.

## Validation

- exact repository formatter and linter pass
- workflow actionlint passes
- ClawHub pin check passes
- 39 focused workflow, boundary-runner, synchronization, and command-contract
  tests pass
- the committed lock materializes `clawhub@0.23.1` and proves
  `package trusted-publisher set`, `--repository`, and `--workflow-filename`
