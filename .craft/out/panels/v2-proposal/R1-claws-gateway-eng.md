# R1 review — v2 OpenClaw contribution proposal — claws:gateway-eng

**Date**: 2026-04-28
**Reviewer**: claws:gateway-eng (runtime guardian; tension cluster B — runtime performance > governance completeness)
**Subject**: snap-pre-rfc.md, policy-pre-rfc.md, guardrails-adapter.md, realigned-story.md
**Round**: 1
**Verdict**: **APPROVE-WITH-WARNINGS** — directional shape is sound and dramatically friendlier to gateway runtime than the prior daemon-shape; but four runtime correctness hazards must be answered before the chain ships. One of them (the snapshot-ID race in `evaluate(event, ctx)`) is a real bug, not a paperwork concern.

---

## TL;DR

The v2 proposal moves in the right direction for the runtime: it shrinks ~7,700 LoC of in-process parallel impl, kills a daemon-shape that would have added IPC hops on the hot path, and lands all enforcement on upstream's existing `runTrustedToolPolicies` slot — which is in-process, on the event loop, with no new wire format. From a 50ms-per-hook lens, that's good news.

But the proposals are wire-shape contracts, and **at the wire layer the chain has unaddressed gaps**:

1. **`evaluate(event, ctx)` does not carry snapshot ID** — confirmed by reading upstream `PluginHookToolContext` at `src/plugins/hook-types.ts:393-401` (fields: `agentId, sessionKey, sessionId, runId, trace, toolName, toolCallId`; **no `snapshotId`, no `tenantId`**). The realigned-story §"Cross-contract concerns" mentions this in passing and casually proposes "plugin holds the snapshot reference in plugin-private state via `onSnapshotPromoted`." That is the correctness bug — see §3 below. It's not a paperwork concern; it produces a real TOCTOU race between `onSnapshotPromoted` and an in-flight tool call, and it silently breaks under multi-tenant if the gateway hosts more than one workspace. **This deserves a contract-level answer before the policy PR opens, not a downstream-wired workaround.**
2. **Canonicalization is implicit, not specified** — snap-pre-rfc claims content-hash IDs; PolicyIR claims content-hash policyId; neither names a canonicalization algorithm (RFC 8785 / JCS? ad-hoc? sorted JSON? CBOR?). Two `SnapshotStore` impls that canonicalize differently produce divergent IDs for byte-identical workspaces — that breaks the "policyId is content-addressed so two snapshots carrying byte-identical PolicyIR resolve to the same id" claim in policy-pre-rfc §1. Section 4 below.
3. **Decision-vocabulary translation drops claws-side semantics on the wire** — the adapter table maps `review → requireApproval` and discards the approval handle's `signature, sequenceNumber, approverPrincipal, keyId` per guardrails-adapter §"Decision mapping." That's "by design" claws-side, but the resulting upstream `PluginToolPolicyDecision` cannot reconstruct claws's 19-code error envelope (LBC §7.1) when an approval is denied. See §6 below.
4. **SSE event ordering for `policy promoted to snapshot N` is unspecified** — claws-serve has SSE consumers (lobster-web, fleet operators) that depend on a stable event taxonomy: Class A `recompiled`, Class B `governance.warning` etc. (LBC §6). The realigned-story flow generates PolicyIR after fileingest validate but never says which SSE event tells consumers "PolicyIR for snapshot N is now active." If consumers don't get an ordering invariant they're already relying on, two cross-correlation events can re-order and lobster-web's policy-preview UI shows the previous snapshot's PolicyIR. See §7 below.

The proposal is approvable directionally because the chain is structurally correct and the runtime gains are real. The warnings above are R1 — they're answerable before any PR opens — but the **snapshot-ID hazard is not optional**. Without a contract-level answer it lands a latent correctness bug that won't surface until two snapshots promote within one tool call's evaluation window, which is exactly the post-upgrade reload scenario the gateway hits.

---

## What's strong about this from a runtime lens

Before going deep on the warnings, name what's right.

- **No new daemon, no new port, no new IPC hop on the hot path.** Yankee's "contract not daemon" finding for snap is doing real runtime work here. The gateway's `before_tool_call → runTrustedToolPolicies → evaluate(event, ctx)` stays in-process. Decision-evaluation time stays under 50ms per policy because there's no network hop; the only added cost is reading PolicyIR from the active snapshot, which is cacheable in plugin-private state.
- **Sequential short-circuit composition matches our budget.** Upstream's `runTrustedToolPolicies` (`src/plugins/trusted-tool-policy.ts:8-54`) iterates registered policies and short-circuits on first `block`. That's the right shape — claws ships a single composed `GuardrailProvider` that wraps our N providers (per guardrails-adapter §"Composition handling"), so the upstream runner sees one registration, our priority semantics live downstream. The hot path stays one `evaluate` call, not N.
- **The deletion target is real.** ~7,700 LoC of `claws-sdk/src/{snapshot,governance,compliance,audit}/` going away means fewer code paths the gateway has to keep alive across reloads. The 10-restarts-in-8-hours scenario gets simpler when there's one snapshot impl, not two.
- **Fail-open posture is preserved.** If the policy plugin's `evaluate` throws, the upstream runner short-circuits but does not crash the gateway (per the runner's try/catch shape). That matches our fail-open R1-R2 policy. Good.
- **The adapter is small.** ~50 LoC at `packages/openclaw-guardrails/src/openclaw-adapter.ts` is a small thing to keep correct across upstream updates. Cheap to maintain, cheap to verify, doesn't touch the hot path beyond the decision-vocab translation.

This is a meaningful runtime improvement vs. the daemon-shape PR-7. Approving directionally.

---

## Concerns

### 1. **CRITICAL — `evaluate(event, ctx)` snapshot-ID race condition (concern #3 deserves real scrutiny)**

This is the load-bearing runtime hazard. It's not a vocabulary mismatch; it's a real correctness bug latent in the proposed chain.

**What the proposal says** (realigned-story §"Cross-contract concerns surfaced during drafting"):
> "If the answer is 'ctx doesn't carry it,' our policy plugin holds the snapshot reference in plugin-private state via an `onSnapshotPromoted` callback (which we'd wire downstream)."

**What the upstream type actually is** (`src/plugins/hook-types.ts:393-401`):
```ts
export type PluginHookToolContext = {
  agentId?: string;
  sessionKey?: string;
  sessionId?: string;
  runId?: string;
  trace?: DiagnosticTraceContext;
  toolName: string;
  toolCallId?: string;
};
```

Confirmed: `ctx` does not carry snapshot ID. It does not carry tenant ID either. So the proposal's fallback ("plugin-private state via `onSnapshotPromoted`") is the actual plan, not a contingency.

That plan has at least three concrete failure modes:

**(a) TOCTOU race on policy version.** Tool call T0 enters `evaluate(event, ctx)`. Plugin loads `currentSnapshotId = X` from private state. Before `evaluate` finishes, `onSnapshotPromoted(Y)` fires from a parallel SSE thread. Plugin's private state now reads `currentSnapshotId = Y`. T0 finishes evaluation against PolicyIR(X), but the audit event records PolicyIR(Y) because the audit emit happens after evaluate returns. **The audit chain is now lying about which policy gated the call.** This violates the audit-chain composition invariant (`generatedFrom: SnapshotId` in PolicyIR is supposed to be verifiable across the snap+policy chain — realigned-story §"Cross-contract concerns" implicitly relies on this).

The fix: the plugin must capture `currentSnapshotId` at evaluate-entry into a local, evaluate against that local, and emit audit citing that local — not re-read state at audit-time. That's plugin-level discipline, not contract. **The contract should make this discipline easy to get right by passing snapshot context through `ctx` directly.**

**(b) Multi-tenant correctness.** If the gateway plugin instance is shared across tenants (which is the upstream pattern — one plugin registration, N sessions), `currentSnapshotId` in plugin-private state cannot represent "the active snapshot for THIS request." It represents "the most recently promoted snapshot the plugin observed." Tenant A's `onSnapshotPromoted(X)` and tenant B's `onSnapshotPromoted(Y)` race; whichever fires last wins the plugin-private state, and the other tenant's evaluations now read the wrong policy. **This is silent cross-tenant policy bleed, the worst class of governance bug.** Claws-serve today is single-tenant per process so the bug is dormant; the moment we enable multi-tenant claws-serve (which the deployment-pattern decision in serve-deploy-bridge contemplates), it's live.

The fix: snapshot context is per-session, not plugin-global. Either `ctx.snapshotId` flows through, or the plugin maintains a `Map<sessionKey, SnapshotId>` keyed on `ctx.sessionKey`. The latter works but requires every consumer to know it; the former is the correct contract shape.

**(c) Promotion-observation skew.** Snapshot Y promotes. `onSnapshotPromoted(Y)` fires asynchronously to all registered plugins. Plugin A processes the callback in 1ms; plugin B is mid-await on something else and processes in 50ms. During those 49ms, A and B disagree about the active snapshot. Tool call T1 hits A first (uses Y), B next (uses X). **The composed decision is now derived from inconsistent inputs.** Upstream's sequential short-circuit composer doesn't catch this because each policy is evaluated independently; no cross-policy consistency check.

The fix: snapshot context is request-scoped, not plugin-scoped. If the gateway resolves "active snapshot for this tool call" once per request and threads it through `ctx`, all policies in the chain see the same snapshot. That's the only design that's race-free.

**Verdict on this concern: BLOCKING for the policy PR.** The PolicyIR pre-RFC must include in its "Asks" list a request to extend `PluginHookToolContext` with `snapshotId?: string` (or equivalent). Without that, the chain ships a latent multi-tenant policy-bleed bug, plus an audit-chain fidelity bug, plus a promotion-observation race. Claws can paper over (a) downstream (capture-at-entry discipline), but (b) and (c) require contract change.

This is exactly what bandit's audit flagged (guardrails-design-fit §"Asks for #clawtributors" Q3 — "richer `HostContext` injected at `register(api)` time"). The current proposals don't escalate it loudly enough.

### 2. **Wire-shape parity — discriminated unions, optional fields, ETag drift**

Three subtle drift points across the four documents.

**(a) Decision discriminated-union shape mismatch.** PolicyIR's `Decision` is:
```ts
| { kind: 'allow' }
| { kind: 'deny'; reason: string; rule?: string }
| { kind: 'requires-approval'; reason: string }
| { kind: 'params'; mutate: Readonly<Record<string, unknown>> };
```

Upstream's `PluginToolPolicyDecision` is:
```ts
PluginHookBeforeToolCallResult | { allow?: boolean; reason?: string };
```
where `PluginHookBeforeToolCallResult` is the union `{ block?, blockReason?, params?, requireApproval? }`.

These are **structurally different unions** — claws-side uses `kind`-tagged variants, upstream uses optional-field flag union. The adapter (`mapDecision` in guardrails-adapter §"Decision mapping") translates correctly for the four documented variants, **but does not address composition under partial fields**. Concretely: what does upstream see if our `Decision` has `{ kind: 'params', mutate: {...} }` AND a chained provider returned `{ kind: 'requires-approval' }`? Upstream's runner accumulates `params` + first `requireApproval`; the adapter must produce `{ params: {...}, requireApproval: {...} }`. The adapter as drafted only translates one provider's decision at a time — composition lives upstream of the adapter (claws-side `composeDecisions`), but the proposal doesn't show how the composed claws-side decision projects to the upstream optional-field union when both `params` and `requireApproval` are set. **Worth a wire-level worked example in the PR.**

**(b) ETag handling absent from the snap contract.** The snap-pre-rfc §"What's NOT in the contract" deliberately omits `head()` / ETag, but LBC §3.1 builds the entire dryRun→commit→412 flow on `If-Match` ETags. Lobster's UI rounds-trips through `X-Preview-Token` plus an ETag (LBC §4.3 three-way conflict). If snap.read returns bytes only, no etag, no lastModified, **lobster's freshness model has no anchor for "is this the bytes I previewed against."** The proposal is consistent within itself but creates a downstream incompatibility with claws's existing wire shape that consumers depend on.

The fix is small: either (a) snap.read returns `{ content, etag }` (a 2-field tuple), or (b) snap exposes a separate `head(snap, path)` that returns ETag + size. Either way, **the contract chain must address it before the PolicyIR-to-snapshot path ships**, because lobster-web reads PolicyIR via `snap.read(snap, POLICY_IR_PATH)` per realigned-story §"Adoption story" — and that read needs an ETag for the cross-tab freshness invariant in LBC §4.6.

**(c) Error envelope shapes diverge.** snap-pre-rfc has no error envelope spec. PolicyIR pre-RFC has none. Guardrails-adapter has none. Upstream has its own envelope. Claws has 19+ typed codes (LBC §7.1). When `snap.read` of a missing path returns... what? An exception? `null`? An error envelope with `code: SNAPSHOT_NOT_FOUND`? Yankee's earlier Peter-lens audit included `SnapshotErrorCode` (`SNAPSHOT_MALFORMED, SNAPSHOT_ID_MISMATCH, SNAPSHOT_NOT_FOUND, POLICY_ID_MISMATCH, SNAPSHOT_PROMOTE_CONFLICT, SNAPSHOT_ROLLBACK_INVALID`) as part of the contract — the v2 snap-pre-rfc dropped this. **Without an error-envelope spec in the contract, every consumer reinvents one and they drift.** Claws-side error mapping in `ClawsHttpClient` (LBC §7) currently has bespoke handling for `INVALID_SNAPSHOT_ID, SNAPSHOT_NOT_FOUND, POLICY_INVALID, RESTORE_FAILED` — what shape the underlying `SnapshotStore` raises matters because each code maps to a specific UI surface.

Worth adding to snap-pre-rfc §"Open questions": **does `SnapshotStore` define an error envelope, or do we leave error shape to implementations and accept consumer-side fragmentation?**

### 3. **JCS / canonicalization is implicit — divergent IDs across stores**

snap-pre-rfc §"Open questions" Q3:
> "Snapshot ID format — opaque hex content-hash, time-prefixed, or fully opaque? **Recommendation: content-hash** (deduplication free; consistent across `SnapshotStore` implementations; matches the audit-anchor properties downstream consumers want)."

The "consistent across `SnapshotStore` implementations" claim **requires a canonicalization spec** to be true, and the proposal doesn't have one. The reference filesystem store will produce one ID. An S3-backed implementation that serializes object metadata differently (line endings? sort order? encoding?) produces a different ID. **The "content-hash" claim is meaningless without a canonicalization rule.**

Same problem in PolicyIR: §1 says `policyId` is "content-hash of the IR body." Hash of what byte representation? If two generators produce semantically-identical `PolicyIR` JSON with different field orderings, do they hash to the same `policyId`? Yes if canonicalized; no otherwise. **The proposal claims yes implicitly, but the claim is false without a canonicalization rule.**

The fix: either name a standard (RFC 8785 JSON Canonicalization Scheme is the Schelling point — it's what audit-chain consumers like AICert, witness, and Sigstore use) or specify the rule explicitly. Yankee's earlier audit understood this — `packages/openclaw-snap/src/canonical.ts` exists today; pundit's audit notes `claws-policy-generator` already has `compile/canonicalize.ts`. **The v2 proposals dropped canonicalization from the upstream contract surface, citing "decorator pattern" or "consumer concerns," but canonicalization isn't decorator-shaped — it's the load-bearing primitive that makes content-hash IDs meaningful.**

Recommend: snap-pre-rfc §1 names canonicalization as part of the contract, OR explicitly tells consumers "if you implement `SnapshotStore`, your IDs will not match other implementations' IDs for the same workspace; do not rely on cross-store ID equality." The latter is honest but kills the dedup story. The former is a 30-line addition (`canonicalize.ts` exists in our monorepo and is RFC 8785-shaped already).

This is also the substrate for the cross-package conformance-test concern flagged in realigned-story §"Cross-contract concerns": *"Snap's `policy-snap-policyid-conformance` integration test couples two upstream PRs."* That coupling is **caused by** the missing canonicalization spec — if both contracts named the same canonicalizer, the conformance test would be a unit test, not a cross-PR coupling.

### 4. **Audit-chain composition determinism on plugin re-registration**

Guardrails-adapter §"Composition handling" says we register **one** composed `GuardrailProvider` upstream, so on the upstream side the chain is deterministic — one policy, one decision per call.

But what about plugin re-registration on hot reload? Upstream gateways reload plugins on file change (per `gateway_start` and module-reload semantics). If we re-register `toTrustedToolPolicy(composedProvider)` mid-flight, what happens to in-flight `evaluate` calls? The proposal doesn't say. Concrete failure mode:

- T0 enters `evaluate(event, ctx)` against composedProvider v1.
- Plugin reloads. composedProvider v2 is now the registered one.
- T0 returns. Audit emits citing... v1? v2?

This is the same class of bug as the snapshot-ID race. The fix is the same: `ctx` should carry enough provenance to identify which composed-provider instance produced this decision. The PolicyIR `policyId` is one such anchor, but it requires that PolicyIR was loaded at evaluate-entry. **This loops back to concern #3 — without snapshot context in `ctx`, audit-chain provenance is recoverable only through downstream discipline, not contract guarantee.**

`generatedAt + generatedFrom: SnapshotId` in PolicyIR is supposed to be the verifiable anchor — but it's only verifiable if the audit event actually emits the PolicyIR's policyId, which requires the plugin to know which PolicyIR it evaluated against, which requires snapshot context at evaluate-time. **The audit-chain claim in policy-pre-rfc is contingent on resolving concern #3.**

### 5. **previewToken / dryRun discipline is missing from the contract chain**

LBC §3.1 builds every destructive mutation as `staging → dryRun preview → commit`, with `X-Preview-Token` as the anchor. The PolicyIR generation flow in realigned-story §"The architectural flow" goes:

> user edit → fileingest validate → gateway calls policy-generator → PolicyIR → snap.capture → snap stores → SSE notify

There is no dryRun mode in this flow. Concrete questions the proposals don't answer:

- When lobster-web does a dryRun preview on an OC file edit (LBC §3.1), does the gateway run the policy-generator in dryRun mode? Does it produce a "preview" PolicyIR that doesn't get captured into a snapshot?
- If so, where does the dryRun PolicyIR live? Plugin-private state? Snap with a "preview" status? A separate ephemeral store?
- What's the X-Preview-Token's relationship to `SnapshotId`? If dryRun produces SnapshotId-shaped previews, the preview token IS the snapshot id; if not, there are two parallel addressing systems.
- What happens when the user discards a preview? Is there a `snap.delete` or a TTL?

These aren't paperwork questions — they determine whether the policy-preview UI in lobster-web (LBC's `dryRun` flag in the schema) works at all. Today's claws-serve threads previewToken through the full mutation flow. **If the new chain doesn't support previewToken, lobster-web's commit flow has nowhere to attach to the new artifacts.**

Worth adding to PolicyIR pre-RFC §"Open questions": *"Should `PolicyIR` carry a `status: 'draft' | 'committed'` bit, or do dryRun previews live outside snap?"*

### 6. **Decision-vocabulary translation drops claws's 19-code error envelope**

The adapter's decision mapping (guardrails-adapter §"Decision mapping") collapses claws's `AuthorizationDecision` to upstream's narrower `PluginToolPolicyDecision`:

| claws | upstream |
|---|---|
| `{ kind: "deny", reason }` | `{ block: true, blockReason: reason }` |
| `{ kind: "review", handle }` | `{ requireApproval: { id: handle.id, ... } }` |

The adapter explicitly says: *"`review` drops the approval-handle's signature/sequence-number metadata at the wire — those stay claws-internal and re-bind when the approval resolves via `HostContext.approvalHandleSigner`."*

That works for the approval round-trip downstream of the adapter, but it doesn't work for the **error envelope construction at the consumer side**. Claws's LBC §7.1 has 19 codes including `R5_LOCKED, FLEET_LOCKED, GOVERNANCE_DENIED, KILL_SWITCH_ACTIVE, KILL_SWITCH_ACTIVE_MID_FLIGHT, OBO_DENIED, OBO_APPROVAL_REQUIRED`. Each maps to a specific UI surface and a specific recovery action. **When upstream's runner returns `{ block: true, blockReason: "blocked by policy X" }` to claws-serve's hook caller, can claws-serve reconstruct which of the 19 codes applies?**

Concrete: a `KILL_SWITCH_ACTIVE_MID_FLIGHT` (LBC §7.1, "Globally-blocking banner... toast confirming 'your edit was rolled back'") needs to be distinguishable from a `R5_LOCKED` (LBC §7.1, "Read-only — no retry"). Both are `kind: "deny"` claws-side. After translation to upstream's `block: true`, both come back as the same opaque envelope. Claws-serve must reconstruct the 19-code distinction **somehow** — likely via a side-channel (the GuardrailProvider stashes the original decision in the audit-sink before returning to the adapter, then claws-serve's hook caller reads from the audit-sink for the error envelope).

That's possible but it's not in the proposal. **Worth specifying explicitly in guardrails-adapter §"Decision mapping": the adapter translates the wire-level decision, but the full claws-side AuthorizationDecision is preserved via `HostContext.auditSink` for downstream error-envelope reconstruction.** Otherwise the chain ships and lobster-web's error UI silently degrades to "blocked by policy" for everything.

### 7. **SSE event ordering — no event for "PolicyIR promoted to snapshot N"**

LBC §6 lists the SSE events lobster-web depends on. Class A has `oc.file_changed, snapshot.created, snapshot.promoted, recompiled`. Class B has `audit.entry, audit.violation, governance.warning, governance.degraded, governance.kill_switch_active`. There is no `policy.promoted` or `policy.compiled` event.

In the new chain (realigned-story §"The architectural flow"), the PolicyIR generation happens between `fileingest validate` and `snap.capture`. From lobster-web's perspective, the flow is:

1. PATCH `/api/oc/files/SOUL.md` (LBC §3.2)
2. Server runs fileingest validate.
3. Server calls policy-generator → PolicyIR.
4. Server calls snap.capture(workspace + PolicyIR).
5. Server emits... `oc.file_changed`? `recompiled`? `snapshot.created`? `snapshot.promoted`?

If only `recompiled` is emitted post-PolicyIR-generation, lobster-web's policy-preview UI has no way to know whether the PolicyIR for snapshot N is loadable yet (snap might still be flushing the manifest). If `snapshot.promoted` is emitted before PolicyIR is in the snapshot, the UI tries to read PolicyIR and gets a 404.

**Cross-correlation ordering matters here too.** Lobster-web subscribes to SSE per session; events are ordered per-correlation-id but **not** across correlation IDs. If two users edit two different OC files concurrently, each generating a PolicyIR and a snapshot, the SSE consumer sees `snapshot.promoted(N)` from user A and `snapshot.promoted(M)` from user B — but the policy plugin's `onSnapshotPromoted` callback may receive them out of order. Whoever arrives last wins the plugin-private state. (This is concern #3 again, dressed in SSE clothes.)

The fix: define a `policy.compiled { snapshotId, policyId, generatedFrom }` event that lobster-web can subscribe to as the "PolicyIR is now active for snapshot N" signal, ordered after `snapshot.promoted(N)` per correlation. This is downstream wiring, not upstream contract — but the proposal should name it explicitly so claws-serve's SSE taxonomy stays coherent.

### 8. **Multi-domain split implications — cross-service HTTP latency on the hot path**

Realigned-story §"What this replaces" says snap and PolicyIR end up in `claws-snap-server/` and `claws-policy-generator/` respectively. The flow ("user edit → fileingest validate → generate PolicyIR → snap.capture") is described as in-process. But Eduardo's filing-model proposal (per realigned-story §"What's NOT in scope" and prior work) contemplates A/B/C deployment shapes where snap-server may be a separate process from claws-serve.

If snap-server is a sibling process across an HTTP boundary:
- `snap.capture` becomes an HTTP round-trip (~5-50ms depending on local-pod proximity).
- `snap.read(snap, POLICY_IR_PATH)` from the policy plugin's `evaluate` becomes another HTTP round-trip.
- Per tool call, that's potentially 5-50ms added latency to **every** governance evaluation.

That eats most of the 50ms-per-hook budget. **The proposals don't address whether snap-server is in-process or sibling-process for the hot path.** From a runtime-perf lens, the in-process assumption is hidden but load-bearing.

The fix: either (a) document explicitly that the policy plugin caches PolicyIR in plugin-private state on `onSnapshotPromoted` (avoiding per-call snap.read), or (b) require snap-server be co-deployed in-process for hot-path consumers. The proposal needs to pick one. (a) interacts with concern #3; (b) constrains Eduardo's deployment-pattern decision.

### 9. **Cutover correctness — divergent-behavior window**

Realigned-story §"Trim wave scope" says ~7,700 LoC of `claws-sdk/src/{snapshot,governance,compliance,audit}/` get deleted. The cutover assumes consumers are wired to the new chain (upstream snap contract + downstream impls), but during the trim-wave landing window:

- `claws-sdk/src/snapshot/` is still imported by N callers across the monorepo (per yankee's audit).
- The new `claws-snap-server` consuming the upstream contract is wired separately.
- Until every caller is migrated, both implementations run in parallel.
- If the two impls produce divergent IDs (because of canonicalization concern #3), the same workspace is double-snapshotted with two different IDs.

The proposal doesn't sequence the cutover. **Worth a §"Cutover plan" in realigned-story** with concrete answers:
- Is there a single cutover commit, or a deprecation window with both impls live?
- Are claws-sdk's snapshot APIs proxied to the new claws-snap-server during the deprecation window?
- What's the rollback story if the new chain has a runtime regression in production?

The 10-restarts-in-8-hours scenario is exactly when divergent behavior surfaces — a hot-reload mid-flight with one caller on the old impl and one on the new produces inconsistent state. **The cutover correctness story matters more than the steady-state contract story for runtime stability.**

---

## Verification of facts in the proposals

I confirmed:

- `PluginHookToolContext` at `C:/src/openclaw-core/src/plugins/hook-types.ts:393-401` does NOT carry snapshot ID or tenant ID. Concern #3 is structurally real, not speculative.
- `runTrustedToolPolicies` at `src/plugins/trusted-tool-policy.ts:8-54` short-circuits on first block; sequential composition is real.
- `PluginTrustedToolPolicyRegistration` at `src/plugins/host-hooks.ts:65-72` is the registration shape the adapter targets; it accepts the `evaluate(event, ctx)` signature claims correctly.
- Claws's LBC §7.1 has 19 typed error codes; the adapter's decision mapping does not preserve them; reconstruction is implicit not specified.
- LBC §6 SSE event taxonomy lacks a `policy.compiled` or `policy.promoted` event; lobster-web has no signal for PolicyIR readiness.
- Snap-pre-rfc, PolicyIR pre-RFC, and guardrails-adapter agree on the chain shape (snap carries PolicyIR; PolicyIR consumed via snap.read; decisions translated via adapter).
- Yankee's earlier `SnapshotErrorCode` envelope in the design-fit audit was dropped from the v2 snap-pre-rfc.

---

## Asks before R2

In order of urgency:

1. **Concern #3 (snapshot-ID race) — extend the PolicyIR pre-RFC §"Asks" with: "Request to widen `PluginHookToolContext` with `snapshotId?: string`."** This is the right place because it's the contract change that unlocks correct audit-chain provenance, multi-tenant correctness, and promotion-observation atomicity. Without it, the chain is incorrect under multi-tenant; with it, the rest of the chain is sound.
2. **Canonicalization spec — name RFC 8785 (or equivalent) in snap-pre-rfc §1.** ~30 LoC addition to the contract; eliminates cross-store ID drift; uncouples the snap PR from the PolicyIR PR's conformance test.
3. **ETag handling in snap.read** — either return `{content, etag}` or expose `head()`. Required for lobster-web's existing dryRun→commit flow to work against the new chain.
4. **Error envelope spec in snap-pre-rfc** — at minimum the `SnapshotErrorCode` enum from yankee's earlier audit; adapter must preserve enough info for claws-side 19-code reconstruction.
5. **previewToken/dryRun discipline** — PolicyIR pre-RFC needs a §"Preview semantics" answering whether dryRun produces a preview PolicyIR and where it lives.
6. **SSE `policy.compiled` event** — claws-serve-side wiring (not upstream contract); document in realigned-story alongside the architectural flow.
7. **Hot-path cache discipline** — document in realigned-story whether the policy plugin caches PolicyIR in plugin-private state on `onSnapshotPromoted`, plus the implications for concern #3.
8. **Cutover plan** — realigned-story §"Cutover plan" sequencing the trim-wave landing without a divergent-behavior window.

---

## Verdict

**APPROVE-WITH-WARNINGS.**

The directional shape is sound and dramatically friendlier to gateway runtime than the prior daemon-shape. The deletion target is real; the in-process composition over `runTrustedToolPolicies` matches the 50ms hook budget; the fail-open posture is preserved. From a Cluster-B runtime-performance lens, this is a clear win.

But concern #3 (snapshot-ID race) is a real correctness bug latent in the proposed chain, not a paperwork gap. It requires a contract-level fix (extending `PluginHookToolContext`) — papering over downstream produces multi-tenant policy bleed plus audit-chain fidelity loss. Concerns #2-#7 are answerable in pre-RFC iteration; #3 is not optional.

I would not block the snap PR opening; canonicalization (#3) and ETag (#2b) are answerable in the snap pre-RFC's open-questions section and can settle in #clawtributors discussion. **I would block the PolicyIR PR opening until the upstream snapshot-ID-in-ctx question is asked of Peter explicitly** — landing PolicyIR's contract before knowing whether `ctx` will carry snapshot ID locks us into the downstream-workaround design that has the multi-tenant bleed.

The realigned-story is the document that needs the most R2 work: it currently treats concern #3 as a footnote ("we'd wire downstream") when it's the load-bearing runtime correctness question for the entire chain. Promote it from §"Cross-contract concerns" to a top-level §"Open runtime-correctness questions" and the rest of the chain reads honestly.

---

## Sister-role coordination notes

- **claws:audit-eng** (if reviewing R1) — concerns #3 and #4 (audit-chain composition) overlap your lens directly. The `generatedAt + generatedFrom: SnapshotId` provenance claim in PolicyIR is contingent on resolving the ctx-snapshot-id question. Worth a joint position in R2.
- **claws:platform-eng** — concern #8 (cross-service HTTP on hot path) is your turf for the deployment-pattern decision. The proposals assume in-process; please confirm or call it out.
- **lobster:api-integrator** — concerns #2b (ETag), #5 (previewToken), #6 (error envelope), #7 (SSE event) all touch the LBC contract; please verify the proposed chain doesn't break the existing wire shape.
- **claws:release-eng** — concern #9 (cutover) needs your sequencing lens; the trim-wave landing without a divergent-behavior window is more a release-eng problem than a contract problem.

---

**Footer**: Reviewed 2026-04-28 by claws:gateway-eng. Lens: runtime performance > governance completeness; 50ms-per-hook budget; fail-open R1-R2; no daemon crash on governance failure. Subject documents accessed at `C:/src/claws/.craft/out/proposals/{snap-pre-rfc,policy-pre-rfc,guardrails-adapter,realigned-story}.md`. Audits cross-referenced: `.craft/out/audits/{snap,policy,guardrails}-openclaw-design-fit.md`. Upstream verification: `C:/src/openclaw-core/src/plugins/{hook-types,host-hooks,trusted-tool-policy}.ts`.
