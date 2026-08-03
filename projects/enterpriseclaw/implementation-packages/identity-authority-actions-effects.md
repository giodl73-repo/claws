# Identity, Authority, Actions, Effects, Conversations, and Delivery

Status: reconciled implementation package  
Last validated: 2026-08-02  
EnterpriseClaw contracts: EC-003, EC-004, EC-005, EC-013, EC-014, EC-015,
EC-016

## Executive Decision

OpenClaw already has substantial identity, approval, tool-surface, channel,
delivery, and trust machinery. EnterpriseClaw should not replace those owners
with a universal identity plane, policy engine, action bus, or message store.

The package strategy is:

1. preserve credential/profile, approval, capability, channel, provider, and
   pairing owners;
2. make the accepted credential, authority, capability, route, and effect
   relationships durable where correlation is currently lost;
3. adopt the existing upstream issues for external approval presentation and
   resolved pre-effect authorization;
4. use current host-bundle and effective-tool inventory work rather than
   inventing another capability registry;
5. add conversation-route and delivery-operation contracts only after
   unlike-channel fixtures prove the common minimum;
6. keep Entra federation, tenant policy, actor authorization, managed approval
   UX, connector selection, and audit retention in Lobster; and
7. delete Lobster patches and ProxyPipe frames only after their canonical
   owner replacements ship and are adopted.

The central invariant is:

```text
identity selects an owner
  -> authority admits exact normalized intent
  -> capability binds one run-scoped surface
  -> owner dispatches one effect attempt
  -> owner settles effect certainty
  -> evidence projects facts without becoming the owner
```

## Owner Model

| Owner | Owns | Does not own |
| --- | --- | --- |
| Credential/profile owner | Material/reference, principal, refresh, rotation, revocation, validity | Tool intent, approval, provider effect |
| Policy/approval owner | Required decision, allowed outcomes, expiry, actor/route constraints, authoritative resolution | External business state or retry |
| Trust owner | Device/node/plugin/host trust identity, generation, renewal, revocation | Consumer-specific effect settlement |
| Capability owner | Definition, version, requirements, compatibility, run-scoped availability | Authorization or effect success |
| Tool/action owner | Normalized resolved operation, invocation, idempotency/replay declaration, result | Tenant policy authorship |
| Conversation/channel owner | Native account, conversation/thread, message, rendering, transport, receipts | Session transcript truth |
| Delivery owner | Durable desired delivery, native attempts, provider receipts, uncertainty, reconciliation | Provider-independent exactly-once guarantee |
| Lobster | Tenant federation, policy distribution, actor authorization, approval UX, managed connectors, retention, fleet composition | OpenClaw owner semantics |

## Area RFC Boundaries

| Area RFC | EnterpriseClaw source | Boundary |
| --- | --- | --- |
| IAE-01 Credential-to-operation binding | EC-003 | Non-secret credential/profile owner generation bound to one consumer, operation, and attempt |
| IAE-02 Authorization and approval decision | EC-004 | Allow, deny, review, modify, expiry, generation, actor route, and decision correlation |
| IAE-03 Trust renewal, revocation, and federation | EC-005 | Owner-native trust generations, revocation propagation, consumer fencing, and external federation adapters |
| IAE-04 Capability inventory and run surface | EC-013 | Definition, inert discovery, compatibility, active binding, run-scoped surface identity, and degraded/unsupported state |
| IAE-05 Resolved pre-effect authorization | EC-014 | Final normalized operation and target checked immediately before effect |
| IAE-06 External effect and certainty settlement | EC-014 | Owner-native effect identity, attempt, result, partial/unknown state, reconciliation, and evidence |
| IAE-07 Conversation and route identity | EC-015 | Provider conversation/thread, route resolution, semantic turn, session route, and external copy relationships |
| IAE-08 Durable delivery settlement | EC-016 | Delivery operation, queue intent, render/route generations, native attempts, receipts, replay policy, and terminal certainty |

These are eight local planning boundaries, not eight automatic upstream RFCs.

## Current OpenClaw Owner Seams

| Concern | Current source seam | Existing strength | Residual gap |
| --- | --- | --- | --- |
| Execution credential binding | `src/agents/execution-auth-binding.ts` | Exact resolved static credential fingerprints, stable-principal OAuth refresh, opaque runtime owner/artifact proof, and fail-closed missing ownership | Process-local proof is not restart authority; binding is not uniformly consumed by external-effect owners |
| Approval policy | `agent-tools.before-tool-call.*` and exec/plugin approval owners | Ordered trusted policy, snapshot of mutable params, fail-closed timeout/unavailable behavior, allowed decisions, and parameter overrides | Stable decision reference/generation and approval-to-final-invocation correlation are not generic |
| Pairing and trust | Device/node pairing, tokens, pairing generation, node registry | Public-key proof, role/scope grants, generation fencing, live-session invalidation, and revocation | Federation and unlike trust owners do not share one portable propagation contract |
| Effective capability surface | Tool catalog/materialization and `tools-effective-inventory-build.ts` | Core/plugin/MCP/channel attribution, schema normalization, incompatible-tool quarantine, risk metadata, and operator notices | Stable run-scoped surface identity/version evidence is not consistently carried to invocation |
| Nested effect authorization | Tool-specific resolved dispatch paths | Top-level `before_tool_call` and several owner-specific final guards | No shared final resolved-operation hook across exec, nodes, MCP, and plugin fan-out |
| External effect | Tool owners, message tool, node invoke, provider dispatch | Owner-specific idempotency, cancellation, receipts, partial outcomes, and uncertainty in selected paths | Approval/credential/surface binding and owner effect certainty are not one durable portable relationship |
| Conversation identity | Channel resolvers and `session-conversation.ts` | Plugin-native resolver, explicit thread/parent metadata, bundled compatibility path, and generic fallback | Route-resolution source/generation and admitted-turn correlation are not uniformly durable |
| Durable delivery | Durable outbound queue, channel delivery, receipts | Queue intent, capability checks, required reconciliation mode, partial failure, suppression, provider IDs, and restart recovery | No cross-channel durable native-attempt identity or complete common settlement envelope |

## Existing-Investment Crosswalk

### Credential binding and hosted credential origins

| Investment | Live state on 2026-08-02 | Classification | Consequence |
| --- | --- | --- | --- |
| Current `AgentExecutionAuthBinding` | Present | Reuse | Extend current non-secret binding rather than adding a credential service |
| OpenClaw #104849 per-domain credential pass-through | Open, product/security decision required | Reuse | Keep exact-origin credential use with the fetch/media owner; do not generalize prematurely |
| Hosted Integration O2 fork proof | Fork-only extraction | B1 evidence | Recompose only after #104849 owner/security decision |
| OpenClaw #107155 keyless WebIQ fast path | Open | Extend existing | Resolve explicit manifest/owner metadata; do not infer no-secret behavior from opaque config |
| Lobster brokered Teams auth/file download patches | Active downstream | Downstream-only/B3 | Retain while brokered Teams identity remains Lobster-owned |

Residual upstream delta: durable non-secret operation binding is conditional on
a restart and unlike-consumer proof. Exact-origin credential slots stay with
their concrete owner issues.

### Authorization and approval

| Investment | Live state on 2026-08-02 | Classification | Consequence |
| --- | --- | --- | --- |
| Canonical exec/plugin approvals | Present | Reuse | Preserve owner request, expiry, decision, and exactly-once resolution |
| OpenClaw #113444 external approval presentation ownership | Open | Adopt | Use for duplicate-prompt suppression without moving approval authority |
| Lobster patch `0017-msteams-suppress-brokered-approval-prompt` | Active | B3 | Retire after accepted #113444 replacement ships |
| OpenClaw #115408 host Control UI policy | Open draft, head `6fba8ef36745` | Extend existing | Browser shaping only; not an authorization boundary |
| OpenClaw #116013 hosted Gateway policy enforcement | Open draft, head `55e3c97ddc15` | Extend existing | Server-side deny seam for hosted UI policy; keep owner method enforcement |
| OpenClaw #115423 hosted Control UI umbrella | Open | Reuse | Coordinate rather than file a competing host UI policy |
| Lobster #3388, #3391, #2270 | Merged | Downstream-only | Reuse personal/managed policy state and gated UX |
| Lobster #5491 | Open | Downstream-only | Reuse privacy-safe approval friction inventory |

Residual upstream delta: decision correlation at invocation/evidence remains
unproven; external presentation and hosted UI enforcement already have active
threads.

### Trust and federation

| Investment | Live state on 2026-08-02 | Classification | Consequence |
| --- | --- | --- | --- |
| Device/node pairing generation and revocation | Present | Reuse | Treat as the strongest portable trust-owner precedent |
| Gateway scopes and role-bound device tokens | Present | Reuse | Do not replace with one omnibus host credential |
| Lobster MAC/MOS3 application availability #5422 | Open | Downstream-only | Keep tenant application availability and federation downstream |
| Lobster policy baselines | Merged | Downstream-only | Consume as managed policy inputs, not OpenClaw trust truth |
| Hosted peer/connection-owner fork proofs | Bounded evidence | B1/B2 | Use only for explicit host trust identities and delete duplicate transport inference |

Residual upstream delta: none until a second unlike trust owner proves a common
renewal/revocation propagation contract is needed.

### Capability surfaces and host bundles

| Investment | Live state on 2026-08-02 | Classification | Consequence |
| --- | --- | --- | --- |
| Effective tool inventory | Present | Reuse | Use current owner attribution and schema quarantine |
| OpenClaw #89596 declared plugin/MCP allowlists | Merged 2026-06-18 | Adopt | Delete policy compatibility workarounds after release adoption |
| OpenClaw #114782 host contribution bundle issue | Open | Reuse | Use as the bundle decision owner |
| OpenClaw #114783 manifest-first bundle draft | Open draft, head `14bd05f56914` | Extend existing | Keep inventory inert; no runtime activation or second registry |
| Lobster #5336 `scout-standard` convergence brief | Merged 2026-07-25 | Downstream-only | Reuse exact Lobster-owned capability composition |
| Lobster #4297 node catalog projection | Merged 2026-07-21 | Downstream-only | Reuse effective node capability inventory |
| Lobster #4648 governed node invoke | Open | Downstream-only | Reuse native approval and node invocation rails |

Residual upstream delta: stable run-scoped surface identity may remain after
current inventory/bundle work. Prove it before filing.

### Resolved pre-effect authorization and effect settlement

| Investment | Live state on 2026-08-02 | Classification | Consequence |
| --- | --- | --- | --- |
| Top-level `before_tool_call` | Present | Reuse | Preserve ordered trusted policy and fail-closed behavior |
| OpenClaw #113440 resolved nested-operation hook | Open | Adopt | Do not file another pre-effect hook |
| Lobster patch `0020-cron-nested-tool-authorization` | Active | B3 | Retire after accepted owner hook and adoption |
| Protected external-effect simulation | 6/6 deterministic cases | Reuse evidence | Use as the contract shape, not current-runtime proof |
| OpenClaw #114772/#114773 one-hop fetch extraction | Open issue/draft | Reuse | Preserve guarded-fetch security ownership while isolating physical dispatch |
| Hosted Integration provider-dispatch proofs | Fork evidence | B1/B2 | Promote only owner-correct seams; no generic host action bus |

Residual upstream delta: #113440 covers final resolved authorization. A
separate durable authority-to-effect correlation should be proposed only after
one real owner-neutral fixture proves the minimum.

### Conversation and delivery

| Investment | Live state on 2026-08-02 | Classification | Consequence |
| --- | --- | --- | --- |
| Channel-native conversation resolvers | Present | Reuse | Keep provider IDs and parent/thread semantics authoritative |
| Compatibility fallback parsing | Present | B3 | Delete after channel resolvers cover supported routes |
| Durable final delivery | Present | Extend existing | Reuse queue intent, capability requirements, receipts, suppression, and partial outcomes |
| OpenClaw #110357 durable Teams ingress dedupe | Merged 2026-07-18 | Adopt/delete | Remove Lobster delivery-header patch after release adoption |
| OpenClaw #102379 Teams normalization | Open | Extend existing | Keep provider-native inbound identity/normalization with Teams owner |
| Lobster brokered multiplayer route | Active downstream | Downstream-only | Keep tenant multiplayer admission/routing in Lobster |
| Durable-delivery simulation | 10/10 deterministic cases | Reuse evidence | Use for operation/attempt/reconciliation/frozen-route semantics |

Residual upstream delta: a minimal conversation-route provenance result and a
cross-channel durable delivery operation/attempt contract remain candidates.
Neither should be filed before unlike-channel fixtures.

## Residual Upstream Workstreams

### U-IAE-01: Durable credential-to-operation binding, conditional

Prove one accepted non-secret binding across restart and two unlike consumers:
one model/provider execution and one external effect.

Only if owner-native evidence cannot provide it, extend the current execution
binding with:

- stable binding ID;
- credential/profile owner reference and generation;
- principal/grant continuity class;
- consumer and operation/attempt identity;
- accepted configuration/policy generation;
- active, stale, revoked, expired, unavailable, or unknown settlement; and
- restart re-resolution without persisting secret material or process-local
  HMAC fingerprints.

### U-IAE-02: Approval decision correlation, conditional

First test whether existing exec/plugin approval IDs and trusted diagnostics
can carry the consumed decision reference through final invocation.

If not, add the smallest portable correlation:

- approval request/decision reference;
- final normalized intent digest;
- allowed decision and constrained parameter replacement;
- policy/risk/approval generations and expiry;
- authoritative resolver binding;
- consumed operation/attempt identity; and
- redacted evidence reference.

This does not replace owner-specific approval payloads.

### U-IAE-03: External approval presentation ownership

Adopt #113444. The contract must:

- suppress duplicate native prompt/narration only;
- preserve canonical pending/resolved state;
- authenticate the external presentation owner;
- fail closed on malformed/unavailable ownership;
- retain native behavior unless explicitly selected; and
- never widen allowed decisions or bypass actor authorization.

### U-IAE-04: Resolved nested-operation pre-effect authorization

Adopt #113440. The final owner hook should carry:

- stable operation kind and per-attempt ID;
- normalized resolved target/action facts;
- originating run/session/tool context;
- deterministic placement immediately before effect;
- allow/deny with fail-closed hook failure; and
- no secrets or host-specific policy objects.

### U-IAE-05: Capability bundle and run-surface identity

Adopt #114782/#114783 for inert manifest-first host bundle inventory.

Then prove whether current effective-tool inventory can emit one stable
run-scoped surface identity covering owner, version, compatibility,
quarantined/unsupported entries, and selected policy/config generations. Add a
narrow result only if current diagnostics cannot.

### U-IAE-06: Conversation route provenance, conditional

After a threaded two-channel fixture, add only the portable relationship that
current owners cannot represent:

- channel/account/conversation/optional parent identity;
- resolver source and route generation;
- admitted turn/session route correlation;
- unsupported/rejected/ambiguous resolution;
- frozen accepted outbound target; and
- provider message/attachment copy references.

No universal provider message object is permitted.

### U-IAE-07: Durable delivery operation and native attempts, conditional

After two unlike channel implementations prove the common minimum, extend the
existing durable delivery owner with:

- stable delivery operation ID surviving restart;
- durable acceptance identity;
- one active fenced native attempt and distinct retry attempt IDs;
- frozen target, route, render, capability, and payload generations;
- channel-declared replay posture;
- provider receipt and partial/unknown settlement revisions;
- reconciliation result and late-receipt supersession; and
- explicit unsupported/degraded fields for older channels.

External exactly-once delivery is not a portable promise.

### Not residual upstream work

- Entra, tenant, or organization federation implementation;
- one global secret manager;
- one policy language;
- one generic approval UI;
- a central capability registry;
- a universal action/effect bus;
- a universal provider message database;
- blind delivery retry;
- Lobster multiplayer routing or brokered Teams identity; or
- host-specific audit retention and compliance policy.

## Fork and Adapter Ledger

| Ledger item | Class | Purpose | Current relationship | Exit |
| --- | --- | --- | --- | --- |
| Durable credential-binding fixture | B1 | Prove restart-safe non-secret binding across unlike consumers | Extends current `AgentExecutionAuthBinding` | U-IAE-01 or delete |
| Exact-origin credential slot proof | B1 | Prove owner-scoped credential use | Blocked by #104849 decision | Recompose into approved owner or delete |
| Approval-correlation fixture | B1 | Prove final invocation consumes exact decision | Uses current exec/plugin approvals | U-IAE-02 or delete |
| External approval presentation patch | B3 | Suppress duplicate Teams/container prompts | Replaced by #113444 | Delete after accepted release adoption |
| Nested pre-effect authorization patch | B3 | Authorize resolved cron/nodes/MCP/plugin effects | Replaced by #113440 | Delete after accepted release adoption |
| Host Control UI policy adopter | B2 | Project and enforce Lobster host policy | Depends on #115408/#116013 | Remain Lobster adapter |
| Host integration bundle adopter | B2 | Package Lobster contributions with provenance | Depends on #114782/#114783 | Remain downstream plugin/adopter |
| Capability surface identity fixture | B1 | Compare core/plugin/MCP/channel surface generations | Extends effective tool inventory | U-IAE-05 or delete |
| Provider dispatch owner proof | B1 | Prove guarded owner-prepared dispatch and uncertainty | Hosted Integration fork sources | Promote owner-correct seams or archive |
| Conversation provenance fixture | B1 | Prove resolver/route/turn correlation across channels | Extends current channel resolver | U-IAE-06 or delete |
| Delivery operation fixture | B1 | Prove durable acceptance, fenced attempts, and reconciliation | Extends current durable delivery | U-IAE-07 or delete |
| Teams ingress dedupe patch | B3 | Preserve inbound activity identity across restart | Replaced by merged #110357 | Delete after promoted release |
| Teams brokered auth/file download/multiplayer route | B2/B3 | Lobster delegated auth and tenant routing | No generic replacement expected | Keep downstream; delete only if owner model changes |
| ProxyPipe approval/channel frames | B3 | Legacy host transport | Replaced by canonical Gateway/channel owner contracts | Delete after shadow/canary and zero old-path telemetry |

## Lobster Managed Capabilities

| Capability | Lobster responsibility | OpenClaw dependency |
| --- | --- | --- |
| Federation and principal mapping | Entra/tenant/user/workload identity, token exchange, organization trust | Owner-native principal and binding seams |
| Credential materialization | Exact tenant credential source, short-lived/JIT issuance, private networking, break-glass controls | U-IAE-01 and owner-specific slots |
| Policy distribution | Tenant/personal baseline selection, generation, equal-or-stricter merge, rollout | Existing policy enforcement and #115408/#116013 where applicable |
| Approval experience | Route to authorized actor, present exact request, record actor audit, resolve allowed decision | Canonical exec/plugin approval APIs and #113444 |
| Capability composition | `scout-standard`, tenant enablement, connector acquisition, node/tool inventory | Effective inventory, #89596, #114782/#114783 |
| Managed effect reconciliation | Retry/attention workflows and cross-owner evidence for uncertain high-risk effects | #113440 and owner-native effect results |
| Conversation routing | Tenant/account/multiplayer admission and brokered Teams route ownership | Channel-native conversation identity |
| Delivery operations | Managed queue policy, alerts, reconciliation workers, retention, and provider-copy assurance | U-IAE-07/current durable delivery |
| Trust propagation | Emergency tenant revocation and cross-cell distribution targets | Owner-native revocation generations |

Lobster may compile and distribute authority. It must not directly mutate
OpenClaw state or infer owner success from host transport completion.

## Rust Replacement Boundaries

| Candidate | Extraction trigger | Exclusions |
| --- | --- | --- |
| `ec-binding-verifier` | Credential/authority/capability binding is stable, language-neutral, and proven across unlike owners | Secret storage, tenant federation, policy authorship |
| `ec-effect-envelope` | Operation/attempt/effect certainty and reconciliation contract is stable | Provider/business-state ownership |
| `ec-delivery-conformance` | Two unlike channels share stable delivery fixtures | Channel rendering, SDK, and provider retry implementation |
| `ec-trust-verifier` | Multiple trust owners share a proven generation/revocation verification boundary | Entra federation service or device pairing store |

Rust extraction requires TypeScript deletion or replacement behind the same
public contract. It is not a reason to centralize owners.

## Operator Journey

```text
inspect effective capability
  -> see owner, version, availability, risk, and authority requirement
  -> select exact action and target
  -> resolve credential and trust bindings
  -> receive allow/deny/review/modify decision
  -> if modified, re-normalize and re-authorize
  -> authorize final resolved operation immediately before effect
  -> dispatch one fenced owner attempt
  -> observe accepted / not effected / partial / unknown
  -> reconcile before replay
  -> preserve immutable settlement history

for messaging:
  resolve provider conversation and route
  -> durably accept delivery
  -> freeze target/route/render/payload generations
  -> dispatch fenced native attempt
  -> preserve provider IDs and partial effects
  -> show sent / not sent / needs attention truthfully
```

## Acceptance Gates

### Identity and security

- Protected effects fail closed when credential, trust, policy, risk, or
  capability generations are missing, stale, revoked, or unverifiable.
- Evidence contains references/hashes, never reusable credential material.
- External approval presentation cannot widen decisions or replace canonical
  resolution.
- Raw host routing or connection presence never implies trust.

### Runtime

- Final resolved operation is checked after routing/defaults/aliases and before
  effect.
- Modification creates new normalized intent and reruns required checks.
- Restart reconciles accepted bindings and deliveries by identity.
- One active effect/delivery attempt is fenced; stale workers cannot dispatch.

### Effect and delivery

- Tool completion and host transport completion do not prove external effect.
- Unknown and partial effects never authorize blind replay.
- Provider acceptance, delivered, read, and externally retained remain
  separate where supported.
- Late owner proof supersedes uncertainty by reference without rewriting
  history.

### Compatibility and ecosystem

- Older plugins/channels may expose reduced evidence only when explicitly
  declared.
- Discovery and catalog membership never grant activation or permission.
- Local OpenClaw remains complete without Lobster federation or approval UI.
- B1/B3 items have owner, expiry, upstream/adoption link, and deletion gate.

## Dependency-Ordered Work Items

| ID | Work item | Classification | Layer | Depends on | Acceptance | Deletion target |
| --- | --- | --- | --- | --- | --- | --- |
| IAE-001 | Freeze live source and delivery inventory | Reuse | Planning | - | EC-003/004/005/013/014/015/016 source, threads, Lobster work, patches, and dates recorded | Stale duplicate inventories |
| IAE-002 | Map credential owner and consumer matrix | Reuse | Planning | IAE-001 | Model, CLI, channel, MCP, node, host, and effect consumers mapped to existing owners | Universal credential-store proposal |
| IAE-003 | Map approval and enforcement seams | Reuse | Planning | IAE-001 | Exec, plugin, node, Control UI, nested effect, and host presentation owners separated | Generic approval-bus proposal |
| IAE-004 | Map capability surfaces and bundles | Reuse | Planning | IAE-001 | Catalog, effective run surface, host bundle, node inventory, and tenant composition separated | Second capability registry |
| IAE-005 | Map conversation and delivery owners | Reuse | Planning | IAE-001 | Resolver, route, session, queue, attempt, receipt, provider copy, and projection owners separated | Universal message object |
| IAE-006 | Prove restart-safe credential binding | New ask candidate | B1 evidence | IAE-002 | Same owner generation re-resolves without secret persistence; changed owner fences prior attempt | Ambient current-credential lookup |
| IAE-007 | Prove unlike-consumer binding | New ask candidate | B1 evidence | IAE-006 | One model execution and one external effect consume the same minimal relationship | Model-only binding abstraction |
| IAE-008 | Decide U-IAE-01 necessity | Extend existing | Upstream | IAE-007 | Reuse owner-native evidence if sufficient; otherwise smallest durable binding extension | B1 credential fixture |
| IAE-009 | Resolve #104849 credential-origin decision | Reuse | Upstream decision | IAE-002 | Exact domain/origin, redirect, audience, leakage, and owner rules accepted | Standalone credential infrastructure |
| IAE-010 | Reconcile keyless fast path #107155 | Extend existing | Upstream | IAE-009 | Keyless eligibility comes from explicit owner metadata or conservative resolution | Opaque-config credential bypass |
| IAE-011 | Model approval decision correlation | New ask candidate | Evidence | IAE-003 | Request, decision, expiry, intent, generation, modify, and operation fields represented | Approval resolution discarded at invocation |
| IAE-012 | Prove modify reauthorization | Extend existing | B1 evidence | IAE-011 | Changed params produce new intent/risk and cannot inherit stale approval | In-place unverified parameter mutation |
| IAE-013 | Decide U-IAE-02 necessity | Extend existing | Upstream | IAE-012 | Existing approval IDs/diagnostics reused if sufficient | Parallel decision ledger |
| IAE-014 | Adopt #113444 presentation ownership | Adopt | Upstream | IAE-003 | Unselected uses native presentation; selected and healthy uses the external owner; selected but unavailable, malformed, or unauthorized fails closed without duplicate prompts | `0017` Lobster patch |
| IAE-015 | Adopt #115408/#116013 hosted policy stack | Extend existing | Upstream/Lobster | IAE-003 | Browser shaping and server enforcement stay explicit and default-open locally | Fork-only hosted policy semantics |
| IAE-016 | Implement Lobster approval adopter | Downstream-only | B2/Lobster | IAE-013, IAE-014, XPK-004 | Tenant/actor route and audit use canonical approval ID and allowed decisions; hosted UI policy is optional and separate | ProxyPipe approval frames |
| IAE-017 | Prove revocation consumer fencing | Extend existing | Evidence | IAE-002, IAE-003 | Pairing/trust revocation blocks new binding and reports in-flight exposure | Connection-presence trust inference |
| IAE-018 | Define federation adapter obligations | Downstream-only | Lobster | IAE-017 | Propagation target, expiry, unsettled exposure, and local fallback explicit | OpenClaw-specific Entra semantics |
| IAE-019 | Adopt merged #89596 | Adopt/delete | Release | IAE-004 | Released artifact recognizes declared plugin/MCP allowlists | Policy compatibility workaround |
| IAE-020 | Adopt #114782/#114783 bundle inventory | Extend existing | Upstream | IAE-004 | Inert frozen manifest inventory, duplicate-owner rejection, provenance, no activation | Host registry duplication |
| IAE-021 | Prove run-scoped surface identity | New ask candidate | B1 evidence | IAE-019, IAE-020 | Core/plugin/MCP/channel surface generation and unsupported/degraded entries correlate to invocation | Catalog membership as runtime truth |
| IAE-022 | Decide U-IAE-05 residual | Extend existing | Upstream | IAE-021 | Current inventory reused if sufficient; otherwise one optional surface identity | B1 surface fixture |
| IAE-023 | Adopt #113440 pre-effect hook | Adopt | Upstream | IAE-003, IAE-013, ARO-006 | Resolved target/action checked immediately before effect with stable attempt identity; optional run-surface identity may enrich but cannot block authorization | `0020` nested-authorization patch |
| IAE-024 | Re-run protected-effect simulation against accepted shapes | Reuse | Evidence | IAE-008, IAE-013, IAE-023, XPK-003 | Credential, approval, capability, risk, policy, intent, effect, and required evidence facts compose without real I/O | Obsolete fixture fields |
| IAE-025 | Prove one owner-native effect reconciliation | New ask candidate | B1 evidence | IAE-024 | Accepted, not effected, partial, and unknown outcomes drive owner-specific replay | Generic tool success as effect proof |
| IAE-026 | Decide authority-to-effect upstream delta | Extend existing | Upstream | IAE-025 | Use diagnostics/audit if sufficient; otherwise smallest correlation event/result | Parallel action ledger |
| IAE-027 | Implement Lobster managed effect reconciliation | Downstream-only | Lobster | IAE-025, IAE-026 | Attention/retry workflow preserves owner certainty and evidence references | Blind host retry |
| IAE-028 | Prove two-channel conversation provenance | New ask candidate | B1 evidence | IAE-005 | Provider resolver, parent/thread, route change, rejected fallback, and turn correlation pass | Display-label identity inference |
| IAE-029 | Decide U-IAE-06 necessity | Extend existing | Upstream | IAE-028 | Existing resolver/session facts reused if sufficient | Universal conversation database |
| IAE-030 | Prove durable delivery operation across two channels | New ask candidate | B1 evidence | IAE-005, IAE-028 | Durable acceptance, restart, fenced attempts, frozen route, and distinct retries pass | In-memory/request-receipt `queued` |
| IAE-031 | Prove unknown and partial settlement matrix | New ask candidate | B1 evidence | IAE-030 | Replay-safe, reconcile-before-replay, no-replay, partial parts, and late receipts remain truthful | Blind whole-operation retry |
| IAE-032 | Decide U-IAE-07 necessity | Extend existing | Upstream | IAE-031 | Smallest common delivery operation/attempt contract identified or disproved | B1 delivery fixture |
| IAE-033 | Adopt merged #110357 and current Teams fixes | Adopt/delete | Release | IAE-001 | Promoted release replaces ingress dedupe patch; normalization remains with Teams owner | `0006` delivery header patch |
| IAE-034 | Keep brokered Teams identity downstream | Downstream-only | B2/Lobster | IAE-005 | Delegated auth, multiplayer route, and file download retain explicit Lobster owner | Accidental generic upstreaming |
| IAE-035 | Implement Lobster conversation/delivery adopter | Downstream-only | Lobster | IAE-029, IAE-032, IAE-034 | Tenant routes consume provider identity and delivery settlement without rewriting them | ProxyPipe channel frames |
| IAE-036 | Run cross-area operational and assurance proof | Extend existing | Evidence | IAE-016, IAE-018, IAE-022, IAE-027, IAE-035, XPK-003 | Identity, authority, effect, delivery, retained-copy, and audit statuses remain separate and integrity-bearing | Success-shaped aggregate |
| IAE-037A | Retire approval-presentation compatibility path | Delete | Release | IAE-014, IAE-016, IAE-036 | Minimum release, hosted adoption, zero-old-prompt telemetry, rollback window, and exact patch deletion recorded | `0017` |
| IAE-037B | Retire nested-authorization compatibility path | Delete | Release | IAE-023 through IAE-027, IAE-036 | Pre-effect replacement, exact-target proof, zero-old-hook telemetry, and exact patch deletion recorded | `0020` |
| IAE-037C | Retire Teams delivery compatibility paths | Delete | Release | IAE-030 through IAE-035, IAE-036 | Ingress/dedupe/normalization replacements and exact retained Teams owner paths recorded | Teams delivery patches |
| IAE-037D | Retire allowlist and carrier compatibility paths | Delete | Release | IAE-019, IAE-020, IAE-035, IAE-036 | Released allowlist/bundle/carrier replacements and exact downstream survivors recorded | Policy and ProxyPipe workarounds |
| IAE-037 | Close the IAE release/deletion ledger | Delete | Release | IAE-037A through IAE-037D, XPK-009 | Ledger has no unexplained permanent B1/B3 path | Permanent semantic fork |
| IAE-038 | Evaluate Rust extraction gates | Reuse | Rust | IAE-036 | Extract only proven verifier/envelope/conformance boundaries with TS deletion plan | Premature centralized rewrite |

## Sequencing

```text
inventory and owner maps
  -> credential/approval/capability evidence
  -> adopt active upstream decisions
  -> pre-effect and effect proof
  -> conversation and delivery two-channel proof
  -> Lobster adapters
  -> cross-area assurance
  -> independently gated approval, nested-authorization, Teams, allowlist, and
     carrier deletion
  -> optional Rust extraction
```

## Findings

1. **Credential binding already exists, but only as process-local execution
   proof.** The missing question is restart-safe operation binding across
   unlike consumers.
2. **Approval routing is not the main gap.** Canonical approval owners and host
   consumers exist; the gap is exact decision correlation and external
   presentation ownership without duplicate prompts.
3. **Resolved pre-effect authorization already has an upstream issue.**
   EnterpriseClaw must adopt #113440 rather than file another hook.
4. **Capability discovery is stronger than the original RFC framing implied.**
   Effective inventory and schema quarantine exist; host bundles are already
   under #114782/#114783.
5. **Trust should remain plural.** Device pairing is a strong precedent, but
   federation, plugin trust, and host trust should not be forced into one
   database.
6. **Current durable delivery is materially capable.** The residual gap is
   portable operation/native-attempt identity and complete settlement, not a
   new queue.
7. **Conversation identity and delivery must remain separate.** Route changes
   do not rewrite provider conversations, and delivery creates new external
   copies with their own lifecycle.
8. **Lobster owns composition, not semantic success.** Tenant policy,
   federation, approval UX, managed routing, and reconciliation are downstream;
   effect truth remains with the OpenClaw owner.

## Package Exit

This package is complete when:

- active upstream decisions #113440, #113444, #114782/#114783,
  #115408/#116013, and #104849 have explicit adoption outcomes;
- durable credential and approval correlation are either proven owner-native
  or narrowed to minimal upstream deltas;
- two unlike channels prove or disprove common conversation-route and
  delivery-operation contracts;
- Lobster consumes canonical owner seams for policy, approvals, effects, and
  delivery;
- external approval presentation has explicit unselected, selected-and-healthy,
  and selected-but-unavailable behavior;
- mapped Teams, nested-authorization, approval-presentation, allowlist, and
  ProxyPipe compatibility paths have independent release and deletion
  evidence; and
- any Rust component replaces a stable boundary rather than centralizing its
  owners.
