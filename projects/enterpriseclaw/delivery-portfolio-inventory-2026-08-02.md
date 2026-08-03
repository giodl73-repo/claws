# Enterprise OpenClaw Delivery Portfolio Inventory - 2026-08-02

## Purpose

This is the delivery inventory gate for EnterpriseClaw implementation packages.
Before creating an upstream ask, fork patch, Lobster capability, or Rust work
item, the package must verify:

1. whether an upstream PR or issue already exists;
2. whether the behavior already exists in OpenClaw source;
3. whether Lobster already implements or proves the managed side;
4. whether the current Lobster patch baseline already carries the behavior;
5. whether an accepted upstream replacement is waiting for release promotion;
   and
6. what code or patch is deleted after adoption.

The goal is merged replacement adoption and deletion, not a larger PR count.

## Sources

- Team-provided `Team Investment in Enterprise OpenClaw` snapshot.
- Live `gh` verification against `openclaw/openclaw` on 2026-08-02.
- `projects/openclaw-patches/` historical 21-patch inventory at
  `f807270d0b90`.
- `projects/hosting-profiles/`.
- `projects/state-continuity/`.
- `projects/promoteclaw/`.
- Live Microsoft GHE verification for named Lobster PRs.

## Live Portfolio Delta

The supplied snapshot reported:

```text
30 open
6 merged
36 total
```

Live state on 2026-08-02 is:

```text
28 open
7 merged
1 closed without merge
36 total
```

Changes since the supplied snapshot:

- #113403, explicit tool-less runs, merged on 2026-08-01.
- #115323, the first `memory.list` candidate, closed without merge.
- #115329 remains the related open draft implementation sketch.

## Live Portfolio by Investment Area

| Area | Open | Merged | Closed | Live items |
| --- | ---: | ---: | ---: | --- |
| Governance, policy, and Control UI | 1 | 1 | 0 | #115408 open; #89596 merged |
| Runtime, hosting, config, and continuity | 9 | 0 | 0 | #107026, #104018, #113421, #113422, #112385, #112865, #112896, #107155, #114636 open |
| Applications, distribution, and localization | 8 | 0 | 0 | #111541, #111542, #111543, #111544, #111545, #112784, #112801, #113427 open |
| Channels and Teams | 2 | 4 | 0 | #107164 and #102379 open; #102366, #102357, #110357, and #105801 merged |
| Memory | 1 | 0 | 1 | #115329 open draft; #115323 closed without merge |
| Automations | 0 | 1 | 0 | #113403 merged |
| Diagnostics, catalog, and signals | 7 | 1 | 0 | #99255, #84472, #100960, #104158, #104159, #107937, and #104160 open; #100361 merged |
| **Total** | **28** | **7** | **1** | **36** |

## Reusable Features and Owner Contracts

| Area | PRs | Current disposition |
| --- | --- | --- |
| Governance / Control UI | #115408 | Open draft; adopt rather than duplicate |
| Ordered configuration | #107026 | Open |
| Readiness and hosting | #104018, #113421, #113422 | Open stack |
| Recovery points and restored admission | #112385, #112865, #112896 | Open stack |
| Localization and product surfaces | #111541, #111542, #111544, #111545, #112784, #112801, #113427 | Open |
| Memory | #115329 | Open draft; #115323 closed |
| Diagnostics, catalog, and signals | #99255, #84472, #100960, #104158, #104159, #107937 | Open |

## Fixes and Patch-Retirement Changes

| PR | Live state | Patch/adoption consequence |
| --- | --- | --- |
| #89596 | Merged | Candidate policy workaround deletion after release adoption |
| #107155 | Open | Track existing keyless web-search fix; do not duplicate |
| #107164 | Open | Track existing Teams proxy/DNS fix |
| #102379 | Open | Track existing Teams inbound-normalization fix |
| #102366 | Merged | Delete native CJS patch after promoted release includes it |
| #102357 | Merged | Delete Teams whitespace patch after promotion |
| #110357 | Merged | Delete Teams ingress/dedupe patch after promotion |
| #105801 | Merged | Delete official-install trust patch after promotion |
| #113403 | Merged | Delete tool-less Automation patch after promotion and conformance |

## Conformance, Documentation, and Evidence

| PR | Live state | Role |
| --- | --- | --- |
| #114636 | Open | Hosting-profile inspection, live validation, and release evidence |
| #111543 | Open | Localization contributor workflow |
| #100361 | Merged | Doctor lint/audit selection |
| #104160 | Open draft | Generated command reference |

## Upstream Asks Without an Accepted PR

All remain open as of 2026-08-02:

- Hosted Control UI: #115423.
- Memory viewer/delete: #115303, #115330, #115331, #116484, #116485,
  #116494.
- Memory-write governance: #116499, #116500, #116501.
- Automation behavior and contracts: #77298 and #113440 through #113444.

An implementation package must link to these asks before proposing another
surface in the same owner area.

## Current Lobster Evidence

### Promotion and patch baseline

- `bic/lobster#5402` is open at head `285efe4097b5`.
- It promotes OpenClaw `2026.7.1`.
- Its current body states that **22 patches apply cleanly**.
- The PR changes 26 patch-file paths: 22 modified, 1 added, 1 removed, and 2
  renamed. This is change-set shape, not the active patch count.
- The earlier `projects/openclaw-patches/` inventory remains a valid historical
  snapshot of 21 patches at head `f807270d0b90`; it is not the current PR head.

The current stack remains primarily Teams, secrets, Automations, memory,
approval, sensitivity, node, and compatibility work. It does not directly
implement the readiness/hosting-profile, recovery-point, or multi-unit fleet
contract proposed by the operations package. That package must not claim
retirement of an unrelated patch.

### Release slots

- `bic/lobster#5541` merged on 2026-07-27.
- It provides Active, Previous, and Candidate OpenClaw image slots.
- It is existing Lobster implementation evidence for release staging, route
  pinning, candidate isolation, rollback selection, and quarantine.
- It does not prove state downgrade compatibility or portable fleet fan-out.

### Runtime state continuity

- `bic/lobster#5481` is open at head `277812458306`.
- It binds the RFC 0013 host acceptance contract.
- Fork PRs `giodl/lobster#25-#28` remain open drafts for permanent acceptance,
  lifecycle authority, destruction consumption, and final-capture adoption.
- Fork PRs `#38`, `#39`, `#41-#43`, `#45-#47`, and `#51` remain open drafts for
  wake projection, retained authority, owner validation, and delivery.

These are existing managed-side proofs. New continuity work must reconcile,
consolidate, or delete them rather than create a parallel stack.

## Operations, Assurance, and Fleet Reconciliation

| Package workstream | Existing OpenClaw investment | Existing Lobster investment | Result |
| --- | --- | --- | --- |
| U-OAF-01 generation-bound readiness | #104018 readiness framework; #113421 core owner conditions; #113422 hosting profiles; #114636 inspection/conformance | Hosts consume the contract; no separate runtime truth required | **Covered by active upstream stack. Do not file a new ask.** |
| U-OAF-02 durable per-unit lifecycle receipt | Current Fleet leases/attempt labels and the hosting stack provide partial identity/readiness | #5541 provides release-slot generations and route evidence | **Partial. Audit whether one narrow lifecycle receipt ask remains.** |
| U-OAF-03 release activation and recovery result | #111542 updater preview; #113422/#114636 profile proof; #112385/#112865/#112896 recovery-point stack | #5541 release slots and PromoteClaw promotion process | **Partial. Define only the residual mixed-component activation/rollback truth.** |
| U-OAF-04 checkpoint manifest and restore preview | #112385 aggregate recovery points; #112865 final capture; #112896 restored admission/status | #5481 and the continuity proof stack | **Covered by active upstream and Lobster stacks. Adopt and close gaps; do not duplicate.** |
| U-OAF-05 evidence reference and assurance status | Current bounded audit writer; #114636 release evidence; #100361 Doctor audit selection | Continuity journals and future assurance retention | **Partial/new. No shared owner assurance-status contract is identified.** |
| Fleet parent/child fan-out and repair | No portable upstream implementation; EC-034 remains a projection contract | #5541 proves slot lifecycle, not multi-unit fan-out | **Lobster/EnterpriseClaw work. Upstream only the missing per-unit leaf seams.** |

## Knowledge, Context, and Continuity Reconciliation

| Package workstream | Existing OpenClaw investment | Existing Lobster investment | Result |
| --- | --- | --- | --- |
| Session export identity and omissions | Current `/export-session` creates fs-safe artifacts and reports malformed rows and backend-delegated omissions | Managed destination, retention, and disclosure remain host concerns | **Extend the current export owner with stable source/export identity and a structured omission manifest. Do not build another exporter.** |
| Context assembly evidence | Current context-engine exposes ordered messages, token estimates, projection, fallback/degraded state, and host requirements; #84676 and #84830 are merged | #3371 and #3379 are merged context-budget plugin/UI investments; #3700 is merged roadmap evidence | **At most one narrow source inclusion/omission evidence extension. Context-budget policy remains downstream.** |
| Persisted-memory read | #115303/#115330/#115331 decision stack; #115329 open draft; #115323 closed; #116494 generic-files alternative | Current viewer depends on the carried memory-list patch | **No new ask. Resolve the active namespace/discovery decisions and retire the patch after adoption.** |
| Memory delete and write governance | #116484/#116485 delete decisions; #116499-#116501 semantic writes, protected paths, and standing consent | Lobster #6149 and #6336-#6338 track managed delete/consent needs | **No implementation before owner decisions settle. Lobster supplies tenant policy and consent UX.** |
| Memory corpus lifecycle | Canonical file-backed memory, derived indexes, index identity checks, and backend-specific deletion already exist | Managed retention, obligation retries, and assurance are host responsibilities | **Prove per-copy settlement after mutation decisions; file a residual event/status ask only if owner-native evidence is insufficient.** |
| Checkpoint and restore | #112385/#112865/#112896 | #5481 and fork continuity proofs | **Adopt. Do not file a duplicate checkpoint contract.** |
| Workspace and artifact boundaries | `agents.workspace.*`, `agents.files.*`, sandbox bindings, and `@openclaw/fs-safe` | Tenant roots, remote workspace policy, DLP, retention, and artifact UX are managed concerns | **Extend named semantic surfaces only. Do not create a universal filesystem API.** |

## Identity, Authority, Actions, Effects, and Delivery Reconciliation

| Package workstream | Existing OpenClaw investment | Existing Lobster investment | Result |
| --- | --- | --- | --- |
| Credential-to-operation binding | Current process-local `AgentExecutionAuthBinding`; #104849 owns exact-origin fetch/media credential decisions; #107155 owns keyless WebIQ behavior | Brokered Teams credentials and exact tenant materialization remain host-owned | **Prove restart-safe non-secret binding across unlike consumers before proposing a portable extension. Do not create a universal credential registry.** |
| Approval decision and presentation | Canonical exec/plugin approval owners; #113444 external presentation ownership; #115408/#116013 hosted UI shaping/enforcement | #3388/#3391/#2270 policy state/UX; #5491 approval-friction inventory; active duplicate-prompt patch | **Adopt existing threads. Residual question is exact decision correlation through final invocation and evidence.** |
| Trust revocation and federation | Mature device/node pairing, scoped tokens, pairing generations, and live-session fencing | #5422 MAC/MOS3 application availability and tenant federation/policy composition | **Reuse owner-native trust. Keep federation downstream until a second unlike owner proves a common portable propagation seam.** |
| Capability inventory and run surface | Effective tool inventory and schema quarantine; merged #89596; #114782/#114783 manifest-first host bundles | Merged #5336 `scout-standard`, merged #4297 node catalog, open #4648 governed node invocation | **Adopt current inventory/bundle stacks. Prove stable run-surface identity before any new ask.** |
| Resolved pre-effect authorization | Top-level policy hooks and owner-specific final guards; #113440 owns the generic nested-operation gap | Active `0020-cron-nested-tool-authorization` patch | **Adopt #113440 and retire the patch after release adoption. Do not file another hook.** |
| Authority-to-effect settlement | Owner-specific idempotency/results, trusted diagnostics, and protected-effect simulation | Managed reconciliation and audit retention remain host concerns | **Conditionally extend existing evidence only after one real owner-native reconciliation fixture. No generic action bus.** |
| Conversation and delivery | Channel-native resolvers, durable final delivery, queue intent, capability requirements, receipts, partial outcomes; merged #110357 | Brokered Teams auth, multiplayer routing, and provider UX remain downstream | **Use two unlike-channel fixtures to prove or disprove common route provenance and delivery operation/native-attempt identity. Do not create another queue or message database.** |

## Runtime Fabric, Nodes, and Rust Reconciliation

| Package workstream | Existing OpenClaw investment | Existing Lobster investment | Result |
| --- | --- | --- | --- |
| Protocol negotiation and compatibility | Gateway protocol provides separate package/wire versions, role-specific min/max negotiation, typed envelopes, structured mismatch errors, additive owner payloads, and node/probe N-1 support | Hosts consume the protocol; no separate Lobster wire owner is required | **Reuse the current protocol. Residual work is a versioned language-neutral fixture and deprecation contract, not a new Gateway protocol.** |
| Streaming, cancellation, reconnect, and replay | ACP and node invocation provide ordered progress/replay, deadlines, cancellation signaling, disconnect handling, and late-result fencing | Managed recovery UX may project owner status but cannot authorize replay | **Build owner-specific conformance fixtures. Keep semantic replay, idempotency, and effect certainty with the invoked owner.** |
| Node identity, pairing, and trust | Public-key identity, pairing approval, role tokens, generation fencing, connection incarnations, revocation, presence, wake, and pending work already exist | Tenant enrollment, placement, fleet revocation propagation, and recovery UX are managed concerns | **Reuse current node trust. Do not create parallel Rust enrollment or infer authority from presence/capabilities.** |
| Command and capability inventory | #100960 open non-draft; #104158/#104159 open drafts | #4297 merged catalog projection; #4648 open governed invocation; #5460 open offline recovery | **Adopt the active stack. It is observational/guidance evidence, not invocation authority.** |
| Remote node invocation | Current policy, approval, pairing, route, connection, invocation, idempotency, stream, deadline, cancellation, disconnect, and late-result checks | Actor policy, managed placement, approval UX, reconciliation, and audit retention remain host-owned | **Prove TypeScript/Rust parity before extending. Select one runtime before admission; no dual dispatch.** |
| Reverse-provider carrier | #114783 host-bundle dependency remains open; no accepted reverse-provider owner contract | Fork proofs cover inactive peer lifecycle and adoption | **Keep separate from Node Mode. File only after dependency, owner review, and explicit authorization.** |
| Rust node profile | Fork-only untracked Cargo validator and five fixtures; no live upstream Rust-node/conformance thread | Lobster can package, place, canary, monitor, quarantine, and repair after the profile exists | **Independent Rust component. Next proof is committed clean-install packaging plus a disposable real Gateway connection; TypeScript remains authoritative.** |
| Rust migration and deletion | Current TypeScript node runtime is the oracle and fallback | Lobster release slots can support managed canary/rollback selection | **Require fenced state import, admission-time single authority, update/rollback proof, exact TypeScript deletion inventory, and deletion of migration adapters.** |

## Configuration and Activation Reconciliation

| Package workstream | Existing OpenClaw investment | Existing Lobster investment | Result |
| --- | --- | --- | --- |
| Ordered configuration sources | RFC #34 open draft; #107026 open non-draft at `409fab999c40`; current main already owns source/runtime snapshots, transactional writes, reload, rollback, and restart debt | `giodl/lobster#12` open draft at `0d37e2a34b45`; current baked config and overlay writers remain | **Adopt bounded startup-only/read-only V1 first. Do not inflate #107026 with generations, live reload, write routing, or host policy.** |
| Accepted/active generations and provenance | Current source exposes process-local revisions, fingerprints, applied source hash, restart targets, and debt, but not one portable operator projection | Managed rollout needs exact source/accepted/active/readiness correlation | **Prove the residual against current snapshot/reload facts after V1 adoption; extend the existing owner only if a bounded gap remains.** |
| Owner readiness | RFC #33; #104018/#113421 open | Hosts currently use process/listener/proxy checks and private readiness logic | **Adopt the canonical owner stack. Replace private evaluators only where semantics match; retain shallow liveness.** |
| Hosting profiles and facilities | RFC #37; #113422/#114636 open | Lobster consumes profile readiness for routing, rollout, and repair | **Adopt in dependency order. Fork watch/wait/catalog/validation slices become deletion candidates after landing.** |
| Automation interruption and identity | Current Cron owner; #77298, #113441, and #113443 open; RFC #50 merged terminology only | Carried restart-status, hook-identity, staged-publication, and Passport patches | **Adopt exact existing issues. Keep Passport policy downstream. Delete replacement patches after release adoption.** |
| Portable scheduled activation identity | Current Cron owns durable job/schedule/catch-up/reservation/restart state but lacks one uniform cross-trigger activation identity | Managed hosts need correlation, not scheduler ownership | **Build cross-trigger and lost-ack fixtures first. File only the smallest residual identity relationship if current owner-native facts are insufficient.** |
| Absent-compute wake | No generic OpenClaw wake API is required | `giodl/lobster#39/#46/#47/#51` and `bic/lobster#5481` prove projection, retained causes, owner validation, readiness-gated delivery, and host acceptance | **Lobster composition. Consolidate one payload-free retained activation owner and delete source-specific cold-start races.** |
| First config deletion target | #107026 supplies the candidate replacement seam | Existing `gateway_config_override` writes and cleans `gateway.controlUi.allowedOrigins` | **After conformant release and old/new effective-config proof, delete the writer, cleanup, env-only projection, lifecycle call, and exact-blob tests.** |

## Agent Runtime and Delegated Execution Reconciliation

| Package workstream | Existing OpenClaw investment | Existing Lobster investment | Result |
| --- | --- | --- | --- |
| Run admission and session targeting | Current Gateway and channel/auto-reply paths already provide run ID, lifecycle generation, canonical session targeting, persistence, lanes, and terminal settlement | Managed hosts may gate admission and project results but do not own the run | **Reuse. Build one cross-entry fixture before proposing a shared run relationship.** |
| Whole-execution attempt bindings | Current prepared runtime pins config/plugins/models/hooks; embedded attempt owns staged setup, execution, transcript, cleanup, and phase-aware cancellation | Managed evidence currently risks reconstructing bindings from logs | **Conditional residual. Prove a stable attempt distinct from provider/tool/child/delivery attempts and bind generation references only.** |
| Terminal outcome consistency | Current terminal builder distinguishes cancellation, timeout phase, liveness, provider reach, and ordinary errors; #104950 remains open | Operator views and retention consume the owner result | **Adopt #104950 and reconcile existing projections; do not create another terminal taxonomy.** |
| Hook and outbound correlation | #50291 open | Fork #148 at `d6978e25f6c` proves routed outbound `runId` correlation and durable-replay omission | **Adopt existing issue. Promote the bounded owner-local slice or archive it; no trace registry.** |
| Delegation authority and lifecycle | Current spawn/session/registry/control/A2A owners persist requester, controller, completion owner, lineage, depth, control scope, child run, restart, and cleanup facts; #103618 merged | Tenant quotas and operator control remain managed policy | **Reuse. Residual proof is durable admission, parent trust revocation, and separate cancel/terminal/delivery/cleanup settlement.** |
| Subagent terminal evidence | #101867 open; exactly-once `subagent_ended` owner exists | Fork #149 at `a614815a4ce` proves bounded diagnostics-otel projection | **Adopt existing issue. Keep diagnostics non-authoritative and avoid duplicate lifecycle events.** |
| Run/subagent usage projections | #90911 and #57404 open | Managed cost/usage views consume owner accounting | **Adopt existing issues; usage is projection, not run authority.** |
| Managed skill/application dispatch | Native skill/session/subagent owners already provide the primitives | Fork #114 at `b461715f14e` centralizes one managed-skill admission POC | **Evidence only. Adopt through an accepted Claws/application owner or archive; do not create a workflow engine.** |
| Rust execution | TypeScript runtime remains the compatibility oracle | Lobster can select/place a future bounded runtime before admission | **Start with fixtures/validator or one isolated child-worker profile. No full Rust agent kernel before state, ecosystem, canary, rollback, and exact TypeScript deletion proof.** |

## Models, Provider Attempts, and Usage Reconciliation

| Package workstream | Existing OpenClaw investment | Existing Lobster investment | Result |
| --- | --- | --- | --- |
| Catalog, route, auth, and prepared runtime | Current source separates definitions, logical route/donor projection, auth profile/endpoint/SecretRef binding, and leased fingerprinted runtime generations | Managed provider allowlists, broker/egress policy, and deployment values remain host concerns | **Reuse current owners. Selection is intent, not availability or invocation success.** |
| Candidate attempts and fallback | Current fallback planner/runner records ordered provider/model/error/reason/status facts; `model.call` owns request-level identity and usage | Managed routing policy may constrain candidates but does not own fallback truth | **Build one primary-failure/fallback-success fixture. Add only a candidate parent identity if current call-order records cannot reconcile lifecycle and restart.** |
| Plugin-runtime usage | #98968 open; #107937 open non-draft at `f52816089d1b` | Fork #150 at `06ed6cb65ba` is minimal evidence | **Adopt and repair the active PR path. Resolve duration and permanent metric-dimension compatibility; do not file a duplicate.** |
| Per-run/task/subagent usage products | #13219, #90911, and #57404 open with maintainer/product decisions required | Managed cost views consume owner usage | **Keep separate from the candidate contract and from #107937. No global accounting service.** |
| Cost provenance | #90674 open; #85882 merged at `d7363801d157`; #90825 closed | Lobster needs approved rate cards and uncertainty-aware projections | **Owner decision required for billed/estimated/free/unavailable/partial/unknown persisted semantics. Do not infer from zero rates.** |
| Delayed provider reconciliation | Per-call and aggregate usage exist; no portable causal delayed-record contract identified | Enterprise billing/import may need delayed reconciliation | **Prove one real provider record first. File a portable residual only if current candidate/call/run owners cannot bind it idempotently.** |
| Context Budget | Native context signals exist; no core FinOps owner is needed | `bic/lobster#3371/#3379` merged read-only plugin and UX; judge daily-cost env is a downstream policy example | **Keep Budget and tenant FinOps downstream. OpenClaw supplies portable usage/provenance facts.** |
| Stale Lobster references | None | Historical notes named fork PRs #3/#4/#9 as Budget rate-card/attribution work, but live GHE shows unrelated host-provider PRs | **Do not count these as active Budget investments. Re-establish live PRs before claiming rate-card or attribution delivery.** |
| Rust provider worker | TypeScript provider paths remain authoritative | Lobster can select a future isolated worker before dispatch | **Optional bounded transport replacement only. Preserve candidate/call/usage identities and delete one exact TypeScript path after canary/release proof.** |

## Extensibility, Artifact Trust, and Release Reconciliation

| Package workstream | Existing OpenClaw investment | Existing Lobster investment | Result |
| --- | --- | --- | --- |
| Inert extension definitions | Canonical plugin manifests; #114782 open; #114783 open draft at `14bd05f56914`; merged #112773 portable Claw/profile split | MOS3 catalog and feed projections | **Use host bundles as a plugin-family exemplar. Prove plugin, Claw/skill, and one unlike family before any shared definition envelope.** |
| Unknown-required compatibility | Strict Claw profile validation and host-bundle version boundary | Enterprise catalog may project compatibility but cannot invent it | **Build cross-family fixtures first. Extend one existing owner only if required trust/lifecycle/migration semantics can be silently approximated today.** |
| Immutable artifact/install evidence | Current plugin and Claw source/version/digest/provenance, preview integrity, status, update, export, and safe removal | MOS3 plugin acquisition slice remains fail-closed until canonical mutation/readback exists | **Normalize existing evidence and migrate name-only legacy records. Do not create a new installer.** |
| Signed provenance and revocation | Local install provenance exists; no portable cross-source signed publisher/build/revocation owner identified | Feeds can attest projections and enforce stronger tenant policy | **Prove npm, ClawHub/plugin, and one unlike source before proposing a minimal signed statement. Revocation blocks admission and exposes retained installs; it does not silently uninstall.** |
| Release component manifest | Current package/git updater, protocol, database, plugin, and recovery owners already hold component facts | #5541 provides Active/Previous/Candidate slots | **Generate a compact evidence artifact from current owners. Do not add parallel hand-authored release configuration.** |
| Local activation and recovery | Current staging, verification, Doctor migration, downgrade refusal, service handoff, plugin convergence, publication, fresh-install, and upgrade-survivor proof; #111542 open | #5541 release slots and #5402 promotion process | **Extend existing structured output only where exact phases/results/recovery references are missing. EC-029 remains per deployment unit.** |
| Patch promotion and deletion | Upstream replacements are tracked per patch | #5402 open at `285efe4097b5`, promoting `2026.7.1` with 22 patches applied | **Build a live 22-row owner/upstream/expiry/deletion ledger. Delete each patch after pinned-release adoption and hosted conformance.** |
| Standalone Claws adapter | #113836 closed without merge; merged #112773 supplies public owner boundary | Private standalone CLI delegates to public OpenClaw CLI | **Keep as independent B2 evidence or approved separate project. No OpenClaw private-module adapter.** |
| Rust verifier/updater | TypeScript install/update/release paths remain authoritative | Lobster can canary and promote a bounded replacement | **Optional complete-owner replacement only after shared fixtures, fresh install, migration, readiness, rollback, and exact TypeScript/adaptor deletion.** |

## Data Governance and Resource Control Reconciliation

| Package workstream | Existing OpenClaw investment | Existing Lobster investment | Result |
| --- | --- | --- | --- |
| Session export and copy identity | Current `/export-session`; guarded session delete/reset; transactional transcript-index cleanup; retained archives; QMD projection | Managed destination, retention, eDiscovery, and disclosure remain host concerns | **Adopt U-KCC-01 for export identity. Build one truthful per-copy lifecycle fixture; do not add another exporter or global copy database.** |
| Session lifecycle settlement | Canonical/index/archive/disk-budget owners are mature, but ordinary delete retains archives and external copies remain | #5378 Purview/eDiscovery/retention; #5318 reset-archive accumulation | **Partial/new relationship. Prove complete/retained/deferred/external/unknown outcomes before proposing owner result fields.** |
| Memory lifecycle | #116484/#116485 and #116499-#116501 are open owner decisions; current file/index/backend owners are separate | #6149 and #6336-#6338 are open adopters; #5914 tracks memory-note retention | **No implementation before owner decisions. Then test current status/evidence for per-copy settlement; no parallel memory API.** |
| Resource policy and admission | Current limits, grouped lanes, queues, child/Cron admission, rate limits, cooldowns, timeouts, truncation, and disk pressure | Tenant policy, licensing, placement, and support posture are managed concerns | **Reuse owner-native decisions. Preserve queue/defer/throttle/reject/cancel/kill/truncate rather than flattening to allow/deny.** |
| Durable lease identity | Cron slots, worktree leases, subagent generations/slots, and stale-holder fencing exist locally | Managed quota/reservation may consume a portable seam | **Evidence gap. Persist, exhaust, restart, fence, renew/expire, and settle one bounded lease before filing an ask.** |
| Bounded quota issues | #105466 disk/workspace quota; #66187 ended subagent capacity bug; #112086 hybrid usage/budget; #53023/#8061 concurrency config/projection | Lobster capacity and workload policy consume owner outcomes | **Adopt exact issues independently. They are conformance inputs, not a global EC-031 implementation stack.** |
| Usage and cost | Existing model calls, run totals, pricing, usage reports; #90674 cost provenance | Merged Budget #3371/#3379/#3742; #556/#3912/#3913 licensing and UX | **Reuse EC-011/EC-012. Link usage causally to operation/lease; no second accounting or billing database.** |
| Fleet capacity | Current cell profiles and host pressure signals | #6428 and #98 track user-scale and GPU/TPS capacity | **Lobster projection. Portable owners expose fresh capacity/readiness facts; fleet allocation and fairness stay downstream.** |
| Patch baseline | No current generic lifecycle-settlement or portable-lease replacement in the 22-patch stack | #5402 may carry memory compatibility until accepted owner contracts ship | **Retire exact memory compatibility patches after adoption. Do not claim this package deletes unrelated patches.** |
| Rust lifecycle/lease owners | TypeScript owner implementations remain authoritative | Lobster can canary a bounded coordinator or supervisor | **Optional complete-owner replacement only after language-neutral fixtures, state migration, single admission authority, rollback, and exact TypeScript/adapter deletion.** |

## Experience and Administration Reconciliation

| Package workstream | Existing OpenClaw investment | Existing Lobster investment | Result |
| --- | --- | --- | --- |
| Owner-state projection | Configuration, readiness, release, delivery, node, lifecycle, and resource owners expose heterogeneous identity/generation/freshness/result facts | Managed dashboards and Control UI consume owner facts | **Build a three-owner config/readiness/release adapter fixture. Add a shared envelope only if it removes real inference without flattening owner payloads.** |
| Audience/disclosure compatibility | Existing JSON/human surfaces, redaction, and localization stacks | Operator/admin/security projections need different authorized detail | **Prove one fact across local/managed audiences with explicit omissions and mixed versions. No separate semantic models.** |
| Lifecycle projection | EC-030 per-copy settlement | Managed retention/eDiscovery UX | **Render `deleted locally; copies remain` from owner results. Do not create another lifecycle store.** |
| Doctor finding selection | Many merged structured slices; #100361 merged | Admin experiences consume findings | **Reuse. Preserve default versus `--all`/`--only`; do not enable every expensive or advisory check by default.** |
| Config repair preview | #99255 open draft at `3adfe2f2a1bb` | Config-admin preview shell is planned | **Adopt the narrow owner preview. Do not duplicate config mutation logic.** |
| General dry-run reports | #84472 open draft at `b3563d3f3404` | Managed repair UX may consume reports | **Adopt selectively after truthful structured owner effects exist; no forced parity across every lint family.** |
| Durable repair plan | Current Doctor has repair callbacks, preview effects, apply, and validation but no stable cross-step plan identity | Lobster may coordinate owner repairs | **Build a two-owner conflict/supersession/rollback fixture before proposing a residual plan contract.** |
| Command and repair discovery | #100960 and #104158-#104160 | Managed surfaces need owner-attributed discovery | **Adopt catalog/docs stacks. Inventory is inert and not availability or attestation.** |
| Hosted Control UI policy | #115408/#116013 open drafts | #6060 and #6121 merged; #6116 root-cutover draft | **Adopt generic host policy/enforcement. Keep hosting/auth/rollout downstream and delete patch `0019` after released adoption.** |
| Policy/admin UX | OpenClaw policy/config/Doctor owners remain authoritative | #3355/#3388/#3391 merged preview/baseline/UX | **Keep tenant state and admin composition in Lobster; consume owner schema/findings and avoid a second settings authority.** |
| Rust projection/repair components | TypeScript projection and Doctor owners remain authoritative | Lobster can canary bounded collectors/coordinators | **Optional complete-owner replacement only after language-neutral fixtures, no owner mutation, mixed-version proof, rollback, and exact TypeScript/adapter deletion.** |

## Required Inventory Result for Every Work Item

Each future area package row must include:

| Field | Required value |
| --- | --- |
| Existing OpenClaw source | File, owner, and current behavior |
| Existing upstream thread | PR/issue/RFC number and live state |
| Existing Lobster behavior | PR, service, adapter, or explicit none |
| Current patch baseline | Live PR head, patch id and status, or `not in current carried-patch baseline` |
| Classification | Reuse, adopt, extend existing, new ask, downstream-only, or delete |
| Upstream delta | Exact residual portable behavior, if any |
| Fork action | B1/B2/B3 entry or `none` |
| Lobster action | Existing owner to extend or new bounded owner |
| Deletion | Patch, fork proof, script, inference, or duplicate PR removed |
| Validation timestamp | Absolute date and verified head/state |

No new upstream ask is ready until this row is complete.
