# OpenClaw Patch Upstream Status

Status date: 2026-07-26

Baseline: Lobster PR
[#5402](https://microsoft.ghe.com/bic/lobster/pull/5402), head
`f807270d0b90cf2515bd82f257213f74f9338f5c`, carrying 21 OpenClaw patches
against `v2026.7.1`.

## Executive Summary

| Portfolio disposition | Count | Meaning |
| --- | ---: | --- |
| Upstream fixes or contracts | 16 | Generic OpenClaw behavior or extension contracts |
| Lobster-owned policy/integration | 5 | Keep downstream |
| **Total** | **21** | Current Lobster patch set |

The 16 upstream candidates are now substantially triaged:

| Upstream status | Count | Patches |
| --- | ---: | --- |
| Landed upstream | 4 | `0003`, `0005`, `0006`, `0021` |
| Active upstream PR | 4 | `0002`, `0004`, `0007`, `0011` |
| Open issue; owner decision or implementation needed | 6 | `0015`, `0017`, `0018`, `0019-preapproval`, `0020-authorization`, `0020-personality` |
| Reassess after Teams SDK migration | 2 | `0009`, `0014` |
| **Total upstream candidates** | **16** | |

## Patch Status

### Drop after an OpenClaw release includes the fix

| Patch | Upstream fix |
| --- | --- |
| `0003-msteams-native-runtime-entrypoints` | PR #102366 |
| `0005-msteams-streaming-prefix-delta` | PR #102357 |
| `0006-msteams-delivery-id-dedupe` | PR #110357, generalized by PR #111249 |
| `0021-msteams-official-trust` | PR #105801 unified bundled catalog loading; present from `v2026.7.2-beta.1`, absent from `v2026.7.1` |

### Track existing upstream PRs

| Patch | Thread | Current state |
| --- | --- | --- |
| `0002-msteams-brokered-benchmark-range` | Issue #107163 / PR #107164 | Open; Galin-owned; head `371e707170b2`; Codex-clean and all GitHub checks green |
| `0004-secrets-fast-path-keyless-webiq` | Issue #107154 / PR #107155 | Open; Galin-owned; head `ff85c33c553d`; tests, CI, and startup proof pass; not merge-ready because exact-head review requires an owner-approved manifest contract instead of opaque `omitAuth` inspection, and the branch is 4,057 current-main commits behind |
| `0007-msteams-normalize-quoted-forward` | Issue #102376 / PR #102379 | Open; Galin-owned; head `0fc04b3cbd2a`; all checks and required gate green; GitHub `UNSTABLE` and real Teams proof still needed |
| `0011-cron-toolless-run-guard` | Issue #113402 / PR #113403 | Open; no ClawSweeper findings; proof sufficient; ready for maintainer look; Peter assigned for policy/security-boundary decision |

### Needs a product or owner decision

| Patch | Decision |
| --- | --- |
| `0015-cron-gateway-restart-interrupt-skipped` | Canonical issue #77298 now has Scout provenance. Decide whether restart interruption uses existing `skipped` or a new public `interrupted` status. |
| `0009-msteams-threaded-replies` | Re-prove the desired behavior against Teams SDK 2.0.14; do not port the old `replyToId` interceptor. |
| `0014-msteams-quoted-replies` | Define reactive versus proactive quote policy using SDK-native `reply()` / quote APIs. |
| `0020-personality-extra-system-prompt` | Review filed issue #113442 and confirm prompt precedence, inheritance, authorization, and mutability before coding. |

### Filed generic upstream contract issues

| Patch | Proposed generic contract |
| --- | --- |
| `0017-msteams-suppress-brokered-approval-prompt` | #113444 — externally rendered approval surface |
| `0018-cron-hook-job-identity` | #113441 — persisted Automation job/revision/run hook identity |
| `0019-cron-preapproval-creation` | #113443 — opaque staged publication and host authorization |
| `0020-cron-nested-tool-authorization` | #113440 — resolved pre-effect authorization hook for nested operations |

Issue #113442 separately covers persisted session prompt state. All five new
issues need owner confirmation before implementation because they add durable
host/plugin/runtime or session surfaces.

### Keep downstream in Lobster

| Patch | Reason |
| --- | --- |
| `0001-msteams-brokered-auth` | Lobster-owned authenticated transport |
| `0010-cron-delivery-target-optional` | Lobster policy conflicts with upstream fail-closed delivery defaults |
| `0013-msteams-brokered-multiplayer-route` | Lobster multiplayer admission and routing |
| `0016-msteams-brokered-file-download` | Lobster delegated-auth proxy |
| `0019-cron-passport-execution-fence` | Lobster regional ownership and execution fencing |

## Recommended Next Actions

1. Ask plugin/secrets owners to choose the bounded #107155 manifest contract in
   `pr-107155-capability-decision.md` or retain the conservative resolver path.
   Rebuild on current `main` only after that decision.
2. Wait for Peter's explicit inherited-allowlist policy decision on PR #113403;
   after acceptance, rebase onto current `main` and refresh the focused
   Automation proof before landing.
3. Ask for the narrow status decision on issue #77298. If `skipped` is
   accepted, author patch `0015` as the next focused PR.
4. Track Galin's PRs #107164, #107155, and #102379 rather than creating
   duplicates.
5. Run one current-SDK Teams proof pass covering `0009` and `0014`; file only
   behavior gaps that still reproduce.
6. Review issues #113440–#113444 as one owner packet, then implement accepted
   contracts as separate PRs.
7. During the next PromoteClaw bump, verify release inclusion and remove
   patches `0003`, `0005`, `0006`, and `0021`.
