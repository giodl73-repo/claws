/**
 * Cross-file conflict detection — orchestrator for 7 conflict categories.
 *
 * Takes a GovernanceAST and ParsedManifest, runs all 7 detectors,
 * and produces a ConflictReport ordered by severity (Error first),
 * then by category.
 *
 * @module claws-sdk/compile/conflict-detect
 */

import type {
  GovernanceAST,
  ParsedManifest,
  ConflictReport,
  ConflictEntry,
  ConflictCategory,
} from './types.js';

import { detectDenyVsTool } from './conflicts/deny-vs-tool.js';
import { detectTrustEscalation } from './conflicts/trust-escalation.js';
import { detectOboWithoutElicit } from './conflicts/obo-without-elicit.js';
import { detectDataLabelMismatch } from './conflicts/data-label-mismatch.js';
import { detectCircularDelegation } from './conflicts/circular-delegation.js';
import { detectSkillToolGhost } from './conflicts/skill-tool-ghost.js';
import { detectScheduleNoApproval } from './conflicts/schedule-no-approval.js';

/**
 * Category ordering for stable sort (alphabetical by category name).
 */
const CATEGORY_ORDER: Record<ConflictCategory, number> = {
  'CIRCULAR-DELEGATION': 0,
  'DATA-LABEL-MISMATCH': 1,
  'DENY-vs-TOOL': 2,
  'OBO-WITHOUT-ELICIT': 3,
  'SCHEDULE-NO-APPROVAL': 4,
  'SKILL-TOOL-GHOST': 5,
  'TRUST-ESCALATION': 6,
};

/**
 * Sort conflicts: Error first, then Warning. Within same severity,
 * sort by category order for stable output.
 */
function sortConflicts(conflicts: ConflictEntry[]): ConflictEntry[] {
  return conflicts.sort((a, b) => {
    // Severity: Error < Warning (Error comes first)
    const severityOrder = a.severity === b.severity ? 0 : a.severity === 'Error' ? -1 : 1;
    if (severityOrder !== 0) return severityOrder;

    // Category order — CATEGORY_ORDER covers all ConflictCategory values
    return CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category];
  });
}

/**
 * Detect all cross-file conflicts in a GovernanceAST + ParsedManifest.
 *
 * Runs 7 independent conflict detectors and aggregates results into
 * a sorted ConflictReport.
 *
 * @param ast - The GovernanceAST from pass 2 parsing
 * @param manifest - The ParsedManifest from extraction
 * @returns ConflictReport with all detected conflicts
 */
export function detectConflicts(
  ast: GovernanceAST,
  manifest: ParsedManifest,
): ConflictReport {
  // Run all 7 detectors
  const allConflicts: ConflictEntry[] = [
    ...detectDenyVsTool(ast, manifest),
    ...detectTrustEscalation(ast, manifest),
    ...detectOboWithoutElicit(ast, manifest),
    ...detectDataLabelMismatch(ast, manifest),
    ...detectCircularDelegation(ast, manifest),
    ...detectSkillToolGhost(ast, manifest),
    ...detectScheduleNoApproval(ast, manifest),
  ];

  // Sort by severity then category
  const sorted = sortConflicts(allConflicts);

  return {
    conflicts: sorted,
    errorCount: sorted.filter(c => c.severity === 'Error').length,
    warningCount: sorted.filter(c => c.severity === 'Warning').length,
  };
}
