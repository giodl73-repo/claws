/**
 * Check 8: Input validation presence.
 *
 * Verifies that skill handlers validate their input before processing.
 * Unvalidated input is an injection vector.
 *
 * @module @bic/claws-test/governance/checks/input-validation
 */

import type { GovernanceCheckInput, CheckResult, CheckFinding } from '../../types.js';

const CHECK_NAME = 'input-validation';

export function checkInputValidation(input: GovernanceCheckInput): CheckResult {
  const findings: CheckFinding[] = [];

  if (!input.hasInputValidation) {
    findings.push({
      checkName: CHECK_NAME,
      severity: 'medium',
      message: 'Skill handler does not declare input validation — unvalidated input is an injection vector',
      remediation: 'Add @validate decorator with a Zod schema or equivalent input validation',
      target: 'input-validation',
    });
  }

  return { name: CHECK_NAME, pass: findings.length === 0, findings };
}
