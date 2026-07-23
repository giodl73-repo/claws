# State Continuity PR Consolidation

## Goal

Reduce the fork-only continuity stack from 21 canonical open PRs to 12
reviewable bundles without rewriting or deleting the original branch history.

Obsolete PRs are closed with a link to their replacement. Canonical source
branches remain available as evidence until each rollup branch passes its
focused proof.

## Current Count

| Repository | Before cleanup | Canonical after cleanup | Target bundles |
| ---------- | -------------: | ----------------------: | -------------: |
| OpenClaw   |             15 |                      13 |              7 |
| Lobster    |              7 |                       7 |              4 |
| RFCs       |              2 |                       1 |              1 |
| **Total**  |         **24** |                  **21** |         **12** |

Closed as superseded:

- OpenClaw PR 110 and PR 111 -> PR 112.
- RFC PR 3 -> PR 5.

## Proposed Bundles

### OpenClaw

| Bundle | Source PRs                 | Boundary                                                                                                                         |
| ------ | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| OC-A   | 41, 55-58                  | CAPE owner model plus complete Archived capture, verification, materialization, and preview.                                     |
| OC-B   | 64                         | Launcher-fenced managed restore executor.                                                                                        |
| OC-C   | 101                        | Strict final closed-state capture.                                                                                               |
| OC-D   | 112                        | Direct external-plugin publication and independent retrieval.                                                                    |
| OC-E   | 115, 121                   | Elastic wake descriptor plus exact destination preparation.                                                                      |
| OC-F   | 124, 127                   | Durable restored readiness plus private restored-startup transaction.                                                            |
| OC-G   | 129 plus current follow-on | Live restored startup and paired v2 descriptor/result/completion contracts. One product follow-on commit; no proof-harness code. |

### Lobster

| Bundle | Source PRs                    | Boundary                                                                                                                                       |
| ------ | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| LB-A   | 15                            | Exact-route fenced restore execution.                                                                                                          |
| LB-B   | 16, 17                        | Final capture, publication acceptance, source finalization, and destruction authority.                                                         |
| LB-C   | 18, 19                        | Sleep authorization and durable wake scheduling.                                                                                               |
| LB-D   | 20, 21 plus current follow-on | Ensure-ready coordination, destination restore binding, concrete crash-safe provisioner, and one separate test-only paired-image proof commit. |

### RFC

| Bundle | Source PR | Boundary                                                                        |
| ------ | --------- | ------------------------------------------------------------------------------- |
| RFC-A  | 5         | RFC 0021 and normative CAPE, publication, readiness, and Elastic host sidecars. |

## Rollups Created

| Bundle | Rollup PR                                                            | State                                                                                                                                     | Source PRs                              |
| ------ | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| OC-A   | [OpenClaw PR 139](https://github.com/giodl73-repo/openclaw/pull/139) | Verified exact terminal source head. Substantive checks pass; fork-only label/auto-response jobs fail on missing app secrets as expected. | 41, 55-58 remain open by user choice.   |
| OC-B   | [OpenClaw PR 141](https://github.com/giodl73-repo/openclaw/pull/141) | Verified exact terminal source head. Substantive checks pass; only expected fork-secret jobs fail.                                        | 64 remains open by user choice.         |
| OC-C   | [OpenClaw PR 142](https://github.com/giodl73-repo/openclaw/pull/142) | Verified exact terminal source head. Substantive checks pass; only expected fork-secret jobs fail.                                        | 101 remains open by user choice.        |
| OC-D   | [OpenClaw PR 143](https://github.com/giodl73-repo/openclaw/pull/143) | Verified exact terminal source head. Substantive checks pass; only expected fork-secret jobs fail.                                        | 112 remains open by user choice.        |
| OC-E   | [OpenClaw PR 144](https://github.com/giodl73-repo/openclaw/pull/144) | Verified exact terminal source head. Substantive checks pass; only expected fork-secret jobs fail.                                        | 115 and 121 remain open by user choice. |
| OC-F   | [OpenClaw PR 140](https://github.com/giodl73-repo/openclaw/pull/140) | Verified exact terminal source head. Substantive checks pass; only expected fork-secret jobs fail.                                        | 124 and 127 remain open by user choice. |
| LB-B   | [Lobster PR 22](https://microsoft.ghe.com/giodl/lobster/pull/22)     | Draft and mergeable, but no GitOps/ADO contexts are attached. Not ready.                                                                  | 16-17 remain open.                      |
| LB-C   | [Lobster PR 23](https://microsoft.ghe.com/giodl/lobster/pull/23)     | Draft and mergeable, but no GitOps/ADO contexts are attached. Not ready.                                                                  | 18-19 remain open.                      |

Ten of the twelve target bundle positions now exist when counting RFC PR 5 and
the single-source Lobster restore foundation PR 15. OC-G and LB-D remain
deferred until the dirty PR 129 and PR 21 follow-ons are committed, pushed, and
the paired fork-image crash proof is complete.

The proof harness remains inside LB-D and does not create a thirteenth bundle.
The current OpenClaw follow-on is bounded to 4 files; the current Lobster
product follow-on is bounded to 25 files. Keep the Lobster harness in a later
test-only commit so reviewers can separate runtime behavior from proof
orchestration without rewriting either history.

## Construction

1. Freeze and commit the current OpenClaw v2 lifecycle follow-on as the OC-G
   product commit.
2. Freeze and commit the current Lobster v2/concrete-provisioner follow-on as
   the LB-D product commit.
3. Add the executable paired-image harness as a separate LB-D test-only commit.
   Do not add harness code to OpenClaw.
4. Push the exact fork branches, build images from those immutable SHAs, and run
   paired first execution plus coordinator-crash replay. This requires a
   running Docker engine and the complete Lobster native image-build feed
   secret set. The current process-local fixture is necessary evidence but is
   not a substitute.
5. If proof finds a defect, append focused corrective commits. Do not amend,
   squash, or rewrite the already-proven product/harness history.
6. Create new rollup branches at the selected passing top branch SHA; preserve the
   existing commits rather than squashing or rewriting them.
7. Open each rollup against the previous bundle branch so the review diff
   matches the boundary above.
8. Copy proof links, exact source/image identities, and owner-confirmation
   warnings into each rollup body.
9. Keep source PRs open by current user choice. If that decision changes later,
   add replacement links before closing. Keep source branches until the fork
   evidence program ends.

## Gates

- Do not close canonical source PRs before the replacement rollup exists.
- Do not enable production activation from a rollup.
- OC-G and LB-D require the paired fork-image crash-replay proof.
- Proof must name committed OpenClaw and Lobster SHAs; a dirty-worktree-only
  image is not reproducible rollup evidence.
- Do not substitute remote source-level tests for the missing paired-image
  crash-injection run.
- Sticky OpenClaw config, manifest, Plugin SDK, CLI, and runtime contracts still
  require owner confirmation.
- Lobster bundles are not ready unless all required GitOps and ADO contexts are
  attached and green.
