/**
 * R5 fail-closed enforcement for the claws free tier.
 *
 * Walks governance analysis output and identifies ambiguous or conflicting
 * rules. Every ambiguity triggers fail-closed (deny). This enforcement
 * is permanent and non-negotiable in the free tier.
 *
 * @module claws-sdk/compiler/enforce/r5
 */

import type { OCWorkspaceIR } from '../ir/workspace-ir.js';
import type {
  GovAnalysis,
  GovViolation,
  FailClosedResult,
  FailClosedViolation,
} from './types.js';

/**
 * Check whether a governance violation represents an ambiguous rule
 * that cannot be definitively resolved.
 *
 * Ambiguity indicators:
 * - Fix suggestions exist in both directions (tighten AND relax)
 * - Tool fuzzy matches suggest the rule target may be wrong
 * - The violation has R5 level (critical)
 */
function isAmbiguousViolation(v: GovViolation): boolean {
  const hasBidirectionalFix =
    v.fixSuggestions.some((f) => f.direction === 'tighten') &&
    v.fixSuggestions.some((f) => f.direction === 'relax');

  const hasFuzzyMatch = v.toolFuzzyMatches.length > 0;

  return hasBidirectionalFix || hasFuzzyMatch || v.level === 5;
}

/**
 * Convert a GovViolation to a FailClosedViolation.
 */
function violationToFailClosed(v: GovViolation): FailClosedViolation {
  return {
    rule: v.ruleId,
    context: `Target: ${v.target}, diagnostic: ${v.diagnosticCode}`,
    severity: v.level === 5 ? 'critical' : v.level >= 4 ? 'high' : 'medium',
    explanation: `Rule ${v.ruleId} cannot be definitively resolved: ${v.message}`,
  };
}

/**
 * Check governance analysis violations for ambiguity.
 */
function checkViolations(analysis: GovAnalysis): FailClosedViolation[] {
  const violations: FailClosedViolation[] = [];

  for (const v of analysis.violations) {
    if (isAmbiguousViolation(v)) {
      violations.push(violationToFailClosed(v));
    }
  }

  return violations;
}

/**
 * Check for effective R5 count anomalies.
 * If overridden R5 count exceeds derived count, something is wrong --
 * fail closed on the discrepancy.
 */
function checkR5Counts(analysis: GovAnalysis): FailClosedViolation[] {
  const { effectiveR5Count } = analysis;

  if (effectiveR5Count.overridden > effectiveR5Count.derived) {
    return [
      {
        rule: 'R5-COUNT-ANOMALY',
        context: `Derived: ${effectiveR5Count.derived}, overridden: ${effectiveR5Count.overridden}, total: ${effectiveR5Count.total}`,
        severity: 'critical',
        explanation:
          'R5 override count exceeds derived count — more rules were overridden to R5 than ' +
          'were originally derived, indicating potential policy manipulation.',
      },
    ];
  }

  return [];
}

/**
 * Check workspace IR for governance-relevant diagnostics.
 * Any error-severity diagnostic in the workspace IR is a fail-closed violation
 * because the workspace state is not definitively known.
 */
function checkWorkspaceDiagnostics(workspace: OCWorkspaceIR): FailClosedViolation[] {
  const violations: FailClosedViolation[] = [];

  for (const d of workspace.diagnostics) {
    if (d.severity === 'error') {
      violations.push({
        rule: d.code,
        context: `File: ${d.file}, line: ${d.line ?? 'unknown'}`,
        severity: 'critical',
        explanation: `Workspace diagnostic error prevents definitive governance analysis: ${d.message}`,
      });
    }
  }

  return violations;
}

/**
 * Count the total number of governance rules checked.
 */
function countRulesChecked(
  analysis: GovAnalysis,
  workspace: OCWorkspaceIR,
): number {
  return (
    analysis.violations.length +
    analysis.warnings.length +
    workspace.diagnostics.length +
    1 // R5 count check
  );
}

/**
 * Enforce R5 fail-closed on governance analysis results.
 *
 * Walks the analysis output and workspace diagnostics.
 * Identifies ambiguous or conflicting rules. Returns a FailClosedResult:
 * - `{ ok: true }` if all rules are definitively resolved
 * - `{ ok: false, violations }` if any rule is ambiguous or conflicting
 *
 * The free tier does not produce cross-rule conflict reports; rich conflict
 * detection (OBO, multi-constraint) is a paid-tier extension.
 *
 * This function is permanent and cannot be turned off in the free tier.
 */
export function enforceR5(
  analysis: GovAnalysis,
  workspace: OCWorkspaceIR,
): FailClosedResult {
  const violations: FailClosedViolation[] = [
    ...checkViolations(analysis),
    ...checkR5Counts(analysis),
    ...checkWorkspaceDiagnostics(workspace),
  ];

  const rulesChecked = countRulesChecked(analysis, workspace);

  if (violations.length === 0) {
    return { ok: true, rulesChecked };
  }

  return { ok: false, rulesChecked, violations };
}
