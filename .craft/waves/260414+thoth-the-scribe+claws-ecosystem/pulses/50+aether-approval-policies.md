---
pulse: 50
slug: aether-approval-policies
plan: claws-aether-integration
depends_on: [49]
governing_roles: [craft:architect, claws:gateway-eng]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 6
  L1_integration: 4
  L2_e2e: 2
  L3_accept: 2
test_scope:
  run:
    - "cd claws-sdk && vitest run tests/emit/"
  typecheck:
    - "cd claws-sdk && tsc --noEmit"
checkpoint: 5
checkpoint_gate: false
---

# Pulse 50: Emit host-approval-policies.json

## Objective

Add a 5th emit artifact: `host-approval-policies.json` that maps GovernanceIR risk
classifications to a vendor-neutral host approval policy format. Same compilation
drives both the Gateway plugin and any host-level approval gate (Aether, etc.).

## Review Amendments (R1)

- **CM4**: Rename `AetherApprovalPolicy` → `HostApprovalPolicy`; rename `aether-sim.ts` → `host-policy-sim.ts`
- **CM5**: Fix file ref: edit `capability-manifest.ts` not `governance-ir.ts`; add parse-phase deliverable for mcpServer population
- **CM6**: Use R2 as minimum risk level (ToolRiskLevel has no R1); update all refs from R1 to R2
- **CM7**: Include host-approval-policies.json in `.claws-manifest.json` artifact list
- **CM9**: Use pre-indexed Map<string, Map<string, Policy>> for O(1) resolution; add 200+ entry perf test
- **CM2**: Fleet overrides require audit chain entry + counter-signature on change

## Deliverables

- [ ] `claws-sdk/src/emit/host-approval-policy-types.ts` — HostApprovalPolicy, PolicyMapping types matching `{server, tool, requires_approval, risk_level, reason}` (vendor-neutral naming)
- [ ] `claws-sdk/src/emit/emit-host-approval-policies.ts` — Maps GovernanceIR tool classifications to policies. R2 → false, R3-R4 → true (configurable via fleet overrides), R5 → true (non-negotiable). Tool-to-MCP-server mapping from TOOLS.md + `mcp.servers` config. Pre-indexed Map<server, Map<tool, Policy>> for O(1) resolution.
- [ ] `claws-sdk/src/emit/index.ts` — EDIT: export new emitter, call in emit pipeline
- [ ] `claws-sdk/src/ir/capability-manifest.ts` — EDIT: add optional `mcpServer?: string` to ToolCapability. Bump schemaVersion.
- [ ] `claws-sdk/src/compile/manifest.ts` — EDIT: populate `mcpServer` from workspace `mcp.servers` config during parse phase
- [ ] `claws-sdk/src/compliance/artifact-signer.ts` — EDIT: include host-approval-policies.json in manifest artifact list
- [ ] `claws-sdk/tests/emit/emit-host-approval-policies.unit.test.ts` — 4 L0: R2→false, R3→true, R5→always-true, fleet override R3→false
- [ ] `claws-sdk/tests/emit/emit-host-approval-policies-perf.unit.test.ts` — 2 L0: 200+ entry resolution <5ms, O(1) lookup verification
- [ ] `claws-sdk/tests/emit/emit-host-approval-policies.integration.test.ts` — 4 L1: full compile→emit pipeline, policy artifact matches GovernanceIR, host-policy-sim resolution, fleet override with audit entry
- [ ] `claws-sdk/tests/e2e/aether-policy-emit.e2e.test.ts` — 2 L2: compile workspace with mixed R2/R3/R5 tools → verify artifact, recompile after risk change → artifact updates
- [ ] `claws-sdk/tests/accept/runners/host-policy-sim.ts` — Mock host policy resolver: loads policies, resolves tool calls with specific→wildcard→global order (reference resolution, documented as matching Aether PR #5067)
- [ ] `claws-sdk/tests/aether/aether-approval-policies.accept.test.ts` — L3: SDK acceptance — consumer compiles workspace with mixed R2/R3/R5 tools, invokes emit API, verifies host-approval-policies.json contains correct approval gates per risk level and fleet overrides
- [ ] `claws-cli/tests/aether/aether-approval-policies.accept.test.ts` — L3: CLI acceptance — runs `claws compile` + `claws emit` on fixture workspace, verifies host-approval-policies.json artifact written with correct R2-false/R3-true/R5-always-true mappings

## Key Constraints

- R5 → `requires_approval: true` is NON-NEGOTIABLE, no fleet override can change this
- Unknown tools default to R5 fail-closed
- Schema version 1 with `schemaVersion` field for forward compat
- Artifact written to `.claws/compiled/host-approval-policies.json`
- All type names are vendor-neutral (HostApprovalPolicy, not AetherApprovalPolicy)
- Fleet overrides produce audit chain entry recording who changed what and when
- Minimum risk level is R2 (`low`), not R1 — R1 does not exist in ToolRiskLevel
- mcpServer populated during parse phase from `mcp.servers` config, not at emit time
