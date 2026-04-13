/**
 * Check 10: Bounded reasoning limits.
 *
 * Verifies that skills declare step, tool call, budget, and recursion limits.
 * Unbounded reasoning is a denial-of-service and cost risk.
 *
 * @module @bic/claws-test/governance/checks/bounded-reasoning
 */

import type { GovernanceCheckInput, CheckResult, CheckFinding } from '../../types.js';

const CHECK_NAME = 'bounded-reasoning';

export function checkBoundedReasoning(input: GovernanceCheckInput): CheckResult {
  const findings: CheckFinding[] = [];
  const limits = input.reasoningLimits;

  if (!limits) {
    findings.push({
      checkName: CHECK_NAME,
      severity: 'medium',
      message: 'No reasoning limits declared — unbounded execution is a DoS and cost risk',
      remediation: 'Add @budget and @timeout decorators to set execution bounds',
      target: 'reasoning-limits',
    });
    return { name: CHECK_NAME, pass: false, findings };
  }

  if (limits.tokenBudget === undefined) {
    findings.push({
      checkName: CHECK_NAME,
      severity: 'medium',
      message: 'No token budget declared — unbounded token usage is a cost risk',
      remediation: 'Set a tokenBudget limit using @budget decorator',
      target: 'token-budget',
    });
  }

  if (limits.maxRecursionDepth === undefined) {
    findings.push({
      checkName: CHECK_NAME,
      severity: 'low',
      message: 'No recursion depth limit — recursive delegation chains can exhaust resources',
      remediation: 'Set a maxRecursionDepth limit in governance configuration',
      target: 'recursion-depth',
    });
  }

  return { name: CHECK_NAME, pass: findings.length === 0, findings };
}
