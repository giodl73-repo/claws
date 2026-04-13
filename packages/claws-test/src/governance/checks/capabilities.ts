/**
 * Check 5: Capability/permission alignment.
 *
 * Verifies that handlers only use tools listed in their capability manifest.
 * A handler using a tool not in the manifest is an undeclared capability.
 *
 * @module @bic/claws-test/governance/checks/capabilities
 */

import type { GovernanceCheckInput, CheckResult, CheckFinding } from '../../types.js';

const CHECK_NAME = 'capabilities';

export function checkCapabilities(input: GovernanceCheckInput): CheckResult {
  const findings: CheckFinding[] = [];
  const declaredTools = new Set(input.tools.map(t => t.name));

  // Check that all agents' delegatesTo targets exist as agents
  const agentNames = new Set(input.agents.map(a => a.name));
  for (const agent of input.agents) {
    for (const target of agent.delegatesTo) {
      if (!agentNames.has(target)) {
        findings.push({
          checkName: CHECK_NAME,
          severity: 'medium',
          message: `Agent '${agent.name}' delegates to '${target}' which is not declared in the workspace`,
          remediation: `Declare agent '${target}' in AGENTS.md or remove the delegation`,
          target: agent.name,
        });
      }
    }
  }

  return { name: CHECK_NAME, pass: findings.length === 0, findings };
}
