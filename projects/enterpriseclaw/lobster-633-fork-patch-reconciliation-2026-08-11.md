# Lobster 6.33 / Controlled-Fork Patch Reconciliation

Date: 2026-08-11

## Decision

The controlled OpenClaw fork does **not** contain Lobster PR #7055's complete
37-patch image queue. That is intentional and useful:

- Lobster retains a self-contained downstream queue that can be replayed
  against signed OpenClaw `v2026.6.33`.
- The controlled fork retains admitted OpenClaw source and bounded evidence
  slices rather than becoming a second copy of the Lobster image build.
- Portable behavior can move into the fork only through an exact source
  admission or an upstream-equivalent implementation.
- Microsoft adapters, brokered Teams behavior, sensitivity providers, and
  private capability carriers remain Lobster-owned.

This separation means the queue remains available for a later image promotion.
It does not mean the 37 patches should be applied wholesale to the controlled
fork.

## Compared Generations

| Surface | Exact generation | Meaning |
| --- | --- | --- |
| Lobster promotion candidate | PR #7055 head `4b011a77bfffdffb0dc9ea5ba83dad5502a41002` | 37 physical patches targeting signed OpenClaw `v2026.6.33` |
| Controlled fork | merged EVID-021 head `fcadf5ced0ef139fe8e8319e2fbfb08bec8918c2` | OpenClaw source admissions and evidence through EVID-021 |
| Pending controlled-fork work | PR #229 head `039e08997108dc3f81aef03653abc082769cff43` | EVID-022 streaming-input proof; not yet merged |

## Status Grammar

- **fork-present**: exact admitted source or evidence exists in the controlled
  fork.
- **upstream-equivalent**: the controlled fork's OpenClaw baseline already has
  the relevant portable behavior; the Lobster backport is still needed for
  `v2026.6.33`.
- **Lobster-only**: the behavior is intentionally downstream product or
  adapter code.
- **superseded**: the physical patch is obsolete for this generation.
- **missing**: the portable behavior is not established in the controlled
  fork.
- **mixed**: a consolidated patch combines two or more of those outcomes.

“Present” never means that a physical Lobster `.patch` file exists in the
controlled fork. It means the behavior is admitted or independently present in
source. Similar names, quarantined source, RFCs, and evidence-only authority do
not count as implementation.

## 37-Row Reconciliation

| Patch | Behavior | Current physical owner | Controlled-fork status | Evidence / source | Required action | Deletion condition |
| --- | --- | --- | --- | --- | --- | --- |
| `0000-enterpriseclaw-upstream-evidence-slices` | EnterpriseClaw source admissions and bounded evidence | Lobster image bundle plus controlled-fork evidence series | **fork-present**, but generations differ | Controlled fork has EVID-001 through EVID-021 merged; EVID-022 is open as PR #229. The #7055 bundle is a downstream backport, not the complete Rust evidence series. | Keep the image bundle pinned to its exact admitted source identities; merge and document EVID-022 separately. | Delete the image backport when the promoted OpenClaw release contains the admitted source generations and Lobster no longer needs the bundled proof files. |
| `0001-msteams-upstream` | Consolidated generic Teams correctness, delivery, attachments, and channel behavior | Lobster patch queue | **mixed** | The controlled fork has a newer upstream Teams extension, but no exact admission proves the consolidated #7055 bucket is fully equivalent. | Split by portable behavior; compare each focused fix with current OpenClaw and upstream only missing corrections. | Delete each hunk after its focused upstream fix ships in the pinned OpenClaw release. |
| `0002-msteams-lobster` | Brokered Teams transport, routing, identity, and host behavior | Lobster | **Lobster-only** | No controlled-fork-specific `extensions/msteams` carry exists. | Keep downstream behind supported channel and host seams. | Delete only when upstream host seams replace every brokered behavior and Lobster validation passes without the patch. |
| `0003-secrets-fast-path-keyless-webiq` | Keyless hosted provider startup | Lobster, with a portable credential-provider seam still absent | **mixed** | No admitted generic credential-provider seam or WebIQ adapter exists in the controlled fork. | Extract the generic credential-provider contract; retain WebIQ details downstream. | Delete the generic hunk after an upstream seam ships; delete the adapter only when Lobster no longer needs it. |
| `0004-cron-delivery-target-optional` | Scheduled jobs without a delivery target | Lobster backport | **missing** | No controlled-fork admission establishes this exact Cron behavior. | Upstream as a focused scheduler correction; retain the `v2026.6.33` carry meanwhile. | Signed OpenClaw release includes the behavior and Lobster Cron tests pass without the patch. |
| `0005-cron-toolless-run-guard` | Correct settlement for tool-less scheduled runs | Lobster backport | **missing** | No controlled-fork admission establishes the guard. | Upstream the focused settlement fix. | Signed release includes the fix and the Lobster regression passes unpatched. |
| `0006-cron-gateway-restart-interrupt-skipped` | Correct restart/interruption state | Lobster backport | **missing** | Controlled-fork restart evidence covers Gateway/Rust continuity, not Cron run-state semantics. | Upstream the Cron owner-state correction. | Signed release preserves the expected interrupted/skipped state without the patch. |
| `0007-cron-hook-job-identity` | Stable scheduled-job identity through hooks | Lobster backport | **missing** | No exact fork admission or fixture proves Cron hook identity. | Upstream a typed stable job identity. | Signed release exposes the stable identity and Lobster hooks pass unpatched. |
| `0008-cron-passport-execution-fence` | Generation and authority fencing for scheduled execution | Lobster-managed adapter around a portable fence | **mixed** | Controlled-fork evidence proves owner-first generations elsewhere, but not this Cron Passport implementation. | Extract a product-neutral execution fence; keep Passport projection downstream. | Delete generic hunks after upstream shipment; delete Passport projection only when Lobster policy no longer requires it. |
| `0009-cron-preapproval-creation` | Recurring scoped approval creation | Lobster-managed policy adapter plus portable approval contract | **mixed** | The fork has action/effect evidence but not this recurring preapproval implementation. | Extract a typed scoped approval receipt; retain managed creation policy downstream. | Upstream receipt ships and Lobster can implement policy through the supported seam. |
| `0010-personality-extra-system-prompt` | Additional system-prompt projection | Lobster backport | **mixed** | Current OpenClaw source has broad `extraSystemPrompt` support, but exact personality-path equivalence to this patch is not recorded. | Verify the affected personality path against current source; upstream only any remaining gap. | Drop when the pinned release passes the original regression without the patch. |
| `0011-cron-nested-tool-authorization` | Authorization of nested scheduled or Code Mode effects | Lobster adapter around a generic authorization need | **mixed** | The fork has bounded authority evidence, not the Cron/WorkIQ nested-effect implementation. | Extract the generic nested-effect authorization contract; retain Microsoft adapters downstream. | Supported upstream authorization seam ships and Lobster tests pass through it. |
| `0012-msteams-brokered-bot-framework-attachment-download` | Brokered Bot Framework attachment access | Lobster Teams adapter | **Lobster-only** | No controlled-fork-specific Teams carry exists. | Keep downstream. | Supported Teams attachment host seam replaces the brokered path. |
| `0013-node-approved-followup-output` | Correct output after an approved node operation | Lobster backport | **missing** | Rust evidence proves approved invocation boundaries, not this follow-up output behavior. | Upstream the focused node result correction. | Signed release passes the approval/follow-up regression unpatched. |
| `0014-sensitivity-label-session-entry` | Sensitivity and provenance in session context | Lobster provider plus a portable provenance contract | **mixed** | No Microsoft label provider exists in the fork; no admitted generic provenance contract replaces it. | Extract the generic provenance projection; keep Microsoft labels downstream. | Generic seam ships and the provider uses it without patching core. |
| `0015-agent-hook-channel-field` | Channel identity in agent hooks | Lobster backport | **mixed** | Current hook types carry channel-related fields, but the exact #7055 contract and all call sites are not admitted as evidence. | Compare the original regression with current OpenClaw; upstream any missing propagation only. | Pinned release passes the hook-channel regression without the patch. |
| `0016-memory-list-gateway-rpc` | Bounded read-only memory inventory | Lobster backport | **missing** | No `memory.list` Gateway method is present in the controlled-fork source search. | Upstream a bounded, authorized inventory method. | Signed release exposes the method with the required authorization and bounds. |
| `0017-exec-approval-capability-token-relay` | Attributable approval capability through execution | Lobster private carrier plus portable approval receipt | **mixed** | Controlled-fork action evidence does not admit this token relay. | Upstream a typed approval receipt; keep private carrier and token details downstream. | Supported receipt propagation replaces the private carrier in Lobster. |
| `0018-msteams-agent-reactions` | Agent reaction behavior in Teams | Lobster backport | **mixed** | Current OpenClaw has Teams reaction handling, but exact agent-initiated behavior and parity with this patch are not established. | Run the original patch regression against current OpenClaw and upstream only the remaining behavior. | Pinned release passes agent-reaction tests without the patch. |
| `0019-hosted-control-ui-policy` | Hosted Control UI policy and lockdown | Lobster patch; generic hosting profile belongs upstream | **mixed** | The controlled fork admitted hosting/readiness sources, but not this complete route/settings lockdown policy. | Reuse admitted hosting profiles; upstream explicit generic UI policy instead of copying the patch. | Upstream hosted policy ships and Lobster's hidden-route/read-only tests pass unpatched. |
| `0022-node-exec-deadlines` | Node execution deadline propagation and settlement | Lobster backport | **mixed** | Fork source has Gateway invocation deadlines and EVID-020 proves cancellation, but that does not prove the patch's complete node-exec path. | Compare the patch regression with EVID-020 owner semantics; upstream any unowned propagation gap. | Signed release proves deadline propagation and settlement across the original node path. |
| `0024-cron-drain-quiescence` | Scheduler drain and shutdown quiescence | Lobster backport | **missing** | No admitted fork evidence covers Cron drain. | Upstream owner-native drain/quiescence semantics. | Signed release drains deterministically and Lobster shutdown tests pass unpatched. |
| `0025-context-derived-sensitivity` | Microsoft sensitivity and provenance implementation | Lobster provider, with a generic provenance opportunity | **mixed** | Microsoft implementation is absent by design; generic provenance behavior is not yet admitted. | Keep the provider downstream; extract only the portable provenance contract. | Core patch disappears after the provider consumes a supported upstream seam. |
| `0026-msteams-reaction-target-text` | Correct reaction target rendering | OpenClaw Teams extension backported by Lobster | **upstream-equivalent** | Current fork source resolves `replyToId` to the reacted message and carries reaction-target tests. | Keep only as a `v2026.6.33` backport; validate the original regression against the fork baseline. | Lobster promotes an OpenClaw release containing the upstream correction. |
| `0027-teams-per-send-sensitivity` | Per-message Microsoft sensitivity behavior | Lobster Teams/sensitivity provider | **Lobster-only** | No controlled-fork Microsoft sensitivity provider exists. | Keep downstream behind a generic per-send metadata seam. | Provider can supply the behavior without patching OpenClaw core. |
| `0028-node-invoke-session-binding` | Bind node invocation to the trusted requesting session | Lobster backport | **mixed** | Current invoke-stream source carries `sessionKey`, but no exact evidence proves parity with this security patch over every dispatch path. | Turn the original regression into a fork fixture and upstream any uncovered path. | Signed release passes session-binding security tests without the patch. |
| `0029-agent-harness-host-adapter` | Hosted Agent Harness transport adaptation | Lobster host adapter | **Lobster-only** | Controlled fork contains no Lobster harness adapter admission. | Keep downstream behind a typed host contract. | Supported host contract replaces the patched adapter path. |
| `0030-msteams-native-audience-route` | Teams audience and routing selection | Lobster Teams adapter | **Lobster-only** | No controlled-fork-specific Teams route carry exists. | Keep downstream unless a narrowly portable Teams correction is isolated. | Supported Teams extension behavior replaces every downstream routing hunk. |
| `0031-cron-wake-only-payload-kind` | Wake scheduler without enqueueing a session, heartbeat, or agent turn | Lobster backport | **missing** | Fork source has Cron wake modes and unrelated hook `kind: "wake"` mapping, but no evidence of this wake-only payload contract. | Upstream as a product-neutral scheduler primitive. | Signed release supports the exact wake-only payload and Lobster tests pass unpatched. |
| `0032-channel-participant-capability-surface` | Teams participant origin and scoped group-chat capability | Lobster Teams surface plus portable origin/capability contract | **mixed** | Exact participant-binding symbols are absent; controlled-fork authority evidence does not implement this Teams surface. | Extract generic origin/capability binding; keep brokered Teams behavior downstream. | Generic contract ships and Lobster implements the Microsoft adapter without core patches. |
| `0033-hosted-readiness-ui-integration` | Integrate readiness and hosted policy into Control UI | Lobster integration patch over admitted readiness sources | **mixed** | Controlled fork has admitted readiness/hosting source and UI readiness tests, but not the complete hosted Control UI integration. | Preserve the admitted owner seam; upstream the generic UI projection and keep Lobster policy values downstream. | Pinned release projects owner readiness and hosted policy without the integration patch. |
| `0034-node-command-policy-structured-commands` | Structured `gateway.nodes.commands.allow/deny` policy | OpenClaw source backported by Lobster | **upstream-equivalent** | Controlled-fork source has structured config types, schema/help, policy implementation, denial hints, and tests while retaining legacy-key compatibility. | Keep as a `v2026.6.33` backport only. | Lobster promotes a release containing the structured policy. |
| `0035-scoped-enterprise-test-stability` | Scoped test repairs plus product-neutral middleware behavior | Lobster integration patch | **mixed** | Some test/runtime behavior exists in the newer fork baseline, but the consolidated patch is not an admitted source unit and includes generation-specific repairs. | Split product-neutral runtime behavior from test-only backport repairs; do not admit the bundle wholesale. | Runtime fix ships upstream and remaining test repairs become unnecessary on the promoted release. |
| `0036-cron-implicit-delivery-transcript-mirror` | Mirror implicit Cron delivery into transcript state | Lobster backport | **missing** | No exact controlled-fork admission or evidence covers transcript mirroring. | Upstream only after owner semantics, idempotency, and duplicate-delivery behavior are explicit. | Signed release records the delivery once and passes replay/restart tests unpatched. |
| `0037-channel-participant-tool-hook-context` | Project participant identity into tool-hook context | Lobster Teams surface plus portable hook contract | **mixed** | Generic hook context exists, but exact participant binding and isolation are not present or admitted. | Extract typed participant origin/capability context; retain Teams roster resolution downstream. | Generic context ships and Lobster supplies participant data through supported hooks. |
| `0038-teams-personal-replies-thread` | Preserve personal-chat reply threading | Lobster Teams backport | **mixed** | Current Teams source carries extensive `replyToId` handling, but parity with this personal-reply patch is not established. | Run the original personal-chat regression against current OpenClaw; upstream only the missing portable correction. | Pinned release passes personal-reply threading tests without the patch. |
| `0039-group-chat-scheduling-contracts` | v3 Group Chat scheduling, availability, proposal/direct booking, closed host bindings, opaque roster references, and hook isolation | Lobster Group Chat and Teams integration | **mixed** | Exact scheduling and host-binding symbols are absent from the controlled fork. The Microsoft adapter is intentionally downstream; the portable scheduling/host-binding contract is also not implemented. | Keep the adapter in Lobster; extract only product-neutral scheduling descriptors and closed host-binding contracts after the semantics stabilize. | Generic contracts ship and Lobster implements v3 scheduling entirely through supported extension seams. |

## Absent Physical Entries

PR #7055's README still explains three historical numbers that are not
physical files in its 37-patch directory. They are dispositions, not missing
inventory:

| Historical entry | #7055 state | Controlled-fork disposition |
| --- | --- | --- |
| `0020-retry-reply-session-init-conflicts` | No physical patch | **superseded** for this image generation; retain only the regression if still relevant. |
| `0021-doltlite-sqlite-engine` | No physical patch | **mixed**: upstream only a pluggable engine seam; keep DoltLite product selection downstream. No fork admission establishes that seam. |
| `0023-vitest-unit-fast-group-order` | No physical patch | **superseded** maintenance carry; do not recreate it without a current reproducible ordering failure. |

## Practical Outcome

The queues can move independently:

1. Lobster may apply and validate all 37 files against exact
   `v2026.6.33` whenever the promotion is resumed.
2. The controlled fork may keep advancing bounded source admissions and
   evidence without first absorbing the image queue.
3. Upstream-equivalent rows `0026` and `0034` should remain image backports,
   not new fork carries.
4. No other row should be called fork-complete until its original regression
   passes against an exact controlled-fork head or its source is admitted.

PR #7055 is therefore the right direct promotion candidate instead of first
promoting 2026.6.11, but it is not ready merely because the queue is preserved.
Its current failing/missing validation gates still need to be resolved before
promotion.

## Sources

- Lobster PR #7055 patch ledger at
  `4b011a77bfffdffb0dc9ea5ba83dad5502a41002`
- `projects/enterpriseclaw/lobster-plugin-patch-disposition-2026-08-05.md`
- `projects/enterpriseclaw/lobster-image-patch-manifest-2026-08-06.md`
- controlled-fork `.lobster/sources.json`
- controlled-fork `.lobster/disposition.json`
- controlled-fork merged EVID-021 head
  `fcadf5ced0ef139fe8e8319e2fbfb08bec8918c2`
- controlled-fork EVID-022 PR #229 head
  `039e08997108dc3f81aef03653abc082769cff43`
