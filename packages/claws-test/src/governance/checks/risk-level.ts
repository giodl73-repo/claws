/**
 * Check 1: Risk level consistency.
 *
 * Verifies that declared risk levels match actual tool usage.
 * A skill declaring R3 but using R5-level tools is a governance gap.
 *
 * @module @bic/claws-test/governance/checks/risk-level
 */

import type { GovernanceCheckInput, CheckResult, CheckFinding } from '../../types.js';

const CHECK_NAME = 'risk-level';

const RISK_ORDER: Record<string, number> = {
  R1: 1, R2: 2, R3: 3, R4: 4, R5: 5,
};

export function checkRiskLevel(input: GovernanceCheckInput): CheckResult {
  const findings: CheckFinding[] = [];
  const declaredLevel = RISK_ORDER[input.declaredRiskLevel ?? ''] ?? 0;

  for (const tool of input.tools) {
    const toolLevel = RISK_ORDER[tool.riskLevel] ?? 0;
    if (toolLevel > declaredLevel && declaredLevel > 0) {
      findings.push({
        checkName: CHECK_NAME,
        severity: toolLevel >= 5 ? 'critical' : 'high',
        message: `Tool '${tool.name}' has risk level ${tool.riskLevel} but skill declares ${input.declaredRiskLevel}`,
        remediation: `Update skill risk declaration to at least ${tool.riskLevel} or remove the tool`,
        target: tool.name,
      });
    }
  }

  return { name: CHECK_NAME, pass: findings.length === 0, findings };
}
