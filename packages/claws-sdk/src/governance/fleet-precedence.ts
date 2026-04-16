/**
 * Fleet precedence resolution — determines the final `requiresExternalApproval`
 * value by composing provider defaults with fleet policy overrides.
 *
 * Precedence rules (per CM3 review amendment):
 * - Fleet policy override wins at host level for R3-R4.
 * - If fleet says R3 auto-approve, provider MUST NOT set
 *   requiresExternalApproval: true for R3 tools.
 * - R5 → requiresExternalApproval: true ALWAYS, regardless of fleet policy.
 * - R2 (low) → false by default (no approval needed).
 *
 * Per CISO W2: R3+ MUST set requiresExternalApproval: true unless
 * fleet override explicitly permits false.
 *
 * @module claws-sdk/governance/fleet-precedence
 */

import type { RiskLevel } from './guardrail-types.js';
import type { FleetOverride } from './fleet-override-types.js';

/**
 * Fleet override configuration for approval gate resolution.
 */
export interface FleetApprovalOverride {
  /** Tool name the override applies to. */
  readonly tool: string;
  /** MCP server (optional, applies to all servers if omitted). */
  readonly server?: string | undefined;
  /** Whether the fleet permits disabling external approval. */
  readonly allowAutoApprove: boolean;
  /** Reason for the override. */
  readonly reason: string;
}

/**
 * Result of approval gate resolution.
 */
export interface ApprovalGateResult {
  /** Final value for requiresExternalApproval. */
  readonly requiresExternalApproval: boolean;
  /** Source of the decision. */
  readonly source: 'risk-default' | 'fleet-override' | 'r5-non-negotiable';
  /** Human-readable explanation. */
  readonly reason: string;
}

/**
 * Default approval gate per risk level.
 *
 * R1-R2: false (no approval needed).
 * R3-R4: true (approval required, overridable by fleet).
 * R5: true (non-negotiable).
 */
function defaultApprovalForRisk(riskLevel: RiskLevel): boolean {
  return riskLevel >= 3;
}

/**
 * Resolve the final `requiresExternalApproval` value for a tool.
 *
 * Fleet override wins over provider default for R3-R4.
 * R5 always returns true regardless of fleet policy or provider setting.
 * R1-R2 returns false unless fleet explicitly requires approval.
 *
 * @param riskLevel - Numeric risk level (1-5)
 * @param toolName - Tool name for fleet override lookup
 * @param fleetOverrides - Fleet approval overrides
 * @param server - Optional MCP server for scoped override matching
 * @returns Resolution result with final value, source, and reason
 */
export function resolveApprovalGate(
  riskLevel: RiskLevel,
  toolName: string,
  fleetOverrides: readonly FleetApprovalOverride[] = [],
  server?: string,
): ApprovalGateResult {
  // R5: non-negotiable, always true
  if (riskLevel === 5) {
    return {
      requiresExternalApproval: true,
      source: 'r5-non-negotiable',
      reason: 'R5 critical risk — approval required (non-negotiable)',
    };
  }

  // Look for fleet override
  const override = fleetOverrides.find(
    o => o.tool === toolName && (o.server === undefined || o.server === server),
  );

  if (override) {
    // Fleet override found — R3-R4 can be overridden, R1-R2 can be escalated
    const requiresApproval = !override.allowAutoApprove;
    return {
      requiresExternalApproval: requiresApproval,
      source: 'fleet-override',
      reason: override.reason,
    };
  }

  // Default based on risk level
  const requiresApproval = defaultApprovalForRisk(riskLevel);
  return {
    requiresExternalApproval: requiresApproval,
    source: 'risk-default',
    reason: requiresApproval
      ? `R${riskLevel} risk — approval required by default`
      : `R${riskLevel} risk — no approval needed`,
  };
}

/**
 * Convert FleetOverride (from host-approval-policy-types) to FleetApprovalOverride.
 *
 * Maps the emit-layer FleetOverride type to the governance-layer
 * FleetApprovalOverride type for use with resolveApprovalGate.
 */
export function fromFleetOverride(override: FleetOverride): FleetApprovalOverride {
  return {
    tool: override.tool,
    server: override.server,
    allowAutoApprove: !override.requires_approval,
    reason: override.reason,
  };
}
