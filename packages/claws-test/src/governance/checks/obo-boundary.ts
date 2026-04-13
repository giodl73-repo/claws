/**
 * Check 2: OBO boundary consistency.
 *
 * Verifies that OBO-flagged tools operate within declared OBO boundaries.
 * A handler declaring OBO 'email' but accessing 'calendar' is a boundary violation.
 *
 * @module @bic/claws-test/governance/checks/obo-boundary
 */

import type { GovernanceCheckInput, CheckResult, CheckFinding } from '../../types.js';

const CHECK_NAME = 'obo-boundary';

export function checkOboBoundary(input: GovernanceCheckInput): CheckResult {
  const findings: CheckFinding[] = [];
  const declaredBoundaries = new Set(input.declaredOboBoundaries ?? []);

  for (const tool of input.tools) {
    if (tool.oboFlag && declaredBoundaries.size > 0) {
      const toolClass = tool.classification;
      if (!declaredBoundaries.has(toolClass)) {
        findings.push({
          checkName: CHECK_NAME,
          severity: 'high',
          message: `Tool '${tool.name}' is OBO-flagged with classification '${toolClass}' but only [${[...declaredBoundaries].join(', ')}] boundaries are declared`,
          remediation: `Add '${toolClass}' to the declared OBO boundaries or remove OBO flag from the tool`,
          target: tool.name,
        });
      }
    }
  }

  return { name: CHECK_NAME, pass: findings.length === 0, findings };
}
