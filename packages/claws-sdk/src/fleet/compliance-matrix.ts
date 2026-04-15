/**
 * Workspace x framework compliance table.
 *
 * For each workspace, checks which policy frameworks are applied (SOC2,
 * ISO 27001, custom), governance check pass/fail status, and trust tier.
 * Returns ComplianceMatrix as 2D structure (workspace rows, framework columns).
 *
 * This module re-exports the matrix builder from report.ts and adds
 * convenience functions for querying the matrix.
 *
 * @module claws-sdk/fleet/compliance-matrix
 */

import type {
  ComplianceMatrix,
  ComplianceRow,
  ComplianceCell,
  ComplianceStatus,
} from './report.js';

export type { ComplianceMatrix, ComplianceRow, ComplianceCell, ComplianceStatus };
export { buildComplianceMatrix } from './report.js';

/**
 * Count workspaces by compliance status for a given framework.
 */
export function countByStatus(
  matrix: ComplianceMatrix,
  framework: string,
): { pass: number; fail: number; missing: number } {
  let pass = 0;
  let fail = 0;
  let missing = 0;

  for (const row of matrix.rows) {
    const cell = row.cells.find((c) => c.framework === framework);
    if (!cell || cell.status === 'missing') {
      missing++;
    } else if (cell.status === 'pass') {
      pass++;
    } else {
      fail++;
    }
  }

  return { pass, fail, missing };
}

/**
 * Get the compliance status for a specific workspace and framework.
 * Returns 'missing' if the workspace or framework is not found.
 */
export function getComplianceStatus(
  matrix: ComplianceMatrix,
  workspacePath: string,
  framework: string,
): ComplianceStatus {
  const row = matrix.rows.find((r) => r.workspace === workspacePath);
  if (!row) return 'missing';
  const cell = row.cells.find((c) => c.framework === framework);
  return cell?.status ?? 'missing';
}

/**
 * Get all failing workspaces for a given framework.
 */
export function getFailingWorkspaces(
  matrix: ComplianceMatrix,
  framework: string,
): readonly string[] {
  return matrix.rows
    .filter((row) => {
      const cell = row.cells.find((c) => c.framework === framework);
      return cell?.status === 'fail';
    })
    .map((row) => row.workspace);
}

/**
 * Compute overall compliance percentage across all frameworks and workspaces.
 * Only counts cells where the framework is applied (not 'missing').
 */
export function overallComplianceRate(matrix: ComplianceMatrix): number {
  let applicable = 0;
  let passing = 0;

  for (const row of matrix.rows) {
    for (const cell of row.cells) {
      if (cell.status !== 'missing') {
        applicable++;
        if (cell.status === 'pass') {
          passing++;
        }
      }
    }
  }

  return applicable === 0 ? 100 : Math.round((passing / applicable) * 100);
}
