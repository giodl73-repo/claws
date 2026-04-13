/**
 * Check 9: Output guard presence.
 *
 * Verifies that handlers returning data from R4+ operations have output guards.
 * Unguarded output from high-risk operations can leak sensitive information.
 *
 * @module @bic/claws-test/governance/checks/output-guards
 */

import type { GovernanceCheckInput, CheckResult, CheckFinding } from '../../types.js';

const CHECK_NAME = 'output-guards';

const RISK_ORDER: Record<string, number> = {
  R1: 1, R2: 2, R3: 3, R4: 4, R5: 5,
};

export function checkOutputGuards(input: GovernanceCheckInput): CheckResult {
  const findings: CheckFinding[] = [];

  const hasHighRiskTool = input.tools.some(t => (RISK_ORDER[t.riskLevel] ?? 0) >= 4);

  if (hasHighRiskTool && !input.hasOutputGuards) {
    findings.push({
      checkName: CHECK_NAME,
      severity: 'high',
      message: 'R4+ tools present without output guards — high-risk output must be guarded against data leakage',
      remediation: 'Add output guards to filter or redact sensitive data from R4+ tool responses',
      target: 'output-guards',
    });
  }

  return { name: CHECK_NAME, pass: findings.length === 0, findings };
}
