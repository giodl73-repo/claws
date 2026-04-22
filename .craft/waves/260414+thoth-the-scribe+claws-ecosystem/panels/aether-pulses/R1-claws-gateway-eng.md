---
round: 1
role: claws:gateway-eng
pulses: [50, 51, 52]
plan: claws-aether-integration
date: 2026-04-13
---

# R1 Review: claws:gateway-eng -- Pulses 50-52

**Lens**: Runtime performance of policy resolution, blob verification latency at container startup, aether-sim fidelity to real Aether behavior, MCP server mapping correctness.

---

## F-01 (W): Policy resolution in aether-sim uses unspecified resolution order

**Pulse**: 50 | **Artifact**: `claws-sdk/tests/accept/runners/aether-sim.ts`

The plan specifies "specific -> wildcard -> global resolution order as Aether PR #5067" but the pulse deliverables for `aether-sim.ts` merely say "loads policies, resolves tool calls with specific->wildcard->global order" without specifying the lookup algorithm. The existing `gateway-sim.ts` (lines 124-138) builds a flat `riskMap` keyed by tool name with no server dimension at all. The aether-sim must resolve on a `(server, tool)` tuple with fallback to `(server, *)` then `(*, *)`. If the sim flattens to tool-name-only lookup (matching the gateway-sim pattern), it will not detect regressions where the `server` field is wrong or missing.

**Risk**: Aether resolves per-server; if the sim skips the server dimension, tests pass but production breaks when two servers expose tools with the same name at different risk levels (e.g., `read-file` on sharepoint vs. filesystem).

**Recommendation**: The aether-sim runner must implement (server, tool) -> (server, *) -> (*, *) three-tier lookup. Add at least one L1 scenario where two servers expose the same tool name at different risk levels to validate the resolution chain is not flattened.

---

## F-02 (M): No latency budget for policy resolution in aether-sim or host-approval-policies emitter

**Pulse**: 50 | **Artifact**: `emit-host-approval-policies.ts`, `aether-sim.ts`

The gateway-eng role defines a hard 50ms budget per governance hook. The plan introduces `host-approval-policies.json` as a new artifact loaded at container startup and queried on every tool call. Neither the pulse plan nor the emitter deliverables mention:

1. A maximum acceptable policy count (what happens with 500+ tools across 9 MCP servers?)
2. A resolution time budget for the aether-sim policy lookup
3. Whether the policy file is loaded once into memory or re-read per call

The existing `emit-exec-approvals.ts` iterates all tools linearly (lines 137-154) which is fine for 10-50 tools. But `host-approval-policies.json` adds the server dimension, potentially producing O(servers x tools) entries. With 9 Graph MCP servers and many tools per server, this could exceed the 50ms budget for naive linear resolution.

**Risk**: Linear scan over 200+ policy entries on every tool call adds measurable latency to the Gateway event loop.

**Recommendation**: Specify that the emitter MUST produce a pre-indexed structure (Map<server, Map<tool, policy>>) or that the aether-sim runner must measure resolution time and fail tests that exceed 10ms (leaving 40ms headroom for the rest of the hook chain). Add an L0 test with 200+ policy entries to verify resolution stays sub-millisecond.

---

## F-03 (M): Blob verification blocks container startup with no timeout

**Pulse**: 51 | **Artifact**: `blob-verify.ts`

The pulse specifies that `verifyGovernanceArtifacts(manifestPath)` reads the manifest, checks the signature, then verifies SHA-256 content hashes of each listed artifact. On container restart, this runs before the Gateway starts. The pulse does not specify:

1. A timeout for the entire verification operation
2. What happens if an artifact file is missing (not tampered, just absent -- e.g., partial blob download)
3. Whether verification is synchronous or async

The Gateway has a startup budget. The Aether adapter's `blob_mount.py` downloads artifacts and then calls verification. If verification hangs (e.g., a large artifact, or a filesystem stall on Azure Blob FUSE mount), the container never starts and there's no recovery path.

**Risk**: A stalled verification function causes a container startup timeout, which in a fleet scenario means multiple agents simultaneously fail to restart after an upgrade. Ten gateway restarts in 8 hours is a real post-upgrade scenario (per the role frame) -- each one runs verification.

**Recommendation**: The `verifyGovernanceArtifacts` function must accept a `timeoutMs` parameter (default 5000ms). On timeout, return `{verified: false, errors: ['verification timed out'], warnings: []}` so the adapter can decide whether to proceed with a warning or block. Add an L0 test simulating slow I/O (mock read delay) to prove the timeout works. Also specify behavior for missing (not tampered) artifacts: a manifest that lists an artifact that doesn't exist on disk should produce a specific error distinct from hash mismatch.

---

## F-04 (W): HMAC-only signing insufficient for blob integrity in multi-tenant fleet

**Pulse**: 51 | **Artifact**: `blob-verify.ts`, `artifact-signer.ts`

The existing `artifact-signer.ts` uses HMAC-SHA256 with a shared secret key. The pulse says "HMAC or Ed25519" for manifest signature but the deliverable type `GovernanceManifest` includes `keyId` -- suggesting key rotation. HMAC requires the verifier to hold the same secret as the signer. In a fleet deployment where `claws publish` signs on a CI machine and containers verify at startup, the HMAC key must be distributed to every container.

This is not a blocking concern for R1-R2 (the plan correctly scopes to claws-sdk verification logic only, no Aether repo changes). But the plan's "Contract for Aether Consumers" section (line 98) and the blob-verify-sim scenarios assume the key is available at verification time without specifying key distribution.

**Risk**: If the verification function is deployed before key distribution is solved, containers will fail verification on every restart because they don't have the HMAC key, triggering the "block loading" path. This turns a security feature into a denial-of-service.

**Recommendation**: The `verifyGovernanceArtifacts` function should accept an optional `keyResolver: (keyId: string) => Buffer | null` parameter. When the resolver returns null (key not available), treat as "missing signature" and follow the backward-compat WARNING path, not the FAIL path. This preserves the "missing signature -> WARNING" backward-compat guarantee from the plan while the fleet key distribution problem is solved separately.

---

## F-05 (M): `requiresExternalApproval` creates double-gate latency for R3-R4 tools

**Pulse**: 52 | **Artifact**: `guardrail-types.ts`

The GuardrailProvider's `preAuthorize()` runs in the Gateway event loop (before_tool_call hook). When it returns `{allowed: true, requiresExternalApproval: true}`, the host (Aether) fires an SSE approval dialog. The tool call is now blocked waiting for:

1. The `preAuthorize()` hook execution time (budget: 50ms)
2. The SSE round-trip to the Aether orchestrator
3. User interaction with the approval dialog
4. The SSE response back to the Gateway

For R3-R4 tools (which default to `requires_approval: true`), this means EVERY R3-R4 tool call waits for human approval even when a fleet policy has configured them for auto-approval. The plan says "R3-R4 -> requires_approval: true by default (safety-first)" but the `requiresExternalApproval` field in the GuardrailProvider response creates a second enforcement point that fleet policy (which lives in `host-approval-policies.json`) cannot override.

**Risk**: R3-R4 tools configured for fleet auto-approval via `fleet.approvalOverrides.r3: false` will still trigger the SSE approval dialog because the GuardrailProvider sets `requiresExternalApproval: true` independently. This makes the fleet override useless for R3-R4 and every R3 tool call adds 500ms+ of SSE latency.

**Recommendation**: The `requiresExternalApproval` field in `AuthorizationDecision` must be informed by the same fleet policy that drives `host-approval-policies.json`. The GuardrailProvider must read the fleet override at preAuthorize time: if `fleet.approvalOverrides.r3: false` and the tool is R3, set `requiresExternalApproval: false`. Otherwise the two enforcement points diverge. Add an L1 test: fleet override + provider response + aether-sim must all agree.

---

## F-06 (W): ToolCapability lacks `mcpServer` field -- plan says add it but pulse 50 underspecifies the population

**Pulse**: 50 | **Artifact**: `governance-ir.ts`

The plan says "Extend ToolCapability with optional `mcpServer?: string` field, populated during parse phase from workspace `mcp.servers` config." The pulse lists this as a deliverable. But the current `ToolCapability` interface (capability-manifest.ts:28-39) has no `mcpServer` field, and the parse phase (`parse.ts`) reads TOOLS.md declarations, not `mcp.servers` config.

The population logic is critical: if the tool "send-email" is declared in TOOLS.md but the MCP server mapping comes from `mcp.servers` in the workspace config, there must be a join between these two data sources during parsing. Pulse 50 does not describe this join, which tool names in TOOLS.md correspond to which server names in `mcp.servers`, or what happens when a tool is declared but no server mapping exists (which server does it map to?).

**Risk**: Without a defined join strategy, the emitter will produce `host-approval-policies.json` entries with `"server": null` or a hardcoded default, which defeats the purpose of per-server policy resolution in Aether.

**Recommendation**: The pulse should explicitly specify: (1) the join is by tool name (TOOLS.md `name` == mcp.servers tool name), (2) tools without a server mapping get `server: "unknown"` which resolves to fail-closed in the aether-sim, (3) an L0 test covering the unmapped-tool case. The ToolCapability IR change should be documented as a schema version bump.

---

## F-07 (N): OpenClaw adapter emits 4 artifacts but pulse 50 adds a 5th without updating the adapter

**Pulse**: 50 | **Artifact**: `openclaw-adapter.ts`, `emit/index.ts`

The existing `openclaw-adapter.ts` (lines 27-52) calls `emitPlugin`, `emitSkill`, and `emitExecApprovals` to produce 4 artifacts. Pulse 50 adds `emit-host-approval-policies.ts` but the deliverable only mentions editing `claws-sdk/src/emit/index.ts` to "export new emitter, call in emit pipeline." The actual call site is `openclaw-adapter.ts` -- that's where the 3 existing emitters are called. The `emit/index.ts` barrel file is just re-exports.

The platform router (`platform-router.ts`) calls `adapter.emit(ir)` per platform. If the new emitter is only added to the barrel but not called in the adapter, the artifact won't be generated during `routeAndEmit()`.

**Risk**: Low -- implementation will likely catch this. But the pulse plan should be explicit about the adapter call site to avoid a "works in unit test, missing in integration" gap.

**Recommendation**: Pulse 50 deliverables should list `claws-sdk/src/emit/platforms/openclaw-adapter.ts` as an EDIT target, adding the `emitHostApprovalPolicies()` call after the `emitExecApprovals` call.

---

## F-08 (W): blob-verify-sim backward-compat scenarios allow silent governance bypass

**Pulse**: 51 | **Artifact**: `blob-verify-sim.ts`

The plan specifies two backward-compat scenarios: "Missing signature (pre-signing era) -> WARNING, load proceeds" and "Missing manifest entirely -> WARNING, load proceeds." These are correct for migration. But the blob-verify-sim also needs a scenario where the manifest EXISTS but lists ZERO artifacts (empty `artifacts: []`). An attacker who can write to the blob could replace the manifest with a valid-signature empty manifest, then replace all governance artifacts with permissive versions. Since verification checks "manifest signature valid" (passes) and "all listed artifacts match" (passes -- there are none), the tampered artifacts load.

**Risk**: Empty-manifest attack bypasses integrity verification while all checks report success. This is within the gateway-eng scope because it means the Gateway loads a permissive plugin without any verification failure.

**Recommendation**: The `verifyGovernanceArtifacts` function must check that the manifest lists at least the minimum expected artifacts (plugin index.ts at minimum). An empty manifest should be treated as tampered, not as backward-compat. Add an L0 test: manifest with empty artifacts array -> FAIL, not WARNING.

---

## F-09 (W): No graceful degradation when GuardrailProvider throws

**Pulse**: 52 | **Artifact**: `guardrail-types.ts`

The gateway-eng lens asks: "What happens when this hook throws? Does the Gateway crash or degrade gracefully?" The pulse 52 spec documents the `requiresExternalApproval` field semantics for all 4 decision states (allow, deny, review, modify) but does not document the 5th state: `preAuthorize()` throws an exception.

The role's fail-mode policy is clear: R1-R2 fail-open, R3-R4 configurable, R5 fail-closed. But the GuardrailProvider spec (which pulse 52 extends) does not encode this fail-mode policy in the type system or the composition documentation. If `preAuthorize()` throws for an R1 tool, should the host treat it as `{allowed: true}`? The current design leaves this to each host's implementation.

**Risk**: Without documented fail-mode behavior in the GuardrailProvider spec, Aether and future hosts will implement different crash behaviors. One host might crash the Gateway on a provider exception (bad), another might silently allow R5 tools (worse).

**Recommendation**: The `guardrail-composition.md` documentation deliverable in pulse 52 must include a "Provider Failure" section that documents the expected host behavior per risk level. The `AuthorizationDecision` type or the composition spec should recommend: on provider exception, the host reads the tool's `risk_level` from `host-approval-policies.json` and applies the fail-mode policy (R1-R2 allow, R3-R4 gate, R5 deny). Add this as a specific section in the composition doc and an L1 test in the aether-sim.

---

## Summary

| ID | Sev | Pulse | Theme |
|----|-----|-------|-------|
| F-01 | W | 50 | aether-sim resolution must include server dimension |
| F-02 | M | 50 | No latency budget or scaling test for policy resolution |
| F-03 | M | 51 | Blob verification has no timeout, risks startup hang |
| F-04 | W | 51 | HMAC key distribution not addressed, risks DoS on restart |
| F-05 | M | 52 | Fleet override bypassed by double-gate design |
| F-06 | W | 50 | mcpServer field population and join strategy unspecified |
| F-07 | N | 50 | OpenClaw adapter not listed as edit target for 5th artifact |
| F-08 | W | 51 | Empty-manifest attack bypasses integrity verification |
| F-09 | W | 52 | No documented fail-mode when GuardrailProvider throws |

**Must-fix (M)**: 3 -- F-02, F-03, F-05
**Warning (W)**: 5 -- F-01, F-04, F-06, F-08, F-09
**Note (N)**: 1 -- F-07
