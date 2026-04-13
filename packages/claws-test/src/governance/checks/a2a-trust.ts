/**
 * Check 7: A2A trust boundary declarations.
 *
 * Verifies that agent-to-agent delegations have trust boundary declarations.
 * Default-deny: delegations without explicit trust boundaries are rejected.
 *
 * @module @bic/claws-test/governance/checks/a2a-trust
 */

import type { GovernanceCheckInput, CheckResult, CheckFinding } from '../../types.js';

const CHECK_NAME = 'a2a-trust';

export function checkA2ATrust(input: GovernanceCheckInput): CheckResult {
  const findings: CheckFinding[] = [];

  for (const agent of input.agents) {
    if (agent.delegatesTo.length > 0 && !agent.hasTrustBoundary) {
      findings.push({
        checkName: CHECK_NAME,
        severity: 'high',
        message: `Agent '${agent.name}' delegates to [${agent.delegatesTo.join(', ')}] without a trust boundary declaration`,
        remediation: `Add trust boundary declaration for agent '${agent.name}' delegation chain`,
        target: agent.name,
      });
    }
  }

  return { name: CHECK_NAME, pass: findings.length === 0, findings };
}
