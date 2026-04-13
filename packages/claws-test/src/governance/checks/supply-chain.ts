/**
 * Check 12: Supply chain signature.
 *
 * Verifies that skill packages include supply chain signatures
 * for integrity verification. Unsigned skills are a supply chain risk.
 *
 * @module @bic/claws-test/governance/checks/supply-chain
 */

import type { GovernanceCheckInput, CheckResult, CheckFinding } from '../../types.js';

const CHECK_NAME = 'supply-chain';

export function checkSupplyChain(input: GovernanceCheckInput): CheckResult {
  const findings: CheckFinding[] = [];

  if (!input.hasSupplyChainSignature) {
    findings.push({
      checkName: CHECK_NAME,
      severity: 'medium',
      message: 'No supply chain signature — skill integrity cannot be verified',
      remediation: 'Sign the skill package using `claws sign` before publishing to ClawHub',
      target: 'supply-chain-signature',
    });
  }

  return { name: CHECK_NAME, pass: findings.length === 0, findings };
}
