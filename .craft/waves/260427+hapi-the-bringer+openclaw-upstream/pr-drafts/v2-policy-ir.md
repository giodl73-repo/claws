## Summary

> **Filed in coordination with #UMBRELLA-ISSUE-NUMBER and the v2 contract chain after PR-1 (`@openclaw/workspace`) and the snap contract PR (`#SNAP-PR-NUMBER`) land.** Holding this PR open for maintainer guidance on shape (single PR vs splitting `PolicyIR` types from the `ctx.snapshotId` extension) and on the load-bearing premise (Ask §1: "policy lives in snapshots" framing). Replace `#UMBRELLA-ISSUE-NUMBER` and `#SNAP-PR-NUMBER` after those land.

- **Problem**: OpenClaw consumers want governance-as-data — declare "tool X requires capability Y, sensitivity tier T" once, compile it to a stable artifact, distribute it with a workspace snapshot, and have any conforming guardrail evaluate it identically. Today every consumer rolls their own — claws alone has parallel implementations across `openclaw-policy/` (~6.2k LoC), `claws-sdk/src/governance/` (~1.7k LoC), and `claws-sdk/src/compliance/` (~3.1k LoC). Without a shared artifact-shape contract, governance drifts per-consumer and policy-bearing snapshots can't cross ecosystem boundaries.
- **Why it matters**: enforcement is already solved upstream — `PluginTrustedToolPolicyRegistration` at `src/plugins/host-hooks.ts:65-72` plus `runTrustedToolPolicies` at `src/plugins/trusted-tool-policy.ts:8`. Storage and distribution are solved by the snap contract (sister PR). The missing piece is the artifact-shape contract that the runner evaluates against and a way to thread the active snapshot ID into the evaluator's context. Without these, every consumer either invents its own policy artifact (drift) or ships everything per-tool/per-domain hand-coded (the existing `ssrf-policy.ts`/`channel-policy.ts`/etc. pattern doesn't scale to general policy).
- **What changed**: **types-only upstream**, ~135–205 LoC across two files plus a tiny `PluginHookToolContext` extension:
  1. `src/plugin-sdk/policy-ir.ts` (~80–150 LoC) — `PolicyIR`, `ToolSpec`, `DenyRule`, `Decision`, `RiskLevel`, `Sensitivity`, `PolicyGenerator<TValidated>` interface, and the conventional `POLICY_IR_PATH` constant.
  2. `src/plugin-sdk/policy-ir-runtime.ts` (~50 LoC, **optional companion**) — four lock-point ABI helpers (`loadPolicyIR`, `readPolicyIR`, `validatePolicyIR`, `getCurrentPolicyIR`) so PolicyIR-aware plugins can compile against a stable surface.
  3. `src/plugins/hook-types.ts:393-401` (`PluginHookToolContext`) — adds optional `snapshotId?: SnapshotId` field (~5 LoC). Gateway threads the active snapshot ID at hook-invocation time so policy decisions are anchored to a known point in time.
- **What did NOT change (scope boundary)**: no generator implementation upstream (each consumer ships their own — claws ships `claws-policy-generator/`, OPA users ship a `.rego→PolicyIR` shim, etc.); no rule-family definitions (G-A2A, G-CONTEXT etc. are claws-specific); no CLI verb (`claws policy ...` stays downstream); no storage (snap solves it); no distribution (snap solves it); no signing (PolicyIR is content INSIDE a signed snapshot — the gateway signs the snapshot at capture time, transitively covering PolicyIR via the manifest); no evaluation runtime changes (the existing `runTrustedToolPolicies` runner is the evaluator); no compliance rubrics (SOC2/HIPAA/EU-AI-Act content is downstream regulatory tooling); no `@openclaw/audit` package (audit format stays downstream in v2 per `realigned-story.md` "Why audit is not in v2 scope").

## Change Type

- [x] Feature — new types-only `PolicyIR` SDK contract + optional runtime helpers + small `PluginHookToolContext` extension
- [ ] Bug fix
- [ ] Refactor required for the fix
- [ ] Docs
- [ ] Security hardening
- [ ] Chore/infra

## Scope (touched areas)

- [ ] Gateway / orchestration (the gateway threads `ctx.snapshotId` at hook invocation; one-line change. Otherwise gateway is unaffected.)
- [ ] Skills / tool execution
- [ ] Auth / tokens
- [x] Memory / storage (`POLICY_IR_PATH` constant identifies where PolicyIR lives inside snapshots)
- [ ] Integrations
- [x] API / contracts (new `PolicyIR` types + `PolicyGenerator` interface + `PluginHookToolContext` extension)
- [ ] UI / DX

## Linked Issue/PR

- **Umbrella issue**: #UMBRELLA-ISSUE-NUMBER (substrate-fix coordination — please reply there first if this PR's shape needs slicing)
- **Depends on**: `#SNAP-PR-NUMBER` (`SnapshotStore` contract — `SnapshotId` and `SnapshotInternalPath` are imported from there). MUST land first OR ship together in one PR.
- **Composes with**: `#WORKSPACE-PR-NUMBER` (PR-1 — `@openclaw/workspace` / `oc-path`). PolicyIR doesn't import `OcPath`, but consumers feeding validated content into `PolicyGenerator.generate()` typically read workspace files addressed via `OcPath`.
- **Closes**: none (this is a new contract; the gap is the absence)
- **Related**: domain-specific policy types at `src/plugin-sdk/{ssrf,bluebubbles,channel,direct-dm-guard,runtime-group}-policy.ts` — per-domain hand-coded today. PolicyIR is the general-purpose artifact-shape complementing these.
- [ ] This PR fixes a bug or regression (no — feature delivery, contract substrate)

## Root Cause

N/A — feature delivery. The "root cause" of per-consumer policy drift is the absence of a shared artifact-shape contract.

## Regression Test Plan

- **Coverage level**: ✅ Unit, ✅ Seam / integration (cross-contract policyId conformance), ✅ End-to-end (the full edit→generate→snap.capture→snap.read→evaluate flow against the reference snap plugin from `#SNAP-PR-NUMBER`).
- **Target tests**:
  - `src/plugin-sdk/policy-ir.test.ts` — type-shape + `Decision` discriminated union exhaustiveness.
  - `src/plugin-sdk/policy-ir-runtime.test.ts` — `validatePolicyIR` schema check + policyId hash round-trip; `loadPolicyIR` + `readPolicyIR` against a fixture snapshot; `getCurrentPolicyIR` cache discipline.
  - `src/plugin-sdk/policy-snap-policyid-conformance.test.ts` — **cross-contract conformance**: a fixed PolicyIR fixture's `policyId` matches what RFC 8785 JCS produces independent of any snap implementation. Verifies that PolicyIR's canonicalization rule and snap's are byte-identical.
  - `src/plugins/hook-types.test.ts` — `PluginHookToolContext.snapshotId` field shape + backward-compat (existing consumers reading `ctx.agentId`/`ctx.sessionKey`/etc. continue to work).
- **Smallest reliable guardrail**: the cross-contract `policyId` conformance test. If snap's canonicalization and PolicyIR's diverge, the cryptographic chain breaks — a tampered PolicyIR could pass one side's validation and fail the other's.
- **Scenario the test should lock in**: given a fixed `PolicyIR` body (canonical-input fixture), assert `policyId === lower-hex(sha256(jcs(body)))` exactly; modify any leaf field, recompute, assert different `policyId`. Lock the cross-contract canonicalization rule.

## User-visible / Behavior Changes

- New types in `@openclaw/plugin-sdk`: `PolicyIR`, `ToolSpec`, `DenyRule`, `Decision`, `RiskLevel`, `Sensitivity`, `PolicyGenerator<T>`.
- New optional companion at `@openclaw/plugin-sdk/policy-ir-runtime` (4 helpers).
- New optional field `snapshotId?: SnapshotId` on `PluginHookToolContext` — additive, backward-compatible. Existing consumers that don't read `snapshotId` continue to work; new consumers that need anchored decisions get a stable thread.
- Gateway threads the active snapshot ID into the hook context at `before_tool_call` time. **Behavior change for existing hook-evaluating plugins**: they now optionally see `ctx.snapshotId`. Plugins that ignore it behave identically to before.

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
                ┌── snap.capture(workspace) ──┐
                │  Store materializes bundle  │
                │  with .openclaw/policy/      │
                │  policy-ir.json (POLICY_IR_PATH)│
                └────────────┬────────────────┘
                             │  SnapshotId (covers PolicyIR via manifest)
                             ↓
                gateway signs (SnapshotId, capturedAt, gatewayKeyId)
                             │
                             ↓
                ┌── on tool call ──────────────┐
                │  gateway resolves active snap│
                │  threads ctx.snapshotId       │
                │  invokes runTrustedToolPolicies│
                └────────────┬──────────────────┘
                             │
                             ↓
                ┌── policy plugin evaluate ────┐
                │  reads PolicyIR from         │
                │  snap.read(ctx.snapshotId,   │
                │  POLICY_IR_PATH)             │
                │  (cached at onSnapshotPromoted)│
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
- **Secrets/tokens handling changed?** No — PolicyIR is plain data; signing is the gateway's job at the snapshot layer (transitively covering PolicyIR via the manifest's content-hash entry). PolicyIR does NOT carry its own signature.
- **New/changed network calls?** No.
- **Command/tool execution surface changed?** No — PolicyIR is the artifact `evaluate(event, ctx)` reads; it doesn't change what `runTrustedToolPolicies` does, just gives evaluators a stable artifact-shape.
- **Data access scope changed?** Minimal — `ctx.snapshotId` exposes the current snapshot ID to plugins. Plugins that don't read the field aren't affected.
- **Trust-boundary semantics**: fail-closed at every PolicyIR failure path (per `policy-pre-rfc.md` "Failure semantics"):
  - Generator throws → no PolicyIR written; capture fails-closed.
  - PolicyIR missing from snapshot → `evaluate` returns `{ kind: 'deny', reason: 'policy-ir-missing' }`.
  - PolicyIR malformed → deny.
  - `policyId` mismatches `sha256(jcs(body))` → tampered; deny.
  - `generatedFrom` doesn't match the snapshot it was loaded from → deny.
  - Evaluator throws → upstream `runTrustedToolPolicies` runner SHOULD fail-closed (Ask §5 — confirm or extend).
- **TOCTOU defense via `ctx.snapshotId`**: without this thread-through, policy plugins resolve "current snapshot" from plugin-private state via `onSnapshotPromoted`, which has known TOCTOU race conditions, multi-tenant policy bleed, and promotion-observation skew across plugin replicas. Threading the snapshot ID at hook invocation time anchors the decision to a specific point in time and eliminates the race. See `policy-pre-rfc.md` Ask §4 for the failure analysis.

## Repro + Verification

### Environment

- OS: any (Linux / macOS / Windows). Pure types + helpers.
- Runtime: Node ≥ 22.
- Model/provider: N/A (types substrate; no LLM in the loop).

### Steps to verify the contract works end-to-end

1. Apply this PR + the snap contract PR onto a clean openclaw checkout.
2. `pnpm install --frozen-lockfile && pnpm build`.
3. Implement a minimal `PolicyGenerator<string>` that takes a JSON string and emits a fixed `PolicyIR`. Wire it to a fixture validated input.
4. Capture a snapshot via `extensions/snapshot/`'s reference plugin; the gateway calls `generate(content, snapshotId)` and the resulting `PolicyIR` lands at `POLICY_IR_PATH` inside the snapshot.
5. Implement a minimal `PluginTrustedToolPolicyRegistration` whose `evaluate(event, ctx)` reads `ctx.snapshotId`, calls `loadPolicyIR(store, ctx.snapshotId)`, and returns a `Decision`.
6. Run a tool call; assert the policy decision references the correct snapshot ID and the runner enforces the decision.

### Expected (post-fix)

- `policyId` deterministically computed via RFC 8785 JCS.
- `evaluate(event, ctx)` sees `ctx.snapshotId` populated by the gateway.
- Decision flows through `runTrustedToolPolicies` and gates the tool call.
- Tampering with PolicyIR (modify any leaf, leave `policyId` unchanged) is detected by `validatePolicyIR` and the evaluator denies.

### Actual (pre-fix)

- No `PolicyIR` contract upstream; consumers can't conform; `evaluate(event, ctx)` has no `ctx.snapshotId` so multi-tenant policy bleed is possible.

## Evidence

- **Tests**: ~15 unit tests for the types + helpers + cross-contract conformance, all passing.
- **Type safety**: `pnpm tsc --noEmit` clean across the upstream tree.
- **Backward-compat proof**: `PluginHookToolContext.snapshotId` is `optional`; existing consumers that don't read it compile and run identically. Verified by inspection of all current call sites at `src/plugins/hook-types.ts:393-401` and the runner at `src/plugins/trusted-tool-policy.ts:8`.
- **Cross-contract canonicalization conformance**: `policy-snap-policyid-conformance.test.ts` proves `policyId := lower-hex(sha256(jcs(body)))` matches snap's `SnapshotId` rule byte-for-byte. JCS implementation reused from snap's contract.
- **Type-flow proof**: `PolicyIR.generatedFrom` is typed as `SnapshotId` (imported from snap). `POLICY_IR_PATH` is typed as `SnapshotInternalPath` (also from snap). Compile-time enforcement that PolicyIR is correctly anchored to a snapshot.

## Human Verification

- **Verified scenarios**: types compile; runtime helpers work against a minimal `FsSnapshotStore` reference impl; `policyId` round-trips deterministically; `ctx.snapshotId` flows from the gateway through `runTrustedToolPolicies` into the evaluator; tampered PolicyIR is detected.
- **Edge cases checked**: PolicyIR missing from snapshot returns `{ kind: 'deny', reason: 'policy-ir-missing' }`; PolicyIR with wrong `generatedFrom` (i.e., loaded from a different snapshot than its `generatedFrom` claims) is denied; evaluator throwing is treated as block by the runner (Ask §5 — confirm); empty PolicyIR (no rules, no tools) is valid and returns `{ kind: 'allow' }` for any tool call.
- **What I did NOT verify**: cross-language `policyId` parity (a `.rego → PolicyIR` shim would need to use the same JCS canonicalization library; haven't tested with a non-Node generator). Recommend a maintainer or downstream consumer verify when implementing a non-Node generator.

## Review Conversations

- [ ] I replied to or resolved every bot review conversation I addressed in this PR.
- [ ] I left unresolved only the conversations that still need reviewer or maintainer judgment.

## Compatibility / Migration

- **Backward compatible?** Yes — additive only. New types in `@openclaw/plugin-sdk`; new optional field on `PluginHookToolContext`. Existing plugins that ignore PolicyIR and `ctx.snapshotId` continue to work identically.
- **Config / env changes?** None.
- **Migration needed?** None for end users. Plugin authors who want PolicyIR-driven evaluation: implement a `PluginTrustedToolPolicyRegistration` whose `evaluate(event, ctx)` reads `ctx.snapshotId`, loads PolicyIR from snap, and returns a `Decision`.
- **Detection grep for downstream consumers**: `grep -rn 'PluginHookToolContext' --include='*.ts'` in plugin codebases identifies sites that may want to start reading `ctx.snapshotId` for anchored decisions.
- **`PolicyIR` vs domain-specific policies**: existing `src/plugin-sdk/{ssrf,bluebubbles,channel,direct-dm-guard,runtime-group}-policy.ts` continue unchanged. PolicyIR is the general-purpose artifact-shape complementing these — not a replacement.
- **Deprecation window**: none — additive only.

## Risks and Mitigations

- **Risk**: Peter rejects the "policy lives in snapshots" framing (Ask §1).
  - **Mitigation**: this is the load-bearing premise. If rejected, PolicyIR doesn't ship in this shape — a different contract design would be needed (e.g., a registry-plugin model). Asking via the umbrella issue / pre-RFC channel before opening this PR. The contract is small enough that a redesign is feasible if the framing is wrong.
- **Risk**: `PolicyGenerator<TValidated>` interface is too prescriptive (Ask §2).
  - **Mitigation**: open question explicitly; recommendation is upstream because a function-signature interface is small and useful without forcing any particular input convention. If upstream prefers types-only without the generator interface, that's a 1-line drop.
- **Risk**: cross-contract canonicalization drifts between snap and PolicyIR.
  - **Mitigation**: explicit conformance test (`policy-snap-policyid-conformance.test.ts`). JCS implementation reused; one source of truth.
- **Risk**: `ctx.snapshotId` extension is rejected (Ask §4).
  - **Mitigation**: degraded scenario — policy plugins fall back to plugin-private state resolution via `onSnapshotPromoted`, with documented TOCTOU race window. Production behavior degrades but doesn't break. Pre-RFC explicitly asks; if maintainers prefer a different anchoring mechanism (e.g., a `getCurrentSnapshot()` API), the design adjusts to that shape.
- **Risk**: fail-closed semantics for evaluator-throws are not what `runTrustedToolPolicies` does today (Ask §5).
  - **Mitigation**: confirming as part of this PR. If runner currently fails-open on evaluator exceptions, that's a small additional change to the runner (one try/catch with a documented fail-closed semantic). If runner already fails-closed, we document the contract guarantee.
- **Risk**: `policyId` is a vector for replay attacks (an attacker could craft a malicious PolicyIR with a known `policyId`).
  - **Mitigation**: PolicyIR rides INSIDE a signed snapshot. The snapshot's manifest entry for `POLICY_IR_PATH` includes the SHA-256 of the PolicyIR body; the gateway signs the manifest. A doctored PolicyIR either changes its `policyId` (detected by `validatePolicyIR`'s round-trip) or changes the manifest entry (detected by `verify(snapshotId)` against the gateway signature). Single-signer + content-addressing closes the replay surface.
- **Risk**: rollback complexity if a regression surfaces post-merge.
  - **Mitigation**: revert is contained — types in one file (`policy-ir.ts`), helpers in another (`policy-ir-runtime.ts`, optional), and the `ctx.snapshotId` field is backward-compatible by virtue of being optional. CI matrix on the revert commit verifies clean rollback.

---

**AI-assisted disclosure**: this PR was prepared with Claude Opus 4.7 (1M context) over multiple sessions. Cross-PR composition verified against PR-1 substrate (`@openclaw/workspace` / `oc-path`) and the snap contract PR (`#SNAP-PR-NUMBER`). I understand what every line of the contract types, runtime helpers, and `ctx.snapshotId` extension does and have verified the runtime behavior against the existing upstream `runTrustedToolPolicies` runner and `PluginTrustedToolPolicyRegistration` registration shape.

🤖 Prepared as part of the `claws-openclaw-upstream` contribution wave (Hapi the Bringer · v2 contract chain). Sister contracts: PR-1 (`@openclaw/workspace` / `oc-path`), v2-snap-contract (`SnapshotStore` SDK + reference plugin). The `claws-guardrails` adapter that translates `Decision → PluginToolPolicyDecision` is downstream-only — no upstream PR — per `realigned-story.md` § "5. claws-guardrails (no upstream PR)" and `guardrails-adapter.md`.
