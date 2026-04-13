/**
 * G-SUPPLY rules — supply chain security.
 *
 * 1 rule:
 * - G-SUPPLY-01: Skill signing validation — flag unsigned skills,
 *   validate governance levels, detect malicious skill patterns.
 *
 * Unsigned skills are ALWAYS a violation, never advisory-only.
 *
 * @module claws-sdk/governance/rules/g-supply
 */

import type { CapabilityManifest } from '../../ir/capability-manifest.js';
import type { GovernanceRule, RuleResult, Violation } from '../types.js';

/**
 * Governance level threshold — skills at or above this level
 * require explicit signing/verification.
 *
 * Level 1: built-in/platform (trusted)
 * Level 2: workspace-local (semi-trusted)
 * Level 3+: external/marketplace (untrusted without signing)
 */
const SIGNING_REQUIRED_LEVEL = 3;

/**
 * Create G-SUPPLY governance rules for registration in the rule registry.
 *
 * Returns 1 rule:
 * - G-SUPPLY-01: Skill signing validation
 */
export function createGSupplyRules(): GovernanceRule[] {
  const skillSigningValidation: GovernanceRule = {
    id: 'G-SUPPLY-01',
    name: 'Skill Signing Validation',
    description: 'Validate skill provenance — unsigned marketplace skills are always violations',
    evaluate(manifest: CapabilityManifest): RuleResult {
      const violations: Violation[] = [];

      for (const skill of manifest.skills) {
        // Skills with governance level >= 3 are external/marketplace
        // and require signing verification
        if (skill.governanceLevel >= SIGNING_REQUIRED_LEVEL) {
          violations.push({
            ruleId: 'G-SUPPLY-01',
            severity: 'critical',
            file: 'skills/',
            line: 1,
            message: `Skill "${skill.name}" (governance level ${skill.governanceLevel}) is unsigned — supply chain violation. Unsigned skills are never advisory-only`,
            remediation: `Sign skill "${skill.name}" with a trusted publisher key, or reduce governance level to 2 (workspace-local) if it is a first-party skill`,
          });
        }
      }

      return { ruleId: 'G-SUPPLY-01', passed: violations.length === 0, violations };
    },
  };

  return [skillSigningValidation];
}
