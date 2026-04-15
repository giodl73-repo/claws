/**
 * Amendment validation — check a proposed amendment against GovernanceIR constraints.
 *
 * Rejects amendments that would violate trust tier or rule level constraints.
 * For example, adding an R5 tool to a workspace at trust tier T2 is rejected.
 *
 * @module claws-sdk/amend/validate
 */

import type { GovernanceIR } from '../ir/governance-ir.js';

/**
 * Supported amendment types.
 */
export type AmendmentType = 'add-skill' | 'remove-tool' | 'update-policy';

/**
 * A proposed amendment to workspace governance state.
 */
export interface Amendment {
  /** Type of amendment. */
  readonly type: AmendmentType;
  /** Target name (skill name, tool name, or policy field). */
  readonly target: string;
  /** New value or configuration for the amendment. */
  readonly value: Record<string, unknown>;
}

/**
 * A single validation violation for a proposed amendment.
 */
export interface AmendValidationViolation {
  /** Rule that was violated. */
  readonly ruleId: string;
  /** Human-readable explanation. */
  readonly message: string;
  /** The amendment field that caused the violation. */
  readonly field: string;
}

/**
 * Result of validating a proposed amendment.
 */
export interface AmendValidationResult {
  /** Whether the amendment is valid. */
  readonly valid: boolean;
  /** Violations found (empty if valid). */
  readonly violations: readonly AmendValidationViolation[];
}

/**
 * Trust tier thresholds — maximum allowed risk level per trust tier.
 *
 * Trust tier 1 = only low risk tools, tier 5 = all risk levels allowed.
 */
const TRUST_TIER_MAX_RISK: Record<number, number> = {
  1: 1,
  2: 3,
  3: 4,
  4: 5,
  5: 5,
};

/**
 * Map tool risk level strings to numeric values for comparison.
 */
function riskLevelToNumber(riskLevel: string): number {
  switch (riskLevel) {
    case 'low': return 1;
    case 'medium': return 2;
    case 'high': return 3;
    case 'critical': return 4;
    default: return 5;
  }
}

/**
 * Validate a proposed amendment against GovernanceIR constraints.
 *
 * Checks:
 * - add-skill: skill's required tools must exist and not exceed trust tier
 * - remove-tool: tool must not be required by existing skills
 * - update-policy: policy field must be recognized and value valid
 *
 * @param amendment - The proposed amendment
 * @param ir - Current GovernanceIR state
 * @param trustTier - Workspace trust tier (1–5)
 * @returns Validation result with violations if invalid
 */
export function validateAmendment(
  amendment: Amendment,
  ir: GovernanceIR,
  trustTier: number,
): AmendValidationResult {
  const violations: AmendValidationViolation[] = [];

  switch (amendment.type) {
    case 'add-skill': {
      // Check if skill declares required tools that exceed trust tier
      const requiredTools = amendment.value['requiredTools'];
      if (Array.isArray(requiredTools)) {
        for (const toolName of requiredTools) {
          if (typeof toolName !== 'string') continue;

          // Find the tool in capabilities
          const tool = ir.capabilities.tools.find(
            (t) => t.name.toLowerCase() === toolName.toLowerCase(),
          );

          if (!tool) {
            violations.push({
              ruleId: 'AMEND-V001',
              message: `Skill "${amendment.target}" requires tool "${toolName}" which does not exist in the workspace.`,
              field: 'requiredTools',
            });
            continue;
          }

          const riskNum = riskLevelToNumber(tool.riskLevel);
          const maxRisk = TRUST_TIER_MAX_RISK[trustTier] ?? 2;

          if (riskNum > maxRisk) {
            violations.push({
              ruleId: 'AMEND-V002',
              message: `Skill "${amendment.target}" requires tool "${toolName}" (risk: ${tool.riskLevel}) which exceeds trust tier T${trustTier} maximum.`,
              field: 'requiredTools',
            });
          }
        }
      }
      break;
    }

    case 'remove-tool': {
      // Check if any existing skills depend on the tool being removed
      const toolName = amendment.target.toLowerCase();
      const dependentSkills = ir.capabilities.skills.filter((s) =>
        s.requiredTools.some((t) => t.toLowerCase() === toolName),
      );

      for (const skill of dependentSkills) {
        violations.push({
          ruleId: 'AMEND-V003',
          message: `Cannot remove tool "${amendment.target}": skill "${skill.name}" depends on it.`,
          field: 'target',
        });
      }
      break;
    }

    case 'update-policy': {
      // Check if the policy field is recognized
      const validFields = ['trustTier', 'suppressions', 'failMode', 'auditLevel', 'policySet'];
      const field = amendment.target;

      if (!validFields.includes(field)) {
        violations.push({
          ruleId: 'AMEND-V004',
          message: `Unrecognized policy field "${field}". Valid fields: ${validFields.join(', ')}.`,
          field: 'target',
        });
      }

      // Validate trust tier range
      if (field === 'trustTier') {
        const newTier = amendment.value['trustTier'];
        if (typeof newTier !== 'number' || newTier < 1 || newTier > 5) {
          violations.push({
            ruleId: 'AMEND-V005',
            message: `Invalid trust tier value: ${String(newTier)}. Must be 1–5.`,
            field: 'value.trustTier',
          });
        }
      }
      break;
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}
