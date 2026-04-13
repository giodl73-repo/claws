/**
 * Check 3: Data label coverage.
 *
 * Verifies that tools processing sensitive data have appropriate data labels.
 * A handler processing PII without a data label declaration is a governance gap.
 *
 * @module @bic/claws-test/governance/checks/data-labels
 */

import type { GovernanceCheckInput, CheckResult, CheckFinding } from '../../types.js';

const CHECK_NAME = 'data-labels';

export function checkDataLabels(input: GovernanceCheckInput): CheckResult {
  const findings: CheckFinding[] = [];
  const declaredLabels = new Set(input.declaredDataLabels ?? []);

  for (const tool of input.tools) {
    if (tool.dataLabels && tool.dataLabels.length > 0) {
      for (const label of tool.dataLabels) {
        if (!declaredLabels.has(label)) {
          findings.push({
            checkName: CHECK_NAME,
            severity: 'high',
            message: `Tool '${tool.name}' processes data labeled '${label}' but skill does not declare this label`,
            remediation: `Add '${label}' to the skill's data label declarations`,
            target: tool.name,
          });
        }
      }
    }
  }

  return { name: CHECK_NAME, pass: findings.length === 0, findings };
}
