/**
 * Conflict report conversion — transforms compile-types ConflictReport
 * to ir/ConflictReport with full detail preservation.
 *
 * M8 fix: previous implementation dropped oboConflicts and
 * multiConstraintConflicts (always empty arrays). This version
 * maps ConflictEntry data to the appropriate IR conflict categories.
 *
 * @module claws-sdk/compile/conflicts-ir
 */

import type { ConflictReport as CompileConflictReport, ConflictEntry } from './types.js';
import type {
  ConflictReport as IRConflictReport,
  OboConflict,
  MultiConstraintConflict,
  ConflictSeverity,
} from '../ir/conflict-report.js';

/**
 * Map compile-level ConflictLevel ('Error'|'Warning') to IR ConflictSeverity.
 */
function toIRSeverity(severity: string): ConflictSeverity {
  if (severity === 'Error') return 'error';
  if (severity === 'Warning') return 'warning';
  return 'info';
}

/**
 * Categories that map to OBO conflicts in the IR.
 */
const OBO_CATEGORIES = new Set(['OBO-WITHOUT-ELICIT']);

/**
 * Categories that map to multi-constraint conflicts in the IR.
 * These involve 2+ rules creating cross-file contradictions.
 */
const MULTI_CONSTRAINT_CATEGORIES = new Set([
  'DENY-vs-TOOL',
  'TRUST-ESCALATION',
  'DATA-LABEL-MISMATCH',
  'CIRCULAR-DELEGATION',
  'SKILL-TOOL-GHOST',
  'SCHEDULE-NO-APPROVAL',
]);

/**
 * Extract tool name from a ConflictEntry explanation.
 *
 * OBO conflict explanations follow the pattern: Tool "toolName" (R{N}) ...
 * Falls back to the raw explanation if the pattern doesn't match.
 */
function extractToolName(entry: ConflictEntry): string {
  const match = /Tool "([^"]+)"/.exec(entry.explanation);
  return match ? match[1]! : entry.explanation;
}

/**
 * Convert a compile ConflictEntry to an OboConflict.
 */
function toOboConflict(entry: ConflictEntry): OboConflict {
  return {
    toolName: extractToolName(entry),
    grantRuleId: `${entry.code}@${entry.locationA.file}:${entry.locationA.line}`,
    denyRuleId: `${entry.code}@${entry.locationB.file}:${entry.locationB.line}`,
    severity: toIRSeverity(entry.severity),
    grantLevel: 1,
    denyLevel: 1,
    description: entry.explanation,
    oboWithoutElicit: entry.category === 'OBO-WITHOUT-ELICIT',
  };
}

/**
 * Convert a compile ConflictEntry to a MultiConstraintConflict.
 *
 * Multi-constraint conflicts involve 2+ locations. Both locations
 * contribute distinct rule IDs so downstream consumers can trace
 * each side of the contradiction.
 */
function toMultiConstraintConflict(entry: ConflictEntry): MultiConstraintConflict {
  return {
    target: `${entry.locationA.file}:${entry.locationA.line}`,
    ruleIds: [
      `${entry.code}@${entry.locationA.file}:${entry.locationA.line}`,
      `${entry.code}@${entry.locationB.file}:${entry.locationB.line}`,
    ],
    severity: toIRSeverity(entry.severity),
    description: entry.explanation,
  };
}

/**
 * Convert a compile-types ConflictReport to an ir/ConflictReport,
 * preserving conflict details in the appropriate IR categories.
 */
export function toIRConflictReport(compileReport: CompileConflictReport): IRConflictReport {
  const oboConflicts: OboConflict[] = [];
  const multiConstraintConflicts: MultiConstraintConflict[] = [];

  for (const entry of compileReport.conflicts) {
    if (OBO_CATEGORIES.has(entry.category)) {
      oboConflicts.push(toOboConflict(entry));
    } else if (MULTI_CONSTRAINT_CATEGORIES.has(entry.category)) {
      multiConstraintConflicts.push(toMultiConstraintConflict(entry));
    }
  }

  return {
    oboConflicts,
    multiConstraintConflicts,
    haltReason: compileReport.errorCount > 0
      ? `${compileReport.errorCount} error-severity conflicts`
      : null,
    hasOboWithoutElicit: oboConflicts.some(c => c.oboWithoutElicit),
    totalConflicts: compileReport.conflicts.length,
  };
}
