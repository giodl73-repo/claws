# OpenClaw Patch Upstream Status

Status date: 2026-07-24

Baseline: Lobster PR
[#5402](https://microsoft.ghe.com/bic/lobster/pull/5402), head
`b85499b5575a0757e13827634741a91ab64eab61`, carrying 20 OpenClaw patches
against `v2026.7.1`.

## Executive Summary

| Portfolio disposition | Count | Meaning |
| --- | ---: | --- |
| Upstream fixes or contracts | 14 | Generic OpenClaw behavior or extension contracts |
| Lobster-owned policy/integration | 6 | Keep downstream |
| **Total** | **20** | Current Lobster patch set |

The 14 upstream candidates are now substantially triaged:

| Upstream status | Count | Patches |
| --- | ---: | --- |
| Landed upstream | 3 | `0003`, `0005`, `0006` |
| Active upstream PR | 3 | `0004`, `0007`, `0011` |
| Canonical issue; owner decision needed | 1 | `0015` |
| Reassess after Teams SDK migration | 2 | `0009`, `0014` |
| Generic contract proposal needed | 4 | `0017`, `0018`, `0019-preapproval`, `0020-authorization` |
| Public API review needed before filing | 1 | `0020-personality` |
| **Total upstream candidates** | **14** | |

## Patch Status

### Drop after an OpenClaw release includes the fix

| Patch | Upstream fix |
| --- | --- |
| `0003-msteams-native-runtime-entrypoints` | PR #102366 |
| `0005-msteams-streaming-prefix-delta` | PR #102357 |
| `0006-msteams-delivery-id-dedupe` | PR #110357, generalized by PR #111249 |

### Track existing upstream PRs

| Patch | Thread | Current state |
| --- | --- | --- |
| `0004-secrets-fast-path-keyless-webiq` | Issue #107154 / PR #107155 | Open; Galin-owned; do not duplicate |
| `0007-msteams-normalize-quoted-forward` | Issue #102376 / PR #102379 | Open; Galin-owned; branch needs refresh and maintainer follow-up |
| `0011-cron-toolless-run-guard` | Issue #113402 / PR #113403 | Open; real Testbox proof and green CI; ClawSweeper re-review did not complete |

### Needs a product or owner decision

| Patch | Decision |
| --- | --- |
| `0015-cron-gateway-restart-interrupt-skipped` | Canonical issue #77298 now has Scout provenance. Decide whether restart interruption uses existing `skipped` or a new public `interrupted` status. |
| `0009-msteams-threaded-replies` | Re-prove the desired behavior against Teams SDK 2.0.14; do not port the old `replyToId` interceptor. |
| `0014-msteams-quoted-replies` | Define reactive versus proactive quote policy using SDK-native `reply()` / quote APIs. |
| `0020-personality-extra-system-prompt` | Confirm the persisted `sessions.create` API contract before filing or coding. |

### Generic upstream contracts to propose

| Patch | Proposed generic contract |
| --- | --- |
| `0017-msteams-suppress-brokered-approval-prompt` | Externally rendered approval surface |
| `0018-cron-hook-job-identity` | Persisted Automation job/revision/run hook identity |
| `0019-cron-preapproval-creation` | Opaque staged publication and host authorization |
| `0020-cron-nested-tool-authorization` | Resolved pre-effect authorization hook for nested operations |

These need owner confirmation before implementation because they add durable
host/plugin/runtime surfaces.

### Keep downstream in Lobster

| Patch | Reason |
| --- | --- |
| `0001-msteams-brokered-auth` | Lobster-owned authenticated transport |
| `0002-msteams-brokered-benchmark-range` | Lobster DNS and egress topology |
| `0010-cron-delivery-target-optional` | Lobster policy conflicts with upstream fail-closed delivery defaults |
| `0013-msteams-brokered-multiplayer-route` | Lobster multiplayer admission and routing |
| `0016-msteams-brokered-file-download` | Lobster delegated-auth proxy |
| `0019-cron-passport-execution-fence` | Lobster regional ownership and execution fencing |

## Recommended Next Actions

1. Unstick PR #113403's ClawSweeper review; it is the most complete upstream
   patch and already has real behavior proof.
2. Ask for the narrow status decision on issue #77298. If `skipped` is
   accepted, author patch `0015` as the next focused PR.
3. Track Galin's PRs #107155 and #102379 rather than creating duplicates.
4. Run one current-SDK Teams proof pass covering `0009` and `0014`; file only
   behavior gaps that still reproduce.
5. Present the four host-contract patches as a coordinated owner-review packet,
   then split accepted contracts into individual RFCs/issues.
6. During the next PromoteClaw bump, verify release inclusion and remove
   patches `0003`, `0005`, and `0006`.
