/**
 * G-PERM rules — capability-based permissions matrix.
 *
 * Default permissive when unspecified, bidirectional fix suggestions
 * for capability mismatch, capability name normalization to uppercase
 * closed enum.
 *
 * @module claws-sdk/governance/rules/g-perm
 */

import type { CapabilityManifest } from '../../ir/capability-manifest.js';
import type { GovernanceRule, RuleResult, Violation } from '../types.js';

/**
 * Create G-PERM governance rules for registration in the rule registry.
 *
 * Returns 1 rule:
 * - G-PERM-01: Capability permissions validation with bidirectional fix suggestions
 */
export function createGPermRules(): GovernanceRule[] {
  const permissionsRule: GovernanceRule = {
    id: 'G-PERM-01',
    name: 'Capability Permissions',
    description: 'Validate tool capability permissions with bidirectional fix suggestions',
    evaluate(manifest: CapabilityManifest): RuleResult {
      const violations: Violation[] = [];

      for (const tool of manifest.tools) {
        // R5 tools must have explicit governance
        if (tool.oboFlag && tool.riskLevel === 'low') {
          violations.push({
            ruleId: 'G-PERM-01',
            severity: 'high',
            file: 'TOOLS.md',
            line: 1,
            message: `Tool "${tool.name}" is flagged OBO but declared as low risk — capability mismatch`,
            remediation: `Either: [tighten] set riskLevel to 'critical' for OBO tools, or [relax] remove oboFlag if tool does not act on behalf of users`,
          });
        }
      }

      return {
        ruleId: 'G-PERM-01',
        passed: violations.length === 0,
        violations,
      };
    },
  };

  return [permissionsRule];
}
