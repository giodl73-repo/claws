# Lobster OpenClaw Patch Inventory

Baseline: Lobster PR #5402 at
`b85499b5575a0757e13827634741a91ab64eab61`, carrying 20 patch files against
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
| `0002-msteams-brokered-benchmark-range` | Upstream fix | Issue #107163 and open PR #107164, owned by Galin Iliev, add a Teams-local hostname-scoped RFC2544 policy | **Active upstream PR** | Do not duplicate; track PR #107164 and drop after release inclusion and accepted host-proxy proof |
| `0003-msteams-native-runtime-entrypoints` | Upstream fix | Issue #102365; merged PR #102366, merge `68dcfe633d85acdb38cdc102de806f2c7141cd6f` | **Upstream landed** | Drop when the pinned OpenClaw release contains the merge |
| `0004-secrets-fast-path-keyless-webiq` | Upstream fix | Issue #107154 and open PR #107155, owned by Galin Iliev | **Active upstream PR** | Do not duplicate; track PR #107155 and drop after release inclusion |
| `0005-msteams-streaming-prefix-delta` | Upstream fix | Issue #102356; merged PR #102357, merge `787ed383f5579420871bc86e0abb3437448c15a9` | **Upstream landed** | Drop when the pinned OpenClaw release contains the merge |
| `0006-msteams-delivery-id-dedupe` | Upstream fix | Merged PR #110357 durably admits Teams activities by `activity.id`, rejects in-flight/completed redeliveries, and survives restart; PR #111249 moved the mechanism into the shared ingress monitor | **Upstream landed** | Drop the Lobster patch when the pinned release contains merge `4e0cc187a21cca36d1887998c101c6b9baf926be`; the Lobster delivery header is no longer needed for generic dedupe |
| `0007-msteams-normalize-quoted-forward` | Upstream fix | Open issue #102376 and PR #102379 cover mention, quoted-reply, forward, and debounce normalization; merged PR #51647 covers HTML reply extraction | **Existing upstream PR** | Do not duplicate Galin's active PR; track its current `DIRTY` head and unresolved maintainer feedback, then drop the matching Lobster patch after release inclusion |
| `0009-msteams-threaded-replies` | Upstream fix | Current `main` already keeps reactive channel/group replies in context through Teams SDK `reply()`; SDK 2.0.14 documents `send()` as thread-preserving and `reply()` as adding a quote, while streaming is 1:1-only | **Reassess after SDK migration** | Do not file the old `replyToId` design; compare with 0014 and split only a verified quote/context gap |
| `0010-cron-delivery-target-optional` | Lobster | Issue #91613 and merged PR #91685 deliberately fail closed for ambiguous keyless implicit delivery; merged PR #105215 preserves successful execution status but keeps `delivery-target` fatal; explicit `delivery.bestEffort: true` already exists | **Downstream policy conflict** | Do not upstream the patch unchanged; keep Lobster's default only if its operator policy intentionally accepts best-effort implicit delivery |
| `0011-cron-toolless-run-guard` | Upstream fix | Scout-marked issue #113402 and PR #113403; real Gateway/Automation proof passed on Testbox `tbx_01kyb3f4sd4c1850yhjcnn1yfw`; PR #95605 covers the distinct raw `modelRun` case | **Upstream PR open; proof posted** | Track re-review/CI and drop after a release contains the fix |
| `0013-msteams-brokered-multiplayer-route` | Lobster | No generic equivalent expected | Downstream | Keep with Lobster multiplayer admission, routing, and completion lease |
| `0014-msteams-quoted-replies` | Upstream fix | PR #51647 is inbound context only; Teams SDK 2.0.14 now provides first-class `reply()`, `quote()`, and `addQuote()` APIs, superseding the patch's older wire-level approach | **Reassess against SDK APIs** | Prove the desired reactive/proactive quote policy on current `main`; use SDK-native APIs rather than porting the patch |
| `0015-cron-gateway-restart-interrupt-skipped` | Upstream fix | Open issue #77298 exactly matches counter/health pollution; Scout provenance and the downstream `skipped` semantics were posted in comment #5075284093; PR #96174 is distinct task-ledger `lost` versus `failed` recovery | **Owner decision needed** | Wait for agreement on reusing existing `skipped` versus adding public `interrupted`; then author the narrow `ops.ts` and restart-catchup test change |
| `0016-msteams-brokered-file-download` | Lobster | No generic direct-token gap; behavior depends on Lobster delegated-auth proxy | Downstream | Keep while brokered Teams remains host-owned |
| `0017-msteams-suppress-brokered-approval-prompt` | Upstream contract | Scout-marked issue #113444 | **Issue filed; owner confirmation** | Confirm the generic external approval-presentation ownership contract before coding |
| `0018-cron-hook-job-identity` | Upstream contract | Scout-marked issue #113441; issue #50291 is related observability work | **Issue filed; owner confirmation** | Confirm the immutable Automation job/run/revision hook identity contract before coding |
| `0019-cron-passport-execution-fence` | Lobster | No generic Passport ownership concept expected | Downstream | Keep regional ownership and duplicate-execution policy in Lobster |
| `0019-cron-preapproval-creation` | Upstream contract | Scout-marked issue #113443 | **Issue filed; owner confirmation** | Confirm the opaque staged-publication/finalization seam before coding |
| `0020-cron-nested-tool-authorization` | Upstream contract | Scout-marked issue #113440; issues #13364 and #110986 cover different top-level hook concerns | **Issue filed; owner confirmation** | Confirm operation taxonomy and owner coverage for exec, nodes, MCP, and plugin tools |
| `0020-personality-extra-system-prompt` | Upstream fix | Scout-marked issue #113442; issue #80329 is related operator context but not persisted prompt state | **Issue filed; public-surface review** | Decide prompt precedence, inheritance, authorization, and mutability before coding |

## Totals

| Disposition | Count |
| ----------- | ----: |
| Direct upstream fixes/features | 11 |
| Generic upstream contracts | 4 |
| Lobster-owned patches | 5 |
| Already landed upstream | 3 |
| Open issue awaiting decision or implementation | 6 |
| Existing related discussion requiring comparison | 2 |
| Conditional issue gaps after bounded search | 2 |

The two remaining issue gaps are patches `0009` and `0014`; file only if
current Teams SDK behavior proof confirms a remaining gap.

## Historical Drop

`0012-msteams-text-attachment-context.patch` was removed during the 2026.7.1
promotion because current upstream attachment-preservation behavior overlaps
the patch. It is not part of the 20 active files.

## Search Evidence

- Gitcrawl database was current as of `2026-07-24T21:29:54Z`, but its bounded
  searches did not find the Teams normalization thread.
- Live GitHub title/body searches found exact issue #102376 and PR #102379 for
  patch 0007.
- Live verification found exact issue #107163 and PR #107164 for patch 0002;
  the focused Teams-local fix supersedes a second Scout PR for hosted package 1.
- Exact code-symbol searches found the already-landed patches 0003 and 0005.
- All links and states must be rechecked live before issue or PR mutation.
