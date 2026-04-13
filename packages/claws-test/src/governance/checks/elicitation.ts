/**
 * Check 6: Elicitation gate presence for R5 tools.
 *
 * R5 (critical) tools MUST have an elicitation gate — a confirmation step
 * before executing high-risk operations.
 *
 * @module @bic/claws-test/governance/checks/elicitation
 */

import type { GovernanceCheckInput, CheckResult, CheckFinding } from '../../types.js';

const CHECK_NAME = 'elicitation';

const RISK_ORDER: Record<string, number> = {
  R1: 1, R2: 2, R3: 3, R4: 4, R5: 5,
};

export function checkElicitation(input: GovernanceCheckInput): CheckResult {
  const findings: CheckFinding[] = [];

  const hasR5Tool = input.tools.some(t => RISK_ORDER[t.riskLevel] === 5);

  if (hasR5Tool && !input.hasElicitationGate) {
    findings.push({
      checkName: CHECK_NAME,
      severity: 'critical',
      message: 'R5 tool present without elicitation gate — critical operations must require user confirmation',
      remediation: 'Add an elicitation gate (user confirmation step) for R5 tool invocations',
      target: 'elicitation-gate',
    });
  }

  return { name: CHECK_NAME, pass: findings.length === 0, findings };
}
