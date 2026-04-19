---
slug: claws-aether-integration
preset: "claws"
plan: "3 headlines: claws build emits host-approval-policies.json consistent with Gateway plugin, blob rehydration verifies governance artifact signatures, GuardrailProvider composes with Aether approval gate"
area: claws
status: Implemented
phase: thoth
atoms: [atom:cicd-pipeline, atom:governance-ir, atom:claws-publish, atom:upstream-contrib]
specs: [CL-04, CL-07, CL-03]
---

# claws-aether-integration — Aether Runtime Governance Bridge

## Headlines

1. **H1: `claws build` emits `host-approval-policies.json` — same risk classification drives both Gateway plugin and Aether approval gate** — The compiler already classifies every tool at R1-R5 and emits a Gateway plugin with `before_tool_call` hooks. This plan adds a fifth emit artifact: `host-approval-policies.json` in the exact format that Aether's `ApprovalPolicyRegistry` consumes (`[{server, tool, requires_approval}]`). The mapping is deterministic: R1-R2 → `requires_approval: false`, R3-R4 → `requires_approval: true` by default (safety-first). Fleet policy can override to `false` via `claws.json` field `fleet.approvalOverrides.r3` and `fleet.approvalOverrides.r4`. When no fleet policy is set, R3-R4 tools are always gated. R5 → `requires_approval: true` (non-negotiable). Tool-to-MCP-server mapping comes from TOOLS.md declarations and the workspace's `mcp.servers` config. This eliminates the current hardcoded `{"server": "*", "tool": "*", "requires_approval": true}` default with precise per-tool policies derived from governance analysis.
   - Validation: `claws build` on a workspace with 3 tools (R1 read-file, R3 send-teams, R5 send-email) produces `host-approval-policies.json` with `requires_approval: false` for read-file, `true` for send-teams, `true` for send-email
   - Validation: Changing a tool's risk from R3 to R1 in TOOLS.md and recompiling updates the approval policy without manual Aether config changes
   - Validation: R5 tools ALWAYS produce `requires_approval: true` regardless of fleet policy overrides
   - Validation: R3 tool with fleet policy `fleet.approvalOverrides.r3: false` produces `requires_approval: false` in host-approval-policies.json

2. **H2: Blob rehydration verifies governance artifact signatures before loading** — When the OpenClaw container restarts, the adapter downloads workspace state from Azure Blob (`wuclaw-{hash}` containers) including governance artifacts. Currently there is no integrity verification — a tampered blob could replace the governance plugin with a permissive version. This plan adds signature verification to the blob rehydration path: the adapter checks `.claws-manifest.json` signatures (produced by `claws publish` / Thoth Pulse 18 artifact-signer) before loading any governance artifact. The manifest includes SHA-256 content hashes of ALL governance artifacts (Gateway plugin index.ts, exec-approvals.json, host-approval-policies.json, SKILL.md). Verification at rehydration checks both the manifest signature (proves manifest is untampered) AND each artifact's content hash against the manifest (proves artifacts match what was signed). Failed verification blocks container startup and alerts the operator.
   - Validation: Tampered governance plugin in blob → manifest content hash mismatch → container refuses to start, logs `GOVERNANCE_INTEGRITY_FAILED`
   - Validation: Valid manifest signature but tampered artifact content → content hash mismatch detected → container blocked
   - Validation: Valid signed governance artifacts → container starts normally
   - Validation: Missing signature (pre-signing era) → container starts with WARNING, not failure (backward compatible)

3. **H3: GuardrailProvider spec documents composition with host-level approval gates** — The GuardrailProvider interface (Thoth Pulse 49) defines `preAuthorize()` → `AuthorizationDecision`. Aether's `ApprovalPolicyRegistry` is a separate enforcement point at the orchestrator level. These two systems currently compose accidentally (they don't conflict). This plan makes the composition intentional by documenting the layering in the GuardrailProvider spec and adding a `requiresExternalApproval` field to `AuthorizationDecision` that signals the host (Aether) to gate the tool call even if the provider allows it. This bridges claws's risk classification with Aether's credential-gated approval UX. The `requiresExternalApproval` field maps to all 4 AuthorizationDecision states: `allow` → explicit (provider sets the field), `deny` → N/A (tool blocked, host gate never reached), `review` → implicitly `true` (review decisions always require external confirmation), `modify` → host sees the modified tool call with `requiresExternalApproval` as set by the provider.
   - Validation: GuardrailProvider returns `{ decision: 'allow', requiresExternalApproval: true }` → Aether fires SSE approval dialog
   - Validation: GuardrailProvider returns `{ decision: 'deny' }` → tool blocked without reaching Aether (deny state — `requiresExternalApproval` N/A)
   - Validation: GuardrailProvider returns `{ decision: 'allow', requiresExternalApproval: false }` → tool executes without approval dialog (R1-R2 tools)
   - Validation: GuardrailProvider returns `{ decision: "review" }` → implicitly `requiresExternalApproval: true` → Aether fires SSE approval dialog

## Summary

This plan bridges claws's compile-time governance with Aether's runtime approval infrastructure. The key insight is that risk classification should be computed once (by claws) and consumed by both enforcement points (OC Gateway plugin + Aether ApprovalPolicyRegistry). Today these are independent systems that happen not to conflict. This plan makes them consistent by design: same compilation produces both artifacts, signature verification prevents tampering in transit, and the GuardrailProvider spec explicitly documents the composition model.

All implementation stays loyal to the upstream contribution strategy: the GuardrailProvider composition model is contributed to OpenClaw (it works with ANY host, not just Aether), the approval policy format is a standard JSON artifact (any orchestrator can consume it), and the blob signature verification uses the same @bic/openclaw-guardrails/audit infrastructure from Thoth CP-5.

## Coverage Contract

### Specs
- [ ] CL-04 — New emit artifact: host-approval-policies.json in the Phase 5 EMIT pipeline
- [ ] CL-07 — GuardrailProvider composition with host-level approval gates
- [ ] CL-03 — Runtime enforcement: blob integrity verification at container startup

### Concept Guides
- [ ] docs/claws/integration/aether-bridge.md — NEW: how claws artifacts flow to Aether
- [ ] docs/claws/integration/blob-integrity.md — NEW: signature verification on rehydration
- [ ] docs/claws/ecosystem/guardrail-composition.md — NEW: provider + host gate layering

### Test Tier Targets
| Tier | Target | Rationale |
|------|--------|-----------|
| L0 unit | 12 | Approval policy mapping (4), blob signature verification (4), GuardrailProvider composition (4) |
| L1 integration | 10 | Emit pipeline + policy artifact (2), blob verify round-trip (2), provider + host gate (2), aether-sim policy resolution (2), blob-verify round-trip (2) |
| L2 e2e | 5 | Full compile → emit → blob → verify → load lifecycle (3), full compile→emit→blob→verify→load→policy-resolve (1), HOST disabled + L2-L4 fallback (1) |
| L3 acceptance | 2 | Container startup with signed/tampered artifacts (manual on Aether staging) |

## Evaluation Sim

The existing test infrastructure covers L1-L4 via `gateway-sim`. The HOST layer requires new sim runners:

### aether-sim.ts
Mock `ApprovalPolicyRegistry` runner in `claws-sdk/tests/accept/runners/`. Loads `host-approval-policies.json`, resolves tool calls against the policy set using the same specific→wildcard→global resolution order as Aether PR #5067. Test scenarios:
- R1 tool → auto-allow (no approval dialog)
- R3 tool → gated (approval required)
- R5 tool → always gated (non-negotiable)
- R3 tool with fleet override `r3_auto_approve: true` → auto-allow
- Unknown tool → R5 fail-closed → gated
- HOST disabled (empty policies) → all tools auto-allow at HOST layer, L2-L4 still enforce

### blob-verify-sim.ts
Mock blob rehydration runner. Downloads fixture artifacts, checks manifest signature, verifies per-artifact content hashes, loads or rejects. Scenarios:
- Clean blob → all hashes match → load succeeds
- Tampered plugin → content hash mismatch → load blocked
- Valid manifest + tampered artifact → blocked
- Missing signature (pre-signing) → WARNING, load proceeds
- Missing manifest entirely → WARNING, load proceeds (backward compat)

### Test additions
| Tier | Count | What |
|------|-------|------|
| L1 integration | +4 | aether-sim policy resolution (2), blob-verify round-trip (2) |
| L2 e2e | +2 | Full compile→emit→blob→verify→load→policy-resolve (1), HOST disabled + L2-L4 fallback (1) |

## Deployment Path

How governance artifacts reach the Aether runtime:

1. Developer runs `claws build` → artifacts written to workspace `.claws/compiled/`
2. Artifacts include: Gateway plugin, exec-approvals.json, SKILL.md, host-approval-policies.json, .claws-manifest.json (with content hashes)
3. These are workspace files — the adapter's `file_watcher.py` automatically detects changes and uploads them to Azure Blob (`wuclaw-{hash}` container)
4. On container (re)start, adapter's `blob_mount.py` downloads from blob, verifies manifest + content hashes, loads artifacts into Gateway

No manual `claws deploy` command is needed. The existing blob sync infrastructure handles delivery. For ClawPilot standalone mode, `claws build` writes artifacts locally and the Gateway reads them directly.

## Contract for Aether Consumers

### host-approval-policies.json

**Blob path**: `{workspace_root}/.claws/compiled/host-approval-policies.json`

**Schema** (version 1):
```json
{
  "schemaVersion": 1,
  "generatorVersion": "0.36.0",
  "policies": [
    {
      "server": "outlook",
      "tool": "send-email",
      "requires_approval": true,
      "risk_level": 5,
      "reason": "R5 tool — always gated"
    },
    {
      "server": "sharepoint_onedrive",
      "tool": "read-file",
      "requires_approval": false,
      "risk_level": 1,
      "reason": "R1 tool — auto-allow"
    }
  ],
  "defaults": {
    "unknown_tool": { "requires_approval": true, "risk_level": 5 },
    "r3_r4_default": { "requires_approval": true }
  }
}
```

**Fallback behavior**: If the file does not exist (pre-claws workspaces), fall back to the current default: `[{"server": "*", "tool": "*", "requires_approval": true}]`.

**Schema versioning**: Check `schemaVersion` field. If the version is higher than supported, fall back to the default (don't fail).

**Test fixture**: A reference fixture will be committed to both repos for cross-language validation.

## Scope

### Emit Artifact (claws-sdk)
- `claws-sdk/src/emit/emit-host-approval-policies.ts` (NEW) — Maps GovernanceIR risk classifications to ApprovalPolicyRegistry format. Input: GovernanceIR tool classifications + MCP server mapping. Output: `host-approval-policies.json`.
- `claws-sdk/src/emit/host-approval-policy-types.ts` (NEW) — AetherApprovalPolicy, PolicyMapping types matching Aether's `{server, tool, requires_approval}` schema.
- `claws-sdk/src/ir/governance-ir.ts` (EDIT) — Extend ToolCapability with optional `mcpServer?: string` field, populated during parse phase from workspace `mcp.servers` config. Bumps IR schema version.

### Blob Integrity (claws-sdk or adapter)
- Signature verification function that checks `.claws-manifest.json` against governance artifacts before loading. Reuses Thoth Pulse 18 artifact-signer verification.
- Integration point: `blob_mount.py` in Aether's `openclaw_adapter/` — call verification after download, before Gateway starts.

### GuardrailProvider Composition (upstream spec)
- `requiresExternalApproval` field added to `AuthorizationDecision` type in the GuardrailProvider spec.
- Documentation of the composition model: provider decides allow/deny, `requiresExternalApproval` signals the host to gate credentials.

## Dependencies

- **Thoth Pulse 18** (artifact-signer) — signing infrastructure for `.claws-manifest.json`
- **Thoth Pulse 49** (GuardrailProvider spec) — interface definition that this plan extends
- **Thoth Pulse 35** (publish pipeline) — manifest signing at publish time
- **Aether PR #5067** (Emmanuel) — `ApprovalPolicyRegistry` with per-container-type policies

## Out of Scope

- Aether-side code changes (those go in Aether PRs, not craftworks)
- ClawPilot integration (device-side is a separate plan)
- Fleet-wide policy push (Thoth claws-fleet-ops handles this)
- L5 sidecar in container Dockerfile (operational concern, not compiler concern)
- App-only SP credential for cron operations (Emmanuel's future work)

## Notes

- The `host-approval-policies.json` artifact is consumed by Aether's `openclaw_manager.py` when provisioning the container. Currently Emmanuel hardcodes `{"server": "*", "tool": "*", "requires_approval": true}`. With this plan, the manager reads the compiled artifact from blob instead.
- Blob integrity verification requires a change in the Aether repo (`blob_mount.py`). The verification LOGIC lives in claws-sdk (or @bic/openclaw-guardrails/audit), but the CALL SITE is in the adapter. This means the Aether repo gets a small PR that imports the verification function.
- The `requiresExternalApproval` field in AuthorizationDecision is an OPTIONAL extension to the GuardrailProvider spec. Providers that don't set it default to `false` (no host gate). This preserves backward compatibility.
- All 9 Graph MCP servers in Aether (outlook, outlook_calendar, m365_teams, sharepoint_onedrive, sharepoint_lists, me_profile, m365_search, m365_copilot, dynamics_sales) would get per-tool policies instead of the current blanket `"*"` wildcard.
- This plan is loyal to the upstream strategy: claws emits standard artifacts, OpenClaw's GuardrailProvider is the interface, and Aether is just one consumer. Any orchestrator that reads `host-approval-policies.json` gets the same governance.
- This plan extends claws-emit (4 artifacts) with a 5th artifact. The emit orchestrator in `openclaw-adapter.ts` must call `emitHostApprovalPolicies()` as part of the standard `emit()` pipeline. See `.craft/plans/claws-emit.md` for the existing emit architecture.
