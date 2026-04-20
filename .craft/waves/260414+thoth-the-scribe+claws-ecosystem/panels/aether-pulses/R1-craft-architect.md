---
round: 1
role: craft:architect
scope: "Pulses 50-52 (claws-aether-integration plan)"
date: 2026-04-13
verdict: Conditional Pass
findings: 8
severity_summary: "M: 4, W: 3, N: 1"
---

# R1 craft:architect — Aether Integration Pulses 50-52

## Verdict: Conditional Pass

The architectural direction is sound: single compilation drives both Gateway plugin and host-level approval policies, blob integrity verification reuses existing signing infrastructure, and the GuardrailProvider composition model is host-agnostic. The layer separation (claws compiles, Aether consumes) is clean and upstream-friendly.

Four mandatory findings must be resolved before implementation proceeds.

---

## Findings

### M1 — ToolCapability lacks `mcpServer` field; Pulse 50 depends on it but the IR edit is underspecified

**Severity**: M (must fix)

The plan says Pulse 50 will add `mcpServer?: string` to `ToolCapability` in `governance-ir.ts`, but `ToolCapability` lives in `claws-sdk/src/ir/capability-manifest.ts:28-39`, not `governance-ir.ts`. The GovernanceIR file re-exports `CapabilityManifest` as a member of the IR, but the type itself is defined in `capability-manifest.ts`. Furthermore, `ToolCapability` currently has no notion of which MCP server provides a tool. The plan says this comes from "TOOLS.md declarations and the workspace's `mcp.servers` config," but this mapping is a **parse-phase** concern — it must be populated before the IR reaches the emit layer. Who populates it? The pulse plan does not specify a parse-phase edit.

**Impact**: If `mcpServer` is not populated during parsing, `emit-host-approval-policies.ts` would receive `undefined` for every tool's server field, making `host-approval-policies.json` useless (all entries would have `server: undefined`).

**Recommendation**: (1) Fix the file reference: edit `capability-manifest.ts`, not `governance-ir.ts`. (2) Add a parse-phase deliverable in Pulse 50 — the `buildCapabilityManifest()` function in `compile/manifest.ts` must populate `mcpServer` from the workspace's MCP config. (3) Bump the `CompilerMeta.schemaVersion` since the IR shape changes.

---

### M2 — Risk-level mapping mismatch: plan says R1, but ToolRiskLevel has no R1

**Severity**: M (must fix)

The plan and Pulse 50 use "R1-R5" risk levels throughout (e.g., "R1 read-file → requires_approval: false", "R1-R2 → false, R3-R4 → true"). However, the actual `ToolRiskLevel` type in `capability-manifest.ts:12` is `'critical' | 'high' | 'medium' | 'low'`, which maps via `riskLevelFromClassification()` to numeric levels 5/4/3/2. There is no R1 in the type system. The `riskClassToLevel()` function maps anything below 3 to `'low'` (=R2), and `riskLevelFromClassification('low')` returns 2. The only way to get R1 is via the `buildCapabilityManifest()` which sets `governanceLevel: 1` for skills — but that is `RuleLevel`, not `ToolRiskLevel`.

**Impact**: Every reference to "R1 tools" in the plan and Pulse 50 deliverables is unreachable in the current type system. Tests asserting R1 behavior will either need a type extension or must be reframed as R2 behavior. The `host-approval-policies.json` contract example showing `"risk_level": 1` for read-file cannot be produced by the current code.

**Recommendation**: Either (a) extend `ToolRiskLevel` with `'info'` mapping to R1, propagate through `riskClassToLevel`/`riskLevelFromClassification`, or (b) update the plan and contract schema to use R2 as the lowest tool risk level. Option (b) is simpler and matches what exec-approvals already produces.

---

### M3 — Blob verification function uses HMAC but manifest signing key management is unspecified

**Severity**: M (must fix)

Pulse 51 says `verifyGovernanceArtifacts(manifestPath)` "reuses Pulse 18 artifact-signer infrastructure." The existing `artifact-signer.ts` uses HMAC-SHA256, which requires a **shared secret key**. The Pulse 51 deliverable signature says `(manifestPath)` — taking only a file path, with no key parameter. Where does the verification function get the HMAC key?

In the signing direction (Pulse 18 / `claws publish`), the key is presumably available to the build operator. But at blob rehydration time (container startup), the Aether adapter needs the same key to verify. The plan does not specify how keys are distributed to the runtime environment — environment variable? Azure Key Vault? Hardcoded? This is a critical design gap for a security-sensitive function.

**Impact**: Without specifying the key management story, the verification function is untestable in integration scenarios and the Aether-side PR will be blocked on "where does the key come from?"

**Recommendation**: The `verifyGovernanceArtifacts` signature must accept a key source (at minimum `key: Buffer | string`). The plan should document the key distribution strategy even if the Aether-side implementation is out of scope. Consider a `KeyResolver` interface that abstracts the source (env var, Key Vault, file).

---

### M4 — `requiresExternalApproval` on AuthorizationDecision creates a type that does not exist yet

**Severity**: M (must fix)

Pulse 52 says "EDIT: add `requiresExternalApproval?: boolean` to AuthorizationDecision" in `claws-sdk/src/governance/guardrail-types.ts`. But no file named `guardrail-types.ts` exists in the governance directory — grepping the codebase for `AuthorizationDecision` and `GuardrailProvider` returned zero matches. This type was specified in Pulse 49 (GuardrailProvider spec) which is a dependency, but it has not yet been implemented.

Pulse 52 `depends_on: [49, 50]`, so this is sequentially valid — Pulse 49 must land first. However, the deliverable list says "EDIT" (not "NEW"), implying the file already exists. If Pulse 49 creates `guardrail-types.ts`, the deliverable annotation should say "EDIT (depends on P49 creating this file)" for clarity. More importantly, the review of Pulse 49 output must confirm that `AuthorizationDecision` has a shape compatible with adding `requiresExternalApproval` — specifically, that the 4 decision states (`allow`, `deny`, `review`, `modify`) are represented in a way that accepts an optional boolean extension.

**Recommendation**: Add an explicit pre-condition check to the Pulse 52 implementation: verify `guardrail-types.ts` exists and `AuthorizationDecision` has the expected shape before editing. Annotate the deliverable as "EDIT (created by P49)" to signal the dependency.

---

### W1 — Emit pipeline grows to 5 artifacts but openclaw-adapter still hardcodes artifact list

**Severity**: W (should fix)

The OpenClaw adapter (`emit/platforms/openclaw-adapter.ts`) manually calls each emitter: `emitPlugin()`, `emitSkill()`, `emitExecApprovals()`. Pulse 50 adds `emitHostApprovalPolicies()` as a 4th call in this adapter. The plan mentions "the emit orchestrator in `openclaw-adapter.ts` must call `emitHostApprovalPolicies()`." This is the right call site, but the pattern of one-by-one additions to a monolithic function does not scale and makes it easy to forget a step. Each new artifact requires touching the adapter, the barrel export in `emit/index.ts`, and tests — 3 places that must stay synchronized.

**Impact**: Not a blocker for these 3 pulses, but compounds as more artifacts are added (the plan mentions this is the 5th artifact overall).

**Recommendation**: Consider a registry pattern where emitters self-register and the adapter iterates. Not required for this wave, but note it as an architecture improvement for post-Thoth.

---

### W2 — `host-approval-policies.json` duplicates risk-to-approval logic from `emit-exec-approvals.ts`

**Severity**: W (should fix)

`emit-exec-approvals.ts` already maps tool risk levels to `requires_approval` booleans (R4+/OBO → true, else false). Pulse 50 introduces `emit-host-approval-policies.ts` with a similar but different mapping (R1-R2 → false, R3-R4 → true, R5 → true non-negotiable). Two emitters with overlapping but divergent risk→approval logic is a maintenance hazard. The exec-approvals emitter gates at R4+, while the host-approval-policies emitter gates at R3+. These represent different enforcement layers (L4 host backup vs HOST-level approval), but the divergence is implicit — a developer modifying one may not realize the other needs updating.

**Impact**: Risk of the two artifacts disagreeing about whether a tool requires approval, confusing operators who see different behavior at different layers.

**Recommendation**: Extract a shared `riskToApprovalPolicy(riskLevel: number, layer: 'l4' | 'host')` function that encodes the policy for each layer. Both emitters call this function, making the intentional differences explicit and testable in one place.

---

### W3 — `claws-test` GovernanceValidator edit (Pulse 52) has no test deliverable for the validator itself

**Severity**: W (should fix)

Pulse 52 edits `claws-test/src/governance/index.ts` to "update GovernanceValidator to check `requiresExternalApproval` consistency with risk classification." The validator is the test harness itself — it's what other tests use to validate governance correctness. But the pulse deliverables only list tests in `claws-sdk/tests/governance/` and `claws-sdk/tests/e2e/`. There is no test for the updated validator in the `claws-test` package, even though the `test_scope.run` field includes `cd claws-test && vitest run`.

**Impact**: The validator could have a bug in its new `requiresExternalApproval` consistency check and nothing would catch it. The validator is a testing tool — it needs its own tests.

**Recommendation**: Add a `claws-test/tests/governance/guardrail-validation.unit.test.ts` deliverable that exercises the new consistency check: valid combination passes, inconsistent combination (e.g., R1 tool with `requiresExternalApproval: true` and no explicit reason) fails.

---

### N1 — Plan says "HMAC or Ed25519" but existing infrastructure is HMAC-only

**Severity**: N (note)

Pulse 51 describes `blob-verify.ts` checking "manifest signature (HMAC or Ed25519)" and the manifest-types specify `{signature, signedAt, keyId}`. The existing `artifact-signer.ts` only supports HMAC-SHA256/384/512 — there is no Ed25519 implementation. The plan's mention of Ed25519 suggests future intent, but implementing Ed25519 support is a non-trivial addition (asymmetric crypto, different key types, different verification flow).

**Impact**: None for this wave if only HMAC is used. But the "or Ed25519" framing could lead to premature abstraction or confusion during implementation.

**Recommendation**: Scope Pulse 51 to HMAC-only verification, matching the existing `artifact-signer.ts` infrastructure. Note Ed25519 as a future enhancement if/when asymmetric signing is needed (e.g., for zero-trust scenarios where the runtime should not hold the signing key).

---

## Summary

| ID | Severity | Finding | Location |
|----|----------|---------|----------|
| M1 | M | `mcpServer` field targets wrong file, parse-phase population missing | P50 / capability-manifest.ts |
| M2 | M | R1 risk level unreachable in current type system | P50 / capability-manifest.ts:12 |
| M3 | M | Blob verification key management unspecified | P51 / blob-verify.ts |
| M4 | M | `AuthorizationDecision` type does not exist yet, edit annotation misleading | P52 / guardrail-types.ts |
| W1 | W | Emit pipeline artifact list grows without registry pattern | P50 / openclaw-adapter.ts |
| W2 | W | Duplicate risk→approval mapping across two emitters | P50 / emit-host-approval-policies.ts |
| W3 | W | No tests for the updated GovernanceValidator in claws-test | P52 / claws-test validator |
| N1 | N | Ed25519 mentioned but not implemented; scope to HMAC-only | P51 / blob-verify.ts |
