/**
 * Check 4: Fail-mode correctness per risk level.
 *
 * R5 (critical) operations MUST have fail-mode 'closed'.
 * Fail-open for R5 is never acceptable — this is a non-negotiable invariant.
 *
 * @module @bic/claws-test/governance/checks/fail-mode
 */

import type { GovernanceCheckInput, CheckResult, CheckFinding } from '../../types.js';

const CHECK_NAME = 'fail-mode';

const RISK_ORDER: Record<string, number> = {
  R1: 1, R2: 2, R3: 3, R4: 4, R5: 5,
};

export function checkFailMode(input: GovernanceCheckInput): CheckResult {
  const findings: CheckFinding[] = [];

  // Check if any tool is R5 or if the declared level is R5
  const hasR5Tool = input.tools.some(t => RISK_ORDER[t.riskLevel] === 5);
  const declaredIsR5 = input.declaredRiskLevel === 'R5';

  if ((hasR5Tool || declaredIsR5) && input.failMode !== 'closed') {
    const detail = input.failMode === undefined
      ? 'R5 operations must have explicit fail-mode \'closed\' — undefined fail-mode defaults to fail-open'
      : 'R5 operations must have fail-mode \'closed\' — fail-open is forbidden for critical rules';
    findings.push({
      checkName: CHECK_NAME,
      severity: 'critical',
      message: detail,
      remediation: 'Set failMode to \'closed\' in governance configuration. R5 fail-open is structurally unrepresentable.',
      target: 'fail-mode',
    });
  }

  // Warn on R4 with fail-open
  const hasR4Tool = input.tools.some(t => RISK_ORDER[t.riskLevel] === 4);
  if (hasR4Tool && input.failMode === 'open') {
    findings.push({
      checkName: CHECK_NAME,
      severity: 'high',
      message: 'R4 (high risk) operations have fail-mode \'open\' — consider fail-closed for high-risk operations',
      remediation: 'Set failMode to \'closed\' for high-risk operations',
      target: 'fail-mode',
    });
  }

  return { name: CHECK_NAME, pass: findings.length === 0, findings };
}
