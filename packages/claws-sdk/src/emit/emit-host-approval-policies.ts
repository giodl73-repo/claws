/**
 * host-approval-policies.json emitter — generates vendor-neutral
 * host approval policy entries from GovernanceIR.
 *
 * Maps GovernanceIR tool risk classifications to a host approval policy
 * format consumed by any host-level approval gate (Aether, etc.).
 *
 * Risk mapping:
 * - R2 (low) → requires_approval: false
 * - R3 (medium) → requires_approval: true (configurable via fleet override)
 * - R4 (high) → requires_approval: true (configurable via fleet override)
 * - R5 (critical) → requires_approval: true (NON-NEGOTIABLE)
 *
 * Unknown tools default to R5 fail-closed.
 *
 * Uses pre-indexed Map<server, Map<tool, Policy>> for O(1) resolution
 * per CM9 review amendment.
 *
 * @module claws-sdk/emit/emit-host-approval-policies
 */

import type { GovernanceIR } from '../ir/governance-ir.js';
import type { ToolCapability, ToolRiskLevel } from '../ir/capability-manifest.js';
import {
  DEFAULT_POLICY_MAPPINGS,
  HOST_APPROVAL_POLICIES_SCHEMA_VERSION,
  type FleetOverride,
  type FleetOverrideAuditEntry,
  type HostApprovalPoliciesDocument,
  type HostApprovalPolicy,
} from './host-approval-policy-types.js';

/**
 * Options for host approval policy generation.
 */
export interface EmitHostApprovalPoliciesOptions {
  /** Fleet overrides for specific tools. */
  readonly fleetOverrides?: readonly FleetOverride[];
  /** Default MCP server name when tool has no mcpServer field. */
  readonly defaultServer?: string;
}

/**
 * Result of host-approval-policies.json generation.
 */
export interface HostApprovalPoliciesResult {
  /** The generated JSON string. */
  readonly content: string;
  /** Warnings produced during generation. */
  readonly warnings: readonly string[];
  /** Pre-indexed policy map: server → tool → policy (O(1) lookup). */
  readonly policyIndex: ReadonlyMap<string, ReadonlyMap<string, HostApprovalPolicy>>;
}

/**
 * Determine the default approval requirement for a risk level.
 */
function defaultApprovalForRisk(riskLevel: ToolRiskLevel): boolean {
  const mapping = DEFAULT_POLICY_MAPPINGS.find(m => m.riskLevel === riskLevel);
  return mapping?.requiresApproval ?? true; // fail-closed for unknown
}

/**
 * Check whether a risk level allows fleet overrides.
 */
function isOverridable(riskLevel: ToolRiskLevel): boolean {
  const mapping = DEFAULT_POLICY_MAPPINGS.find(m => m.riskLevel === riskLevel);
  return mapping?.overridable ?? false; // R5 is non-negotiable
}

/**
 * Build a human-readable reason for the approval policy.
 */
function buildReason(tool: ToolCapability, requiresApproval: boolean): string {
  if (requiresApproval) {
    return `R${riskLevelToNumeric(tool.riskLevel)} ${tool.riskLevel} risk — approval required`;
  }
  return `R${riskLevelToNumeric(tool.riskLevel)} ${tool.riskLevel} risk — no approval needed`;
}

/**
 * Convert ToolRiskLevel string to numeric R-level.
 */
function riskLevelToNumeric(risk: ToolRiskLevel): number {
  switch (risk) {
    case 'critical': return 5;
    case 'high': return 4;
    case 'medium': return 3;
    case 'low': return 2;
  }
}

/**
 * Resolve the MCP server for a tool.
 *
 * Uses the tool's mcpServer field if populated during parse phase (CM5),
 * otherwise falls back to the default server name.
 */
function resolveServer(
  tool: ToolCapability,
  defaultServer: string,
): string {
  return tool.mcpServer ?? defaultServer;
}

/**
 * Generate host-approval-policies.json from a GovernanceIR.
 *
 * Builds a pre-indexed Map<server, Map<tool, Policy>> for O(1) resolution.
 * Fleet overrides produce audit chain entries per CM2.
 *
 * @param ir - The compiled GovernanceIR
 * @param options - Generation options (fleet overrides, default server)
 * @returns JSON content with policies, warnings, and pre-indexed policy map
 */
export function emitHostApprovalPolicies(
  ir: GovernanceIR,
  options: EmitHostApprovalPoliciesOptions = {},
): HostApprovalPoliciesResult {
  const warnings: string[] = [];
  const defaultServer = options.defaultServer ?? '*';
  const fleetOverrides = options.fleetOverrides ?? [];

  // Build policy entries from capability manifest tools
  const policies: HostApprovalPolicy[] = [];
  const policyIndex = new Map<string, Map<string, HostApprovalPolicy>>();

  for (const tool of ir.capabilities.tools) {
    const server = resolveServer(tool, defaultServer);
    let requiresApproval = defaultApprovalForRisk(tool.riskLevel);
    let reason = buildReason(tool, requiresApproval);

    // Apply fleet overrides (only for overridable risk levels)
    const override = fleetOverrides.find(
      o => o.tool === tool.name && (o.server === undefined || o.server === server),
    );
    if (override) {
      if (isOverridable(tool.riskLevel)) {
        requiresApproval = override.requires_approval;
        reason = override.reason;
      } else {
        warnings.push(
          `Fleet override for "${tool.name}" ignored — R5 critical tools are non-negotiable`,
        );
      }
    }

    const policy: HostApprovalPolicy = {
      server,
      tool: tool.name,
      requires_approval: requiresApproval,
      risk_level: tool.riskLevel,
      reason,
    };

    policies.push(policy);

    // Index for O(1) lookup
    if (!policyIndex.has(server)) {
      policyIndex.set(server, new Map());
    }
    policyIndex.get(server)!.set(tool.name, policy);
  }

  // Use the IR's compiledAt for deterministic output (same IR → same artifact)
  const generatedAt = ir.compiler.compiledAt;

  // Build audit entries for fleet overrides
  const auditEntries: FleetOverrideAuditEntry[] = [];
  const appliedOverrides: FleetOverride[] = [];

  for (const override of fleetOverrides) {
    // Find matching tool to check if override was actually applied
    const matchingTool = ir.capabilities.tools.find(t => t.name === override.tool);
    if (matchingTool && isOverridable(matchingTool.riskLevel)) {
      appliedOverrides.push(override);
      auditEntries.push({
        override,
        counterSignature: `${override.authorizedBy}:${override.authorizedAt}`,
        timestamp: generatedAt,
      });
    }
  }

  // Build the document
  const doc: HostApprovalPoliciesDocument = {
    schemaVersion: HOST_APPROVAL_POLICIES_SCHEMA_VERSION,
    generatedAt,
    policies,
    appliedOverrides,
    auditEntries,
  };

  const content = JSON.stringify(doc, null, 2);
  return { content, warnings, policyIndex };
}

/**
 * Resolve a policy for a specific tool call using the pre-indexed map.
 *
 * Resolution order (per Aether PR #5067):
 * 1. Specific server + tool match
 * 2. Wildcard server (*) + tool match
 * 3. Default: fail-closed (requires approval)
 *
 * @param policyIndex - Pre-indexed policy map from emitHostApprovalPolicies
 * @param server - MCP server name
 * @param tool - Tool name
 * @returns The resolved policy, or a fail-closed default
 */
export function resolvePolicy(
  policyIndex: ReadonlyMap<string, ReadonlyMap<string, HostApprovalPolicy>>,
  server: string,
  tool: string,
): HostApprovalPolicy {
  // 1. Specific server + tool
  const serverMap = policyIndex.get(server);
  if (serverMap) {
    const policy = serverMap.get(tool);
    if (policy) return policy;
  }

  // 2. Wildcard server + tool
  const wildcardMap = policyIndex.get('*');
  if (wildcardMap) {
    const policy = wildcardMap.get(tool);
    if (policy) return policy;
  }

  // 3. Default fail-closed (unknown tool → R5)
  return {
    server,
    tool,
    requires_approval: true,
    risk_level: 'critical',
    reason: 'Unknown tool — fail-closed at R5',
  };
}
