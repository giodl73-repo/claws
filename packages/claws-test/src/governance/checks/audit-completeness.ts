/**
 * Check 11: Audit trail completeness.
 *
 * Verifies that governance-relevant operations are covered by audit trail.
 * Audit trails must survive legal discovery — gaps are compliance failures.
 *
 * @module @bic/claws-test/governance/checks/audit-completeness
 */

import type { GovernanceCheckInput, CheckResult, CheckFinding } from '../../types.js';

const CHECK_NAME = 'audit-completeness';

export function checkAuditCompleteness(input: GovernanceCheckInput): CheckResult {
  const findings: CheckFinding[] = [];

  if (!input.hasAuditTrail) {
    findings.push({
      checkName: CHECK_NAME,
      severity: 'high',
      message: 'No audit trail configured — governance events are not being recorded',
      remediation: 'Add @audit decorator to enable audit trail for governance-relevant operations',
      target: 'audit-trail',
    });
  }

  return { name: CHECK_NAME, pass: findings.length === 0, findings };
}
