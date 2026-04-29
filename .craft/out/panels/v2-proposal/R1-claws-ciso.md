# R1 panel review — claws:ciso — v2 OpenClaw contribution proposal

**Reviewer**: claws:ciso (Guardian; Cluster A; "Security assurance > Agent capability")
**Round**: 1
**Subject**: snap-pre-rfc.md, policy-pre-rfc.md, guardrails-adapter.md, realigned-story.md
**Date**: 2026-04-28
**Lens**: OWASP Agentic Top 10, fail-closed defaults, audit-survives-discovery, signed-artifact tamper-proof chain, R5 non-overridable.

---

## TL;DR — the verdict up top

**REVISE before opening any of the three pre-RFCs.** The architectural shape is sound and the LoC reduction is welcome — but as drafted, **none of the four documents articulates a fail-closed posture** at any of the contract boundaries, **the chain of custody for snapshot integrity is undefined**, **the PolicyIR has no signing story**, **the audit-emission path is decorator-based and therefore bypassable**, and **the TOCTOU window between snapshot promotion and policy plugin observation is unbounded and unaddressed**. This is the security model I have to defend to an auditor; right now I cannot. The same proposal that makes the trim-wave smaller also moves three of claws's load-bearing security guarantees from "asserted in code we own" to "asserted in contracts we share with strangers" — and the contracts as drafted don't carry the guarantees over. R5-fail-closed is non-negotiable; the proposal silently demotes it to a downstream claws-only convention with no contract-level expression.

I am not opposed to the architecture. I am opposed to opening any upstream PR before the fail-closed defaults, signing chain, audit non-bypassability, and TOCTOU bound are explicitly addressed in each contract document, and before security-review is wired into the PR template for every contract that touches the snapshot/policy/guardrails axis.

**Verdict**: **REVISE** (not BLOCK; not ACCEPT). Specific revisions enumerated under "What must change before pre-RFCs open."

---

## 1. Snapshot integrity / signing — the chain of custody is undefined

**snap-pre-rfc** proposes content-hash IDs and frames signing as out of contract. That is the wrong default for a security-critical primitive.

### 1.1 Content-hash ID ≠ signed snapshot

Open question 3 recommends "content-hash" as the SnapshotId format with the rationale "deduplication free; consistent across SnapshotStore implementations; matches the audit-anchor properties downstream consumers want." This conflates two distinct properties:

- **Content-addressing** (the ID is a hash of the bytes) — gives you tamper-detection IF AND ONLY IF you can independently verify the hash of what you just received against a hash you trust came from a trustworthy source.
- **Signing** (a signature over the hash, by a key the verifier trusts) — gives you authenticity (who attests this snapshot is the one they captured) and non-repudiation.

The contract gives me (1) but not (2). A buggy or malicious `SnapshotStore` impl can return a `SnapshotId` of `sha256(X)` and bytes `Y`. Since `SnapshotId` is a string and `read(snap, path)` returns `Uint8Array`, nothing in the contract requires the consumer to recompute the hash on read — and nothing requires the producer to sign anything.

**Where does the chain of custody live?** As drafted: nowhere. `realigned-story.md:36` says "snapshot is content-addressed, signed" — but the contract has no `signature` field on `Snapshot`, no `verify` method on `SnapshotStore`, no signing-key handling, no key-id binding. The "signed" word in the architectural narrative is doing work that the contract doesn't pay for.

### 1.2 Can a malicious SnapshotStore impl produce a "signed" snapshot whose content doesn't match the signed hash?

Yes. With the contract as drafted:
- `capture(workspace) → Promise<SnapshotId>` — the impl picks any string. There's no obligation that the SnapshotId actually be the hash of anything captured.
- `read(snap, path) → Promise<Uint8Array>` — the impl returns any bytes. There's no obligation that those bytes hash, when concatenated and canonicalized with the snapshot's other content, to the SnapshotId.
- `list(workspace) → Promise<Snapshot[]>` — the impl can lie about what's there.

A consumer that *trusts* the SnapshotStore impl (because the gateway-mounted plugin is presumed trustworthy) gets fed any data the impl produces. If the impl is the claws-snap-server downstream impl signed by claws's release process, fine. If the impl is a third-party plugin loaded from npm, **we have just made our supply chain the enforcement mechanism for our snapshot integrity guarantees**, and that's exactly the OWASP Agentic Top 10 #6 (LLM06: Excessive Agency) and #9 (LLM09: Misinformation) failure mode the CISO is paid to prevent.

### 1.3 Required revisions

- **Add a `verify(snap: SnapshotId, content: Uint8Array): Promise<boolean>` method to the contract**, OR define the contract such that `read()` MUST recompute and verify the hash on return and throw on mismatch.
- **Add a `signature: { keyId: string; alg: string; sig: Uint8Array }` field to the `Snapshot` interface**, OR document explicitly that signing is a Store-impl concern, with the consequence that consumers of any non-trusted Store cannot rely on integrity (this is a worse outcome but at least it's honest; the current draft is silent).
- **Define a conformance test that proves a Store impl cannot produce `(SnapshotId, content)` pairs where `hash(content) ≠ SnapshotId`.** Without this, "content-addressing" is a marketing claim, not a security property.
- **State explicitly in the contract docs** that `SnapshotId` is the canonicalized-content hash and that it is the consumer's obligation to verify on read. Consumers that don't verify are fail-open by default; that's a security regression.

This is the single most important change I'm asking for. If snap upstream lands without it, claws's downstream impl will need to add a parallel verify-on-read layer that should have been a contract property — and any other Store impl that connects to a claws-bearing snapshot becomes a tampering vector.

---

## 2. PolicyIR injection / authorship — the bypass surface

**policy-pre-rfc** describes a flow where:
1. fileingest validates content
2. gateway calls `policy-generator.generate(validatedContent)` to produce PolicyIR
3. PolicyIR is written into the snapshot at `POLICY_IR_PATH`
4. consumer reads PolicyIR via `snap.read(snap, POLICY_IR_PATH)`
5. PolicyIR drives evaluate decisions

The bypass surface is between (3) and (4). **What prevents a malicious consumer (or a malicious plugin running in the same process as a consumer) from writing a doctored PolicyIR directly into the snapshot bundle, at `POLICY_IR_PATH`, bypassing fileingest entirely?**

### 2.1 The flow as drafted has no signature on PolicyIR

`PolicyIR.policyId` is documented as "content-hash of the IR body" — same problem as §1, content-addressing is not signing. Nothing in the PolicyIR type binds the IR to:
- the gateway that generated it (no `generatorId` / `generatorKeyId`)
- the validated content it was generated from (`generatedFrom: SnapshotId` is structural, not cryptographic — a malicious actor can set it to any value)
- a signing authority (no `signature`)

So a snapshot can carry a PolicyIR whose `policyId` is `sha256(maliciousBytes)`, whose `generatedFrom` points at a real snapshot the user trusts, and whose `denyRules` is empty. Any consumer that loads PolicyIR via `snap.read(snap, POLICY_IR_PATH)` and runs its evaluator against it will see "no deny rules" and allow everything.

### 2.2 The trust chain has gaps

The proposal narrative (`realigned-story.md:14-54`) shows a clean linear chain. The reality has at least three places where the chain breaks:

- **Between fileingest and the gateway-generator**: who signs the validation result? If fileingest returns `validatedContent: TValidated`, can the generator be fed a fake `TValidated` that bypasses validation? Or is `TValidated` opaque and only acquired via a validated channel?
- **Between the generator and the snapshot**: does the gateway's snap plugin enforce that only the in-process generator can write to `POLICY_IR_PATH`? Today nothing in the snap contract does this — `read` is the only path-aware verb; there's no "write" verb at all in the contract (capture takes a workspace, not file-by-file writes), but the snapshot inevitably gets bytes from somewhere, and the contract is silent on who's allowed to be the somewhere.
- **Between the snapshot and the evaluator**: as in §1, an unverified read.

### 2.3 Required revisions

- **PolicyIR must be signed by the gateway/generator at production time.** Add `PolicyIR.signature: { keyId, alg, sig }` and require the evaluator to verify before trusting. This bounds the trust to "I trust the gateway's signing key" — a single, audit-able assertion.
- **`generatedFrom: SnapshotId` must be cryptographically bound** to the snapshot it claims to be derived from — i.e., the snapshot's signature covers (or is covered by) the PolicyIR's signature. Otherwise `generatedFrom` is decorative.
- **`POLICY_IR_PATH` writes must be gateway-mediated only.** Document this as a contract property: the snap-server plugin's auth model must reject `POLICY_IR_PATH` writes from any caller other than the gateway's own generator. If we can't enforce this at the snap layer, we need a separate "policy-bundle" contract that *does* enforce it.
- **`PolicyGenerator<TValidated>` must require validated content provenance.** The interface should not accept `TValidated` opaquely — it should accept `{ content: TValidated; provenance: ValidationCertificate }` where the certificate is signed by fileingest. Otherwise a misbehaving caller can hand the generator unvalidated bytes and the generator has no way to know.

These revisions move the contract from "trust the consumer not to do bad things" (current state) to "verify cryptographically at every boundary" (required state). The cost is ~50 LoC of additional types and a dependency on a signing-key abstraction; the benefit is a real chain of custody.

---

## 3. Audit chain integrity at the contract boundary — decorators are bypassable

**guardrails-adapter** (line 66) and **snap-pre-rfc** (line 66) both reference "decorator pattern by the consumer (wrap a SnapshotStore to emit on each op)" / "wrapping the GuardrailProvider for audit emission."

### 3.1 Decorators sit between the contract and the consumer

By definition, a decorator is something the consumer chooses to apply. A malicious or buggy consumer can:
- **Not wrap.** No audit is emitted; nothing in the contract notices.
- **Wrap with a no-op decorator.** Audit emissions are silently dropped.
- **Replace a known-good decorator with a malicious one** at module-load time (npm dependency hijack, malicious post-install script, monkey-patch in tests that leaks to prod) — silently dropping or forging audit events.

In every case, **the audit emissions are bypassable**. There is no contract-level guarantee that audit was emitted for any given operation.

This is the OWASP Agentic Top 10 #5 (LLM05: Improper Output Handling) and #10 (LLM10: Unbounded Consumption / lack of observability) failure mode. From a CISO lens: **if I cannot prove to an auditor that an audit event was emitted for every snap.capture / every guardrail decision, the audit trail is theater**.

### 3.2 The current claws design has this guarantee; the proposal removes it

Today, `claws-sdk/src/audit/` is hash-chained with WAL + canonicalize + verify (`packages/openclaw-guardrails/src/audit/`, ~767 LoC) and the producers (snap, policy, guardrail) are the *only* code path that writes the audit chain — there's no decorator in between, the emit-call is inline, and the chain is tamper-evident on read. An attacker who corrupts the audit chain breaks `verify` and is detected.

The proposal moves this to "decorators by the consumer." That is a clear-eyed regression. Even ignoring the bypass concern, the audit chain becomes per-consumer rather than chain-of-custody-bound — two consumers wrapping the same store can produce different audit logs and we have no way to reconcile.

### 3.3 Required revisions

- **Audit emission MUST be a contract property, not a consumer convention.** Add to the SnapshotStore contract that capture/promote/rollback ops must emit audit events to a contract-defined sink. The sink can be plug-in-able (`AuditSink` callback the gateway provides), but the emission obligation is on the contract.
- **`registerTrustedToolPolicy` runner MUST emit audit on every evaluate call** — block, allow, params, and approval cases all distinct. Without this, decisions are unauditable. Bandit's adapter doc is silent on this; our claws-side `composeDecisions` does it today and we'd lose it on adapter migration.
- **Provide a contract-level audit-tamper-evidence guarantee.** Either:
  - The audit chain is canonicalized and signed by the gateway (so the chain itself can be verified independently), or
  - The contract document explicitly states that audit is best-effort with no integrity guarantee, and consumers must layer their own — and the CISO signs off knowing this is what we ship.

The current draft is in the worst place: it implies audit is part of the design, but doesn't pay for the integrity property. Fix the implication or fix the design.

---

## 4. Fail-closed default at every layer — not called out anywhere

This is the single most damning gap in the proposal. **None of the four documents states the fail-closed posture at the contract boundaries**, and the rare implicit guidance points the wrong direction.

### 4.1 snap.read fails — what does the consumer do?

The contract is silent. Consumers will write code like:
```ts
const policyIR = await snap.read(snap, POLICY_IR_PATH).catch(() => null);
if (!policyIR) {
  // ??? — proceed without policy? block? warn? log?
}
```

Half the consumers will fail open ("just proceed, snap is degraded"). Half will fail closed ("block tool calls until we have policy"). **The contract MUST mandate fail-closed.** Without it, a denial-of-service against snap-server (or a transient FS error) is a denial-of-policy, which silently flips the gateway from policy-enforced to wide-open.

### 4.2 PolicyIR is missing from a snapshot — what does the evaluator do?

Same problem. `runTrustedToolPolicies` runner sees no policies registered (because the loader couldn't read PolicyIR) and per upstream `src/plugins/trusted-tool-policy.ts:8` semantics, **returns `undefined` — meaning no block, allow the tool call**. This is fail-open by upstream's runner default.

The proposal does not address this. It says (`policy-pre-rfc.md:131`) "the existing slot is sufficient; PolicyIR rides via plugin-private state" — without addressing what happens when the plugin's state is empty.

This is the R5-non-overridable concern: if PolicyIR is missing because of FS error, network hiccup, key-rotation race, or malicious tampering, **R5 actions become allowed by default**. That violates the CISO non-negotiable. R5 fail-closed must hold even when policy is unreadable.

### 4.3 guardrails-adapter `evaluate` throws — what does upstream's runner do?

Reading upstream `src/plugins/trusted-tool-policy.ts:8-54` (per bandit's audit, lines 110-123): the loop does `await registration.policy.evaluate(...)`. If that throws, the for-loop terminates with an unhandled exception, which propagates up to the gateway's `before_tool_call` hook handler. **Behavior is upstream-defined and the proposal does not state it.** If upstream catches the exception and returns `undefined`, that is fail-open (skip). If upstream re-throws and the gateway treats hook errors as block, that is fail-closed.

I cannot accept the adapter PR without knowing which it is. Bandit's audit (line 138-156) shows the loop body but doesn't show the surrounding try/catch. **This is a load-bearing question that the proposal must answer before the adapter ships**, and the answer must be fail-closed (block on exception). If upstream is fail-open, we either upstream a change to make it fail-closed, or we wrap our adapter in a try/catch that returns `{ block: true, blockReason: 'evaluator-error' }` on every throw.

### 4.4 Required revisions

- **Add a "Fail-closed defaults" section to each pre-RFC** that enumerates every failure mode at the contract boundary and states the required behavior. At minimum:
  - `snap.read` throws → consumer MUST fail closed (no tool calls until snap recovers, or fall back to a previously-verified PolicyIR if policy is critical).
  - `snap.read` returns a value that fails verification → MUST fail closed (treat as missing).
  - `PolicyIR` missing from snapshot → MUST fail closed (no tool calls allowed).
  - `PolicyIR.signature` invalid → MUST fail closed.
  - `evaluate` throws → MUST fail closed (block).
  - `evaluate` returns malformed Decision → MUST fail closed (block).
  - Generator throws during `generate(content, snapshotId)` → MUST fail closed (no PolicyIR written; capture itself fails or proceeds without policy artifact and is flagged).
- **R5 enforcement MUST work without PolicyIR.** Document a downstream invariant: even when PolicyIR is unreadable, R5-classified actions are denied. This is independent of the contract surface but must be called out in `realigned-story.md` so that adopting these contracts doesn't accidentally relocate R5 enforcement to a place where missing-PolicyIR makes R5 default-allow.

The CISO cannot be the one telling the auditor "we accidentally landed a contract that fails open when snap is unavailable." Put it in writing, before the PR opens.

---

## 5. Key handling for snapshot signing — undefined across three deployment shapes

Once §1 and §2 add signatures, key handling becomes the next problem. Today the proposals are silent. The relevant deployment shapes are:

### 5.1 Local dev (CLI standalone mode)

`openclaw snap serve --port N --store-dir D` (snap-pre-rfc.md:60). What signing key does this use?

- **If ephemeral**: every `snap capture` produces a snapshot signed by a key that disappears on restart. Consumer-side verification fails on restart. UX-hostile and incompatible with persistent snapshot stores.
- **If persisted to disk**: where? `~/.openclaw/snap-signing.key`? With what permissions? What happens when a developer accidentally commits it to git, copies their dev box's `~/.openclaw/` to a teammate, or the dev box is compromised?
- **If the prod key shape is identical to the dev key**: the dev environment's signed snapshots are indistinguishable from production's. A developer who exfils their snapshot bundle has signed-by-claws data outside the production trust boundary.

**Required**: dev snapshots must be signed by a *visibly-different* key (different `keyId`, different `kid` in JWKS lookup, signature alg may match but key material is dev-only) and consumers must enforce a trust-tier check on `keyId` (production consumers reject dev-keyed snapshots).

### 5.2 Gateway-mounted plugin

Per Eduardo's filing model (KeyVault), the signing key lives in KeyVault and the gateway accesses it via managed identity. **This is not stated anywhere in any of the four docs.** Required:

- The signing operation MUST be a KeyVault sign() call, not a local-key sign.
- The plugin MUST never have the key material in process memory beyond the duration of a sign() call (KeyVault's HSM-backed signing keeps it remote).
- Key rotation MUST be supported (multiple `keyId` values valid concurrently for a transition window, with `kid` headers that allow consumers to pick the right one).
- Key access auditing MUST flow through KeyVault's diagnostic logs into the SIEM.

### 5.3 claws-snap-server downstream impl

Same KeyVault model when claws-snap-server runs in Eduardo's filing. When it runs locally (e.g., a developer's box pre-deployment) — see §5.1.

### 5.4 Banned tracing patterns

This is non-negotiable. The proposal never states it.

- **No `tracing::debug!(?key)` (or TS equivalent `logger.debug({ key })`) for any key material.** Including `kid`, signing key bytes, intermediate signatures, KeyVault response bodies that may contain transient tokens, etc.
- **No `Display`/`Debug` impls that print key bytes** (in TS: no `JSON.stringify` of objects holding key material; no `toString()` on key wrappers that returns the bytes).
- **Audit-event payloads MUST NOT contain key material**, only `keyId` references.
- **Test fixtures with embedded keys MUST be in test-only files** with `*.test.fixture.ts` naming and `eslint-no-prod-import` rules preventing them from being imported by non-test code.

### 5.5 Required revisions

- **Add a "Key handling" section to snap-pre-rfc and policy-pre-rfc** covering the three deployment shapes and the banned tracing patterns. CISO signs off on this section before the PR opens.
- **Wire a security-review CODEOWNERS rule** for any file under the new `src/plugin-sdk/snapshot.ts` or `src/plugin-sdk/policy-ir.ts` paths upstream — if upstream has a security CODEOWNERS list, our PRs trigger it; if not, we file the gap. (Per `snap-upstream-audit.md:177` the upstream CODEOWNERS pattern targets `secret*` paths; signing-key handling is secret-adjacent.)

---

## 6. Auth wiring — `auth: 'gateway'` is not enough on its own

snap-pre-rfc (line 51, 67) and bandit's audit specify `auth: 'gateway'` for the snap plugin, meaning "uses the gateway's existing auth chain." This raises three questions the proposal doesn't answer:

### 6.1 Per-tenant snapshot isolation

If two tenants share a gateway (multi-tenant claws-serve, or the upstream gateway running multi-tenant), can tenant A read tenant B's snapshots via `snap.read(B's-snap-id, path)`? The contract has no tenant axis; the auth model has to enforce this entirely at the auth-callback layer.

Per `snap-upstream-audit.md:296` ("Open question — multi-tenant snap state — `filesystemStore` is single-root; if claws-serve is multi-tenant, does each tenant get its own snap daemon, or does snap-daemon become tenant-aware? Today: single-tenant. Future: tenant-axis on `Snapshot.author` is plausible but not implemented."), this is a known gap. **Required**: tenant-axis on `SnapshotId` (e.g., `SnapshotId = tenantHash + ":" + contentHash` or scoped under a tenant prefix) OR a contract obligation that the gateway's auth-callback enforces tenant isolation.

### 6.2 Per-user authorization

read vs write vs capture is not differentiated in the contract — `auth: 'gateway'` means "the gateway authenticated the request"; it does not say "this user has read-snapshot permission for this workspace." Required: a permission model layered on top, either contract-defined (e.g., the snap plugin requires `OpenClawPluginApi.requireCapability('snap.capture')` at registration) or downstream-only with an explicit acknowledgment that consumers MUST add their own.

### 6.3 Identity continuity across edit → validate → generate → capture

When a tool call is gated on a PolicyIR generated from an edit by user X, can we prove the identity of X is the same as the identity invoking the tool call? Today's claws audit chain binds these via session token + handle binding (per `packages/openclaw-guardrails/src/handle-binding/` ~338 LoC). The proposal moves identity-bridge downstream into the claws governance bundle; the cross-contract identity continuity is therefore claws-only and not enforceable at the upstream contract level. **For the CISO**, this means: if a future ecosystem consumer adopts these contracts without the claws governance bundle, identity continuity breaks silently — and they can't tell. Required: a documented assumption that identity continuity is the consumer's responsibility, with a recommended implementation pattern (handle binding) for production deployments.

### 6.4 Required revisions

- Add an "Auth + multi-tenancy" section to snap-pre-rfc and policy-pre-rfc covering tenant isolation, RBAC layering, and identity continuity assumptions.
- State the per-tenant isolation default: deny-cross-tenant-read at the contract boundary if technically feasible; otherwise, document the deferred-to-consumer approach with clear language.

---

## 7. The `evaluate(event, ctx)` snapshot-ID hazard — TOCTOU during policy transitions

`realigned-story.md:178` flags this casually as weaver-concern-3: "if the answer is 'ctx doesn't carry it,' our policy plugin holds the snapshot reference in plugin-private state via an `onSnapshotPromoted` callback (which we'd wire downstream)."

**From the security lens, this is a real TOCTOU vulnerability and the proposal does not bound the staleness window.**

### 7.1 The race

1. Tenant has policy P1 (permissive: allows tool T) on snapshot S1, current.
2. Admin promotes a tightened policy P2 (denies tool T) on snapshot S2 → `snap.promote(S2)`.
3. Snap-server flips current pointer to S2.
4. Gateway's plugin runtime hasn't yet received the `onSnapshotPromoted` callback (or the callback hasn't yet completed loading PolicyIR-S2).
5. User invokes tool T. `evaluate(event, ctx)` reads the plugin's cached PolicyIR — still P1. Returns allow.
6. Gateway permits the action. **Tightened policy is unenforced for a window of unknown duration.**

The window is bounded by:
- snap-server promote latency
- callback delivery latency (in-process: microseconds; cross-process: network + queueing)
- callback completion latency (load + parse + validate + signature-check PolicyIR-S2)

Under load, that can be hundreds of ms or more. Under a malicious DoS against the callback channel, indefinite.

### 7.2 The proposal does not address it

Bandit's adapter doc, pundit's PolicyIR doc, and weaver's narrative all say "wire it via `onSnapshotPromoted`" but none documents:
- how long the staleness window can be
- what the consumer does during the window (allow stale? block until refresh?)
- how the consumer knows the cache is stale (does the cached PolicyIR include `generatedFrom: SnapshotId`? if so, can the consumer compare against `ctx.snapshotId` if it's added — and if not added, what's the alternative?)

### 7.3 Required revisions

- **Add `currentSnapshotId` to `PluginHookToolContext`** upstream, OR define a contract-level `snap.currentId(workspace) → SnapshotId` that the evaluator calls on every evaluate. The evaluator compares against its cached PolicyIR's `generatedFrom`; on mismatch, it MUST block (fail closed) until it can refresh, OR it MUST refresh synchronously before returning. Either is an explicit choice; silent allow-stale is unacceptable.
- **Document a hard latency bound** for the staleness window. E.g., "PolicyIR caches MUST be invalidated within 100ms of `snap.promote` returning success." This is a contract obligation on the runtime, not the data shape.
- **Add a regression test scenario**: adversary-style "tighten policy + immediately invoke previously-allowed tool" with the assertion "tool call MUST be blocked." If the test fails, the staleness window is dangerous and we must fix before shipping.

This is the failure mode where, after a security-incident-driven policy tightening, the operator believes the tightening is in effect while the system is still letting through the very actions the tightening was meant to prevent. The CISO has to defend this to the board; the proposal must defend it in code.

---

## 8. R0–R5 tier labels are claws-specific — security regression vs. today's posture

`realigned-story.md:175` and `policy-openclaw-design-fit.md:249` both flag that R0–R5 is claws-specific and recommend pruning before submission, replacing with a generic `Sensitivity` enum (`'public' | 'internal' | 'confidential' | 'restricted'`).

From a CISO lens: **the rename is a security regression, even if it's the architecturally correct move for upstream-fit.**

### 8.1 What R5 means for claws

R5 is a non-overridable fail-closed marker. Today claws's enforcement says: "if the action is R5-classified, force external approval; no admin can override; no plugin can shim past it; no fail-open path exists." This is encoded in:
- `claws-sdk/src/governance/` rule families (per the trim wave's plan to delete and fold into `claws-policy-generator/`)
- `composeDecisions` priority merge (today; lost in adapter migration per §4.3 of bandit's doc)
- `R5 force-external-approval` semantics in `ProviderRegistryImpl` (`packages/openclaw-guardrails/src/registry.ts:108-192`)

### 8.2 What `Sensitivity = 'restricted'` gives me upstream

The proposal's `Sensitivity` is just a label. There's no contract obligation that `restricted` is fail-closed, non-overridable, or force-external-approval. It's a string in a struct. Any consumer can ignore it.

So the upstream contract knows nothing about R5. Claws's enforcement of R5 lives entirely in:
- the downstream generator (translates `R5` → some PolicyIR shape) — invisible to upstream
- the downstream guardrail adapter (interprets the PolicyIR shape) — invisible to upstream

This means: **a future ecosystem consumer adopting the upstream contracts without the claws governance bundle has no contract-level guarantee that `restricted` is non-overridable.** They'll write `if (sensitivity === 'restricted') { /* maybe approve, maybe log */ }` and we have no contract handle to say "no, restricted MUST mean R5-fail-closed."

### 8.3 Is this a security regression vs. today's claws posture?

**For claws-internal: no**, because we still own the generator and guardrail and we still encode R5 there.

**For the contract surface: yes**, because we're shipping a vocabulary upstream that includes "restricted" without the strong meaning we attach to it. A downstream-only impl that tries to consume claws's PolicyIR for non-claws guardrails will weaken R5.

**Mitigation that I require**: the downstream `claws-policy-generator/` MUST emit PolicyIR that is *unambiguously* claws-bearing (e.g., a `dialect: 'claws-r-tier'` field, plus deny-rules that encode R5 directly as `denyRules` so even a non-claws guardrail enforces them). The contract upstream is `Sensitivity` (generic); the downstream artifact is claws-specific via deny-rule lowering. That way the upstream contract is generic, the downstream artifact carries the claws semantics, and no one accidentally weakens R5.

### 8.4 Required revisions

- Add a section to **policy-pre-rfc** acknowledging that `Sensitivity` is intentionally generic and stating that consumers requiring tier-based enforcement (claws's R0-R5; future consumers' equivalents) MUST encode their semantics in `denyRules`, not in the `sensitivity` label alone.
- Add a section to **realigned-story** documenting the downstream R5-lowering: how the claws-policy-generator emits R5 as deny-rules so that adapter-level enforcement is contract-level and not vocabulary-dependent.
- **Add a contract-level conformance test** (downstream): "given a claws-emitted PolicyIR with R5 actions, evaluating against any conforming `evaluate(event, ctx)` produces `block` for R5 events." If this test passes, we have proof at the contract level that R5 fail-closed survives the upstream-vocabulary refactor.

---

## 9. Supply chain — upstream vs downstream

Accepting upstream contracts means trusting upstream's code (plugin runner, registration verb, type definitions, helper libraries). The proposals do not address supply-chain hygiene for the new dependency.

### 9.1 What I need

- **`cargo deny` / `npm audit` policy for upstream deps** when the contracts land. We need a CI gate that blocks merging if any `@openclaw/plugin-sdk` or related dep introduces a CVE.
- **Pinned versioning of upstream packages.** Once we depend on `@openclaw/plugin-sdk` for snap/policy types, our lockfiles must pin to specific versions and our release process must include a security-team review on every upstream version bump.
- **SBOM generation across the contract chain.** Today claws presumably has SBOM (or should); adding upstream contracts adds new links in the SBOM that need to be tracked. Per Eduardo's filing, this hooks into Microsoft's container-image SBOM tooling.
- **Upstream's own dep posture matters.** `pnpm-workspace.yaml` upstream sets `minimumReleaseAge: 2880` (2-day quarantine on dep updates) — that's good, but our consumer-side has its own lockfile that needs an analogous discipline.

### 9.2 Required revisions

- Add a "Supply chain posture" subsection to `realigned-story.md` (it's the meta-doc) that calls out the four points above and assigns owners (security team for the policy; release-eng for the CI; Eduardo for the deploy-side).
- Add a CODEOWNERS or PR-template hook that requires security-team review on every PR that bumps an `@openclaw/*` dependency in any claws monorepo lockfile.

This isn't a contract-content concern — but it's a CISO concern about the surface area we're inviting in. Worth being explicit before the PRs open.

---

## 10. No-codename-leak / no-secret-leak audit

The proposals reference (with line numbers from each doc):

- **snap-pre-rfc.md:84** — "claws ships a downstream `SnapshotStore` implementation"
- **snap-pre-rfc.md:99** — "Internal claws monorepo has a daemon-shaped reference impl"
- **policy-pre-rfc.md:107** — "claws ships its `PolicyGenerator` impl downstream"
- **policy-pre-rfc.md:107** — "the existing ~1900 LoC parse/extract/canonicalize/emit pipeline, renamed `claws-policy-generator/`"
- **policy-pre-rfc.md:127** — "Not asking to land a generator implementation upstream"
- **realigned-story.md:33** — "writes .openclaw/policy/policy-ir.json + emitted plugin"
- **realigned-story.md:107** — "`claws-policy-generator/` absorbs governance + compliance + audit"
- **realigned-story.md:151** — "`packages/openclaw-snap/` → `packages/claws-snap-server/`"

Repo-steward will do a full lexical scan; from a CISO lens I'm specifically concerned about:

### 10.1 Does the contract code or contract docs leak claws/Microsoft codenames?

The contract types (`Snapshot`, `SnapshotStore`, `PolicyIR`, etc.) themselves do not. The pre-RFC discussion mentions claws frequently as the "downstream consumer" and gives package names like `claws-policy-generator` and `claws-snap-server` as adoption examples. This is appropriate in a pre-RFC (we identify ourselves as the proposing org); it would be inappropriate in the contract code itself.

**Verify**: when the actual upstream PR opens, the diff for `src/plugin-sdk/snapshot.ts` and `src/plugin-sdk/policy-ir.ts` MUST not contain "claws", "Microsoft", "BIC", "lobster", "openclaw-snap", "claws-policy-generator", "isis", "weaver", or any internal codename in code, comments, or test fixtures. This is a pre-merge check, not pre-RFC.

### 10.2 Configuration values, audit fields, error messages

- **`Snapshot.author`** (in current `packages/openclaw-snap` types, not in the upstream-contract draft). What's the default? If it leaks `microsoft.com`, internal SSO, or KeyVault keyIds in the wire, that's a leak.
- **Error messages**. `OC_PATH_NOT_FOUND`, `SNAPSHOT_ID_MISMATCH`, etc. — the codes are fine; the human-readable messages must be reviewed for "Microsoft Identity validation failed for tenant tid-...", which would expose tenant IDs or principal names in logs/SIEM.
- **`POLICY_IR_PATH = '.openclaw/policy/policy-ir.json'`** — fine as-is. (`.openclaw` is upstream's existing convention per `~/.openclaw/exec-approvals.json`.)
- **Audit-event field names**. If we adopt the chain-emit downstream, `audit-chain.ts` field names must be reviewed before the rename to ensure "claws" doesn't appear in field-name strings that ride the audit envelope into customer SIEMs.

### 10.3 Required revisions

- Add a "Naming hygiene" pre-merge checklist to each pre-RFC. Repo-steward owns the lexical scan; CISO owns the audit-field and error-message review.
- Add a security-review gate on the audit-chain implementation when it migrates from `claws-sdk/src/audit/` to `claws-policy-generator/emit/`: every audit-event field name and every error-message string must pass the codename scan.

---

## 11. Cross-contract attack surface

Each arrow in `realigned-story.md:14-54` is an attack surface. The proposal does not enumerate them.

### 11.1 Replay attacks

If an attacker captures a snap → PolicyIR pair from time T1 (when policy was permissive) and replays it at time T2 (when policy is tightened), can they bypass the tightening?

- **Today's claws posture**: handle binding includes `nonce`, `ttl`, `sequence-number`, signed by the approver — replays detected.
- **Proposal's posture**: not specified. `Snapshot` has `capturedAt`; `PolicyIR` has `generatedAt`; nothing in the contract requires a consumer to reject snapshots/policies older than a freshness threshold.

**Required**: add freshness obligations. Contract-level guidance: consumers MUST treat snapshots older than X as require-refresh; any cached PolicyIR has a TTL after which it cannot drive a tool-call decision.

### 11.2 Race conditions

Two simultaneous edits → two concurrent calls to `policy-generator.generate` → two PolicyIR emissions → which wins?

- If snap-server's `capture` is sync and serialized, the second one overwrites the first or both are stored as separate snapshots.
- If `promote` selects one, the loser's PolicyIR is orphaned.
- If both are written to the same `POLICY_IR_PATH` concurrently, the result is undefined.

**Required**: state the concurrency model. Recommended: every capture produces a distinct snapshot; promote is single-writer (per the existing `Idempotency-Key` shape in our current snap-server impl); concurrent generator calls are serialized at the gateway. The contract should mandate this or at least document the assumption.

### 11.3 Tampering at any boundary

Beyond §1-§3 above, the boundaries that can be tampered include:

- **Validation result between fileingest and generator**: addressed in §2.3.
- **PolicyIR between snap-server and consumer**: addressed in §1.3 + §2.3.
- **Decision between adapter and `runTrustedToolPolicies`**: in-process; lower risk; but if the adapter is a separate plugin loaded from npm, supply chain risk per §9.
- **Audit emission between consumer and audit-sink**: addressed in §3.3.

### 11.4 Required revisions

- Add a "Threat model" section to `realigned-story.md` (the meta-doc) that walks each arrow in the architectural diagram and states the threat (replay, race, tampering), the mitigation, and the residual risk.
- Each pre-RFC should reference back to this threat model when introducing its contract.

---

## What must change before pre-RFCs open

In priority order (highest first; addressing these in this order maximizes the LoC efficiency of revisions):

1. **Add `signature` and verification obligations to Snapshot and PolicyIR** (§1.3, §2.3). ~50 LoC additional types each; ~100 LoC of verification helpers in the optional companion runtime files. Without this, the chain of custody is fictional and I cannot defend the snapshot/policy axis to an auditor.

2. **Add fail-closed defaults sections to each pre-RFC** (§4.4). Documentation work, ~30 lines per doc. Without this, consumers will fail open by default and we get a silent security regression at adoption.

3. **Address the TOCTOU staleness window** (§7.3). Either add `currentSnapshotId` to `ctx`, or define a `snap.currentId` contract verb, plus a documented latency bound. ~10 LoC of contract; ~20 LoC of documentation.

4. **Mandate contract-level audit emission**, not decorator pattern (§3.3). ~20 LoC of contract changes (an `auditSink` parameter on capture/promote/rollback ops); ~50 LoC of documentation.

5. **Document the R5-lowering downstream** (§8.4) so the upstream `Sensitivity` rename doesn't silently weaken R5 enforcement. Documentation only; ~50 LoC of `realigned-story.md`.

6. **Add a key-handling section** to snap-pre-rfc and policy-pre-rfc covering the three deployment shapes and banned-tracing patterns (§5.5). Documentation only; ~80 LoC across both docs.

7. **Add an auth + multi-tenancy section** (§6.4). Documentation only; ~50 LoC across both docs.

8. **Add a threat model section to `realigned-story.md`** enumerating cross-contract attack surface (§11.4). Documentation only; ~100 LoC.

9. **Add a supply-chain posture section** (§9.2). Documentation only; ~30 LoC.

10. **Add naming-hygiene + security-review CODEOWNERS hooks** (§10.3, §5.5). Process work; ~20 LoC of CODEOWNERS plus a PR-template snippet.

Total documentation work: ~500 LoC across the four docs. Total contract changes: ~80–150 LoC additional types + verification helpers. The pre-RFC opens with a much more defensible posture and a clearer ask of upstream maintainers ("we want fail-closed defaults and signed artifacts; here's why; here's the cost").

---

## What CAN stay as-is

To be fair to the proposal: the *architectural shape* — types-only upstream + downstream impls + decorator-shape adapter — is correct, and this review doesn't ask to change it. The LoC reduction from ~1665 to ~250-500 is real and welcome. The fact that `registerTrustedToolPolicy` already exists upstream is a genuine simplification. The decision to keep R0-R5 as a downstream concern (with the lowering caveat in §8) is correct for upstream-fit. The "policy lives in snapshots" framing is a sound architectural insight. None of these are at risk in this review.

What I'm asking for is to **complete** the security model of the proposed shape — not to redesign the shape.

---

## Verdict

**REVISE.**

The proposal as drafted is a sound architectural shape with **load-bearing security gaps**: undefined chain of custody for snapshots, unsigned PolicyIR, bypassable audit decorators, unstated fail-closed defaults at every contract boundary, an unbounded TOCTOU window during policy transitions, undefined key handling across three deployment shapes, undefined per-tenant isolation, and no threat model for the cross-contract attack surface.

These gaps are not incompatible with the architectural shape — they're omissions that can be added with ~500 LoC of documentation revisions and ~150 LoC of contract changes (signatures + verification + auditSink + ctx.snapshotId). I am not asking for a redesign; I am asking for the security properties to be made explicit and contract-bound.

**Specifically I will not give CISO sign-off** on opening any of the three pre-RFCs to `#clawtributors` until items 1, 2, 3, 4, and 5 from "What must change" are addressed. Items 6-10 should land in the same revision pass but are not absolute blockers.

The R5 fail-closed non-negotiable survives — but only via the downstream lowering documented in §8.4. The audit chain integrity property survives — but only via the contract-level emission obligation in §3.3. The chain of custody for snapshots survives — but only via the signing scheme in §1.3 and §2.3. Without these, we'd be shipping a security model that is theater at the contract layer and only real in the claws-internal downstream — and the moment a non-claws consumer adopts the contracts, they get a weakened security posture without any signal that they should add their own protections.

**Bring the revised pre-RFCs back for R2 and we can talk about ACCEPT.**

---

**Reviewed by**: claws:ciso
**Lens applied**: OWASP Agentic Top 10, fail-closed at every layer, audit-survives-discovery, R5 non-overridable, chain of custody, no key leak in tracing, supply-chain hygiene.
**Date**: 2026-04-28
**Round**: 1
