/**
 * Host approval policy types — vendor-neutral approval policy format
 * for host-level approval gates (Aether, etc.).
 *
 * Maps GovernanceIR risk classifications to approval requirements.
 * Schema version 1, forward-compatible via schemaVersion field.
 *
 * @module claws-sdk/emit/host-approval-policy-types
 */

import type { ToolRiskLevel } from '../ir/capability-manifest.js';

/**
 * A single host approval policy entry.
 *
 * Vendor-neutral: uses generic field names, not Aether-specific.
 * snake_case for JSON serialization compatibility with host platforms.
 */
export interface HostApprovalPolicy {
  /** MCP server that hosts this tool. */
  readonly server: string;
  /** Tool name within the server. */
  readonly tool: string;
  /** Whether the tool requires host-level approval before execution. */
  readonly requires_approval: boolean;
  /** Risk level string (low, medium, high, critical). */
  readonly risk_level: ToolRiskLevel;
  /** Human-readable reason for the approval requirement. */
  readonly reason: string;
}

/**
 * Mapping from risk level to default approval policy.
 *
 * R2 (low) → false: no approval needed
 * R3 (medium) → true: approval required (configurable via fleet override)
 * R4 (high) → true: approval required (configurable via fleet override)
 * R5 (critical) → true: approval required (NON-NEGOTIABLE, no override)
 */
export interface PolicyMapping {
  /** Risk level this mapping applies to. */
  readonly riskLevel: ToolRiskLevel;
  /** Default approval requirement. */
  readonly requiresApproval: boolean;
  /** Whether fleet overrides can change this mapping. */
  readonly overridable: boolean;
}

/**
 * Fleet override entry — changes approval policy for a specific tool.
 *
 * Per CM2: fleet overrides require audit chain entry + counter-signature.
 */
export interface FleetOverride {
  /** Tool name to override. */
  readonly tool: string;
  /** MCP server (optional, applies to all servers if omitted). */
  readonly server?: string;
  /** New approval requirement. */
  readonly requires_approval: boolean;
  /** Reason for the override. */
  readonly reason: string;
  /** Who authorized this override. */
  readonly authorizedBy: string;
  /** ISO 8601 timestamp of authorization. */
  readonly authorizedAt: string;
}

/**
 * Audit chain entry for a fleet override change.
 *
 * Per CM2: every fleet override produces an audit record.
 */
export interface FleetOverrideAuditEntry {
  /** The override that was applied. */
  readonly override: FleetOverride;
  /** Counter-signature from the approver. */
  readonly counterSignature: string;
  /** ISO 8601 timestamp of the audit entry. */
  readonly timestamp: string;
}

/**
 * The top-level host-approval-policies.json document.
 */
export interface HostApprovalPoliciesDocument {
  /** Schema version for forward compatibility. */
  readonly schemaVersion: number;
  /** Generated timestamp (ISO 8601). */
  readonly generatedAt: string;
  /** All approval policy entries. */
  readonly policies: readonly HostApprovalPolicy[];
  /** Fleet overrides that were applied (for audit trail). */
  readonly appliedOverrides: readonly FleetOverride[];
  /** Audit entries for fleet override changes. */
  readonly auditEntries: readonly FleetOverrideAuditEntry[];
}

/**
 * Default policy mappings per risk level.
 *
 * R2 → no approval, R3-R4 → approval (overridable), R5 → approval (non-negotiable).
 * Note: R1 does not exist in ToolRiskLevel — minimum is R2 (low).
 */
export const DEFAULT_POLICY_MAPPINGS: readonly PolicyMapping[] = [
  { riskLevel: 'low', requiresApproval: false, overridable: true },
  { riskLevel: 'medium', requiresApproval: true, overridable: true },
  { riskLevel: 'high', requiresApproval: true, overridable: true },
  { riskLevel: 'critical', requiresApproval: true, overridable: false },
] as const;

/**
 * Schema version for host-approval-policies.json.
 */
export const HOST_APPROVAL_POLICIES_SCHEMA_VERSION = 1;
