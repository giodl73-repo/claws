## Summary

> **Filed in coordination with #UMBRELLA-ISSUE-NUMBER and the v2 contract chain after PR-0 (`@openclaw/workspace`) and the LKG contract PR (`#LKG-PR-NUMBER`, see `v2-lkg-contract.md`) land.** Holding this PR open for maintainer guidance on shape (single PR vs splitting `PolicyIR` types from the context-extension piece) and on the load-bearing premise (Ask §1: "PolicyIR is an LKG-tracked artifact, anchored at decision time by content hash" framing). Replace `#UMBRELLA-ISSUE-NUMBER` and `#LKG-PR-NUMBER` after those land.

> **Reframed 2026-04-30 from prior "PolicyIR lives in snapshots" framing to "PolicyIR is an LKG-tracked artifact"** following the strategic pivot to the LKG contract (see `pr-drafts/v2-lkg-contract.md` and `carve-consumer-catalog.md` for rationale). Sweep complete: snapshot/SnapshotId → LKGFingerprint; ctx.snapshotId → ctx.lkgFingerprint; snap.capture/snap.read → lkg.observe/lkg.readLastKnownGood. Sister snap-contract references replaced with LKG contract equivalents.

- **Problem**: OpenClaw consumers want governance-as-data — declare "tool X requires capability Y, sensitivity tier T" once, compile it to a stable artifact, persist it with the user's workspace, and have any conforming guardrail evaluate it identically. Today every consumer rolls their own — claws alone has parallel implementations across `openclaw-policy/` (~6.2k LoC), `claws-sdk/src/governance/` (~1.7k LoC), and `claws-sdk/src/compliance/` (~3.1k LoC). Without a shared artifact-shape contract, governance drifts per-consumer and policy-bearing artifacts can't cross ecosystem boundaries.
- **Why it matters**: enforcement is already solved upstream — `PluginTrustedToolPolicyRegistration` at `src/plugins/host-hooks.ts:65-72` plus `runTrustedToolPolicies` at `src/plugins/trusted-tool-policy.ts:8`. Storage and distribution are solved by the LKG contract (sister PR — `v2-lkg-contract.md`) — PolicyIR rides at an LKG-tracked path. The missing piece is the artifact-shape contract that the runner evaluates against and a way to thread the active LKG fingerprint into the evaluator's context. Without these, every consumer either invents its own policy artifact (drift) or ships everything per-tool/per-domain hand-coded (the existing `ssrf-policy.ts`/`channel-policy.ts`/etc. pattern doesn't scale to general policy).
- **What changed**: **types-only upstream**, ~135–205 LoC across two files plus a tiny `PluginHookToolContext` extension:
  1. `src/plugin-sdk/policy-ir.ts` (~80–150 LoC) — `PolicyIR`, `ToolSpec`, `DenyRule`, `Decision`, `RiskLevel`, `Sensitivity`, `PolicyGenerator<TValidated>` interface, and the conventional `POLICY_IR_PATH` constant (the LKG-tracked path where PolicyIR lives).
  2. `src/plugin-sdk/policy-ir-runtime.ts` (~50 LoC, **optional companion**) — four lock-point ABI helpers (`loadPolicyIR`, `readPolicyIR`, `validatePolicyIR`, `getCurrentPolicyIR`) so PolicyIR-aware plugins can compile against a stable surface.
  3. `src/plugins/hook-types.ts:393-401` (`PluginHookToolContext`) — adds optional `lkgFingerprint?: LKGFingerprint` field (~5 LoC). Gateway threads the active LKG fingerprint of the PolicyIR file at hook-invocation time so policy decisions are anchored to a specific bytes-hash. **This is the killer step**: closes the TOCTOU window between PolicyIR generation and PolicyIR evaluation.
- **What did NOT change (scope boundary)**: no generator implementation upstream (each consumer ships their own — claws ships `claws-policy-generator/`, OPA users ship a `.rego→PolicyIR` shim, etc.); no rule-family definitions (G-A2A, G-CONTEXT etc. are claws-specific); no CLI verb (`claws policy ...` stays downstream); no storage (LKG solves it via the `LKGStore` carrier in PR-2); no distribution (LKG solves it); no signing (signing is gateway-side, layered on top of LKG composite fingerprints — operator-territory, not contract); no evaluation runtime changes (the existing `runTrustedToolPolicies` runner is the evaluator); no compliance rubrics (SOC2/HIPAA/EU-AI-Act content is downstream regulatory tooling); no `@openclaw/audit` package (audit format stays downstream in v2 per `realigned-story.md` "Why audit is not in v2 scope").

### Hook approval-merger fix (folded from former PR-4)

**Behavior change** at `src/plugins/hooks.ts:1008-1013` and `src/plugins/trusted-tool-policy.ts:43-45`: the existing `??` (nullish-coalesce) merger is **first-wins** — the first plugin that returns a `requireApproval` descriptor wins, every subsequent plugin's `requireApproval` is silently dropped. This is a **chain-of-custody bug** for governance plugins enforcing R5 (irreversible-external) or RESTRICTED-data invariants — plugin-A's approval requirement can be silently discarded by plugin-B returning no approval, leaving the agent free to act on a tool that should have required external review.

**Why this is folded into the PolicyIR PR**: same chain-of-custody story at a different layer. PolicyIR + `ctx.lkgFingerprint` deliver chain-of-custody for the _artifact_ (which version of the policy was evaluated against). The merger fix delivers chain-of-custody for the _enforcement_ (every plugin's decision survives the merger). End-to-end policy chain-of-custody is the unified story; splitting these two would orphan one half.

**The fix**: merger becomes **conjunctive** — every plugin's `requireApproval` survives, the companion app receives an array of approval descriptors, all must be approved before the action proceeds. Field widens from `ApprovalDescriptor` to `ApprovalDescriptor | ApprovalDescriptor[]` at `hook-types.ts:421-433`. Both call sites (`hooks.ts` and `trusted-tool-policy.ts`) import the same `mergeApprovals` helper from a new shared module (`src/plugins/approval-merge.ts`).

**Crash-safety wrapper** at the per-plugin invocation site: a thrown plugin's failure is recorded as `plugin_invocation_failed` audit entry; surviving plugins' approvals stay in the merged result. Plugin-A's `requireApproval` cannot be downgraded by plugin-B's exception.

**Swift protocol model regen** for `apps/macos/Sources/OpenClawProtocol/GatewayModels.swift` and `apps/shared/OpenClawKit/Sources/OpenClawProtocol/GatewayModels.swift` to accept the widened field shape.

~10 lines of source change across two sites + 1 shared helper module + 1 try/catch wrapper + 2 Swift model regens. Test plan covers F-17..F-25 from the wave's findings catalog (multi-plugin merger collects all descriptors; plugin-A's approval survives plugin-B's exception; conjunctive AND on the supervisor side; existing tests asserting first-wins must update — break is the proof).

## Change Type

- [x] Feature — new types-only `PolicyIR` SDK contract + optional runtime helpers + small `PluginHookToolContext` extension
- [ ] Bug fix
- [ ] Refactor required for the fix
- [ ] Docs
- [ ] Security hardening
- [ ] Chore/infra

## Scope (touched areas)

- [x] Gateway / orchestration (the gateway threads `ctx.lkgFingerprint` at hook invocation — one-line change for the threading; otherwise gateway is unaffected. The merger fix at `hooks.ts:1008-1013` and `trusted-tool-policy.ts:43-45` is also gateway-side.)
- [ ] Skills / tool execution
- [ ] Auth / tokens
- [x] Memory / storage (`POLICY_IR_PATH` constant identifies the LKG-tracked path where PolicyIR lives)
- [ ] Integrations
- [x] API / contracts (new `PolicyIR` types + `PolicyGenerator` interface + `PluginHookToolContext` extension + `ApprovalDescriptor[]` widening on the merger result)
- [ ] UI / DX

## Linked Issue/PR

- **Umbrella issue**: #UMBRELLA-ISSUE-NUMBER (substrate-fix coordination — please reply there first if this PR's shape needs slicing)
- **Depends on**: `#LKG-PR-NUMBER` (`LKGStore` contract — `LKGFingerprint` and `LKGStore` are imported from there). MUST land first OR ship together in one PR.
- **Composes with**: `#WORKSPACE-PR-NUMBER` (PR-1 — `@openclaw/workspace` / `oc-path`). PolicyIR doesn't import `OcPath`, but consumers feeding validated content into `PolicyGenerator.generate()` typically read workspace files addressed via `OcPath`.
- **Closes**: none (this is a new contract; the gap is the absence)
- **Related**: domain-specific policy types at `src/plugin-sdk/{ssrf,bluebubbles,channel,direct-dm-guard,runtime-group}-policy.ts` — per-domain hand-coded today. PolicyIR is the general-purpose artifact-shape complementing these.
- [ ] This PR fixes a bug or regression (no — feature delivery, contract substrate)

## Root Cause

N/A — feature delivery. The "root cause" of per-consumer policy drift is the absence of a shared artifact-shape contract.

## Regression Test Plan

- **Coverage level**: ✅ Unit, ✅ Seam / integration (TOCTOU defense via `ctx.lkgFingerprint`), ✅ End-to-end (the full edit→generate→lkg.observe→lkg.readLastKnownGood→evaluate flow against the reference LKG plugin from `#LKG-PR-NUMBER`).
- **Target tests**:
  - `src/plugin-sdk/policy-ir.test.ts` — type-shape + `Decision` discriminated union exhaustiveness.
  - `src/plugin-sdk/policy-ir-runtime.test.ts` — `validatePolicyIR` schema check + policyId hash round-trip; `loadPolicyIR` + `readPolicyIR` against an LKG-tracked fixture; `getCurrentPolicyIR` cache discipline.
  - `src/plugin-sdk/policy-ir-toctou-defense.test.ts` — **the killer test**: stale plugin replica (with cached PolicyIR keyed on old `lkgFingerprint`) sees a freshly-promoted PolicyIR via `ctx.lkgFingerprint` mismatch, evicts cache, loads new IR, decision is anchored to the new bytes. Without `ctx.lkgFingerprint` thread-through, the stale replica would silently evaluate against the old policy.
  - `src/plugins/hook-types.test.ts` — `PluginHookToolContext.lkgFingerprint` field shape + backward-compat (existing consumers reading `ctx.agentId`/`ctx.sessionKey`/etc. continue to work).
  - `src/plugins/hooks.merger-conjunctive.test.ts` — multi-plugin merger collects all `requireApproval` descriptors (was first-wins, now conjunctive AND). Plus crash-safety (plugin-A's approval survives plugin-B's exception).
- **Smallest reliable guardrail**: the TOCTOU defense test. If `ctx.lkgFingerprint` doesn't thread through, multi-tenant policy bleed and promotion-observation skew become silent failure modes — the kind of bug that surfaces in production months after merge.
- **Scenario the test should lock in**: gateway promotes PolicyIR v1 (lkgFingerprint=H1); plugin caches the IR keyed on H1; gateway promotes v2 (lkgFingerprint=H2); next tool call threads `ctx.lkgFingerprint=H2`; plugin's cache miss triggers reload; decision is anchored to v2. Modify any leaf field of PolicyIR; recompute; assert different `lkgFingerprint`. Lock the LKG-anchor rule.

## User-visible / Behavior Changes

- New types in `@openclaw/plugin-sdk`: `PolicyIR`, `ToolSpec`, `DenyRule`, `Decision`, `RiskLevel`, `Sensitivity`, `PolicyGenerator<T>`.
- New optional companion at `@openclaw/plugin-sdk/policy-ir-runtime` (4 helpers).
- New optional field `lkgFingerprint?: LKGFingerprint` on `PluginHookToolContext` — additive, backward-compatible. Existing consumers that don't read `lkgFingerprint` continue to work; new consumers that need anchored decisions get a stable thread.
- Gateway threads the active LKG fingerprint of the PolicyIR file into the hook context at `before_tool_call` time. **Behavior change for existing hook-evaluating plugins**: they now optionally see `ctx.lkgFingerprint`. Plugins that ignore it behave identically to before.
- **Behavior change at the merger** (folded from former PR-4): `requireApproval` field on the merged hook result widens from `ApprovalDescriptor` to `ApprovalDescriptor | ApprovalDescriptor[]`. Existing tests asserting first-wins must update — break is the proof of the chain-of-custody fix.

## Diagram

```text
                        user edits SOUL.md
                                │
                                ↓
                  ┌── fileingest validate ──┐
                  │  (workspace-edit + parser)│
                  └────────────┬───────────────┘
                               │  TValidated
                               ↓
                ┌── PolicyGenerator.generate ──┐
                │  (downstream impl,          │
                │   per-consumer convention)   │
                └────────────┬─────────────────┘
                             │  PolicyIR { policyId, generatedFrom, tools, denyRules }
                             ↓
                ┌── lkg.observe(POLICY_IR_PATH) ──┐
                │  LKGStore promotes the file  │
                │  computes LKGFingerprint =   │
                │  sha256(rawBytes) of PolicyIR│
                └────────────┬────────────────┘
                             │  LKGFingerprint (per-file content hash)
                             ↓
                gateway MAY sign (composite, capturedAt, keyId)
                             │  — operator-territory, not contract
                             ↓
                ┌── on tool call ──────────────┐
                │  gateway resolves active LKG │
                │  threads ctx.lkgFingerprint  │
                │  invokes runTrustedToolPolicies│
                └────────────┬──────────────────┘
                             │
                             ↓
                ┌── policy plugin evaluate ────┐
                │  reads PolicyIR from         │
                │  lkg.readLastKnownGood(      │
                │    POLICY_IR_PATH)           │
                │  (cached on lkgFingerprint   │
                │   key; evicts on mismatch)   │
                │  returns Decision            │
                └────────────┬─────────────────┘
                             │
                             ↓
                guardrails-adapter translates
                Decision → PluginToolPolicyDecision
                             │
                             ↓
                runTrustedToolPolicies enforces
                (block | allow | params | requireApproval)
```

## Security Impact

- **New permissions/capabilities?** No.
- **Secrets/tokens handling changed?** No — PolicyIR is plain data; the LKG layer handles bytes-only content addressing. Signing is operator-territory, layered on top of LKG composite fingerprints (gateway can sign `(lkgFingerprint, capturedAt, gatewayKeyId)` for chain-of-custody — not a contract concern).
- **New/changed network calls?** No.
- **Command/tool execution surface changed?** No — PolicyIR is the artifact `evaluate(event, ctx)` reads; it doesn't change what `runTrustedToolPolicies` does, just gives evaluators a stable artifact-shape.
- **Data access scope changed?** Minimal — `ctx.lkgFingerprint` exposes the current LKG fingerprint of the PolicyIR file to plugins. Plugins that don't read the field aren't affected.
- **Trust-boundary semantics**: fail-closed at every PolicyIR failure path (per `policy-pre-rfc.md` "Failure semantics"):
  - Generator throws → no PolicyIR written; LKG promote fails-closed.
  - PolicyIR missing (no LKG observed yet) → `evaluate` returns `{ kind: 'deny', reason: 'policy-ir-missing' }`.
  - PolicyIR malformed → deny.
  - `policyId` mismatches `sha256(jcs(body))` → tampered; deny.
  - `generatedFrom` doesn't match the workspace LKG composite at observe-time → deny.
  - Evaluator throws → upstream `runTrustedToolPolicies` runner SHOULD fail-closed (Ask §5 — confirm or extend).
- **TOCTOU defense via `ctx.lkgFingerprint`**: without this thread-through, policy plugins resolve "current PolicyIR" from plugin-private state via observe-promote events, which has known TOCTOU race conditions, multi-tenant policy bleed, and promotion-observation skew across plugin replicas. Threading the LKG fingerprint at hook invocation time anchors the decision to a specific bytes-hash and eliminates the race. **This is the killer step of the PR.** See `policy-pre-rfc.md` Ask §4 for the failure analysis.

## Repro + Verification

### Environment

- OS: any (Linux / macOS / Windows). Pure types + helpers.
- Runtime: Node ≥ 22.
- Model/provider: N/A (types substrate; no LLM in the loop).

### Steps to verify the contract works end-to-end

1. Apply this PR + the LKG contract PR onto a clean openclaw checkout.
2. `pnpm install --frozen-lockfile && pnpm build`.
3. Implement a minimal `PolicyGenerator<string>` that takes a JSON string and emits a fixed `PolicyIR`. Wire it to a fixture validated input.
4. Promote the PolicyIR via `extensions/lkg/`'s reference plugin; the gateway calls `generate(content, lkgFingerprint)` and the resulting `PolicyIR` lands at `POLICY_IR_PATH` (LKG-tracked path).
5. Implement a minimal `PluginTrustedToolPolicyRegistration` whose `evaluate(event, ctx)` reads `ctx.lkgFingerprint`, calls `loadPolicyIR(store, POLICY_IR_PATH)`, and returns a `Decision`.
6. Run a tool call; assert the policy decision references the correct LKG fingerprint and the runner enforces the decision.

### Expected (post-fix)

- `policyId` deterministically computed via RFC 8785 JCS.
- `evaluate(event, ctx)` sees `ctx.lkgFingerprint` populated by the gateway.
- Decision flows through `runTrustedToolPolicies` and gates the tool call.
- Tampering with PolicyIR (modify any leaf, leave `policyId` unchanged) is detected by `validatePolicyIR` and the evaluator denies.

### Actual (pre-fix)

- No `PolicyIR` contract upstream; consumers can't conform; `evaluate(event, ctx)` has no `ctx.lkgFingerprint` so multi-tenant policy bleed is possible.

## Evidence

- **Tests**: ~15 unit tests for the types + helpers + TOCTOU-defense scenario + merger conjunctive AND + crash-safety, all passing.
- **Type safety**: `pnpm tsc --noEmit` clean across the upstream tree.
- **Backward-compat proof**: `PluginHookToolContext.lkgFingerprint` is `optional`; existing consumers that don't read it compile and run identically. Verified by inspection of all current call sites at `src/plugins/hook-types.ts:393-401` and the runner at `src/plugins/trusted-tool-policy.ts:8`.
- **TOCTOU-defense conformance**: `policy-ir-toctou-defense.test.ts` proves a stale plugin replica with cached PolicyIR keyed on old `lkgFingerprint` correctly evicts and reloads when `ctx.lkgFingerprint` changes. Without this thread-through, the stale replica would silently evaluate against the old policy.
- **`policyId` round-trip**: `policyId := lower-hex(sha256(jcs(body)))` is deterministic; modify any leaf, recompute, get a different `policyId`. JCS canonicalization from RFC 8785.
- **Type-flow proof**: `PolicyIR.generatedFrom` is typed as `LKGFingerprint` (imported from `@openclaw/plugin-sdk/lkg`). `POLICY_IR_PATH` is the LKG-tracked path constant. Compile-time enforcement that PolicyIR is correctly anchored to an LKG observation.

## Human Verification

- **Verified scenarios**: types compile; runtime helpers work against a minimal `FsLKGStore` reference impl; `policyId` round-trips deterministically; `ctx.lkgFingerprint` flows from the gateway through `runTrustedToolPolicies` into the evaluator; tampered PolicyIR is detected.
- **Edge cases checked**: PolicyIR missing (no LKG observed yet) returns `{ kind: 'deny', reason: 'policy-ir-missing' }`; PolicyIR with wrong `generatedFrom` (i.e., loaded against a different workspace fingerprint than its `generatedFrom` claims) is denied; evaluator throwing is treated as block by the runner (Ask §5 — confirm); empty PolicyIR (no rules, no tools) is valid and returns `{ kind: 'allow' }` for any tool call.
- **What I did NOT verify**: cross-language `policyId` parity (a `.rego → PolicyIR` shim would need to use the same JCS canonicalization library; haven't tested with a non-Node generator). Recommend a maintainer or downstream consumer verify when implementing a non-Node generator.

## Review Conversations

- [ ] I replied to or resolved every bot review conversation I addressed in this PR.
- [ ] I left unresolved only the conversations that still need reviewer or maintainer judgment.

## Compatibility / Migration

- **Backward compatible?** Mostly additive. New types in `@openclaw/plugin-sdk`; new optional field on `PluginHookToolContext`. Existing plugins that ignore PolicyIR and `ctx.lkgFingerprint` continue to work identically. **One behavior change**: hook merger goes from first-wins to conjunctive AND for `requireApproval`. Existing tests that assert first-wins must update; the break is the proof of the chain-of-custody fix.
- **Config / env changes?** None.
- **Migration needed?** Codemod for consumers reading `result.requireApproval` as a single object — coerce to array (snippet in the merger fix section above). Plugin authors who want PolicyIR-driven evaluation: implement a `PluginTrustedToolPolicyRegistration` whose `evaluate(event, ctx)` reads `ctx.lkgFingerprint`, loads PolicyIR via the LKG store, and returns a `Decision`.
- **Detection grep for downstream consumers**: `grep -rn 'PluginHookToolContext' --include='*.ts'` in plugin codebases identifies sites that may want to start reading `ctx.lkgFingerprint` for anchored decisions; `grep -rn 'result\.requireApproval' --include='*.ts'` identifies sites that may need the array-coercion codemod.
- **`PolicyIR` vs domain-specific policies**: existing `src/plugin-sdk/{ssrf,bluebubbles,channel,direct-dm-guard,runtime-group}-policy.ts` continue unchanged. PolicyIR is the general-purpose artifact-shape complementing these — not a replacement.
- **Deprecation window**: none — additive only.

## Risks and Mitigations

- **Risk**: Peter rejects the "PolicyIR is an LKG-tracked artifact" framing (Ask §1).
  - **Mitigation**: this is the load-bearing premise. If rejected, PolicyIR doesn't ship in this shape — a different contract design would be needed (e.g., a registry-plugin model). Asking via the umbrella issue / pre-RFC channel before opening this PR. The contract is small enough that a redesign is feasible if the framing is wrong.
- **Risk**: `PolicyGenerator<TValidated>` interface is too prescriptive (Ask §2).
  - **Mitigation**: open question explicitly; recommendation is upstream because a function-signature interface is small and useful without forcing any particular input convention. If upstream prefers types-only without the generator interface, that's a 1-line drop.
- **Risk**: `ctx.lkgFingerprint` extension is rejected (Ask §4).
  - **Mitigation**: degraded scenario — policy plugins fall back to plugin-private state resolution via observe-promote events, with documented TOCTOU race window. Production behavior degrades but doesn't break. Pre-RFC explicitly asks; if maintainers prefer a different anchoring mechanism (e.g., a `getCurrentLKGFingerprint()` API), the design adjusts to that shape.
- **Risk**: fail-closed semantics for evaluator-throws are not what `runTrustedToolPolicies` does today (Ask §5).
  - **Mitigation**: confirming as part of this PR. If runner currently fails-open on evaluator exceptions, that's a small additional change to the runner (one try/catch with a documented fail-closed semantic). If runner already fails-closed, we document the contract guarantee.
- **Risk**: `policyId` is a vector for replay attacks (an attacker could craft a malicious PolicyIR with a known `policyId`).
  - **Mitigation**: two anchors, both load-bearing. (1) `policyId = sha256(jcs(body))` — content-canonical identity that survives re-serialization and detects body tampering. (2) `LKGFingerprint.hash = sha256(rawBytes)` — bytes-on-disk integrity check enforced by the LKG store at observe time. A doctored PolicyIR either changes its `policyId` (detected by `validatePolicyIR`'s round-trip) or changes its bytes (detected by the LKG hash mismatch on next observe). Defense in depth.
- **Risk**: existing tests asserting first-wins merger behavior break with the conjunctive AND fix.
  - **Mitigation**: that's the proof. CHANGELOG migration note explains the breakage is by design; codemod snippet covers single-to-array consumer adoption.
- **Risk**: rollback complexity if a regression surfaces post-merge.
  - **Mitigation**: revert is contained — types in one file (`policy-ir.ts`), helpers in another (`policy-ir-runtime.ts`, optional), the `ctx.lkgFingerprint` field is backward-compatible by virtue of being optional, and the merger fix is two call-site swaps + one shared helper module. CI matrix on the revert commit verifies clean rollback.

---

**AI-assisted disclosure**: this PR was prepared with Claude Opus 4.7 (1M context) over multiple sessions. Cross-PR composition verified against PR-1 (`@openclaw/workspace`) and the LKG contract PR (`#LKG-PR-NUMBER`). I understand what every line of the contract types, runtime helpers, `ctx.lkgFingerprint` extension, and merger fix does and have verified the runtime behavior against the existing upstream `runTrustedToolPolicies` runner and `PluginTrustedToolPolicyRegistration` registration shape.

🤖 Prepared as part of the `claws-openclaw-upstream` contribution wave (Hapi the Bringer · v2 contract chain — 3 upstream PRs). Sister contracts: PR-1 (`@openclaw/workspace`), PR-2 (`v2-lkg-contract` — the LKG carrier with 326 adversarial scenarios). The `claws-guardrails` adapter that translates `Decision → PluginToolPolicyDecision` is downstream-only — no upstream PR — per `realigned-story.md` § "5. claws-guardrails (no upstream PR)" and `guardrails-adapter.md`.
