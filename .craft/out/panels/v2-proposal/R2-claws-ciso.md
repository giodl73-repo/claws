# R2 panel review — claws:ciso — v2 OpenClaw contribution proposal

**Reviewer**: claws:ciso (Guardian; Cluster A; "Security assurance > Agent capability")
**Round**: 2
**Subject**: snap-pre-rfc.md, policy-pre-rfc.md, guardrails-adapter.md, realigned-story.md (R1-amended + R1-follow-on revisions, all dated 2026-04-29)
**Date**: 2026-04-29
**Lens**: OWASP Agentic Top 10, fail-closed at every layer, audit-survives-discovery, R5 non-overridable, chain of custody, no key leak in tracing, supply-chain hygiene, threat-modeling.
**Prior round**: R1 REVISE — 10 findings; signing fictional, fail-closed unspecified, audit bypassable.

---

## TL;DR — the verdict up top

**APPROVE-WITH-WARNINGS** (was REVISE in R1). The four R1-blocking concerns I anchored on — signing fiction, fail-closed silence, audit bypass via decorator, TOCTOU window — are now resolved at the proposal layer. The single-gateway-signer model is a clean, defensible design with one consolidated trust anchor. The fail-closed semantics tables are explicit, comprehensive, and call out the correct failure cases. The gateway-emitted audit posture eliminates the bypass surface that decorators created. `ctx.snapshotId` closes the policy-transition race. The `SnapshotErrorCode` enum + HTTP mapping is consistent and does not leak tenant- or principal-bearing info in the codes themselves.

What blocks **APPROVE** (without warnings) is the residual set of operational obligations that the proposals correctly **defer to implementation** but that the CISO must surface to the user **before the trim wave runs and the gateway-as-signer is wired**: key-handling discipline (5.1–5.5 from R1, only partially landed); replay/freshness window enforcement at the verify boundary (now necessary precisely because we have a single signer whose signed bundles can be replayed); error-message surface (codes are clean; messages are not specified); audit-emission unbypassability **at the gateway implementation layer** (the contract now says "gateway emits audit" — but the proposal does not specify that this emission is itself non-bypassable in the gateway's hot path; an implementation bug or hot-path-elision optimization could re-introduce the bypass under a different name).

These are not v2-blocking. They are **trim-wave-blocking and gateway-signer-implementation-blocking**. The pre-RFCs can open to `#clawtributors` with the current text. The CISO sign-off on the implementation will require the items in §New Findings before the gateway-as-signer code lands and before the trim wave deletes `claws-sdk/src/audit/` (because once the legacy audit chain is gone, any gateway-side audit-emission gap is a regression with no fallback).

**Verdict**: **APPROVE-WITH-WARNINGS**. The architectural shape is now defensible to an auditor. The next round of scrutiny moves from "does the proposal articulate the security model?" to "does the implementation honor the proposal's security model?" That round is owned by the trim-wave plan and the gateway-signer wiring, not by the pre-RFC text.

---

## R1 finding resolution table

| R1 # | Heading | R1 verdict | R2 verdict | Where the fix landed |
|---|---|---|---|---|
| §1 | Snapshot integrity / signing — chain of custody undefined | BLOCK | **RESOLVED** | snap-pre-rfc §"Signing" L116-127; realigned-story §"Gateway-as-signer model" L29-49; explicit "Stores have no signing API; gateway is single signer; verification gateway-side; dev mode unsigned and rejected at trust boundaries" |
| §2 | PolicyIR injection / authorship — bypass surface | BLOCK | **RESOLVED** | policy-pre-rfc §"Canonicalization" L87-101 (policyId is sha256(jcs(body))); §"Failure semantics" L103-116 (PolicyIR with policyId mismatch MUST deny; generatedFrom mismatch MUST deny); realigned-story §"Gateway-as-signer model" L39-45 (snapshot signature transitively covers PolicyIR via manifest entry); the `generate(content, snapshotId)` extension binds PolicyIR to a known snapshot at generation time |
| §3 | Audit chain integrity at contract boundary — decorators bypassable | BLOCK | **RESOLVED** at the proposal layer; **PARTIAL** at the implementation layer (see new finding §F11) | snap-pre-rfc §"Audit emission" L143-156; guardrails-adapter §"Audit emission" L122-124; realigned-story §"Gateway-emitted audit model" L51-62; no decorator pattern remains in any doc; gateway is the single audit-emitting layer |
| §4 | Fail-closed default at every layer — not called out | BLOCK | **RESOLVED** | snap-pre-rfc §"Failure semantics" L129-141 (table covers capture/read/list throws, hash mismatch, network/IO); policy-pre-rfc §"Failure semantics" L103-116 (table covers generate throws, missing PolicyIR, malformed PolicyIR, policyId mismatch, generatedFrom mismatch, evaluate throws); guardrails-adapter §"Fail-closed on adapter boundaries" L114-120 (preAuthorize throws → block; missing ctx.snapshotId → deny; PolicyIR malformed → deny). All branches stated; no implicit fail-open paths visible to me. R5 unsubstantiated by `Sensitivity` enum is mitigated by the downstream R5-lowering documented in realigned-story §"Cross-contract concerns" L320 |
| §5 | Key handling for snapshot signing — undefined across deployment shapes | High | **PARTIALLY-RESOLVED** | snap-pre-rfc §"Signing" L125 ("openclaw snap serve does NOT sign; production trust boundaries reject unsigned snapshots") covers dev/prod tier separation. realigned-story §"Gateway-as-signer model" L36 mentions "KeyVault-backed in Eduardo's filing model" but does NOT enumerate banned-tracing-patterns, key-rotation discipline, multi-keyId transition windows, or KeyVault diagnostic-log-to-SIEM wiring. The R1 §5.4 banned-tracing list is not in any of the four docs. **This is a deferred-to-implementation gap, not a proposal-layer gap.** See new finding §F12 |
| §6 | Auth wiring — `auth: 'gateway'` not enough | High | **UNRESOLVED at proposal layer; CISO accepts deferral** | None of the four docs adds an "auth + multi-tenancy" section per R1 §6.4. snap-pre-rfc §"Open questions" still leaves multi-tenant snap state as a future concern. The R1 ask was for a section; the R2 reality is that multi-tenant isolation lives downstream in `claws-snap-server`'s auth chain (Eduardo's filing) and is not a property the upstream `SnapshotStore` contract can enforce alone. **Accepting deferral with a follow-on requirement**: the trim-wave plan and the `claws-snap-server` rename PR must add explicit per-tenant isolation tests and an "auth model" section. See new finding §F13 |
| §7 | TOCTOU during policy transitions | BLOCK | **RESOLVED** | policy-pre-rfc §"Asks" §4 L198 elevates `ctx.snapshotId?: SnapshotId` to a load-bearing ask; realigned-story §"The four contracts" §4 L155-157 marks it as a contract change in the same wave; guardrails-adapter §"Fail-closed on adapter boundaries" L119 ("If the upstream `ctx.snapshotId` is missing (transitional state, before the extension lands), the adapter MUST treat as deny"). Hot-path cache discipline in realigned-story §"Cross-contract concerns" L323 bounds the staleness window via `(sessionKey, snapshotId)` keying with synchronous fail-closed on cache miss + snap-read failure. The race is now closeable with explicit fail-closed semantics |
| §8 | R0–R5 → Sensitivity rename — security regression at contract surface | Medium | **RESOLVED** | realigned-story §"Cross-contract concerns" L320 ("Re-frame as a generic `Sensitivity` enum upstream and document the **downstream R5-lowering**: claws-policy-generator emits PolicyIR where R5 actions appear as explicit `denyRules`, so even a non-claws guardrail enforces them"). The contract-level conformance test I asked for in R1 §8.4 is not yet drafted but is implicit in the post-trim test plan. **Accepting**: the lowering is documented; the conformance test is a trim-wave artifact, not a pre-RFC artifact |
| §9 | Supply chain — upstream vs downstream | Medium | **UNRESOLVED at proposal layer; defer to release-eng wave** | None of the four docs adds the supply-chain section I asked for in R1 §9.2. realigned-story §"What's NOT in scope" L307-313 explicitly excludes deploy-pattern, lobster-web roadmap, OpenClaw cadence — but does not include supply-chain. **Accepting deferral with a follow-on requirement**: the release-eng wave that owns the trim plan and the `@openclaw/*` lockfile bumps must include `npm audit` policy + pinned versioning + SBOM + security-team CODEOWNERS on `@openclaw/*` deps. See new finding §F14 |
| §10 | No-codename-leak / no-secret-leak audit | Medium | **PARTIALLY-RESOLVED** | The four proposal docs themselves continue to reference "claws", "Microsoft", "lobster", "Eduardo's filing", and codename-bearing terms. This is appropriate in pre-RFC drafting (the proposal identifies the proposing org); R1 §10 explicitly said this is fine in pre-RFC and the constraint is on the **upstream PR diff**, not the proposal docs. **Accepting**: the codename-scrub is a pre-merge gate on the upstream PR, not a pre-RFC gate. realigned-story L4 ("potentially shareable to `#clawtributors` ... with scrubbing pass per repo-steward W3") acknowledges this. The audit-field and error-message review I asked for has not happened yet but is also implementation-time, not proposal-time. See new finding §F15 |

**Resolution scorecard**: 5 RESOLVED, 3 PARTIALLY-RESOLVED, 2 UNRESOLVED-but-acceptably-deferred. **No finding from R1 remains in a state that blocks pre-RFC dispatch.**

---

## Lens.verify checklist applied to the amended docs

I'll walk each lens prompt and report what the amended docs do or do not establish.

### "Can I prove to an auditor that this agent is governed?"

**Yes, conditionally.** The proof chain:

1. The gateway signs `(SnapshotId, capturedAt, gatewayKeyId)` with a KeyVault-backed key (realigned-story L36). Auditor gets a signed chain anchored at a single, audit-able trust authority.
2. The snapshot's manifest covers the PolicyIR via `{ path: POLICY_IR_PATH, sha256: <hex> }` (realigned-story L39). Auditor gets cryptographic binding from snapshot signature → PolicyIR content.
3. The gateway emits hash-chained audit entries on every Store op + every policy decision (realigned-story L57-58). Auditor gets a tamper-evident chain of policy decisions.
4. PolicyIR's `policyId` is `sha256(jcs(body))` (policy-pre-rfc L92), so any tampered PolicyIR breaks either its own hash or the snapshot manifest hash — both verifiable post-hoc.

**The condition** is that the gateway implementation actually honors all of (1)–(4) without elision, error-swallowing, or hot-path optimization that drops audit entries. The proposal layer establishes the obligation; the implementation must keep it. The CISO will revisit at gateway-signer wiring time.

### "What happens when an agent is compromised? Is lateral movement blocked?"

**The proposals don't address A2A directly** — that's expected, since A2A trust is a guardrails-layer concern handled by the existing `runTrustedToolPolicies` runner, not a snap/policy contract concern. The relevant question is: **if a compromised agent forges a snapshot, can it pass the signing check?**

No, because the signing key lives in KeyVault and the gateway is the only signer (realigned-story L36, L42-46). A compromised agent has the same access as an employee (per the role body) and can call gateway APIs, but it cannot extract the KeyVault key or sign on behalf of the gateway. Lateral movement via forged signed snapshots is blocked by the single-signer model.

The compromise vector that **remains** is: a compromised agent with gateway authority calls `Store.capture(...)` for a malicious workspace, the gateway signs it, and the agent uses the signed snapshot to bypass policy elsewhere. **This is not blocked by signing — it's blocked by audit + identity continuity.** The audit chain shows which agent invoked capture; identity continuity (R1 §6.3) bridges the agent identity to the user-on-whose-behalf identity. Identity continuity is downstream-only per R1 §6.3 acceptance, so a non-claws consumer adopting these contracts without claws's handle-binding gets a weakened compromise-recovery posture.

**Mitigation already in scope**: R1 §6.3's ask was a documented assumption about identity continuity. realigned-story §"Cross-contract concerns" mentions `HostContext` upstream-asymmetry (L321) but does not document identity continuity as an assumption. **See new finding §F16.**

### "Can an agent impersonate an employee?"

**Same as above.** The signing model prevents forged snapshots; the OBO chain prevents identity-impersonation in the upstream auth flow (`auth: 'gateway'`). The amended docs do not add new OBO concerns.

### "Is there a kill switch? Does it work across the fleet?"

**Not addressed by the proposal scope.** Kill-switch is a claws-feature, lives in `claws-sdk`, and is not in scope of the upstream contracts. realigned-story §"What this replaces" L194-198 lists `claws-sdk/src/governance/` as a delete target — kill-switch lives there. **The trim wave must verify kill-switch enforcement migrates intact to `claws-policy-generator/`.** This is a trim-wave concern, not a pre-RFC concern. Accepting.

### "Can I export governance events to our SIEM?"

**Yes, via the gateway-emitted audit chain.** realigned-story §"Why audit is not in v2 scope" L64-76 establishes that audit format stays downstream in v2 — claws emits via `claws-policy-generator/emit/` — which means the SIEM-export path (CEF, syslog, NDJSON formatters in the surviving `claws-guardrails/siem/`) continues unchanged. **The risk** is the trim wave: deleting `claws-sdk/src/audit/` (~1,500 LoC) re-homes the chain to `claws-policy-generator/emit/`; if the rename loses any SIEM emitter, the export pipeline breaks silently. **Trim-wave gate**: SIEM-export integration test must run pre- and post-trim with byte-identical SIEM output. See new finding §F17.

### "Is R5 fail-closed non-negotiable? Can an admin override it?"

**Conditionally yes.** The upstream `Sensitivity` enum does not encode R5 (R1 §8 acceptance). The downstream R5-lowering in `claws-policy-generator/` emits R5 as `denyRules`, which any conforming guardrail enforces. **An admin cannot override `denyRules` at the contract layer** — `Decision = { kind: 'deny', reason, rule? }` is terminal in the upstream `runTrustedToolPolicies` runner (short-circuits on first block per guardrails-adapter L36-38).

**The risk**: a future ecosystem consumer adopting the upstream contracts without the claws-policy-generator gets R5 as `Sensitivity = 'restricted'` (a label) without the `denyRules` lowering. They could write `if (sensitivity === 'restricted') { /* warn but allow */ }` and we would not detect it. Per R1 §8.3 this is a contract-layer regression vs. claws-internal, not a claws-internal regression. The mitigation (downstream R5-lowering) is documented in realigned-story L320. The CISO accepts this trade-off because:

1. The upstream contract is intentionally generic (architectural correctness).
2. The downstream lowering preserves R5 enforcement for claws.
3. A non-claws consumer is not within the CISO's enterprise-security scope.

**APPROVED with warning**: if a Microsoft enterprise consumer adopts these contracts in a context that does NOT include `claws-policy-generator`, R5 enforcement weakens. The CISO must be informed before any such adoption. See new finding §F18.

---

## Targeted scrutiny per the user's R2 questions

### Fail-closed semantics — truly fail-closed in every branch?

**Yes, at the proposal layer.** I walked the three failure-semantics tables:

- snap-pre-rfc L133-141: covers `capture` throws, `read` throws, hash mismatch on read, `list` throws, network/IO transient. **Every row terminates in deny or fail-closed.** No "MAY proceed" branches.
- policy-pre-rfc L107-116: covers `generate` throws, missing PolicyIR, malformed PolicyIR, `policyId` mismatch, `generatedFrom` mismatch, `evaluate` throws. **Every row deny.** The last row (evaluate throws) is conditional on Peter's confirmation per Ask §5; the proposal explicitly flags this dependency.
- guardrails-adapter L114-120: covers `preAuthorize` throws, missing `ctx.snapshotId`, malformed PolicyIR. **Every row block.**

**The branches I scrutinized for hidden fail-open paths**:

- "Network/IO/transient errors" in snap-pre-rfc L139 says "MAY retry once with bounded backoff for non-policy reads." This is the **only** place I see an explicit "MAY proceed" — and it's conditional on "non-policy reads." The wording "for non-policy reads" is correct and surgical: a `Store.read(snap, '/some/diff/anchor')` for a UI preview can retry; a `Store.read(snap, POLICY_IR_PATH)` cannot. **APPROVED**, but flagging that the consumer must distinguish "policy-bearing read" from "non-policy read" — and that distinction is consumer-side, so a careless consumer may retry the policy read. **See new finding §F19.**
- "Consumer's `evaluate(event, ctx)` itself throws" in policy-pre-rfc L114 says "Upstream `runTrustedToolPolicies` runner SHOULD treat this as block (fail-closed); we ask Peter to confirm." If Peter says "no, the runner skips on exception," the proposal layer's commitment is honored by the adapter's own try/catch in guardrails-adapter L118 ("If `provider.preAuthorize(...)` throws, the adapter MUST return `{ block: true, blockReason: 'evaluator-error' }`"). **APPROVED**: the adapter independently catches and converts to block, so even if upstream's runner is fail-open, the adapter's own boundary is fail-closed. Dual-layer safety.
- "PolicyIR cache miss + snap-read fails": realigned-story §"Cross-contract concerns" L323 says "Fail-closed if `ctx.snapshotId` is missing or cache-miss + snap-read both fail." **APPROVED.**

**Verdict on fail-closed**: comprehensive. The only failure mode I can construct that is NOT explicitly fail-closed is the "non-policy read" retry, which is correctly scoped.

### Audit emission at gateway layer — actually unbypassable?

**At the proposal layer, yes.** The decorator pattern is deleted. The gateway is the named emitter for every Store op and every policy decision.

**At the implementation layer, the answer depends on a hot-path elision question the proposal does not address.** Specifically: when the gateway emits an audit entry, does it block the request thread until the entry is durably written, or does it fire-and-forget into a queue?

- **Block-until-durable**: provides true unbypassability — if audit emission fails, the request fails. Correct security posture; possibly unacceptable latency in the hot path.
- **Fire-and-forget into queue**: provides best-effort emission; queue overflow or worker-thread failure silently drops audit entries. Bypassable under load.

The proposals do not specify. The CISO position is: for **policy-decision audit**, the emission MUST be block-until-durable (a tool call is gated on a policy decision, so the latency is already in the path; making the audit synchronous is not a new latency cost). For **non-policy Store-read audit** (e.g., diff-preview reads), fire-and-forget into a bounded queue is acceptable with a circuit-breaker that fails the request if the queue is over capacity (because a queue we can't write to is no audit chain at all). **See new finding §F11** (referenced earlier).

### Signing model — single gateway signature: threat model? Replay? Forwarded snapshots?

The single-gateway-signer model has these threat-model implications I want explicit before implementation:

#### Replay across time

A snapshot signed at T1 (when policy was permissive) can be replayed at T2 (when policy is tightened) if a consumer accepts arbitrary signed snapshots without freshness checks. The proposal does not currently mandate freshness.

**Today's amended docs**: the snapshot carries `capturedAt` (snap-pre-rfc L57). Consumers MAY reject snapshots older than X. **The CISO position**: consumers MUST. The freshness threshold is policy-decision-driven (a stale snapshot whose `generatedFrom` PolicyIR has been superseded MUST be rejected for tool-call gating; it MAY be retained for audit-replay purposes).

Combined with `ctx.snapshotId` (which forces "current" snapshot anchoring at evaluate-entry), the replay window is bounded by the cache-refresh latency on `onSnapshotPromoted`. **This is closeable but not closed in the current text.** See new finding §F20.

#### Replay across gateways

A snapshot signed by gateway A used by gateway B. The proposals are silent on whether the gateway signing key is per-gateway-instance or per-tenant or per-fleet. If signing key is fleet-wide (one key for all gateway instances of one tenant), a forwarded snapshot signed by any instance verifies on any other instance — by design, this is the desired property. If signing key is per-instance, forwarded snapshots fail verification — this might be too strict for multi-instance deployments.

**Eduardo's filing model** (from MEMORY) implies per-tenant KeyVault scoping. This is the correct shape: signing keys are per-tenant (so cross-tenant snapshot use is rejected) but shared across instances of the same tenant (so multi-instance scaling works). **The proposals do not state this.** See new finding §F21.

#### Forwarded snapshots from one gateway used by another

Same as above. The verification check `verify(snapshotId)` (snap-pre-rfc L124) must include a `gatewayKeyId` check that matches the verifier's accepted-keys list. Cross-gateway-but-same-tenant: accept. Cross-tenant: reject. The verify API spec does not yet exist. **See new finding §F21** (combined).

#### Dev-mode unsigned snapshots crossing into production

snap-pre-rfc L125 explicitly says "production trust boundaries reject unsigned snapshots." **Verify this is enforced at the trust-boundary check, not the consumer level.** A consumer-level check is bypassable; a trust-boundary check (enforced by the gateway's verify API) is not. The proposal text matches the latter shape. **APPROVED.**

### Error codes — do any leak info?

Walked the `SnapshotErrorCode` enum at snap-pre-rfc L177-194:

- `SNAP_NOT_FOUND` — codename-clean. Does not distinguish "doesn't exist" from "exists but you can't see it" (the classic privacy-vs-debugability trade-off). The CISO position: it should NOT distinguish — exposing "exists but unauthorized" leaks the existence of a resource. The current code is correctly conservative.
- `SNAP_INVALID_PATH` — codename-clean. Could leak workspace structure if the path is echoed in a 400 response body. **Verify the `message` field for `SNAP_INVALID_PATH` does NOT echo the malformed path back to the user**, since the malformed path may itself be probe-bearing (e.g., a path-traversal probe like `../../etc/passwd` echoed back confirms the consumer's parsing accepts the probe). See new finding §F22.
- `SNAP_STORE_UNAVAILABLE` — codename-clean. Does NOT leak which backing store (S3, postgres, in-memory) is unavailable, which is correct.
- `SNAP_AUTH_DENIED` — codename-clean. Does NOT distinguish "no auth provided" from "auth provided but insufficient" — correct.
- `SNAP_CAPTURE_FAILED` — clean. The `message` field (per L196 "human-readable; not for parsing") is the leak surface. Capture failures may include "workspace at /Users/.../microsoft/REDACTED/..." which leaks principal-bearing path components. **Verify the implementation sanitizes message strings before they cross the trust boundary.** See new finding §F22 (combined).
- `SNAP_LIMIT_EXCEEDED` — clean. The 429 mapping is correct; does not leak which limit (per-tenant quota, global rate limit, per-user budget).
- `SNAP_CHECKSUM_MISMATCH` — clean. Does NOT echo the expected vs actual hash, which would leak the internal hash format details.
- `SNAP_CONTRACT_VIOLATION` — clean.
- `SNAP_INTERNAL` — clean. The 500 mapping is correct.

**Verdict on the enum**: codes are clean. **Messages are the leak surface** and the proposal does not specify a message-sanitization rule. See new finding §F22.

### Canonicalization edge cases — JCS interpretation divergence?

RFC 8785 is a precise spec, and the proposal explicitly references it (snap-pre-rfc L92, policy-pre-rfc L93). The known edge cases where implementations diverge:

1. **NaN / Infinity / -0**: RFC 8785 forbids these in JSON. If a `PolicyIR.tools[i]` or a `Snapshot.files[i]` carries one (e.g., a number coerced from JS `NaN`), JCS implementations behave differently — some throw, some serialize as `null`, some as `"NaN"`. **Proposal does not specify.** Recommend: contract-level prohibition that PolicyIR and snapshot-manifest content MUST NOT contain non-finite numbers. See new finding §F23.

2. **Surrogate pairs in strings**: RFC 8785 specifies UTF-8 encoding with no UTF-16 surrogate pairs. Some implementations pass through invalid surrogates; some reject. If a workspace file has a filename containing an invalid UTF-16 surrogate (rare but possible on Windows), the canonical manifest may produce divergent hashes. **Proposal does not specify.** Recommend: contract-level rule that `SnapshotInternalPath` strings MUST be valid UTF-8 with no unpaired surrogates. See new finding §F23 (combined).

3. **Number precision**: RFC 8785 specifies a particular number formatting (ECMAScript 6 `Number.prototype.toString()`). JS, Rust, Go, Python implementations have differed historically on edge cases (e.g., very large integers, very small floats). The conformance test (snap-pre-rfc L114, policy-pre-rfc L101) catches this — **GOOD** — but only if the test fixtures cover these edge cases. Recommend the conformance test fixture set explicitly include these cases. See new finding §F23 (combined).

4. **Object key duplication**: RFC 8785 requires unique keys; some implementations silently drop duplicates, some throw. PolicyIR and Snapshot are typed structs so duplicates can't occur at the source — but a malicious Store impl could synthesize a `policy-ir.json` with duplicate keys to probe the canonicalizer's behavior. **Proposal does not specify the parsing-side rejection.** Recommend: the `validatePolicyIR` helper (policy-pre-rfc L124) MUST reject duplicate keys before hashing. See new finding §F23 (combined).

These are implementation-time concerns, not pre-RFC concerns. The pre-RFCs reference RFC 8785 by name, which is the right level of abstraction for a contract. **The new finding §F23 is for the conformance test suite and the implementation reviews.**

---

## New findings (R2)

R1 had findings F1–F10 (`§1`–`§11` headings; treating each numbered section as one finding). R2 numbering continues from F11.

### F11 — gateway audit emission must be block-until-durable for policy decisions

**Severity**: High (implementation-time blocker for trim wave)
**Concern**: The proposals say "gateway emits audit" for every Store op and policy decision but do not specify whether the emission is synchronous-and-durable or fire-and-forget-into-queue. For policy decisions, the emission MUST block the request thread until the audit entry is durably written; otherwise an under-load gateway can drop policy-decision audit entries and we lose the unbypassability property the contract just gained.

**Required fix (implementation-time, not pre-RFC-time)**:
- For policy-decision audit: synchronous, block-until-durable. Hot-path latency cost is acceptable because the request is already gated on the decision.
- For non-policy Store-read audit (diff previews, list calls): bounded-queue with circuit-breaker that fails the request when queue is over capacity. A queue we can't write to is no audit chain.
- Conformance test: simulate audit-sink unavailability and assert the gateway fails closed (rejects new requests) rather than dropping audit entries.

**Where this lands**: trim-wave plan; gateway-as-signer wiring PR.

### F12 — key-handling discipline is documented in narrative but not enforced

**Severity**: High (implementation-time blocker)
**Concern**: realigned-story L36 mentions "KeyVault-backed in Eduardo's filing model" but the four docs do not enumerate:
- Banned tracing patterns (no `logger.debug({ key })`, no `JSON.stringify` of key wrappers, no `Display` impls leaking key bytes).
- Key-rotation discipline (multiple `keyId` valid concurrently for transition window; `kid` headers in signatures so consumers select the right key).
- KeyVault diagnostic-log-to-SIEM wiring.
- `secrecy::SecretString` + `zeroize` patterns (Rust-port-relevant).
- Test-fixture key isolation (`*.test.fixture.ts` + `eslint-no-prod-import` rules).

**Required fix (implementation-time)**:
- Banned-tracing-patterns lint rules in the gateway-signer wiring PR.
- Key-rotation runbook in `claws-snap-server/docs/`.
- SIEM wiring acceptance test.

**Where this lands**: trim-wave plan; gateway-as-signer wiring PR; security-team review on the SIEM wiring.

### F13 — multi-tenant snapshot isolation deferred; downstream test required

**Severity**: Medium (downstream-test-time blocker; acceptable proposal-time deferral)
**Concern**: snap-pre-rfc still leaves multi-tenant snap state as an open question. The upstream contract cannot enforce tenant isolation — the auth chain must. R1 §6.1 asked for a contract obligation; R2 accepts deferral on the grounds that downstream `claws-snap-server`'s auth chain owns this.

**Required fix (downstream-test-time)**:
- The `claws-snap-server` rename PR must add explicit tests:
  - Cross-tenant `Store.read(tenantA-snap-id, path)` from a tenantB-authed gateway → SNAP_AUTH_DENIED.
  - Cross-tenant `Store.list(tenantA-workspace)` from a tenantB-authed gateway → empty list, not list-of-tenantA-snapshots-with-permission-error (the latter leaks existence).
  - SnapshotId namespacing: if `SnapshotId` is content-hashed without a tenant prefix, two tenants writing identical content to identical-name files produce IDENTICAL `SnapshotId`. This is OK if dedup-across-tenants is desired and if the auth check is on the tenant context, not the SnapshotId. **Verify this trade-off is intentional** and documented.

**Where this lands**: `claws-snap-server` rename PR; downstream test suite.

### F14 — supply-chain posture not specified; defer to release-eng wave

**Severity**: Medium (release-eng-wave blocker)
**Concern**: R1 §9 asked for a supply-chain section. R2 docs do not have one. The pre-RFCs do not need this section (it's a downstream concern), but the trim wave + the `@openclaw/*` consumption introduce supply-chain surface that needs a posture.

**Required fix (release-eng-wave-time)**:
- `npm audit` policy gating CI.
- Pinned versioning + lockfile discipline for `@openclaw/*` deps.
- SBOM generation across the contract chain.
- CODEOWNERS rule requiring security-team review on `@openclaw/*` lockfile bumps.

**Where this lands**: release-eng wave plan that owns trim + dep-bump.

### F15 — codename + message-string scrub deferred to upstream-PR-merge time

**Severity**: Medium (pre-merge gate)
**Concern**: The four proposal docs reference "claws", "Microsoft", "lobster", "Eduardo's filing", "BIC", "isis", "weaver", and "yankee/pundit/bandit/whiskey" codenames. This is appropriate in pre-RFC drafting; the constraint is on the upstream PR diff. R1 §10 acknowledged this; R2 confirms.

**Required fix (pre-merge-time)**:
- The repo-steward owns the lexical scan on the upstream PR diff.
- The CISO additionally reviews:
  - Audit-event field names in the chain machinery (when re-homed to `claws-policy-generator/emit/`).
  - Error-message strings in the `SnapshotError.message` surface (per F22).
  - Test-fixture content for embedded principal/tenant identifiers.

**Where this lands**: pre-merge gate on the snap upstream PR; pre-merge gate on the policy-IR upstream PR; trim-wave gate on the audit-chain re-home.

### F16 — identity continuity assumption not documented

**Severity**: Medium (acceptable deferral; affects future ecosystem consumers)
**Concern**: R1 §6.3 asked for a documented assumption that identity continuity (handle-binding-style) is the consumer's responsibility. realigned-story §"Cross-contract concerns" mentions `HostContext` upstream-asymmetry but does not document identity continuity as a separate concern.

**Required fix (next R3 doc-revision pass, OR accepted as a post-merge follow-on)**:
- Add to realigned-story §"Cross-contract concerns" a note: "Identity continuity from edit→validate→generate→capture→evaluate is consumer-side. Production deployments should layer handle-binding (signed approval handles with nonce + ttl + sequence-number) on top of `ctx.snapshotId`. Without this, a compromised agent can replay a snapshot with a stale identity."
- This unblocks future ecosystem consumers from accidentally weakening compromise recovery.

**Where this lands**: doc-revision pass before pre-RFC dispatch, OR explicit follow-on note in the `#clawtributors` thread.

### F17 — SIEM-export integration test required around trim wave

**Severity**: High (trim-wave-blocker)
**Concern**: The trim wave deletes `claws-sdk/src/audit/` (~1,500 LoC) and re-homes the chain machinery to `claws-policy-generator/emit/`. The CEF/syslog/NDJSON formatters in `claws-guardrails/siem/` must continue working post-trim. If a formatter is lost in the rename, the SIEM export pipeline breaks silently.

**Required fix (trim-wave-time)**:
- SIEM-export integration test runs pre-trim (capture golden output) and post-trim (assert byte-identical output).
- Test fixtures cover: every `SnapshotErrorCode` value emitted to SIEM; every `Decision` kind; representative audit-chain entries with HMAC + Ed25519 head.

**Where this lands**: trim-wave plan acceptance criteria.

### F18 — R5-lowering applies only to claws-policy-generator consumers; ecosystem warning required

**Severity**: Low (acceptable trade-off; informational)
**Concern**: R1 §8.3 acceptance assumed "non-claws consumer is not within the CISO's enterprise-security scope." R2 confirms this is the correct stance for v2. **However, if a Microsoft enterprise team adopts the upstream contracts (claws-snap-server + claws-policy-generator-shaped, but possibly without claws-guardrails), the R5-lowering must be in their generator or R5 silently weakens.**

**Required fix**:
- realigned-story §"Cross-contract concerns" already has the lowering note (L320). Add one sentence: "Microsoft enterprise consumers adopting these contracts who do NOT also adopt `claws-policy-generator` MUST replicate the R5-lowering in their own generator; the CISO must be informed before any such adoption."
- This is a one-sentence amendment, doc-only.

**Where this lands**: realigned-story §"Cross-contract concerns"; can be added in this revision pass or deferred.

### F19 — "non-policy reads" retry rule needs consumer-side discipline

**Severity**: Low-Medium (informational, easy implementation guidance)
**Concern**: snap-pre-rfc L139 says "MAY retry once with bounded backoff for non-policy reads." The distinction "policy-bearing read" vs "non-policy read" is consumer-side. A careless consumer that retries `Store.read(snap, POLICY_IR_PATH)` re-introduces fail-open under transient failure.

**Required fix (implementation-time)**:
- `loadPolicyIR` helper (policy-pre-rfc L122) MUST NOT retry. Single attempt; throw on failure; consumer fail-closes.
- Document explicitly in the helper's docstring: "this is a policy-bearing read; do not retry."
- Lint rule (or convention) flagging `Store.read(*, POLICY_IR_PATH)` calls outside of `loadPolicyIR` for review.

**Where this lands**: `policy-ir-runtime.ts` helper implementation; implementation-time concern.

### F20 — freshness window enforcement on signed snapshots

**Severity**: High (gateway-signer-wiring blocker; threat-model)
**Concern**: With single-gateway-signer, replay across time becomes a real threat. A signed snapshot from T1 (permissive policy) replayed at T2 (tightened policy) bypasses tightening if the consumer accepts arbitrary signed snapshots. `ctx.snapshotId` closes the race for the *current* tool call, but a stale snapshot still verifies if the consumer reads it.

**Required fix (implementation-time)**:
- The gateway's `verify(snapshotId)` API (snap-pre-rfc L124) MUST check that the snapshot is the *current* snapshot for the tenant/workspace at verification time. Accept stale snapshots only for explicit audit-replay use cases (which take a different code path).
- For `runTrustedToolPolicies` evaluations: `ctx.snapshotId` MUST equal the gateway-determined "active snapshot for this session" or evaluate fails closed (already captured in guardrails-adapter L119).
- Document the freshness window: "PolicyIR caches MUST be invalidated within 100ms of `snap.promote` returning success" (R1 §7.3 ask, still pending).

**Where this lands**: gateway-signer wiring PR; verify API design.

### F21 — per-tenant signing key + verification key-acceptance list

**Severity**: High (gateway-signer-wiring blocker)
**Concern**: The proposals do not specify whether signing keys are per-instance, per-tenant, or fleet-wide. Eduardo's filing model implies per-tenant KeyVault scoping. This must be made explicit.

**Required fix (implementation-time, with one-sentence proposal-time amendment)**:
- realigned-story §"Gateway-as-signer model" should add: "Signing keys are per-tenant (in KeyVault for production; in-memory ephemeral for `openclaw snap serve` dev mode). Verification rejects snapshots signed with a key not in the verifier's accepted-keys list. Cross-tenant snapshot use is rejected by definition; cross-instance same-tenant is supported via shared per-tenant key."
- The `verify(snapshotId)` API takes both `snapshotId` and an implicit tenant context; the check is `keyId in tenant.acceptedKeys`.
- Key-rotation discipline: the accepted-keys list includes `current` + `n previous` (transition window).

**Where this lands**: doc-revision pass (one-sentence amendment) + gateway-signer wiring PR.

### F22 — error messages must not leak path/principal/tenant info

**Severity**: Medium (implementation-time)
**Concern**: The `SnapshotErrorCode` enum is clean. The `SnapshotError.message` field (snap-pre-rfc L191) is "human-readable; not for parsing" — but does not constrain content. Implementations may include workspace paths (leak filesystem layout), principal names (leak SSO identifiers), tenant IDs (leak topology), or echo malformed input back to the caller (probe-confirmation).

**Required fix (implementation-time)**:
- Message-sanitization rule: `SnapshotError.message` MUST NOT contain workspace paths, principal names, tenant IDs, or unsanitized echoes of caller input.
- Reference implementation MUST sanitize before constructing `SnapshotError`.
- Conformance test fixture set MUST include "malformed input that, if echoed, would confirm a probe" and assert the message does not echo.

**Where this lands**: snap-pre-rfc reference plugin implementation; conformance test suite.

### F23 — JCS interpretation edge cases require conformance fixture coverage

**Severity**: Medium (conformance-test-time)
**Concern**: RFC 8785 has several edge cases where implementations diverge in practice (NaN/Infinity/-0; surrogate pairs; number precision; duplicate keys). The conformance test (snap-pre-rfc L114, policy-pre-rfc L101) catches divergence only if its fixtures exercise these cases.

**Required fix (conformance-test-time)**:
- Add fixture: PolicyIR / Snapshot containing (theoretically) NaN — should be REJECTED by both producer and consumer, not produce divergent hashes.
- Add fixture: SnapshotInternalPath with invalid UTF-16 surrogate — REJECTED.
- Add fixture: number at boundary cases (Number.MAX_SAFE_INTEGER, Number.MIN_VALUE, very-precise decimals) — produces identical canonicalization.
- Add fixture: object with duplicate keys (constructed via raw JSON, not type-checked source) — REJECTED before hashing in `validatePolicyIR`.
- Contract-level prohibition: PolicyIR and snapshot-manifest content MUST NOT contain non-finite numbers; SnapshotInternalPath strings MUST be valid UTF-8 with no unpaired surrogates.

**Where this lands**: conformance test plan in trim-wave / contract-PR-merge gate.

---

## What still must change before pre-RFCs open (R2 priority)

In priority order:

1. **F21** — one-sentence amendment to realigned-story §"Gateway-as-signer model" stating signing keys are per-tenant. Doc-only; ~30 seconds. Without it, the threat model has a gaping ambiguity (who can verify what the gateway signed). **PROPOSAL-TIME blocker** for sign-off.

2. **F16** — one-sentence amendment to realigned-story §"Cross-contract concerns" documenting identity continuity as consumer-side. Doc-only; ~30 seconds. Without it, future ecosystem consumers silently weaken compromise recovery. **PROPOSAL-TIME nice-to-have.**

3. **F18** — one-sentence amendment to realigned-story §"Cross-contract concerns" warning Microsoft enterprise consumers about R5-lowering. Doc-only; ~30 seconds. **PROPOSAL-TIME nice-to-have.**

All other findings (F11–F15, F17, F19, F20, F22, F23) are **implementation-time or trim-wave-time**, not pre-RFC-time. They go into the trim-wave plan + the gateway-signer wiring PR + the conformance test suite. They do not block pre-RFC dispatch.

**If the user wants the absolute minimum proposal-layer revision before dispatch**: F21 is the only one I'd insist on. F16 and F18 are improvements, not blockers.

---

## What CAN stay as-is

The R1 BLOCK findings are resolved. The architectural shape is sound and now defensible to an auditor:

- Single-gateway-signer model is the right call (single trust anchor, no per-Store key proliferation).
- Gateway-emitted audit eliminates the decorator bypass surface.
- `ctx.snapshotId` extension closes the policy-transition race.
- RFC 8785 JCS for canonicalization is a real standard with a precise spec.
- Fail-closed semantics tables are comprehensive and consistent across all three contract docs.
- `SnapshotErrorCode` enum codes are clean and conservatively scoped.
- The downstream R5-lowering preserves R5 enforcement for claws while keeping the upstream `Sensitivity` enum architecturally generic.
- Audit staying downstream in v2 is the budget-respecting and bake-time-respecting call.

**The proposal layer is good. The next round of CISO scrutiny moves to implementation.**

---

## Verdict

**APPROVE-WITH-WARNINGS.**

The R1 BLOCK gaps are resolved. The proposal package is now defensible to an auditor at the contract layer. The pre-RFCs can open to `#clawtributors` with the current text — with one strongly-recommended one-sentence amendment (F21, per-tenant signing keys) and two nice-to-have one-sentence amendments (F16 identity continuity, F18 R5-lowering enterprise-consumer warning).

The CISO's R3 scrutiny is reserved for the implementation layer:

- Gateway-signer wiring PR (F11 audit durability, F12 key handling, F20 freshness, F21 per-tenant keys, F22 message sanitization).
- Trim wave plan (F13 multi-tenant tests, F17 SIEM export, F19 non-retry rule, F23 JCS edge-case fixtures).
- Release-eng wave plan (F14 supply chain, F15 codename + message scrub).

These do not block pre-RFC dispatch. They block the trim wave and the gateway-signer code landing.

**The R1 verdict was REVISE.** The R2 verdict is APPROVE-WITH-WARNINGS. The architecture survives, and the security model now matches the architecture.

**Bring the implementation back for R3 when the gateway-signer wiring lands; we'll talk about full APPROVE then.**

---

**Reviewed by**: claws:ciso
**Lens applied**: OWASP Agentic Top 10, fail-closed at every layer, audit-survives-discovery, R5 non-overridable (via downstream lowering), chain of custody (single-signer model), no key leak in tracing (deferred to implementation), supply-chain hygiene (deferred to release-eng), threat-modeling (replay + cross-tenant + freshness).
**Date**: 2026-04-29
**Round**: 2
