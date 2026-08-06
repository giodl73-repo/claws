# Scout Patch Upstream Report

Date: 2026-07-26

Source: Lobster PR #5402 carries 21 OpenClaw patches against `v2026.7.1`.
Every issue created by this effort includes a **Scout patch provenance** banner.

## Portfolio

| Disposition                      |  Count |
| -------------------------------- | -----: |
| Generic upstream fixes/contracts |     16 |
| Lobster-owned integration/policy |      5 |
| **Total**                        | **21** |

Of the 16 upstream candidates, 4 have landed, 4 have active PRs, 6 now have
open issues awaiting an owner decision or implementation, and 2 Teams patches
still require current-SDK behavior proof before filing.

## Upstream Issues

| Patch                | Issue                                                         | Status | Purpose                                                  |
| -------------------- | ------------------------------------------------------------- | ------ | -------------------------------------------------------- |
| `0002`               | #107163                                                       | Open   | Teams-local hostname-scoped RFC2544 policy               |
| `0003`               | #102365                                                       | Closed | Native CJS plugin runtime entrypoints                    |
| `0004`               | #107154                                                       | Open   | Keep keyless WebIQ search on the secrets fast path       |
| `0005`               | #102356                                                       | Closed | Preserve Teams streaming prefix/delta whitespace         |
| `0007`               | #102376                                                       | Open   | Normalize Teams mentions, quotes, forwards, and batches  |
| `0011`               | #113402                                                       | Open   | Allow explicit tool-less Automation runs                 |
| `0015`               | #77298                                                        | Open   | Do not count gateway restart interruptions as job errors |
| `0017`               | [#113444](https://github.com/openclaw/openclaw/issues/113444) | Open   | External runtime ownership of approval presentation      |
| `0018`               | [#113441](https://github.com/openclaw/openclaw/issues/113441) | Open   | Automation job/run/revision identity in hook context     |
| `0019-preapproval`   | [#113443](https://github.com/openclaw/openclaw/issues/113443) | Open   | Fail-closed staged Automation publication                |
| `0020-authorization` | [#113440](https://github.com/openclaw/openclaw/issues/113440) | Open   | Pre-effect hook for resolved nested operations           |
| `0020-personality`   | [#113442](https://github.com/openclaw/openclaw/issues/113442) | Open   | Persist operator-supplied session system prompt          |

Patch `0006` was superseded directly by PR #110357 and the shared ingress
refactor in PR #111249, without a Scout-filed issue.

## Upstream PRs Filed

| Patch  | PR                                                          | State                     | Owner / next step                                                                                                               |
| ------ | ----------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `0002` | #107164                                                     | Open                      | Galin-owned; track, do not duplicate                                                                                            |
| `0003` | #102366                                                     | Merged                    | Drop after release inclusion                                                                                                    |
| `0005` | #102357                                                     | Merged                    | Drop after release inclusion                                                                                                    |
| `0006` | #110357 / #111249                                           | Merged                    | Drop after release inclusion                                                                                                    |
| `0004` | #107155                                                     | Open                      | Galin-owned; CI/proof green; owner manifest-contract decision requested in comment #5083443038, then current-main rebuild       |
| `0007` | #102379                                                     | Open                      | Galin-owned; code/CI green; real Teams tenant proof and current-main refresh still needed                                       |
| `0011` | [#113403](https://github.com/openclaw/openclaw/pull/113403) | Ready for maintainer look | Scout-authored; no findings; proof sufficient; Peter assigned for policy/security-boundary decision                             |
| `0021` | #105801                                                     | Merged                    | Unified bundled catalogs already make the Teams channel entry eligible for official-install trust; drop after release inclusion |

PR #96174 is related to patch `0015`, but solves a distinct task-ledger
`lost`-versus-`failed` timestamp problem. It is not the planned patch `0015`
implementation.

## PRs Planned

| Patch                | Planned PR                                                                         | Gate before coding                                                      |
| -------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `0015`               | Mark restart-interrupted Automations `skipped` without incrementing error counters | Maintainer choice: existing `skipped` versus new `interrupted` status   |
| `0017`               | Add generic external approval-presentation ownership                               | Approval/channel contract owner confirmation                            |
| `0018`               | Propagate immutable Automation job/run/revision identity to hooks                  | Scheduler/plugin contract owner confirmation                            |
| `0019-preapproval`   | Add staged, non-runnable Automation publication and fenced finalization            | Scheduler/storage/gateway owner confirmation                            |
| `0020-authorization` | Add resolved nested-operation pre-effect authorization hook                        | Exec/nodes/MCP/plugin owner confirmation and operation taxonomy         |
| `0020-personality`   | Persist a bounded operator-supplied prompt on session creation                     | Session API, prompt precedence, inheritance, and authorization decision |

This is **6 planned PRs** after owner decisions.

Two additional PRs are conditional:

- `0009-msteams-threaded-replies`
- `0014-msteams-quoted-replies`

These should be filed only if a real Teams SDK 2.0.14 proof demonstrates a
remaining behavior gap. The old wire-level `replyToId` patches should not be
ported.

## Downstream Patches

Keep these 5 in Lobster because they encode Lobster-owned identity, proxy,
routing, delivery, or execution policy:

`0001`, `0010`, `0013`, `0016`, and `0019-passport`.

## Immediate Team Actions

1. Get Peter's inherited-allowlist policy decision on PR #113403; if accepted,
   rebase and refresh focused Automation proof.
2. Get the `skipped` versus `interrupted` decision on issue #77298.
3. Triage owner feedback on issues #113440–#113444 and select the first
   contract PR.
4. Galin is on vacation: keep his three PRs stable. Use the time for owner
   decisions and proof preparation; do not churn or duplicate them.
5. Verify release inclusion of PRs #102366, #102357, #110357, and #105801
   during the next PromoteClaw bump, then remove the corresponding Lobster patches.
