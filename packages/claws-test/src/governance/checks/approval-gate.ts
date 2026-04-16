/**
 * Check 13: Approval gate consistency with risk classification.
 *
 * Validates that the workspace's approval posture is consistent
 * with its risk profile:
 * - R5 tools MUST have both elicitation gate AND audit trail configured.
 *   Without these, the provider cannot safely set requiresExternalApproval.
 * - Workspaces with R5 tools and fail-mode 'open' are flagged
 *   (R5 fail-open is a governance gap for approval gates).
 *
 * This check complements the existing elicitation check (check 6)
 * by focusing on the approval gate composition model, not individual
 * elicitation prompts.
 *
 * @module @bic/claws-test/governance/checks/approval-gate
 */

import type { GovernanceCheckInput, CheckResult, CheckFinding } from '../../types.js';

const CHECK_NAME = 'approval-gate';

const RISK_ORDER: Record<string, number> = {
  R1: 1, R2: 2, R3: 3, R4: 4, R5: 5,
};

export function checkApprovalGate(input: GovernanceCheckInput): CheckResult {
  const findings: CheckFinding[] = [];
  const hasR5 = input.tools.some(t => (RISK_ORDER[t.riskLevel] ?? 0) === 5);

  if (hasR5) {
    // R5 tools require both elicitation gate AND audit trail
    // for the approval gate composition model to work correctly
    if (!input.hasElicitationGate && !input.hasAuditTrail) {
      const r5Tools = input.tools
        .filter(t => (RISK_ORDER[t.riskLevel] ?? 0) === 5)
        .map(t => t.name);

      findings.push({
        checkName: CHECK_NAME,
        severity: 'critical',
        message: `R5 tools [${r5Tools.join(', ')}] have neither elicitation gate nor audit trail — approval gate composition requires at least one`,
        remediation: 'Configure hasElicitationGate: true and/or hasAuditTrail: true for R5 workspaces',
        target: r5Tools.join(', '),
      });
    }

    // R5 with fail-open is a governance gap for approval gates
    if (input.failMode === 'open') {
      findings.push({
        checkName: CHECK_NAME,
        severity: 'critical',
        message: 'R5 workspace with fail-mode open — approval gate composition requires fail-closed for R5',
        remediation: 'Set failMode to closed for workspaces containing R5 tools',
        target: 'fail-mode',
      });
    }
  }

  return { name: CHECK_NAME, pass: findings.length === 0, findings };
}
