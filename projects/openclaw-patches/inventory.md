# Lobster OpenClaw Patch Inventory

Baseline: Lobster PR #5402 at
`c05c4654cf594cb953b56e65e3eb4e5c33fd0d59`, carrying 20 patch files against
OpenClaw `v2026.7.1`.

Classification:

- **Upstream fix**: generic correctness or product behavior suitable for a
  focused OpenClaw issue and PR.
- **Upstream contract**: generic host-extension seam belongs upstream, while
  Lobster policy remains downstream.
- **Lobster**: depends on Lobster-owned identity, proxy, routing, lease, or trust
  topology.

## Related RFC

Omar Shahine's draft
[RFC 0026](https://github.com/openclaw/rfcs/pull/50) standardizes
**Automations** as the user-facing name for the internally named cron feature
and proposes configurable display terminology. It explicitly leaves `cron.*`
RPC methods, config, storage, state paths, and schedule syntax unchanged.

Use RFC 0026 terminology in user-facing issue and PR copy. It does not cover
the patch set's delivery semantics, tool-allowlist correctness, lifecycle
identity, staged publication, pre-effect authorization, or execution fencing;
those remain separate upstream fixes or contract proposals.

## Inventory

| Patch | Classification | Upstream discovery | Status | Next action |
| ----- | -------------- | ------------------ | ------ | ----------- |
| `0001-msteams-brokered-auth` | Lobster | No generic externally authenticated Teams transport found | Downstream | Keep; later assess whether a narrow authenticated-host transport contract is useful upstream |
| `0002-msteams-brokered-benchmark-range` | Lobster | No matching thread found | Downstream | Keep with Lobster DNS sinkhole and egress-proxy design |
| `0003-msteams-native-runtime-entrypoints` | Upstream fix | Issue #102365; merged PR #102366, merge `68dcfe633d85acdb38cdc102de806f2c7141cd6f` | **Upstream landed** | Drop when the pinned OpenClaw release contains the merge |
| `0004-secrets-fast-path-keyless-webiq` | Upstream fix | Issue #107154 and open PR #107155, owned by Galin Iliev | **Active upstream PR** | Do not duplicate; track PR #107155 and drop after release inclusion |
| `0005-msteams-streaming-prefix-delta` | Upstream fix | Issue #102356; merged PR #102357, merge `787ed383f5579420871bc86e0abb3437448c15a9` | **Upstream landed** | Drop when the pinned OpenClaw release contains the merge |
| `0006-msteams-delivery-id-dedupe` | Lobster, with extractable generic behavior | No matching delivery-id/activity-id dedupe thread found | Downstream / split candidate | Keep Lobster header handling; evaluate generic activity-id webhook idempotency separately |
| `0007-msteams-normalize-quoted-forward` | Upstream fix | Merged PR #51647 covers HTML reply extraction only; no matching mention/entity/forward normalization issue found | **Partial overlap** | Diff current `main`; split remaining mention, quoted-entity, and forwarded-message gaps into the smallest issue set |
| `0009-msteams-threaded-replies` | Upstream fix | No matching `replyToId` outbound threading issue or PR found | **Issue needed** | Prove current behavior and file a focused Teams threading issue |
| `0010-cron-delivery-target-optional` | Upstream fix | No matching bare-announce delivery-target issue found; merged PR #92318 is related delivery-proof work | **Issue needed** | Reproduce successful turn becoming `delivery-target` error and file |
| `0011-cron-toolless-run-guard` | Upstream fix | Issue #113402 and PR #113403; PR #95605 covers the distinct raw `modelRun` case | **Upstream PR open** | Track review/CI and drop after a release contains the fix |
| `0013-msteams-brokered-multiplayer-route` | Lobster | No generic equivalent expected | Downstream | Keep with Lobster multiplayer admission, routing, and completion lease |
| `0014-msteams-quoted-replies` | Upstream fix | PR #51647 is inbound context only; no outbound quote-mirroring issue found | **Issue needed** | Prove outbound wire behavior and file separately from inbound normalization |
| `0015-cron-gateway-restart-interrupt-skipped` | Upstream fix | Open issue #77298 matches counter/health concern; open PR #96174 proposes `failed` rather than `lost` | **Existing discussion** | Compare `skipped` versus `failed` semantics and add evidence to the canonical issue before coding |
| `0016-msteams-brokered-file-download` | Lobster | No generic direct-token gap; behavior depends on Lobster delegated-auth proxy | Downstream | Keep while brokered Teams remains host-owned |
| `0017-msteams-suppress-brokered-approval-prompt` | Upstream contract | No matching `externally-brokered` approval-surface thread found | **Issue needed; owner confirmation** | Propose a generic externally rendered approval surface, excluding Lobster UI policy |
| `0018-cron-hook-job-identity` | Upstream contract | No matching persisted cron job/revision/run hook identity thread found | **Issue needed; owner confirmation** | Define the minimal hook-correlation contract and split it from preapproval policy |
| `0019-cron-passport-execution-fence` | Lobster | No generic Passport ownership concept expected | Downstream | Keep regional ownership and duplicate-execution policy in Lobster |
| `0019-cron-preapproval-creation` | Upstream contract | No matching staged host-authorized cron publication thread found | **Issue needed; owner confirmation** | Propose opaque staged-publication/finalization seam without Lobster approval schema |
| `0020-cron-nested-tool-authorization` | Upstream contract | No matching `before_tool_operation` resolved pre-effect hook found | **Issue needed; owner confirmation** | Specify resolved operation identity and ordering for exec, nodes, MCP, and plugin tools |
| `0020-personality-extra-system-prompt` | Upstream fix | No matching `sessions.create` persisted `extraSystemPrompt` issue found; existing prompt issues cover other paths | **Issue needed; public-surface review** | Confirm desired session API contract and file after owner review |

## Totals

| Disposition | Count |
| ----------- | ----: |
| Direct upstream fixes/features | 10 |
| Generic upstream contracts | 4 |
| Lobster-owned patches | 6 |
| Already landed upstream | 2 |
| Exact existing open issue | 1 |
| Existing related discussion requiring comparison | 2 |
| Upstream issue gaps after bounded search | 9 |

The issue-gap count includes contract proposals and excludes Lobster-only
patches. Patch 0007 may become more than one narrowly owned issue after the
current-main diff.

## Historical Drop

`0012-msteams-text-attachment-context.patch` was removed during the 2026.7.1
promotion because current upstream attachment-preservation behavior overlaps
the patch. It is not part of the 20 active files.

## Search Evidence

- Gitcrawl database was current as of `2026-07-24T18:30:01Z`, but contained
  only 84 threads and returned no patch-specific search results.
- Live GitHub title/body searches were therefore used for the initial bounded
  discovery.
- Exact code-symbol searches found the already-landed patches 0003 and 0005.
- All links and states must be rechecked live before issue or PR mutation.
