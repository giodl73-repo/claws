# Aether Integration

<!-- atom:aether-integration (C97) -->

Host approval policy emission and fleet override precedence for vendor-neutral governance enforcement.

> **Prerequisites**: [Guardrail Provider](guardrail-provider.md) (classify, authorize, audit model). Next: [SARIF Pipeline](sarif-pipeline.md).

---

## Overview

claws compiles governance rules from workspace files (SOUL.md, TOOLS.md, lobster.yaml) into a GovernanceIR. The Aether integration layer transforms that IR into `host-approval-policies.json` -- a vendor-neutral artifact that any host approval gate can consume. Fleet overrides allow enterprises to relax or escalate approval requirements for R3-R4 tools, while R5 tools remain non-negotiable.

The architecture is deliberately host-agnostic: Aether is the reference consumer, but any host implementing the `HostApprovalPolicy` interface can use these artifacts.

---

## Artifact flow

```
GovernanceIR            emitHostApprovalPolicies()        Host Approval Gate
     |                          |                              |
     v                          v                              v
Capability Manifest  →  host-approval-policies.json  →  approve/deny UX
                           + fleet overrides
                           + audit entries
```

---

## Risk mapping

Each tool in the GovernanceIR's capability manifest is mapped to an approval requirement based on its risk level (see [Tool Classification](tool-classification.md) for the full R1-R5 table). The Aether-specific concern is fleet overridability:

- **R2 / low** (read): no approval required. Fleet overridable.
- **R3-R4 / medium-high** (write/execute): approval required by default. Fleet can relax or escalate.
- **R5 / critical** (transact): approval required. **Non-negotiable** -- fleet overrides are rejected.

Note: the emit layer uses `ToolRiskLevel` (string: `'low'` | `'medium'` | `'high'` | `'critical'`) while the governance layer uses numeric `RiskLevel` (1-5). There is no R1 equivalent in `ToolRiskLevel` -- the minimum emitted level is R2 (`'low'`). The `resolveApprovalGate` function operates on numeric `RiskLevel`, where R1-R2 both default to no approval.

Unknown tools default to R5 fail-closed.

---

## Fleet override precedence

Fleet overrides let enterprise administrators modify approval requirements for specific tools. Two types represent overrides at different layers: `FleetOverride` (emit layer, JSON-serializable for `host-approval-policies.json`) and `FleetApprovalOverride` (governance layer, used by `resolveApprovalGate`). The `fromFleetOverride()` bridge function converts between them. The `resolveApprovalGate` function in `fleet-precedence.ts` implements these rules:

1. **R5 is non-negotiable.** Any tool at risk level 5 always requires external approval, regardless of fleet policy. The result source is `'r5-non-negotiable'`.
2. **Fleet overrides win for R3-R4.** If a fleet override matches the tool name (and optionally server), it determines the `requiresExternalApproval` value. Source: `'fleet-override'`.
3. **Default by risk level.** R1-R2 default to no approval. R3+ default to approval required. Source: `'risk-default'`.

Fleet overrides that attempt to relax R5 tools are rejected with a warning:

```
Fleet override for "dangerous-tool" ignored — R5 critical tools are non-negotiable
```

---

## Policy resolution order

When resolving a policy for a specific tool call, `resolvePolicy` follows this precedence (per Aether PR #5067):

1. **Specific server + tool** -- exact match on both server name and tool name
2. **Wildcard server (`*`) + tool** -- tool matched against the default server
3. **Fail-closed default** -- unknown tool treated as R5 critical, approval required

---

## Blob integrity verification

Once approval policies are deployed as artifacts, they must be protected from tampering. At container restart, `verifyGovernanceArtifacts` ensures the deployed artifacts match what the compiler produced:

| Step | What happens                                                      |
| ---- | ----------------------------------------------------------------- |
| 1    | Read `.claws-manifest.json` from the deployment path              |
| 2    | Validate manifest structure (non-empty artifacts, schema version) |
| 3    | Verify manifest signature using the configured `KeyResolver`      |
| 4    | Compute SHA-256 of each listed artifact                           |
| 5    | Compare computed hashes against manifest-recorded hashes          |

Key constraints:

- Empty manifest (zero artifacts) is always a hard failure (prevents bypass)
- Missing signature is a warning by default, a hard failure when `requireSigned: true`
- Missing manifest entirely is a warning (backward compatible with pre-signing era)
- Verification times out at 10 seconds to prevent stalled containers
- Path traversal is blocked -- artifacts must resolve within the base directory

---

## Key types and functions

| Symbol                                     | Module                                       | Purpose                                                                                 |
| ------------------------------------------ | -------------------------------------------- | --------------------------------------------------------------------------------------- |
| `emitHostApprovalPolicies()`               | `claws-sdk/emit/emit-host-approval-policies` | Generate `host-approval-policies.json` from GovernanceIR                                |
| `resolvePolicy(policyIndex, server, tool)` | `claws-sdk/emit/emit-host-approval-policies` | O(1) policy lookup from pre-indexed map                                                 |
| `resolveApprovalGate()`                    | `claws-sdk/governance/fleet-precedence`      | Determine final `requiresExternalApproval` value                                        |
| `verifyGovernanceArtifacts()`              | `claws-sdk/compliance/blob-verify`           | Verify manifest + artifact integrity at container restart                               |
| `HostApprovalPolicy`                       | `claws-sdk/emit/host-approval-policy-types`  | Per-tool policy entry in the generated JSON                                             |
| `FleetApprovalOverride`                    | `claws-sdk/governance/fleet-precedence`      | Governance-layer fleet override (used by `resolveApprovalGate`)                         |
| `FleetOverride`                            | `claws-sdk/emit/host-approval-policy-types`  | Emit-layer fleet override (JSON-serializable, used in policy generation)                |
| `fromFleetOverride()`                      | `claws-sdk/governance/fleet-precedence`      | Bridge: converts emit-layer `FleetOverride` to governance-layer `FleetApprovalOverride` |

---

## Related concepts

- [Guardrail Provider](guardrail-provider.md) -- the provider interface that feeds GovernanceIR into this layer
- [Tool Classification](tool-classification.md) -- risk level assignment (R1-R5)
- [OBO Boundary](obo-boundary.md) -- on-behalf-of grants that interact with approval gates
- [Artifact Signing](artifact-signing.md) -- Ed25519/HMAC-SHA256 signing used by blob verification
- [Key Management](key-management.md) -- key resolution for manifest verification
