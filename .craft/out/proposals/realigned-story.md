# Realigned story — workspace + LKG + PolicyIR as the v2 contract chain

**Status**: internal architectural narrative
**Target audience**: claws + lobster team; potentially shareable to `#clawtributors` as the "why" behind the pre-RFCs (with scrubbing pass per repo-steward W3)
**Author**: giodl@microsoft.com
**Date**: 2026-04-29
**Revision**: R1-amended 2026-04-29 (hapi state honest, gateway-as-signer, gateway-emitted audit, trim arithmetic reconciled, upstream cadence honest, ctx.snapshotId threaded, OcPath/SnapshotInternalPath split); R1-follow-on 2026-04-29 (audit stays downstream — no `@openclaw/audit` in v2; trim figure pinned at 6,200 LoC; `claws-guardrails` rename for naming consistency); R2 fix-pass 2026-04-29 (M11 trim-prose 1,689 reconciled; F21 per-tenant signing keys explicit; G-N1 KeyVault hot-path amortization; G-N2 per-session async audit chains; NEW-1 pre-day-0 hapi window in calendar; NEW-2 v3 audit trigger gates; NEW-3 trim-plan parallel-drafting timing); **R3 LKG-pivot 2026-04-30** (snap → LKG as the carrier; chain consolidates from 5 to 3 upstream PRs by folding stripFrontMatter raw-preserve into PR-1 and merger conjunctive AND into PR-3; ctx.snapshotId → ctx.lkgFingerprint; sister proof = 326 adversarial scenarios across 18 waves; sections 2-3 below rewritten to LKG framing, sections 4-6 amended with redirect notes — see "R3 amendment summary" immediately below).

## R3 amendment summary (2026-04-30) — read this first

The earlier R1/R2 framing had **snap as the carrier** (capture-the-workspace-as-bundle, JCS-canonical SnapshotId, gateway-signed at capture). Two things changed on 2026-04-30:

**Pivot A (2026-04-29 — guardrails moved downstream).** Already in this doc: §5 "claws-guardrails (no upstream PR)". Recap: upstream already ships `PluginTrustedToolPolicyRegistration` + `runTrustedToolPolicies`, so the guardrails-package PR was redundant. Slot becomes a ~50-LoC downstream adapter.

**Pivot B (2026-04-30 — snap → LKG as carrier).** New. After surveying upstream demand (`carve-consumer-catalog.md` strategic-pivot section), the carrier abstraction shifts from "introduce a SnapshotStore" to "factor out the existing config-LKG mechanism into a generalized `LKGTracker<T>` / `LKGStore` contract that any plugin can register against." This generalizes the pattern shipped at `src/config/io.observe-recovery.ts` (#70528, commit `af56926e2fc4`, `v2026.4.23`). The same load-bearing claim — *every policy decision is anchored to a known point-in-time fingerprint* — survives the pivot; the anchor is now `LKGFingerprint.hash` (sha256 of raw bytes) instead of `SnapshotId` (sha256 of JCS-canonical manifest).

**Final chain shape (3 upstream PRs)**:

| PR | What ships | Killer step |
|---|---|---|
| **PR-1: `@openclaw/workspace`** | package + lint + oc:// URIs + JSONC byte-identical chokepoint + `__OPENCLAW_REDACTED__` sentinel guard + **stripFrontMatter raw-preserve** (folded from former PR-2) | byte-stability foundation across the 9-file workspace surface |
| **PR-2: LKG contract** | `LKGStore` types + reference impl + 326 adversarial scenarios across 75 categories | the carrier — proven backend-agnostic via dual-backend `describe.each([fs, git])`; abstraction boundary holds |
| **PR-3: PolicyIR + `ctx.lkgFingerprint` + hook merger** | PolicyIR types + ctx extension + runtime helpers + **conjunctive AND merger fix** (folded from former PR-4) | end-to-end policy chain-of-custody — types contract + LKG anchor + enforcement merger |

Plus one downstream-only: `claws-guardrails` adapter (no upstream PR by design).

**What sections of this doc are still canonical post-R3**: §5 (claws-guardrails — unchanged); §6 (gateway-as-signer model, but signing is now over `(lkgFingerprint, capturedAt, gatewayKeyId)` instead of `(SnapshotId, ...)` — operator-territory either way); §"Why audit is not in v2 scope" (unchanged); calendar honesty (still applies, modulo PR count going from 6→3).

**What sections are historical / pre-R3**: TL;DR (rewritten below to R3 framing); §1 oc-path (unchanged — still PR-1's primitive); §2 snap (rewritten to "LKG as carrier"); §3 PolicyIR (still applies, with snap → LKG sweep); §4 ctx.snapshotId (rewritten to ctx.lkgFingerprint); §"architectural flow" diagram (still describes the snap-shape; the LKG-shape is in `carve-consumer-catalog.md` and `pr-drafts/v2-lkg-contract.md`).

This doc preserves the R1/R2 archaeology to maintain the audit trail of how the strategy evolved. The **canonical current strategy** is the 3-PR table above + `pr-drafts/v2-lkg-contract.md` (the LKG carrier proposal) + `pr-drafts/v2-policy-ir.md` (the PolicyIR + ctx + merger proposal) + `pr-drafts/PR-1.md` (the workspace + frontmatter proposal).

## TL;DR

**Three pivots collapse the upstream contribution surface to 3 PRs:**

1. **The "policy lives at a content-addressed path" framing** reframes PolicyIR as a generated artifact whose decisions are anchored to a known content fingerprint, not a separate API surface.
2. **Bandit's audit found upstream already ships the guardrails contract** — `registerTrustedToolPolicy` + `runTrustedToolPolicies` are in production at `src/plugins/{host-hooks,trusted-tool-policy}.ts`, so guardrails has zero LoC upstream and a ~50 LoC adapter downstream.
3. **The snap → LKG pivot (R3)** factors out the existing `recoverConfigFromLastKnownGood` mechanism (#70528, `v2026.4.23`) into a generalized `LKGTracker<T>` / `LKGStore` contract any plugin can register against — instead of introducing a parallel `SnapshotStore` abstraction. Less new surface, broader reuse, free recovery, proven against 326 adversarial scenarios across 18 waves.

**The chain composes naturally**: workspace files are byte-stable (PR-1 — JSONC byte-identity + frontmatter raw-preserve); LKG carries them as content-addressed per-file fingerprints (PR-2 — `LKGStore` contract with FS + git backends); PolicyIR is the payload that rides at an LKG-tracked path, with `ctx.lkgFingerprint` threaded into hook-time so decisions anchor to a specific PolicyIR version (PR-3 — types + ctx extension + conjunctive-AND merger fix); guardrails enforce via upstream's existing runner with the threaded anchor.

**Downstream we drop ~6,200 LoC** of parallel implementations after dedup (claws-sdk's snapshot + governance + compliance + audit-chain machinery; pinned per R1-follow-on because audit stays downstream — see "Why audit is not in v2 scope" and "What this replaces" below). Net: claws-sdk shrinks substantially, the Rust port target shrinks with it, and we gain three reusable upstream contracts plus a free recovery primitive that closes #70528-class agent-corruption gaps for any plugin-registered file. **Realistic upstream timeline: 6–10 weeks for the chain to land** — see "Calendar honesty" below.

**Strategic frame in one line**: every policy decision is anchored to the LKG-fingerprinted state of the workspace at a known point in time.

## Hapi wave coordination (R1 amendment 2026-04-29 addressing M-HAPI-COLLISION)

**Honest current state of the hapi worktree**: the hapi wave (`feature/isis-the-weaver` branches downstream of) currently has PR-drafts at `c:/src/claws/.craft/waves/260427+hapi-the-bringer+openclaw-upstream/pr-drafts/PR-{1..6}.md`. There is **no PR-7** in the current revision — that was a numbering artifact from an earlier plan. PR-6 in hapi is the **shipping daemon-shape** for snap (port + HTTP surface + audit chain coupling + 11-verb subcommand). PR-5 is the policy generator + 9-verb subcommand. Both contradict the v2 contract-first proposal (snap = thin contract not daemon; policy = types-only not generator+CLI).

**Earlier drafts of this story claimed "PR-7 retired" — that's wrong; there is no PR-7 to retire.** The actual coordination need is to **amend hapi's PR-5 and PR-6 to contract-first** as part of the v2 proposal wave. We will fix hapi to align with v2, not the other way around.

Concrete coordination steps (NOT touched by this fix-pass per scope; documented here so the v2 proposal package does not pretend they're already done):

1. Hapi `wave.yaml` adds a `v2_proposal_absorption:` section recording (a) PR-5 and PR-6 are deprecated in favor of v2 contract PRs, (b) PR-1/2/3/4 survive as-is, (c) v2 pre-RFC channel-asks gate the rewritten PR-5/6 dispatch.
2. Hapi `PROGRESS.md` adds a row to the stage table: "v2-proposal-absorption — pending — gates implementation-stage cp-4/cp-5 dispatch."
3. Hapi pulse files for cp-4 (PR-5 policy) and cp-5 (PR-6 snap) get marked `superseded_by: <new pulse for v2 contract PR>`.
4. Existing PR-5 and PR-6 drafts move to `pr-drafts/superseded/` with a header note pointing at the v2 pre-RFCs.
5. New PR-drafts authored at `pr-drafts/PR-5-v2-policy-ir.md` and `pr-drafts/PR-6-v2-snap-contract.md` matching the v2 pre-RFC shapes.

These steps are out-of-scope for this docs-only fix-pass (the user's instruction was "do not touch the hapi worktree"), but they are the concrete next action when this proposal package is ratified. Without them, the v2 proposal is a paper exercise that contradicts the actual upstream PR drafts being prepared.

## Gateway-as-signer model (R1 amendment 2026-04-29 addressing M-SIGNING-CHAIN-FICTIONAL)

**Single signer at snapshot capture time. `SnapshotStore` and `PolicyGenerator` contracts have NO signing API.**

The signing model is:

1. The gateway, having received an edit + invoked fileingest validate + invoked `PolicyGenerator.generate(content, snapshotId)` to produce a PolicyIR, calls `Store.capture(workspaceId)` to materialize the snapshot bundle (which includes the PolicyIR at `POLICY_IR_PATH`).
2. Once `capture` returns a `SnapshotId`, the gateway signs `(SnapshotId, capturedAt, gatewayKeyId)` with its production signing key (KeyVault-backed in Eduardo's filing model; ephemeral dev key for `openclaw snap serve`).
3. The signature is persisted in a gateway-controlled location (separate from the Store; the Store does not see signatures and does not need a key).
4. Verification is the gateway's responsibility: trust-boundary-crossing reads call a gateway `verify(snapshotId)` API; in-process reads (within the same gateway) trust the gateway's prior verification.
5. PolicyIR is content INSIDE the signed snapshot. The snapshot's manifest lists `{ path: POLICY_IR_PATH, sha256: <hex of PolicyIR body> }`, and the manifest is what `SnapshotId` hashes (per `snap-pre-rfc.md` "Snapshot ID generation"), so the snapshot's signature transitively covers PolicyIR. PolicyIR does NOT carry its own signature.
6. **`openclaw snap serve` (dev mode) does NOT sign.** Dev snapshots are unsigned and clearly marked as such; production trust boundaries reject unsigned snapshots.

Why this shape:

- **Single signer** = single key, single auditable trust anchor, single rotation flow. Pushing signing into `SnapshotStore` impls would require every Store impl (S3, blob, postgres, in-memory test, ...) to provision a signing key, multiplying the supply-chain attack surface.
- **PolicyIR un-signed individually** is fine because the snapshot's signature covers it. A doctored PolicyIR either (a) changes its `policyId` (detected by recomputing the hash against the snapshot's manifest entry) or (b) changes the manifest itself (detected by recomputing `SnapshotId` against the gateway signature).
- **Stores stay simple.** A `SnapshotStore` impl produces content-addressed bytes; it does not sign, does not verify, does not hold keys. The gateway is the trust authority.
- **Dev mode is honest.** `openclaw snap serve` is for local dev; it does not pretend to be production. Dev snapshots that escape into a production trust boundary are rejected, not silently accepted.

This addresses ciso R1 §1, §2 — chain of custody for snapshots and PolicyIR is no longer fictional; it lives at the gateway layer with a single signing key and explicit verification at every trust-boundary crossing.

**Per-tenant key isolation (R2 fix-pass amendment 2026-04-29 addressing R2-F21 + R2-G-N1 per-tenant note + repo-steward consensus).** Each gateway tenant has its own signing key, managed via the tenant's KeyVault (per Eduardo's filing model). Cross-tenant snapshot signature verification fails by design — a snapshot signed by tenant A's gateway key is not accepted by tenant B's gateway. This isolates blast radius if a tenant key is compromised and matches the existing per-tenant filing pattern. The `verify(snapshotId)` check is implicitly tenant-scoped: the verifier consults its tenant's accepted-keys list (current `keyId` plus a small rotation window of previous keys); a `keyId` outside that list is rejected. Cross-instance same-tenant verification works because the key is shared across instances of the same tenant; cross-tenant does not.

**KeyVault hot-path amortization (R2 fix-pass amendment 2026-04-29 addressing R2-G-N1).** KeyVault sign latency is on the snapshot capture path. To keep capture fast under load, the gateway batches sign operations across concurrent captures (small in-memory queue with a short flush window — order of 50ms or 32 captures, whichever first), or signs asynchronously with synchronous attestation (the capture returns the snapshot ID immediately; the signature lands moments later and verification at trust boundaries waits on it). Either approach keeps p99 capture latency bounded; the choice is a downstream implementation decision, not a contract concern. Verification is similarly amortized: the gateway caches the public-half of the tenant's accepted-keys in-process so warm-path `verify(snapshotId)` is O(1) without a KeyVault round-trip; cold-start MAY round-trip but warm paths MUST not.

## Gateway-emitted audit model (R1 amendment 2026-04-29 addressing M-AUDIT-EMISSION-BYPASSABLE)

Audit emission is **the gateway's responsibility, not a decorator on the Store or a wrapper around the GuardrailProvider**.

Concretely:

- The gateway emits a hash-chained audit entry on every `Store.capture(...)`, `Store.read(POLICY_IR_PATH)`, signing operation, and verification operation.
- The gateway emits a hash-chained audit entry on every `evaluate(event, ctx)` policy decision: block, allow, params, requires-approval.
- The audit chain is canonicalized (RFC 8785 JCS, same as `SnapshotId`) and signed by the gateway's signing key. A tampered audit entry breaks the chain and is detected on `verify`.
- Stores MAY emit additional impl-private metrics/logs but are NOT obligated to emit audit. There is no "audit decorator" for a consumer to skip — the audit emission happens upstream of the Store, at the gateway layer.

Earlier drafts proposed "decorator pattern by the consumer" — that was a security regression (a non-decorating consumer silently drops audit; a malicious dep can replace the decorator with a no-op). The amended posture eliminates this bypass surface.

**Per-session async chains (R2 fix-pass amendment 2026-04-29 addressing R2-G-N2).** Hash-chained audit on every snapshot capture and every policy decision is write-amplification under load. The gateway emits audit events into per-session chains (one chain per gateway session, not one global chain), and chain emission is async with a bounded queue — synchronous policy decisions do not block on disk. Block-until-durable semantics apply only at the trust boundary (e.g., before a policy decision is replayed for an external auditor). This is implementation guidance for any gateway-emitted audit subsystem; not a contract change. Read-side: cache hits on `Store.read(POLICY_IR_PATH)` do NOT emit audit entries — only cache miss + actual store-read does — so the cache benefit is preserved. Per-session chains parallelize cleanly across concurrent sessions; only intra-session decisions serialize, which is the correct shape (a single session's decisions ARE causally ordered).

## Why audit is not in v2 scope (R1-follow-on amendment 2026-04-29)

The earlier instinct was to ask whether audit deserved its own contract package (a fourth entry alongside snap, PolicyIR, oc-path). The answer for v2 is **no — audit stays downstream, not in `plugin-sdk`**, and there is no `@openclaw/audit` package proposed in this wave. The gateway emits audit events as part of its existing observability/event bus; the **format** of the audit entries (envelope shape, hash-chain rule, signing scheme) is documented in **claws docs** and emitted via **`claws-policy-generator/emit/`** (post-rename), not via an upstream contract.

Three reasons audit doesn't belong upstream in v2:

1. **No meaningful consumer choice variation.** `SnapshotStore` has real choice variation (S3, blob, postgres, in-memory test, filesystem) and `PolicyGenerator` has real choice variation (markdown, .rego, .cel, yaml). Audit format does not — every consumer wants the same things (entry-per-decision, hash-chained, signed, queryable). A contract that nobody disagrees on doesn't earn a `plugin-sdk` row; it just adds surface for surface's sake.
2. **Upstream surface budget.** Adding a 4th contract PR (audit) on top of snap + PolicyIR + `ctx.snapshotId` extension would push the chain from ~6 weeks to ~8+ weeks at upstream's actual cadence (see "Calendar honesty" below). Each added PR multiplies bot-review iterations, cross-PR coupling, and Peter's reviewer attention. The user's directive is to ship the chain, not to maximize the contract surface; audit-as-downstream is the budget-respecting call.
3. **Format hasn't baked across enough consumers yet.** Today's audit format (HMAC-chained per-entry + Ed25519-headed chain root) lives in `packages/claws-guardrails/src/audit/` and `packages/openclaw-policy/emit/emit-audit-chain.ts`. It works in claws; it has not run in another consumer's hot path. Standardizing a format upstream **before** it's been stress-tested across two or more consumers risks locking in a shape that consumer #3 has to fork around. The fix: let the HMAC chain + Ed25519 head bake in claws for two release cycles (the 2-week LTS cadence × 2 = ~4 weeks of post-merge soak); revisit for a v3 contract proposal once the format has demonstrably survived a non-claws consumer integration.

This is the **lower-bound discipline** the trim arithmetic depends on: the conservative ~6,200 LoC trim figure (see "What this replaces") includes folding the audit-chain machinery into `claws-policy-generator/emit/` rather than carving it out as a fourth standalone package. If audit had been promoted to `@openclaw/audit`, the trim figure would have included an additional ~1,500 LoC of carve-out churn (rename + re-home + downstream re-import) and the gross trim would have moved up to the ~7,000 LoC range — at the cost of an extra upstream PR. The pinned figure reflects the actual scope.

**Future v3 may propose `@openclaw/audit`.** When/if a non-claws consumer wants to emit audit chains conforming to a shared format, that's the trigger to revisit. Until then: claws emits audit, format is documented in claws docs, and consumer responsibility (per `snap-pre-rfc.md` "Audit emission" R1-follow-on note and `policy-pre-rfc.md` "Audit-chain emission" R1-follow-on note).

**When v3 reconsiders this (R2 fix-pass amendment 2026-04-29 addressing R2-NEW-2).** A future `@openclaw/audit` SDK contract becomes worth the upstream surface budget when ANY of:

- At least 2 non-claws OpenClaw consumers ship audit-emitting gateways with HMAC-chained audit (proves the format has multi-consumer demand)
- SIEM-export integration tests exist that prove the HMAC + Ed25519 contract works across at least 2 consumer-side audit-receivers (proves the format is interop-stable)
- A formal compliance regulation (FedRAMP audit-trail, SOX, or equivalent) names HMAC-chained tamper-evident audit as a control requirement that consumer-side claws cannot satisfy alone (proves regulatory pull)

Until then, audit format lives in `claws-policy-generator/emit/` downstream; the gateway emits events into it via the gateway's existing event bus. The earlier "let it bake for two release cycles" hedge is replaced by these three concrete trigger gates so the v3 ask is falsifiable rather than a perpetual deferral.

## The architectural flow (the spine)

```
                     user edit (lobster-web)
                              |
                              v
              [claws-serve language services]
                              |
                              v
                   fileingest validate
                  (workspace-edit + parser)
                              |
                              v
              gateway calls policy-generator
                  (downstream impl, per-consumer convention)
                  generate(content, snapshotId) → PolicyIR
                              |
                              v
                  PolicyIR (typed artifact)
                              |
                              v
            snap.capture(workspaceId) — Store materializes bundle
            (writes .openclaw/policy/policy-ir.json + emitted plugin)
                              |
                              v
            SnapshotId = sha256(jcs(canonical-manifest))   [RFC 8785]
                              |
                              v
            GATEWAY signs (SnapshotId, capturedAt, gatewayKeyId)
            GATEWAY emits audit entry (hash-chained, canonicalized)
                              |
                              v
                push / SSE notify consumers
                              |
                              v
        on tool call: gateway resolves "current snapshot for this session"
        and threads it through ctx.snapshotId (per policy-pre-rfc Ask §4)
                              |
                              v
                runTrustedToolPolicies(event, ctx)
                              |
                              v
        registered policy reads PolicyIR via snap.read(ctx.snapshotId, POLICY_IR_PATH)
        (cached in plugin-private state at onSnapshotPromoted; see "Hot-path cache discipline")
                              |
                              v
                   Decision (allow/block/params/requireApproval)
                              |
                              v
        adapter translates Decision → PluginToolPolicyDecision
        (fail-closed if evaluator throws; gateway-emits audit on every decision)
                              |
                              v
              upstream gateway hook runner enforces
                  (runTrustedToolPolicies short-circuits on block)
```

The chain is one-directional: edit → validate → generate → store → sign → audit → distribute → read → decide → audit → enforce. Each arrow is a contract surface or an audit point. Most arrows already exist upstream; we're adding the two missing nodes (snap, PolicyIR) and the small `ctx.snapshotId` extension on `PluginHookToolContext`, plus adapting our existing guardrails to the existing upstream slot.

## The four contracts (plus one small extension)

### 1. oc-path (in-flight, Hapi PR-1)

The leaf utility for **live workspace addressing**: a structured `OcPath` interface (`{ file, section?, item?, field?, session? }`) where `file` is one of the 9 entries in `OC_WORKSPACE_FILES` (`SOUL.md`, `TOOLS.md`, `AGENTS.md`, `MEMORY.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, `skills/`, `lobster.yaml`). Plus `parseOcPath` / `formatOcPath` / `isValidOcPath` helpers. **Not a string-typed alias** — earlier drafts of the v2 proposal got this wrong (R1 review M-OCPATH-TYPE-MISUSE).

Currently bundled into Hapi PR-1 (`@openclaw/workspace` package per `wave.yaml`). Already in flight; unblocks every contract above by giving the chain a typed addressing primitive for live workspace files.

**Important distinction from snapshot-internal paths**: `OcPath` addresses files in a LIVE workspace (the structured `oc://{file}/...` scheme). Snapshot-internal paths (where PolicyIR lives, where any file inside a captured bundle lives) are NOT `OcPath` — they are POSIX-style relative strings inside the snapshot, typed as `SnapshotInternalPath` (a string alias defined by the snap contract). The two addressing schemes are not interchangeable. See `snap-pre-rfc.md` "Related work / prior art" for the long form.

### 2. LKG carrier (proposed — R3 replacement for snap, see `lkg-pre-rfc.md` and `pr-drafts/v2-lkg-contract.md`)

An `LKGTracker<T>` / `LKGStore` contract in `src/plugin-sdk/lkg.ts` (~80 LoC: `LKGFingerprint`, `LKGEntry`, `LKGObservation`, `ValidationIssue`, `LKGTracker<T> { path, parse, validate, suspiciousReasons?, shouldRecover? }`, `LKGStore { register, observe, readLastKnownGood, getEntry }`) plus a reference plugin at `extensions/lkg/` (~150 LoC) and a wire-parity conformance test (~80–100 LoC) that asserts the reference implementation matches the existing config-LKG behavior on a fixed fixture set.

**~250–350 LoC upstream total.** Generalizes the pattern shipped at `src/config/io.observe-recovery.ts` (#70528, commit `af56926e2fc4`, `v2026.4.23`) so any plugin can register a per-file tracker. `LKGFingerprint.hash` is sha256 lower-hex over raw bytes (bytes-only content-addressing, simpler than JCS). Signing is operator-territory layered on top (gateway can sign `(lkgFingerprint, capturedAt, gatewayKeyId)` for chain-of-custody — not a contract concern). Failure semantics are fail-closed; the contract surface is exactly `{register, observe, readLastKnownGood, getEntry}` — proven backend-agnostic via dual-backend `describe.each([fs, git])` in 18 waves of adversarial scenarios.

The carrier is per-file (each tracked path has its own fingerprint); workspace-level state composes from the set of LKG fingerprints across the 9 `OC_WORKSPACE_FILES` plus PolicyIR. Recovery is a free byproduct of the contract — no separate API needed.

Two reference backend implementations downstream: `@bic/openclaw-lkg` (FS-backed: `<path>.lkg` companion file) and `@bic/openclaw-lkg-git` (git-backed: `git commit` = promote, `git checkout HEAD --` = recover, multi-agent merge for free vs rclone last-writer-wins on OneDrive-backed workspaces). Both pass the 326 adversarial scenarios.

### 3. PolicyIR (proposed — see `policy-pre-rfc.md` and `pr-drafts/v2-policy-ir.md`)

A types-only contract in `src/plugin-sdk/policy-ir.ts` (~80–150 LoC: `PolicyIR`, `ToolSpec`, `DenyRule`, `Decision`, `PolicyGenerator<TValidated>` interface, `POLICY_IR_PATH = '.openclaw/policy/policy-ir.json'` constant — the LKG-tracked path). Optional companion `policy-ir-runtime.ts` (~50 LoC) for the four lock-point ABI helpers (`loadPolicyIR`, `readPolicyIR`, `validatePolicyIR`, `getCurrentPolicyIR`). `policyId` uses RFC 8785 JCS canonicalization for content-canonical identity that survives re-serialization (this is **defense in depth alongside** `LKGFingerprint.hash` — `policyId` catches body tampering even if bytes look fresh; `LKGFingerprint.hash` catches bytes-on-disk tampering caught by the LKG store's hash check at observe time).

The generator implementation stays downstream — claws ships SOUL.md/TOOLS.md/AGENTS.md compilation; OPA users ship a `.rego → PolicyIR` shim; ecosystem authors implement their own.

### 4. `ctx.lkgFingerprint` extension to `PluginHookToolContext` (proposed, folded into PR-3)

A small (~5 LoC) extension to `PluginHookToolContext` at `src/plugins/hook-types.ts:393-401`, adding an optional `lkgFingerprint?: LKGFingerprint` field. The gateway threads the active LKG fingerprint of the PolicyIR file into the hook context at `before_tool_call` invocation time, so policy decisions are anchored to a specific bytes-hash. Without this, policy plugins must resolve "current PolicyIR" from plugin-private state via observe-promote events, which has known TOCTOU race conditions, multi-tenant policy bleed, and promotion-observation skew. **This is the killer step of PR-3.**

### 4b. Hook approval-merger conjunctive AND fix (folded into PR-3 from former PR-4)

A behavioral fix at `src/plugins/hooks.ts:1008-1013` and `src/plugins/trusted-tool-policy.ts:43-45`: replace the existing first-wins `??` merger with a conjunctive-AND merger so plugin-A's `requireApproval` requirement isn't silently dropped by plugin-B returning no approval. Folded into PR-3 because it's the same chain-of-custody story at the enforcement layer that PolicyIR + `ctx.lkgFingerprint` deliver at the artifact layer. ~10 LoC across two call sites + a shared `mergeApprovals` helper in `src/plugins/approval-merge.ts` + a try/catch wrapper for crash-safety + Swift protocol model regen.

### 5. `claws-guardrails` (no upstream PR — see guardrails-adapter.md)

**0 LoC upstream.** Upstream already has `PluginTrustedToolPolicyRegistration` at `src/plugins/host-hooks.ts:65-72` and `runTrustedToolPolicies` runner at `trusted-tool-policy.ts:8-54`. We adapt our `GuardrailProvider` via a ~50 LoC downstream adapter in `packages/claws-guardrails/src/openclaw-adapter.ts` (renamed from `openclaw-guardrails` per R1-follow-on for naming consistency with `claws-sdk`/`claws-serve`/`claws-snap-server`/`claws-policy-generator`). The adapter exports `toTrustedToolPolicy(provider)` that translates `allow|deny|review|modify` → `block|allow|params|requireApproval`. Adapter fail-closes on evaluator exceptions; reads PolicyIR via `snap.read(ctx.snapshotId, POLICY_IR_PATH)`. `ShellExecProvider` is deleted as a duplicate of upstream's native `~/.openclaw/exec-approvals.json` consumer.

### Total upstream surface (R3 — 3 consolidated PRs)

| Contract | Upstream LoC | Status | Goes in PR |
|---|---:|---|---|
| `@openclaw/workspace` (oc-path + lint + JSONC chokepoint + sentinel guard) | ~3500 | in-flight | PR-1 |
| stripFrontMatter raw-preserve | ~5 | folded into PR-1 (was former PR-2) | PR-1 |
| LKG contract (`LKGStore` types + reference plugin + conformance test) | ~250–350 | proposed (lkg-pre-rfc) | PR-2 |
| PolicyIR (types + optional runtime helpers) | ~80–200 | proposed (policy-pre-rfc) | PR-3 |
| `ctx.lkgFingerprint` extension | ~5 | proposed (policy-pre-rfc Ask §4) | PR-3 |
| Hook merger conjunctive AND fix | ~10 + Swift regen | folded into PR-3 (was former PR-4) | PR-3 |
| `claws-guardrails` (downstream adapter) | 0 | already shipped upstream | (no upstream PR) |
| **Total upstream** | **~3850–4070 LoC** | **3 PRs** | |

For comparison: the original Hapi PR-6 alone was ~1665 LoC of daemon-shape code that yankee's audit predicted would be rejected on architectural grounds. The R3 chain is bigger in absolute LoC because PR-1's `@openclaw/workspace` package is substantial (lint engine, JSONC parser, etc.) — but it's split across coherent responsibilities, each PR has one strategic frame, and the LKG contract (PR-2) ships with 326 adversarial scenarios of evidence backing it.

## Why this works (the design payoff)

### Each contract is small because of the others

- **snap is small** because snapshots aren't a generation/enforcement system — just a state-at-time-T contract with content-addressing and gateway-side signing. It defines `capture/read/list`, not "what's a policy" or "how do you evaluate it" or "who signs."
- **PolicyIR is small** because storage, distribution, signing (transitively via snap), and reading are already solved. Policy is just a typed artifact at a known snapshot-internal path inside a signed snapshot.
- **`ctx.snapshotId` is tiny** (one optional field) but unlocks correct multi-process / multi-tenant behavior.
- **`claws-guardrails` has 0 LoC upstream** because the runner already exists. Our GuardrailProvider conforms to upstream's `evaluate(event, ctx)` shape via a downstream adapter; we lose nothing.

### The composition is natural

A single user edit travels the chain like this. Lobster-web sends a section edit to claws-serve via PATCH. Claws-serve calls fileingest validate (workspace-edit + parser, today downstream). The gateway-side policy-generator (claws-policy-generator post-rename) parses the validated content, lifts it to a `PolicyIR`, and hands it back. The gateway calls `Store.capture(workspaceId)`; the Store materializes a bundle including `.openclaw/policy/policy-ir.json` plus the emitted gateway-plugin.ts; the resulting `SnapshotId` is `sha256(jcs(canonical-manifest))`. The gateway signs the `SnapshotId` with its KeyVault-backed key and emits a hash-chained audit entry. Claws-serve emits SSE; consumers (or the gateway itself) get notified. On the next tool call, the gateway resolves "active snapshot for this session" and threads it through `ctx.snapshotId`. The hook runner invokes `runTrustedToolPolicies(event, ctx)`. Our registered policy reads the PolicyIR from `ctx.snapshotId` via snap (cache-hit in plugin-private state per `onSnapshotPromoted`), applies the rules, and returns a `Decision`. The adapter translates that into a `HookResult` (block/allow/params/requireApproval) — failing closed on any exception, mismatch, or missing PolicyIR. The runner gates the call. The gateway emits the decision as another audit entry. No new wire formats, no new processes, no new auth chains — the existing primitives compose, with two thin contract additions and one small ctx-field extension.

### What this replaces (R1 amendment 2026-04-29 addressing M-TRIM-ARITHMETIC-AMBIGUITY; R1-follow-on 2026-04-29 pinning the figure)

Today claws has roughly **6,200 LoC** of parallel implementation across four claws-sdk subdirectories that each duplicate something the contract chain already addresses. Earlier drafts headlined ~7,889 LoC (gross); that double-counted ~1,689 LoC of overlap between `claws-sdk/src/snapshot/` and `claws-sdk/src/audit/` (the audit-chain machinery is partially intertwined with the snapshot pipeline). The conservative figure deduplicates that overlap. (R2 fix-pass amendment 2026-04-29 addressing R2-M11: prose figure reconciled with the computation at "Trim arithmetic" below — earlier drafts said "~700–1,500 LoC overlap" in prose while the computation used 1,689; the prose now reflects the actual 1,689 value.)

The four delete targets:

- `claws-sdk/src/snapshot/` (~1,556 LoC) — duplicates `claws-snap-server`'s store + manifest pipeline (post-rename from `openclaw-snap`).
- `claws-sdk/src/governance/` (~1,726 LoC) — runtime governance rule families (10 G-* families: g-a2a, g-bound, g-class, g-context, g-data, g-elicit, g-input, g-output, g-perm, g-supply) that overlap with `claws-policy-generator`'s rule-apply.
- `claws-sdk/src/compliance/` (~3,107 LoC) — SOC2/HIPAA/EU-AI-Act evaluators that mirror `claws-policy-generator/ops/evaluate-compliance.ts` (post-rename from `openclaw-policy`).
- `claws-sdk/src/audit/` (~1,500 LoC) — chain emit/verify/WAL/witness machinery that overlaps `claws-policy-generator/emit/emit-audit-chain.ts` (and partially overlaps the snapshot machinery's audit-chain hooks; this is the source of the ~1,689 LoC double-count quantified in the trim arithmetic below).

**Pinned net trim: 6,200 LoC** (no range; firm). **Trim arithmetic** (R1-follow-on 2026-04-29): gross sum 7,889 (1,556 + 1,726 + 3,107 + 1,500) − ~1,689 LoC of audit×snapshot overlap that's actually double-listed = ~6,200 LoC.

The pinned-lower-bound figure is what it is **because audit stays downstream in v2** (see "Why audit is not in v2 scope" above). If audit had been carved into a fourth contract package `@openclaw/audit`, the audit-chain machinery from `claws-sdk/src/audit/` would have re-homed to a new top-level `packages/openclaw-audit/` rather than folding into `claws-policy-generator/emit/`, which would have introduced an additional ~1,500 LoC of carve-out churn (rename + re-home + downstream re-import) and pushed the gross trim into the ~7,000 LoC range. By keeping audit downstream and folding it into `claws-policy-generator/emit/`, the trim collapses cleanly: one rename per package, no fourth-package proliferation, and the ~1,689 LoC of snapshot×audit overlap stays absorbed within the policy-generator destination rather than double-counting across two packages.

After the contract chain lands and the trim wave executes, all of the above collapses into the surviving downstream packages: `claws-policy-generator/` absorbs governance + compliance + audit-chain machinery; `claws-snap-server/` absorbs snapshot. Plus `claws-guardrails/openclaw-adapter.ts` (~50 LoC). Big simplification, single source of truth per domain.

## Calendar honesty (R1 amendment 2026-04-29 addressing M-UPSTREAM-CADENCE-FANTASY)

**The upstream chain is a 6–10 week window, not "1–2 weeks."**

Earlier drafts and user signals framed contract landing as "tight succession" or 1–2 week per PR. That's not credible at upstream's actual cadence. Per `project_openclaw_pr_rules.md` and `project_openclaw_upstream.md`, the constraints are:

- 10 open PRs per author cap (auto-rejected at 11)
- 2-PR-open-at-a-time culture (per the existing Hapi wave's `pr_open_concurrency: 2`)
- 2-week LTS cadence
- Bot reviewer trio (Greptile + Copilot + chatgpt-codex) with P1/P2/P3 categories that must be pre-empted
- AI-assisted disclosure expectation (extra friction; bots ask more questions)
- Refactor-only PRs auto-rejected
- One-thing-per-PR rule strictly enforced
- Codename + spelling + boundary-import + baseline-hash + Swift-model-regen pre-submit gates

A realistic per-PR review cycle for an AI-assisted, types-shaped, contract-introducing PR at this upstream is:

- Day 1: open PR, bot review trio fires within hours, reply to bot findings
- Days 2–4: maintainer (Peter) eyeballs; either signals "directional fit" or asks for restructure
- Days 5–10: address restructure asks (may be 1–3 cycles); the "PR sits open while we re-pitch" zone
- Days 10–14: maintainer sign-off + squash-merge
- **Per-PR realistic median: 10–14 days**; tail to 21+ days on contract-introducing PRs that touch the SDK shape

Chain math against the v2 proposal (R2 fix-pass amendment 2026-04-29 addressing R2-NEW-1 — pre-day-0 hapi-amendment window added; downstream chain-day arithmetic shifts by 1–3d):

| PR | Day-X median | Tail | Notes |
|---|---:|---:|---|
| **pre-day-0 (1–3d)** — hapi wave amendment | -3 to -1 | -1 to 0 | PR-3 (`@openclaw/guardrails` upstream package) reshape; PR-5 (`@openclaw/policy` daemon) drop or reshape; PR-6 (`@openclaw/snap` daemon) drop or reshape; working-tree 7→6 PR renumber committed. Branch left in a state where chain-day-0's PR-1 (oc-path) can dispatch cleanly. See `.craft/plans/hapi-amendment-to-contract-first.md`. |
| oc-path (Hapi PR-1, in flight) | 0 (assume merged by chain start) | +0 | already in flight; depends on pre-day-0 hapi amendment landing first |
| snap | 14 | 21 | depends on oc-path |
| PolicyIR + `ctx.snapshotId` | 28 | 42 | depends on snap; small ctx extension can ride |
| Conformance handshake (snap×PolicyIR) | +6–15 | +21 | 2–3 iteration rounds expected |

**Realistic chain merge: day 28 best case (after pre-day-0 hapi amendment), day 42–56 typical, day 70+ tail. Translation: 6–10 weeks of upstream review window, plus 1–3 days pre-day-0 hapi amendment that lands before any v2 PR opens upstream.** Every downstream chain day shifts by 1–3d relative to wall-clock from the start of this fix-pass; the "day-0" anchor in the table above is "the day oc-path/PR-1 dispatches at upstream", which itself follows the pre-day-0 amendment.

Implications:
- The trim wave **cannot begin** before the chain lands — risk of rollback if a contract changes shape mid-trim is too high.
- Eduardo's deployment timeline cannot assume contracts merged before week 6.
- The post-trim Rust port is gated on the trim, so it sits behind another wave at week 8+.

We will say this honestly in any externally-shareable derivation of this story (the user-facing "calendar" framing must reference the 6–10 week range, not "tight succession").

## Sequencing

```
hapi wave amendment (downstream worktree only)
   |  pre-day-0 (1–3d before chain-day-0)
   |  PR-3 reshape, PR-5/6 drop-or-reshape, 7→6 renumber
   |  see .craft/plans/hapi-amendment-to-contract-first.md
   v
oc-path (in-flight Hapi PR-1)
   |  chain-day 0 / ~week 0
   v
snap contract (yankee's pre-RFC, ~280 LoC)
   |  chain-day 0–14 / ~week 0–3 (median day 14)
   v
PolicyIR contract + ctx.snapshotId extension (pundit's pre-RFC, ~135–205 LoC)
   |  chain-day 14–42 / ~week 2–6 (overlapping iteration with snap; median day 28)
   v
guardrails adapter (downstream, ~50 LoC; no upstream gate)
   |  chain-day 42+ / ~week 6+ (when contracts have landed, downstream wiring)
```

(R2 fix-pass amendment 2026-04-29 addressing R2-NEW-1: pre-day-0 hapi-amendment block added to the diagram so the dependency on `.craft/plans/hapi-amendment-to-contract-first.md` is visible in the chain math, not just an out-of-scope footnote.)

Each contract depends on the previous, no circular deps:
- snap needs oc-path so the live-workspace addressing primitive exists.
- PolicyIR imports `SnapshotId` and `SnapshotInternalPath` from snap; PolicyIR PR must land after (or alongside) snap's PR.
- The `ctx.snapshotId` extension is part of the PolicyIR contribution wave — small enough to ride in the same PR or a sibling small PR.
- guardrails adapter consumes PolicyIR + `ctx.snapshotId`; PolicyIR must land first.
- guardrails has no upstream blocker since `registerTrustedToolPolicy` is already shipped.

The Hapi wave's existing PR-6 (1665 LoC daemon-shape) gets restructured into snap-pre-rfc's three layers (contract, plugin, CLI) before opening — see "Hapi wave coordination" above. PR-5 (policy generator + 9-verb subcommand) similarly collapses to a contract-only PolicyIR PR + downstream generator. Coordination steps for the Hapi wave amendment are listed above; they are out-of-scope for this docs-only fix-pass but are the concrete next action.

**Trim plan timing (R2 fix-pass amendment 2026-04-29 addressing R2-NEW-3).** The trim plan (rollback gates, test-migration manifest, downstream-consumer impact, commit topology, coverage recomputation) is drafted in parallel during the upstream review window — chain-day-7 to chain-day-21 — and must exist before any v2 PR-1 (snap contract) lands upstream. This window is tight but not unrealistic: the trim plan is a downstream-only artifact; it doesn't depend on upstream maintainer time. The wave must NOT enter the post-merge phase without the trim plan in place. Naming an explicit calendar for the trim plan's drafting prevents the deadline-pressure draft failure mode release-eng R2-NEW-3 flagged.

## Downstream implications for claws

### Trim wave scope

Per whiskey's surface audit combined with the three Peter-lens audits (and the R1 reconciliation per M-TRIM-ARITHMETIC-AMBIGUITY):

- **Delete** `claws-sdk/src/snapshot/` (~1,556 LoC) — duplicate of `openclaw-snap`.
- **Delete** `claws-sdk/src/governance/` (~1,726 LoC) — fold the 10 G-* rule families into `claws-policy-generator/governance/`.
- **Delete** `claws-sdk/src/compliance/` (~3,107 LoC) — fold into `claws-policy-generator/compliance/`.
- **Delete** `claws-sdk/src/audit/` (~1,500 LoC, with ~1,689 LoC of overlap against the snapshot subdir already counted there per the trim arithmetic above) — fold the chain machinery into `claws-policy-generator/emit/`. **R1-follow-on 2026-04-29**: the destination is now firm — audit stays downstream in v2 (see "Why audit is not in v2 scope" above); no `@openclaw/audit` carve-out is in scope. The earlier "or a new `openclaw-audit/` if cross-package demand emerges" hedge is retracted; future v3 may revisit.
- **Move** `claws-sdk/src/compiler/` (~11,200 LoC) — entirely CLI-bound, never imported by claws-serve. Relocates to `packages/claws/src/sdk/` or a new `packages/claws-cli-sdk/`.
- **Result**: claws-sdk drops from ~66,500 LoC to **~10–15k LoC** (factor of ~5–6× reduction). The conservative net trim is ~6,200 LoC after deduplicating the snap×audit overlap.

### Renames + new packages

- `packages/openclaw-snap/` → `packages/claws-snap-server/` — clarifies "this is the claws-side server, conforming to the upstream `SnapshotStore` contract." Drop the `openclaw-` prefix since it's not the contract package.
- `packages/openclaw-policy/` → `packages/claws-policy-generator/` — same reasoning. Absorbs governance + compliance + audit-chain machinery from claws-sdk. Stays a `PolicyGenerator<CapabilityManifest>` impl conforming to the upstream `PolicyIR` type.
- `packages/openclaw-guardrails/` → `packages/claws-guardrails/` (R1-follow-on 2026-04-29) — same reasoning, applied for naming consistency. Adapters can still follow the project's package naming convention; the `openclaw-` prefix is reserved for the upstream contract packages, while the `claws-` prefix marks the downstream consumer-of-contract packages (matching `claws-sdk`, `claws-serve`, `claws-snap-server`, `claws-policy-generator`). Adds `src/openclaw-adapter.ts` exporting `toTrustedToolPolicy(provider: GuardrailProvider): PluginTrustedToolPolicyRegistration`. Decision-vocabulary translation lives here. `ShellExecProvider` is deleted (upstream consumes `exec-approvals.json` natively).

(Repo-steward R1 HC-BLOCK 3 flagged that the rename rule should be either all-renamed or explicit about why guardrails was special. R1-follow-on 2026-04-29 resolves this: all three downstream packages rename consistently — `claws-snap-server`, `claws-policy-generator`, `claws-guardrails`. The earlier draft's "guardrails is the adapter, signaling the meeting point" justification for keeping the bare `openclaw-guardrails` name has been retracted; the naming convention takes precedence over the meeting-point semantic.)

### Rust port scope (post-trim)

The whiskey audit's earlier ~14.8k LoC LANGUAGE-SERVICES bucket shrinks once parallel implementations drop. **Rust port target is conditional on trim landing, post-trim contract stability, and the unaddressed rust-port R1 findings (M-CRYPTO-MISLABEL, M-CUTOVER-ROLLBACK, RB-violation, codename discipline).** The earlier "2-3 weeks at sustainable pace" claim is retracted — at upstream's realistic cadence and given the rust-port-plan revision must close 4 critical findings before dispatch, the honest scope is **5–6 weeks at sustainable pace, NOT within the user's recurring "1–2 weeks" ambition window.** See `claws-rust-port.md`'s `revision_pending: true` flag; that should escalate to `revision_required_before_dispatch: true` with explicit dependencies on (a) the trim wave landing, (b) the rust-port-plan-R1 findings closing, (c) contract-stability signal post-trim.

## Open questions for #clawtributors (the asks)

1. **Architectural framing** — does Peter agree with "policy lives in snapshots" + the gateway-as-generator model? If he sees policy living on a separate API surface (e.g., a registry plugin), the PolicyIR contract design differs and this whole chain re-shapes.
2. **Snap + PolicyIR as separate PRs or one combined?** — small enough that one PR could cover both contracts; separate PRs are easier to review (per `CONTRIBUTING.md:122` "Keep PRs focused"); coordination overhead favors separating.
3. **Capability-table membership** (`docs/plugins/architecture.md:34-50`) — snap row, PolicyIR row, neither, or both? **Pre-answered: recommend neither for v1**; both ship as types-only SDK modules.
4. **Naming** — `WorkspaceSnapshot` vs `OcSnapshot` (avoiding collision with the existing `src/gateway/protocol/schema/snapshot.ts` for presence/health); `PolicyIR` vs `WorkspacePolicy` vs `ToolGovernancePolicy` (Peter's house style).
5. **Sequencing** — would Peter prefer snap+policy contracts post-oc-path immediately (small, focused PRs), or batched after the larger Hapi sequence completes (less context-switching for reviewers)?
6. **`ctx.snapshotId` extension** — confirm the small `PluginHookToolContext` extension is acceptable, or propose alternative anchoring (per `policy-pre-rfc.md` Ask §4).
7. **Canonicalization** — RFC 8785 JCS for both `SnapshotId` and `policyId` (recommended; per `snap-pre-rfc.md` Ask §4 and `policy-pre-rfc.md` Ask §6).

## What's NOT in scope of this story

- **Actual Rust port of claws-serve** — separate plan; needs to happen after trim. Sized in `claws-rust-port.md` and re-estimated downward by whiskey's surface audit; honest scope per "Rust port scope" above is 5–6 weeks at sustainable pace, conditional on R1 findings closing.
- **Eduardo's deployment-pattern decision** — separate audit; serve-deploy-bridge plan owns A/B/C deployment shapes for snap-daemon co-deployment.
- **Lobster-web roadmap** — separate; consumes from this contract chain via claws-serve's existing LBC routes.
- **OpenClaw upstream releases / cadence** — Hapi wave coordinates with the 2-week release train; the chain itself is 6–10 weeks regardless.
- **Hapi worktree amendments** — out of scope for this docs-only fix-pass; documented above as the concrete next action.
- **Trim wave plan drafting** — separate doc; this story sketches the scope but the rollback gates, test-migration manifest, downstream-consumer impact analysis, commit topology, and coverage recomputation gate live in the trim plan.

## Cross-contract concerns surfaced during drafting

A few things worth flagging that aren't pre-RFC-blockers but should be on the user's radar:

- **PolicyIR's `R0–R5` tier labels are claws-specific.** The current 220-LoC `types/index.ts` in `openclaw-policy` leans on R0/R1/R2/R3/R4/R5 sensitivity labels that mirror our compliance format. Pundit's audit calls this out for pruning before submission. Re-frame as a generic `Sensitivity` enum upstream and document the **downstream R5-lowering**: `claws-policy-generator/` emits PolicyIR where R5 actions appear as explicit `denyRules`, so even a non-claws guardrail enforces them. The upstream contract is generic; the downstream artifact carries claws semantics via the rule encoding (per ciso R1 §8).
- **`HostContext` / `ProviderLifecycle` upstream-asymmetry.** Our `GuardrailProvider` has a richer lifecycle (`init(HostContext)`, `onSnapshotPromoted`, `onStageModeChanged`) than upstream's `register(api)` model. The adapter has to bridge or expose the claws-side context to the policy at construction time, not at registration time. Bandit flagged this as adapter-shaped; resolvable via closure-capture but worth verifying with one #clawtributors reply before adapter ships. (Fully resolvable now that `ctx.snapshotId` threads through; the per-tenant snapshot anchor was the load-bearing piece.)
- **Snap × PolicyIR conformance test couples two upstream PRs.** The cross-package canonicalizer-version handshake means snap's PR can't merge cleanly without PolicyIR's PR also progressing. Per gateway-eng R1 §3, naming RFC 8785 JCS in **both** contracts (which we now do, per `snap-pre-rfc.md` "Snapshot ID generation" and `policy-pre-rfc.md` "Canonicalization") **uncouples** the conformance test from the cross-PR handshake — both sides reference the same standard, so the test becomes a unit test against the standard, not a moving-target cross-PR negotiation. Expect 1–2 iteration rounds rather than the earlier 2–3.
- **Hot-path cache discipline.** The policy plugin caches PolicyIR in plugin-private state on `onSnapshotPromoted`. With `ctx.snapshotId` threaded, the plugin reads `ctx.snapshotId` at evaluate-entry, looks up the cached PolicyIR keyed on `(sessionKey, snapshotId)`, and refreshes from snap if not cached. This bounds the staleness window to "between cache miss and snap.read" — sub-millisecond if snap is in-process, otherwise bounded by the Eduardo-deployment HTTP latency. Fail-closed if `ctx.snapshotId` is missing or cache-miss + snap-read both fail.

## Sister docs

- `.craft/out/proposals/snap-pre-rfc.md` — yankee's snap pre-RFC (channel-shareable; R1-amended)
- `.craft/out/proposals/policy-pre-rfc.md` — pundit's policy pre-RFC (channel-shareable; R1-amended)
- `.craft/out/proposals/guardrails-adapter.md` — bandit's adapter design (internal-only; R1-amended)
- `.craft/out/audits/snap-openclaw-design-fit.md` — yankee's Peter-lens audit
- `.craft/out/audits/policy-openclaw-design-fit.md` — pundit's Peter-lens audit
- `.craft/out/audits/guardrails-openclaw-design-fit.md` — bandit's Peter-lens audit
- `.craft/out/audits/claws-surface-audit.md` — whiskey's full surface audit (drives the trim)
- `.craft/out/audits/snap-upstream-audit.md` — x-ray's earlier audit (kept for facts; conclusions superseded by yankee)
- `.craft/out/panels/v2-proposal/R1-consolidated.md` — R1 panel review consolidated (drives this amendment)

## Footer

Authored 2026-04-29 by giodl@microsoft.com. R1-amended 2026-04-29 to address consolidated panel review (hapi state honest, gateway-as-signer, gateway-emitted audit, trim arithmetic reconciled, upstream cadence honest, ctx.snapshotId threaded, OcPath vs SnapshotInternalPath split, PR numbering corrected to PR-1/PR-5/PR-6 per actual `wave.yaml`). R1-follow-on 2026-04-29 (audit stays downstream — no `@openclaw/audit` package in v2; trim figure pinned at 6,200 LoC firm — no range; `claws-guardrails` rename for naming consistency with the rest of the `claws-*` package set). R2 fix-pass 2026-04-29 to address consolidated R2 panel findings (R2-M11 trim-prose 1,689-LoC reconciled with computation; R2-F21 per-tenant signing-key statement explicit in §"Gateway-as-signer model"; R2-G-N1 KeyVault hot-path amortization paragraph added; R2-G-N2 per-session async audit-chain paragraph added; R2-NEW-1 pre-day-0 hapi-amendment window added to calendar table + sequencing diagram; R2-NEW-2 v3 `@openclaw/audit` trigger gates spec'd; R2-NEW-3 trim-plan parallel-drafting timing pinned at chain-day-7 to chain-day-21). AI-assisted (planning agents for the audits + this drafting); per upstream PR rules.
