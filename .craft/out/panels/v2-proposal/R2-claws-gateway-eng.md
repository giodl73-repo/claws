# R2 review — v2 OpenClaw contribution proposal — claws:gateway-eng

**Date**: 2026-04-29
**Reviewer**: claws:gateway-eng (runtime guardian; tension cluster B — runtime performance > governance completeness)
**Subject**: snap-pre-rfc.md, policy-pre-rfc.md, guardrails-adapter.md, realigned-story.md (post-R1 amendment + R1-follow-on)
**Round**: 2
**Verdict**: **APPROVE-WITH-WARNINGS** — all four runtime-correctness Majors from R1 are RESOLVED at the contract level; two new runtime hazards surface from the gateway-as-signer / gateway-emitted-audit threading; one carry-over concern (cutover) remains unaddressed but is out-of-scope per user direction.

---

## TL;DR

The amendments hit my four load-bearing R1 concerns directly:

- **Concern #1 (snapshot-ID race) → RESOLVED at contract level.** `ctx.snapshotId` is now Ask §4 in the PolicyIR pre-RFC and threaded through the realigned-story flow diagram. Hot-path cache discipline (`(sessionKey, snapshotId)` keyed cache) is documented. Multi-tenant policy bleed and TOCTOU race are eliminated assuming Peter accepts the extension; if he rejects it, we have a documented fallback (cache + fail-closed on missing).
- **Concern #2 (canonicalization implicit) → RESOLVED.** RFC 8785 JCS named in both contracts; manifest shape pinned with sorted-by-path requirement; conformance test specified.
- **Concern #2/error-envelope → RESOLVED.** `SnapshotErrorCode` enum spec'd with 9 codes; HTTP status mapping table included; conformance test extended to error equivalence classes.
- **Concern #3 (canonicalization → cross-PR coupling) → RESOLVED.** The realigned-story explicitly notes the conformance test is now a unit test against RFC 8785, not a cross-PR negotiation; expected iteration count down from 2–3 to 1–2 rounds.
- **Concern #6 (decision-vocab drops 19-code envelope) → PARTIALLY-RESOLVED.** The `SnapshotErrorCode` enum addresses snap-side errors; the LBC §7.1 19-code envelope reconstruction at the GuardrailProvider boundary is still implicit but no longer load-bearing because audit emission is gateway-side and decision metadata threads via `HostContext`. Audit-eng will want a closer look here.

But the new contract shape (gateway-as-signer + gateway-emitted-audit + composedProvider single-registration) introduces two runtime concerns I did not surface in R1:

1. **G-N1 (NEW) — Gateway is now a signing-key bearer on the hot path.** The "gateway signs every capture" obligation puts a KeyVault round-trip (or in-process key handle) on every snapshot capture. If the gateway-as-signer model evolves to "every read at trust boundary calls verify()", the verify path lands on the hot tool-call path and starts eating the 50ms budget. Worth pinning.
2. **G-N2 (NEW) — Gateway-emitted audit on every Store op + every decision is a write-amplification concern.** The amended snap-pre-rfc and realigned-story specify gateway emits audit on `capture`, `read(POLICY_IR_PATH)`, signing, verification, AND every `evaluate(event, ctx)`. Under sustained tool-call load, that's ≥2 audit writes per call (one for the snap.read, one for the decision) plus the periodic capture-side writes. Audit-chain emission must be off the synchronous hot path or it eats latency.

Carry-over concerns from R1 still flagged but de-prioritized:

- **R1#5 (previewToken/dryRun) — UNRESOLVED**, deliberately deferred to a future plan.
- **R1#9 (cutover correctness) — UNRESOLVED**, also deferred (release-eng owned; per realigned-story §"What's NOT in scope of this story").

The proposal is approvable. The two new concerns (G-N1, G-N2) are pre-RFC-iteration-resolvable, not blocking.

---

## R1 Major findings — disposition

### R1 #1 — `evaluate(event, ctx)` snapshot-ID race (CRITICAL) — **RESOLVED**

**Where the fix landed:**
- `policy-pre-rfc.md` §"Asks" §4 (lines 198): explicit ask to extend `PluginHookToolContext` with `snapshotId?: SnapshotId`, citing R1 reviewer findings (gateway-eng §1, ciso §7, platform-eng M2).
- `policy-pre-rfc.md` §"Sequencing" table (line 168): `ctx.snapshotId` extension listed as ~5 LoC contract change with no contract-cycle dependency.
- `realigned-story.md` §"The four contracts (plus one small extension)" §4 (lines 155–157): contract change explicitly framed as part of the policy contribution wave.
- `realigned-story.md` §"The architectural flow" diagram (lines 113–115): "gateway resolves 'current snapshot for this session' and threads it through ctx.snapshotId" is now an explicit node in the spine.
- `realigned-story.md` §"Cross-contract concerns" 4th bullet (line 323): hot-path cache discipline keyed on `(sessionKey, snapshotId)` documented; sub-millisecond bounded if snap is in-process; fail-closed if `ctx.snapshotId` is missing or cache+read both fail.
- `guardrails-adapter.md` §"Connection to PolicyIR + snap" (lines 102–110): adapter flow shows `ctx.snapshotId` as input, with explicit fail-closed fallback if missing (line 119).

**Verdict**: contract-level fix. The TOCTOU race, multi-tenant policy bleed, and promotion-observation skew are eliminated **assuming Peter accepts the extension**. The sequencing in `realigned-story.md` "Calendar honesty" treats the extension as gating, which is correct. The transitional state (extension proposed, not yet merged) is also handled — `guardrails-adapter.md` line 119 says the adapter MUST treat missing `ctx.snapshotId` as deny, which is the correct fail-closed posture during the gap.

**Residual concern (minor)**: the cache discipline at `realigned-story.md` line 323 says "keyed on `(sessionKey, snapshotId)`" — `sessionKey` is per-tenant in upstream's model, so this is correct for multi-tenant. Good. But the cache eviction policy is unspecified. Under sustained load with N tenants × M snapshots, cache size could grow without bound. Worth a one-line note: "bounded LRU; evict on `onSnapshotPromoted` for the supplanted snapshot." Not blocking; can resolve in pre-RFC iteration.

---

### R1 #2(a) — Decision discriminated-union shape mismatch — **PARTIALLY-RESOLVED**

**Where the fix landed:**
- `guardrails-adapter.md` §"Decision mapping" table (lines 69–75) is unchanged from R1; still translates one provider's decision at a time.
- `guardrails-adapter.md` §"Composition handling" (lines 78–80) re-affirms claws-side composition produces a single composed `GuardrailProvider`, then adapter wraps that one. So the multi-provider composition concern from R1 is moot — upstream sees ONE registration, composition is claws-internal.

**Verdict**: the wire-level worked-example I asked for in R1 is not added, but it's not needed because the architecture eliminates the composition concern. We register one composed provider; upstream's runner sees one decision per call. The discriminated-union mismatch is a translation-of-one issue, which the existing `mapDecision` table covers.

**Residual concern (minor)**: when `composeDecisions` produces a result like `{ kind: 'params', mutate: {...} }` AND the priority chain ALSO returned a `requireApproval` decision earlier, the composed claws-side result is a single tagged variant — there's no "params + requireApproval together" composed claws-side. So upstream sees only one optional-field at a time. Confirmed safe.

---

### R1 #2(b) — ETag handling absent from snap contract — **PARTIALLY-RESOLVED**

**Where the fix landed:**
- `snap-pre-rfc.md` §"Open questions" §1 (line 228): "Read shape — `read()` returns `Uint8Array`? `string`? `{content, etag, lastModified}`? **Recommendation: `Uint8Array`** (most general; text decoders trivial on top; ETag/metadata can ride on a separate `head()` if demand emerges)."

**Verdict**: the contract still returns `Uint8Array` (no ETag); the head() escape hatch is mentioned in passing but not committed to. From a snapshot-immutability lens this is actually fine — a snapshot is content-addressed, the `SnapshotId` IS the ETag. Lobster-web's existing dryRun/preview anchor uses `X-Preview-Token`, which can map to a draft `SnapshotId` without needing a separate ETag header.

**Residual concern (minor)**: the proposal does not explicitly say "the SnapshotId IS the ETag for snapshot-internal reads." Worth adding to the open-questions resolution. But since immutable content-addressed snapshots make this provable, the LBC §4.6 cross-tab freshness invariant is still satisfiable. Not blocking.

---

### R1 #2(c) — Error envelope shapes diverge — **RESOLVED**

**Where the fix landed:**
- `snap-pre-rfc.md` §"Error envelope (R1-follow-on amendment 2026-04-29)" lines 173–214. Specifies `SnapshotErrorCode` enum with 9 codes (`SNAP_NOT_FOUND, SNAP_INVALID_PATH, SNAP_STORE_UNAVAILABLE, SNAP_AUTH_DENIED, SNAP_CAPTURE_FAILED, SNAP_LIMIT_EXCEEDED, SNAP_CHECKSUM_MISMATCH, SNAP_CONTRACT_VIOLATION, SNAP_INTERNAL`). HTTP status mapping table included. Conformance test extends to verify `code` parity across `extensions/snapshot/` and `openclaw snap serve`.
- `snap-pre-rfc.md` §"Conformance" (lines 158–171): conformance test explicitly verifies error envelope parity for `not-found`, `bad-request`, `auth-failure`, `internal-error` equivalence classes.

**Verdict**: this is a clean fix. The 9-code enum is the right granularity — coarser than claws's 19-code LBC envelope (which is fine because some claws codes are claws-specific business semantics like `R5_LOCKED, FLEET_LOCKED`), but covers the snap-contract surface comprehensively. Wire parity for dev (`snap serve`) vs prod (gateway-mounted plugin) is verified via conformance test.

**Residual concern (minor)**: the LBC §7.1 19-code reconstruction at the claws-serve consumer boundary is still implicit. claws-serve receives `SnapshotErrorCode` from snap; how does it map `SNAP_AUTH_DENIED` to `OBO_DENIED` vs `R5_LOCKED` vs `KILL_SWITCH_ACTIVE`? Likely: claws-serve has additional context (the request's policy state, kill-switch state, R5 state) and uses that plus `SnapshotErrorCode` to construct the LBC code. That's a downstream wiring concern; not in the contract. But document the expected mapping in claws docs so the 19-code consumers don't drift. (Not a v2-proposal-fix; flag for trim wave.)

---

### R1 #3 — JCS / canonicalization implicit — **RESOLVED**

**Where the fix landed:**
- `snap-pre-rfc.md` §"Snapshot ID generation (R1 amendment)" lines 81–114. Names RFC 8785 JCS explicitly. Manifest shape pinned (workspace, capturedAt, files: sorted by path). Conformance test: "given a fixed input workspace, two independent `SnapshotStore` impls MUST produce identical `SnapshotId` values."
- `policy-pre-rfc.md` §"Canonicalization (R1 amendment)" lines 87–101. Names RFC 8785 JCS for `policyId`. Cross-references snap. Notes "`policy-snap-policyid-conformance` test in `snap-pre-rfc.md` is the cross-contract evidence that the canonicalization rule is the same on both sides."
- `realigned-story.md` §"Cross-contract concerns" 3rd bullet (line 322): "naming RFC 8785 JCS in **both** contracts ... **uncouples** the conformance test from the cross-PR handshake — both sides reference the same standard, so the test becomes a unit test against the standard, not a moving-target cross-PR negotiation. Expect 1–2 iteration rounds rather than the earlier 2–3."

**Verdict**: clean fix. The cross-PR coupling that R1 §3 worried about is now actively dissolved — both contracts reference the same external standard, so neither needs to wait on the other's canonicalizer impl. This was the right move.

---

### R1 #4 — Audit-chain composition determinism on plugin re-registration — **RESOLVED via gateway-as-signer + gateway-emitted-audit**

**Where the fix landed:**
- `realigned-story.md` §"Gateway-as-signer model" (lines 29–49): single signer at snapshot capture time. Gateway signs `(SnapshotId, capturedAt, gatewayKeyId)` with production key.
- `realigned-story.md` §"Gateway-emitted audit model" (lines 51–62): hash-chained audit on every `Store.capture`, `Store.read(POLICY_IR_PATH)`, signing op, verification op, and `evaluate(event, ctx)` decision.
- `snap-pre-rfc.md` §"Audit emission" (lines 143–156): contract-level audit-sink obligation lives at the gateway, not as a Store decorator.
- `policy-pre-rfc.md` §"What's NOT in the contract" line 139: "Audit-chain emission. Gateway-emitted (see `snap-pre-rfc.md` and `realigned-story.md`); consumer-private state has no audit obligation."

**Verdict**: the original R1 concern — that hot-reloading a plugin mid-evaluate could orphan in-flight audit emissions — is RESOLVED because:
1. Audit is emitted by the gateway, not the plugin. Plugin reload doesn't drop audit.
2. The audit entry includes `policyId` (from the cached PolicyIR at evaluate-entry, anchored to `ctx.snapshotId`) and the gateway's `keyId` for signing.
3. Plugin re-registration affects `evaluate` lookup, not audit chain — the chain is gateway-owned and continuous across plugin lifecycle events.

Better than I asked for in R1.

---

### R1 #5 — previewToken / dryRun discipline — **UNRESOLVED**

**Where the fix landed:** nowhere. No section addresses this.

**Verdict**: this is acknowledged in `realigned-story.md` §"What's NOT in scope of this story" (line 314): "Trim wave plan drafting — separate doc; this story sketches the scope but the rollback gates, test-migration manifest, downstream-consumer impact analysis, commit topology, and coverage recomputation gate live in the trim plan." But previewToken/dryRun isn't a trim concern — it's a wire-shape concern for the policy contract itself.

The PolicyIR pre-RFC `What's NOT in the contract` section does not mention dryRun. So either (a) PolicyIR has no draft state and previews live entirely in claws-serve outside of snap, or (b) previews are SnapshotIds with a `status: draft` bit not present in the contract. The proposals don't pick.

**Residual concern (Warning, not blocking)**: lobster-web's policy-preview UI (LBC §3.1 dryRun→commit flow) needs to render PolicyIR for an uncommitted edit. If snap captures only on commit, lobster-web has no anchor to read against during preview. The likely answer is: preview PolicyIR lives in claws-serve's in-memory state (keyed on `X-Preview-Token`), gets persisted to a snapshot only on commit. That's a downstream concern, but the realigned-story flow diagram should call it out: dryRun edits do NOT trigger `snap.capture`; they trigger an in-memory PolicyIR generation that lobster-web reads via a separate claws-serve route, not via `snap.read`.

Not blocking; flag for the trim wave or a follow-on doc.

---

### R1 #6 — Decision-vocabulary translation drops claws's 19-code error envelope — **PARTIALLY-RESOLVED**

**Where the fix landed:**
- `snap-pre-rfc.md` `SnapshotErrorCode` enum (snap-side) — addresses snap errors, not LBC consumer-side error reconstruction.
- `guardrails-adapter.md` §"Audit emission" (lines 122–124): "Audit emission for policy decisions is **gateway-emitted**, not adapter-decorated. The gateway emits a hash-chained audit entry on every `evaluate(event, ctx)` invocation: block, allow, params, requires-approval. The adapter's job is only the decision-vocabulary translation; it does not own audit."

**Verdict**: the R1 concern was that a `KILL_SWITCH_ACTIVE_MID_FLIGHT` decision vs an `R5_LOCKED` decision both flatten to `block: true` after adapter translation, so claws-serve's hook caller can't reconstruct the 19-code distinction. The amended posture says the gateway emits audit on every decision, which means **the audit log carries the original `Decision` object** (not just the translated `PluginToolPolicyDecision`). claws-serve can read the audit-of-record to reconstruct LBC error codes for UI rendering.

But the proposal doesn't explicitly say "the audit entry carries the pre-translation `Decision`." It says "block, allow, params, requires-approval" which is the post-translation vocabulary. If the audit entry only carries post-translation data, the 19-code reconstruction problem persists.

**Residual concern (minor)**: the gateway-emitted audit shape needs to carry both the claws-side `Decision` (with kind, reason, rule-id, etc.) AND the upstream `PluginToolPolicyDecision`. Otherwise lobster-web's error UI silently degrades. Worth a one-line addition to `guardrails-adapter.md` §"Audit emission": "audit entries carry both the pre-translation `AuthorizationDecision` (with full claws-side metadata) and the post-translation `PluginToolPolicyDecision`."

Not blocking; pre-RFC-iteration-resolvable.

---

### R1 #7 — SSE event ordering — no `policy.compiled` event — **UNRESOLVED**, deliberately

**Where the fix landed:** `realigned-story.md` §"The architectural flow" (line 110): "push / SSE notify consumers" remains generic; no specific event taxonomy named.

**Verdict**: this was always a downstream wiring concern (claws-serve's SSE taxonomy), not an upstream contract concern. The proposal correctly leaves it out of pre-RFC scope. R1 noted this and the v2 proposal is consistent.

**Residual concern (Warning)**: lobster-web's policy-preview UI still needs a "PolicyIR is now active for snapshot N" signal. The realigned-story should add a one-line to-do: "claws-serve will emit `policy.compiled { snapshotId, policyId, generatedFrom }` on SSE post-snapshot-promotion; this is downstream wiring, not upstream contract." Same disposition as R1: not blocking, but worth a forward note so it doesn't get forgotten when the trim wave drafts.

---

### R1 #8 — Multi-domain split implications — cross-service HTTP latency on the hot path — **PARTIALLY-RESOLVED**

**Where the fix landed:**
- `snap-pre-rfc.md` §"Failure semantics" (line 141): "Production deployments are expected to colocate a `SnapshotStore` impl in-process with the gateway for hot-path reads, with PolicyIR cached in plugin-private state at `onSnapshotPromoted` to bound the read latency."
- `realigned-story.md` §"Cross-contract concerns" 4th bullet (line 323): "sub-millisecond if snap is in-process, otherwise bounded by the Eduardo-deployment HTTP latency. Fail-closed if `ctx.snapshotId` is missing or cache-miss + snap-read both fail."
- `policy-pre-rfc.md` §"Failure semantics" (line 116): "Production deployments are expected to colocate snap with the gateway in-process, with PolicyIR cached at `onSnapshotPromoted`, so the read-path latency is sub-millisecond and the fail-closed default does not become a chronic outage source."

**Verdict**: the in-process expectation is now explicitly documented. Eduardo's cross-service deployment is acknowledged as a possibility, with the understanding that it has higher latency. Cache-on-promote discipline preserves the 50ms hook budget under in-process deployment.

**Residual concern (minor)**: the proposal still doesn't name a hard latency budget for the snap.read fallback. If snap is cross-service AND the cache misses (rare but possible — e.g., first call after promote, or after a plugin reload), the snap.read HTTP round-trip eats budget. A 5-50ms upper bound is implicit; a "MUST be <20ms p99 or fail-closed and surface to operator" guarantee is not specified. Not blocking; raise in pre-RFC iteration if Eduardo's deployment-pattern audit lands cross-service as a real shape.

---

### R1 #9 — Cutover correctness — divergent-behavior window — **UNRESOLVED**, out of scope per user direction

**Where the fix landed:** `realigned-story.md` §"What's NOT in scope of this story" (line 314): trim wave plan drafting deferred to a separate doc.

**Verdict**: deferred per user direction. release-eng owns this.

---

## NEW concerns (R2)

New numbering continues from R1's last (R1 had concerns 1–9 in the gateway-eng review).

### G-N1 — Gateway becomes a signing-key bearer on the hot capture path — **WARNING**

**Issue**: `realigned-story.md` §"Gateway-as-signer model" (lines 29–49) puts signing on every `Store.capture(...)` invocation. Concretely:

1. `Store.capture` returns `SnapshotId`.
2. Gateway signs `(SnapshotId, capturedAt, gatewayKeyId)` with production key.
3. Signature persisted to gateway-controlled location.

If the production signing key is KeyVault-backed (per "KeyVault-backed in Eduardo's filing model"), step 2 is a network round-trip to KeyVault. KeyVault sign latency is typically 30-150ms p99. Snapshot capture is not on the per-tool-call hot path, so 50ms-per-hook budget is not directly impacted. **But** if capture happens during an interactive edit flow (lobster-web PATCH `/api/oc/files/SOUL.md` → fileingest validate → policy-generator → snap.capture → sign), the user-perceived edit latency includes the signing round-trip.

Verification path is also worth pinning: line 38 says "in-process reads (within the same gateway) trust the gateway's prior verification; trust-boundary-crossing reads call a gateway `verify(snapshotId)` API." If `verify(snapshotId)` involves a KeyVault verify operation, **that goes on the hot path** for any cross-process read. Eduardo's split-by-domain deployment makes this real.

**Concrete failure mode**: tool call hits a snap.read across the trust boundary. Gateway calls `verify(snapshotId)`. KeyVault is degraded (200ms p99). Tool call evaluate now eats 200ms before policy decision. Budget blown.

**Mitigation options** (pre-RFC iteration):
- Cache verification results (signature is immutable for an immutable snapshot; verify-once-per-snapshot in process memory is safe).
- Use HSM-cached key handle with in-process Ed25519 verify (no network call) — KeyVault-backed sign, in-process verify.
- Specify "trust-boundary verification MUST be O(1) in-process with cached signing-key public-half; cold-start may round-trip but warm path MUST not."

**Severity**: Warning (not blocking). The contracts don't preclude any of these mitigations; they need to be specified in claws docs and conformance-tested. Worth one paragraph in `realigned-story.md` §"Gateway-as-signer model" specifying that verification is amortized.

---

### G-N2 — Gateway-emitted audit on every decision is a write-amplification concern — **WARNING**

**Issue**: `realigned-story.md` §"Gateway-emitted audit model" (lines 53–60) specifies the gateway emits a hash-chained audit entry on:
- every `Store.capture(...)`
- every `Store.read(POLICY_IR_PATH)`
- every signing op
- every verification op
- every `evaluate(event, ctx)` decision

For a tool-call-heavy session, the per-call cost is: 1 snap.read of PolicyIR (cache hit usually, but still emits audit per line 57?) + 1 evaluate decision = 2 audit writes per tool call. Plus capture-side writes amortized across the session.

Hash-chained audit means each entry depends on the previous — which means the audit emission is **serial**, not parallelizable. Two concurrent tool calls cannot emit audit in parallel without serializing through the chain head. Under N-concurrent load, the audit chain becomes a serialization bottleneck.

**Concrete failure mode**: 100 concurrent agents on one gateway. Each agent issues 10 tool calls/sec. That's 1000 tool calls/sec. If hash-chain emission is 1ms per entry (which is optimistic for HMAC + WAL flush), 2000 audit writes/sec means 2 seconds of audit work per second of clock — which is impossible. Gateway throughput is bounded by audit-chain serial bandwidth.

**Mitigation options** (pre-RFC iteration):
- Per-session audit chains (parallel chains, joined at the session-key boundary). Each session is its own serial chain; parallel sessions emit in parallel. This is what claws's existing audit model does (per `claws-guardrails/src/audit/`).
- Async audit emission: decision returns to the caller, audit is enqueued, hash chain is computed off the hot path. Risk: audit emission can fail after decision returned (committing inconsistency). Acceptable iff audit is best-effort; not acceptable for SOC2-grade audit.
- Batch entries: gateway emits a single aggregate entry per N decisions or per T seconds. Reduces chain pressure but loses per-decision granularity.

**Concrete asks in proposals (currently silent)**:
- Is audit chain per-session or process-global? `realigned-story.md` line 59 says "canonicalized (RFC 8785 JCS, same as `SnapshotId`) and signed by the gateway's signing key" — that suggests one chain per gateway, not per session. That's the wrong shape for throughput.
- Is audit emission synchronous or async w.r.t. the decision return path? Not specified.
- Does `Store.read(POLICY_IR_PATH)` cache hit emit an audit entry, or only cache miss? If every read emits, the cache benefit evaporates because the audit cost is paid regardless.

**Severity**: Warning (not blocking). Architecturally, this is fixable downstream — claws's existing audit model is per-session and async-able. But the proposal as written suggests "every Store op + every decision = one chain entry" which is the wrong throughput shape for production gateways.

Worth one paragraph in `realigned-story.md` §"Gateway-emitted audit model": "Audit chain is per-session, not per-gateway, to preserve throughput. Read emissions are emitted only on cache miss + actual store-read, not on cache hit. Decision emissions are async w.r.t. the return path, with a bounded queue and fail-closed-on-overflow posture."

---

### G-N3 — Adapter `auth: 'gateway'` is correct but not yet specified for multi-tenant — **OBSERVATION**

**Issue**: `snap-pre-rfc.md` §"Reference plugin" (line 71) says "Auth is `auth: 'gateway'` — uses the gateway's existing auth chain, no new model."

This is the right answer for single-tenant. For multi-tenant (where multiple workspaces share one gateway process), `auth: 'gateway'` needs to verify:
- the requesting principal has access to the targeted `WorkspaceId`
- the requesting principal has the appropriate verb permission (`capture`, `read`, `list`)
- per-tenant rate limits / quotas are enforced

Upstream's `auth: 'gateway'` model doesn't specify per-tenant scoping today (unverified, but consistent with `PluginHookToolContext` not carrying tenant ID per R1 finding).

**Severity**: Observation, not Warning. ciso's R1 review §"Auth wiring `auth: 'gateway'` insufficient" already flagged this. Cross-reference to ciso's findings; gateway-eng's lens just confirms it's a real concern at the gateway-routing layer, not just security policy.

This is downstream of `ctx.snapshotId` resolution — if `PluginHookToolContext` gets `snapshotId`, it should also get `tenantId` (or `workspaceId`) for auth scoping. Worth pairing the asks: extend `PluginHookToolContext` with both `snapshotId?: SnapshotId` AND `workspaceId?: WorkspaceId`. The latter is the auth anchor; the former is the policy anchor. Both are needed for correct multi-tenant gateway behavior.

---

### G-N4 — `snap.list` is unbounded; absent quota / pagination contract — **OBSERVATION**

**Issue**: `snap-pre-rfc.md` line 63: `list(workspace: WorkspaceId, opts?: { limit?: number }): Promise<readonly Snapshot[]>;`.

`limit` is optional. Default is unspecified. A consumer calling `list(workspace)` against a workspace with 10,000 snapshots receives all 10,000 in one response. Snap-server has to materialize all of them. Memory pressure on the snap-server process; latency on the client.

**Severity**: Observation. Easy fix in pre-RFC iteration — set a default limit (e.g., 100) and add `opts.cursor?: string` for pagination. Conformance test verifies cursor stability.

Not blocking; flag for the open-questions section.

---

### G-N5 — Single composedProvider registration loses upstream short-circuit benefits — **OBSERVATION**

**Issue**: `guardrails-adapter.md` §"Composition handling" (lines 78–80) says we register ONE composed `GuardrailProvider` upstream, with claws-side priority composition. Upstream's `runTrustedToolPolicies` short-circuits on first `block` — but with one registration, there's no chain to short-circuit through. All composition happens claws-side.

**Implication**: if a future consumer (lobster, hapi, third-party) wants to register their own `TrustedToolPolicy` alongside our composedProvider, upstream's runner will iterate them. But our composedProvider is opaque — other policies can't see what's inside. They might re-evaluate the same condition, leading to duplicate cost.

**Severity**: Observation. This is the right trade-off (claws controls its own composition; loses cross-consumer composition benefits). Worth noting in `realigned-story.md` so future consumers understand the layering: "claws's policies compose claws-side into one upstream registration; other consumers' policies compose alongside as additional upstream registrations; the upstream runner short-circuits across all of them."

Not blocking.

---

## Lens.verify checklist

Walking the role's `lens.verify` checklist against the amended proposals:

### "Does this governance hook add more than 50ms to a tool call?"

**Hot path**:
1. Gateway resolves `ctx.snapshotId` (in-process; <1ms).
2. `runTrustedToolPolicies` invokes our composedProvider's `evaluate(event, ctx)` (cached PolicyIR lookup; <1ms).
3. claws-side `composeDecisions` priority-merges (<1ms for typical N=3-5 providers).
4. Adapter translates to `PluginToolPolicyDecision` (<1ms).
5. Gateway emits audit entry (concern G-N2 — could be 1-10ms depending on chain shape).

**Total per-call hot-path**: ~5-15ms in-process, well under 50ms budget. Cross-service deployment (Eduardo's split) adds 5-50ms HTTP for snap.read fallback (cache miss only), still bounded.

**Verdict**: budget compliant assuming G-N2 is resolved (per-session audit chain, async emission). At risk if audit chain is process-global synchronous.

### "What happens when this hook throws? Does the Gateway crash or degrade gracefully?"

**Per the amendments**:
- `policy-pre-rfc.md` §"Failure semantics" line 114: `evaluate` exception → upstream runner SHOULD treat as block (fail-closed); Ask §5 confirms with Peter.
- `guardrails-adapter.md` line 117: adapter wraps `provider.preAuthorize` exceptions and returns `{ block: true, blockReason: 'evaluator-error' }` — **defensive, doesn't depend on upstream behavior**.
- `snap-pre-rfc.md` §"Failure semantics" line 132: Store throws → consumer treats as missing-content; deny dependent action.

**Verdict**: graceful degradation is the documented posture at every boundary. Adapter's defensive wrap means even if upstream's runner doesn't fail-closed, claws's adapter does. Gateway crash from a guardrail exception is not a documented failure mode. Good.

### "Does this modify openclaw.json in a way that could break existing configurations?"

The proposal does not modify `openclaw.json`. It adds:
- `src/plugin-sdk/snapshot.ts` (new types)
- `src/plugin-sdk/policy-ir.ts` (new types)
- `extensions/snapshot/` (new plugin)
- `bin/openclaw snap` (new CLI verb)
- `src/plugins/hook-types.ts:393-401` extension (one optional field)

None of these touch `openclaw.json` schema or default config. The optional `snapshotId?` field is backward-compatible.

**Verdict**: no `openclaw.json` regression risk. Good.

### "Is the generated TypeScript skill well-behaved? No memory leaks, no blocking I/O, no global state?"

The amended proposals don't generate TypeScript skills directly — that's claws-side, downstream. But the cache-on-promote discipline at `realigned-story.md` line 323 is the relevant generated-plugin pattern:

- **Memory leaks**: cache keyed on `(sessionKey, snapshotId)` will grow unbounded without eviction policy. **Concern**: pre-RFC iteration must specify bounded LRU + evict on `onSnapshotPromoted`. Currently unspecified.
- **Blocking I/O**: snap.read is async; cache-miss path returns Promise. Good.
- **Global state**: PolicyIR cache is plugin-private state per upstream's plugin model. Per-instance, not global. Good.

**Verdict**: cache-eviction policy is the only loose end. Pre-RFC iteration should pin it.

### "Can the user disable this specific enforcement layer without disabling all governance?"

The chain shape is: `before_tool_call → runTrustedToolPolicies → composedProvider.evaluate`. The user can:
- Unregister our composedProvider via plugin disable (loses all governance).
- Disable individual claws-side `GuardrailProvider`s in `ProviderRegistryImpl` (granular per-provider disable).
- Disable specific deny-rules in PolicyIR (granular per-rule disable, but requires regenerating the snapshot).

**Verdict**: granular per-provider disable works claws-side. Per-rule disable works via PolicyIR generation. Per-snapshot disable doesn't exist (snapshot is content-addressed; can't selectively disable parts of it). The granularity story is "disable the provider, not the rule, at runtime; rule changes require re-generation." Acceptable.

---

## Final assessment

**Verdict: APPROVE-WITH-WARNINGS.**

R1's four runtime-correctness concerns (snapshot-ID race, canonicalization, ETag/error envelope, audit-chain composition) are RESOLVED at the contract level. The amendments pass my role's lens checklist. The architecture is now coherent: gateway threads `ctx.snapshotId`, gateway signs at capture, gateway emits audit on every Store op + decision, snap stays simple, PolicyIR rides inside snap, adapter translates one composed claws-side `GuardrailProvider` to one upstream `TrustedToolPolicy`.

Two new concerns (G-N1, G-N2) surface from the gateway-as-signer / gateway-emitted-audit threading. Both are pre-RFC-iteration-resolvable, not blocking. They're real concerns — KeyVault sign latency on capture, hash-chain serialization on decision emit — but they're answerable in one paragraph each in `realigned-story.md` (cache verify, per-session chain, async emission with bounded queue).

Three observations (G-N3, G-N4, G-N5) are not blocking; they're forward-notes for pre-RFC iteration or downstream wiring docs.

R1 #5 (previewToken/dryRun) and R1 #9 (cutover) remain unresolved but are deliberately out of scope per user direction.

I would not block any pre-RFC opening on this. The proposals are channel-shareable. The G-N1 and G-N2 paragraphs are the cheapest improvements to land before #clawtributors share — they preempt obvious questions Peter or the bot reviewers will ask. Worth doing before share.

---

## Sister-role coordination notes

- **claws:audit-eng** — G-N2 (write-amplification) is your turf primarily. The "every decision emits an audit entry" + "hash-chained" combination is the load-bearing throughput question. Verify the per-session chain shape and async emission posture is consistent with claws's existing audit model.
- **claws:platform-eng** — G-N1 (KeyVault sign on capture) intersects your deployment-pattern audit. Eduardo's split-by-domain deployment makes the cross-process verify path real; please confirm the in-process verify cache discipline.
- **claws:ciso** — G-N3 (multi-tenant `auth: 'gateway'`) is the gateway-routing version of your R1 §"Auth wiring `auth: 'gateway'` insufficient." Worth a joint position recommending `tenantId` extension alongside `snapshotId`.
- **claws:claws-repo-steward** — G-N5 (single composedProvider registration) is a forward-note for the `claws-guardrails` rename — the package's external behavior at the upstream registration boundary is "we register one policy, not N." Worth documenting in the package README post-rename.

---

**Footer**: Reviewed 2026-04-29 by claws:gateway-eng, R2. Lens: runtime performance > governance completeness; 50ms-per-hook budget; fail-open R1-R2; no daemon crash on governance failure. Subject documents accessed at `C:/src/claws/.craft/out/proposals/{snap-pre-rfc,policy-pre-rfc,guardrails-adapter,realigned-story}.md` (post-R1-amendment + R1-follow-on revision). R1 review at `C:/src/claws/.craft/out/panels/v2-proposal/R1-claws-gateway-eng.md`. R1 consolidated at `C:/src/claws/.craft/out/panels/v2-proposal/R1-consolidated.md`. New finding IDs: G-N1 (gateway-as-signer hot-path latency), G-N2 (gateway-emitted-audit write amplification), G-N3 (multi-tenant auth scoping), G-N4 (snap.list unbounded), G-N5 (single-registration loses cross-consumer composition).
