# Issue draft — PR-3: PolicyIR + `ctx.lkgFingerprint` + hook merger conjunctive AND

**File this issue BEFORE filing PR-3.** Purpose: maintainer thumbs-up on the proposed types contract for `PolicyIR`, the small `PluginHookToolContext` extension that threads the active LKG fingerprint at hook time (TOCTOU defense), and the conjunctive-AND merger fix at `hooks.ts:1008-1013` + `trusted-tool-policy.ts:43-45`.

**Submit via**: `gh issue create -R openclaw/openclaw -t "..." -F <this-file-body>` or via the Feature-request template.

**AI-assisted**: yes. Drafted with Claude Opus 4.7. Backed by the LKG carrier work in PR-2.

---

## Title

`[Feature]: PolicyIR types contract + ctx.lkgFingerprint extension + conjunctive-AND hook merger fix (end-to-end policy chain-of-custody)`

---

## Summary

Three coordinated changes that together close the chain-of-custody gap for policy decisions:

1. **`src/plugin-sdk/policy-ir.ts`** (~80–150 LoC) — types-only contract for `PolicyIR`, `ToolSpec`, `DenyRule`, `Decision`, `RiskLevel`, `Sensitivity`, `PolicyGenerator<TValidated>` interface. The `policyId` is `lower-hex(sha256(jcs(body)))` for content-canonical identity.

2. **`src/plugin-sdk/policy-ir-runtime.ts`** (~50 LoC, optional companion) — four lock-point ABI helpers (`loadPolicyIR`, `readPolicyIR`, `validatePolicyIR`, `getCurrentPolicyIR`) so PolicyIR-aware plugins can compile against a stable surface.

3. **`src/plugins/hook-types.ts:393-401`** (`PluginHookToolContext`) — adds optional `lkgFingerprint?: LKGFingerprint` field (~5 LoC). Gateway threads the active LKG fingerprint of the PolicyIR file at hook-invocation time so policy decisions are anchored to a specific bytes-hash. **This is the killer step.**

4. **`src/plugins/hooks.ts:1008-1013` + `src/plugins/trusted-tool-policy.ts:43-45`** (~10 LoC) — replace the existing first-wins `??` merger with a conjunctive-AND merger so plugin-A's `requireApproval` requirement isn't silently dropped by plugin-B returning no approval. Both call sites import the same `mergeApprovals` helper from a new shared module (`src/plugins/approval-merge.ts`).

Total upstream: ~145–220 LoC across 4 files plus a tiny `PluginHookToolContext` extension and Swift protocol model regen.

---

## Problem to solve

Three coupled gaps in the current policy story:

**(1) No shared artifact-shape contract.** Every consumer rolls their own — claws alone has parallel implementations across `openclaw-policy/` (~6.2k LoC), `claws-sdk/src/governance/` (~1.7k LoC), and `claws-sdk/src/compliance/` (~3.1k LoC). Without a shared shape, governance drifts per-consumer and policy-bearing artifacts can't cross ecosystem boundaries.

**(2) No anchor for decisions.** Without `ctx.lkgFingerprint` thread-through, policy plugins resolve "current PolicyIR" from plugin-private state via observe-promote events. This has known TOCTOU race conditions, multi-tenant policy bleed, and promotion-observation skew across plugin replicas. A stale plugin replica can silently evaluate against an old policy version while the gateway has already promoted a new one.

**(3) Silent dropping of approval requirements at the merger.** `src/plugins/hooks.ts:1008-1013` uses `??` (nullish-coalesce) to combine `requireApproval` decisions from the plugin chain. This is **first-wins**: the first plugin that returns a `requireApproval` descriptor wins, every subsequent plugin's `requireApproval` is silently dropped. For governance plugins enforcing R5 (irreversible-external) or RESTRICTED-data invariants, this is a chain-of-custody bug — plugin-A's approval requirement can be silently discarded by plugin-B returning no approval, leaving the agent free to act on a tool that should have required external review. The same first-wins shape ALSO appears at `src/plugins/trusted-tool-policy.ts:43-45`.

Why fix all three together: they're the same chain-of-custody story at different layers (artifact shape, anchor, enforcement). Splitting them would orphan one layer.

---

## Proposed solution

**Killer step**: `ctx.lkgFingerprint` thread-through closes the TOCTOU window. The gateway resolves the current LKG fingerprint of the PolicyIR file at hook-invocation time and threads it into `PluginHookToolContext`. Plugin caches keyed on `(sessionKey, lkgFingerprint.hash)`; cache miss triggers reload via `loadPolicyIR`. Stale replicas evict and reload automatically.

**Defense in depth via two anchors**:
- `policyId = sha256(jcs(body))` — content-canonical identity that survives re-serialization. Detects body tampering even if the on-disk bytes look fresh.
- `LKGFingerprint.hash = sha256(rawBytes)` — bytes-on-disk integrity check enforced by the LKG store at observe time.

A doctored PolicyIR either changes its `policyId` (detected by `validatePolicyIR`'s round-trip) or changes its bytes (detected by the LKG hash mismatch on next observe).

**Merger fix**: conjunctive AND. `requireApproval` field on the merged hook result widens from `ApprovalDescriptor` to `ApprovalDescriptor | ApprovalDescriptor[]`. Companion app receives an array; supervisor must approve every descriptor before the action proceeds. Crash-safety wrapper at the per-plugin invocation site so plugin-A's approval survives plugin-B's exception.

**What does NOT change**: no generator implementation upstream (each consumer ships their own — claws ships `claws-policy-generator/`, OPA users ship a `.rego→PolicyIR` shim); no rule-family definitions (G-A2A, G-CONTEXT etc. are claws-specific); no CLI verb (`claws policy ...` stays downstream); no storage (LKG solves it via the carrier in PR-2); no signing API (signing is operator-territory layered on top); no evaluation runtime changes (the existing `runTrustedToolPolicies` runner is the evaluator).

---

## Killer test (the one thing this PR proves)

**`policy-ir-toctou-defense.test.ts`** — gateway promotes PolicyIR v1 (lkgFingerprint = H1); plugin caches the IR keyed on H1; gateway promotes v2 (lkgFingerprint = H2); next tool call threads `ctx.lkgFingerprint = H2`; plugin's cache miss triggers reload; decision is anchored to v2. Without `ctx.lkgFingerprint` thread-through, the stale replica would silently evaluate against the old policy.

This is the failure mode that surfaces in production months after merge — multi-tenant policy bleed, plugin replicas drifting apart, stale enforcement against fresh policy. Closing the TOCTOU window in the contract layer (rather than asking every plugin to defend on its own) is the load-bearing claim.

---

## Alternatives considered

- **`getCurrentLKGFingerprint()` plugin API** instead of threading via `ctx`. Rejected: same TOCTOU window — the call returns the fingerprint that was current at call time, not at hook-invocation time. Threading via `ctx` is the only way to anchor a specific decision to a specific bytes-hash.
- **`ctx.snapshotId`** (the prior framing under a snapshot-store abstraction). Rejected after the v2 chain pivoted to LKG as the carrier — `LKGFingerprint` is the right shape for per-file content-addressing.
- **Keep first-wins merger; document the gap.** Rejected: silent dropping of approval requirements is a chain-of-custody bug, not a documentation issue.

---

## Scope boundary (what this PR does NOT do)

- No `PolicyGenerator` implementation upstream. Each consumer ships their own.
- No CLI verbs upstream. `claws policy ...` stays downstream.
- No new audit/signing surface — signing is operator-territory; audit format stays downstream in v2 per `realigned-story.md` "Why audit is not in v2 scope".
- No compliance rubrics (SOC2/HIPAA/EU-AI-Act).
- No rule-family definitions. PolicyIR's `denyRules[].when` is the wire shape; consumers define what predicates mean.

---

## Evidence

- **TOCTOU defense conformance test**: `policy-ir-toctou-defense.test.ts` passing.
- **Cross-anchor independence**: `policyId` and `LKGFingerprint.hash` use different canonicalization (JCS vs raw bytes); each catches different tamper modes. Defense in depth.
- **Merger conjunctive AND**: 10 new/updated tests covering F-17..F-25 from the wave's findings catalog (multi-plugin merger collects all descriptors; plugin-A's approval survives plugin-B's exception; conjunctive AND on the supervisor side; existing tests asserting first-wins must update — break is the proof).
- **Type-flow proof**: `PolicyIR.generatedFrom` is typed as `LKGFingerprint` (imported from `@openclaw/plugin-sdk/lkg` — sister PR). Compile-time enforcement that PolicyIR is correctly anchored.
- **Backward compatibility**: `ctx.lkgFingerprint` is optional; existing consumers compile and run identically. Merger fix is gated by the array-coercion codemod (single-line snippet for consumers reading `result.requireApproval` as a single object).

---

## Linked PRs

- **PR-1**: `@openclaw/workspace` (workspace addressing primitive — composes upstream of policy generation)
- **PR-2**: LKG contract — **MUST land first OR ship together**, since `LKGFingerprint` is imported from there and `PolicyIR` is LKG-tracked at `POLICY_IR_PATH`
- This PR (PR-3): the payload + the anchor + the enforcement fix.

---

## Maintainer asks

1. **(Ask §1)** Does the "PolicyIR is an LKG-tracked artifact" framing survive review? This is the load-bearing premise. If rejected, PolicyIR doesn't ship in this shape.
2. **(Ask §2)** Is `PolicyGenerator<TValidated>` interface useful upstream, or prefer types-only?
3. **(Ask §4)** `ctx.lkgFingerprint` extension OK? Alternatives: `getCurrentLKGFingerprint()` API, or keep current observe-promote event flow with documented TOCTOU window.
4. **(Ask §5)** Is `runTrustedToolPolicies` fail-closed on evaluator throws today? If not, this PR adds a try/catch with a documented fail-closed semantic.
5. **(Ask §6)** Acceptable to combine the merger fix with the types contract in one PR? Or prefer to split (types-additive PR + behavior-fix PR)? The story is unified ("end-to-end policy chain-of-custody") but the changes have different review surfaces.
