/**
 * Fleet-scoped budget aggregation for the PROTECT command group.
 *
 * Discovers workspaces via fleet scan, collects per-workspace budget data
 * in parallel using the workspace-scoped `budget()` function, sorts by
 * spend percentage (highest spenders first), and produces a
 * BudgetFleetReport with fleet totals and per-workspace breakdown.
 *
 * @module claws-sdk/protect/budget-fleet
 */

import { basename } from 'node:path';

import { scanFleet } from '../fleet/scan.js';
import { runParallel } from '../fleet/runner.js';
import { budget } from './budget.js';
import type { BudgetFleetReport, WorkspaceBudgetEntry } from './types.js';
import type { FleetConfig } from '../fleet/types.js';

/**
 * Aggregate per-workspace budget entries into fleet totals.
 *
 * @param entries - Individual workspace budget entries with identity
 * @returns BudgetFleetReport with totals and sorted breakdown
 */
export function aggregateFleetBudget(entries: readonly WorkspaceBudgetEntry[]): BudgetFleetReport {
  if (entries.length === 0) {
    return {
      workspaces: [],
      totalSpend: 0,
      sortedByUsage: [],
    };
  }

  // Only count non-error entries toward totalSpend
  const totalSpend = entries
    .filter((e) => !e.error)
    .reduce((sum, e) => sum + e.report.tokenCount, 0);

  // Sort by usage percentage descending (highest spenders first)
  const sortedByUsage = [...entries].sort((a, b) => b.report.percentage - a.report.percentage);

  return {
    workspaces: entries,
    totalSpend,
    sortedByUsage,
  };
}

/**
 * Compute fleet-wide budget aggregation across all discovered workspaces.
 *
 * 1. Scan the fleet root directory for OC workspaces
 * 2. Collect per-workspace budget data in parallel
 * 3. Sort by spend percentage (highest first)
 * 4. Compute fleet totals
 *
 * @param fleetRoot - Absolute path to the root directory to scan
 * @param scanConfig - Optional partial fleet config overrides
 * @returns BudgetFleetReport with per-workspace breakdown and fleet totals
 */
export async function budgetFleet(
  fleetRoot: string,
  scanConfig?: Partial<FleetConfig>,
): Promise<BudgetFleetReport> {
  const scanResult = await scanFleet(fleetRoot, scanConfig);

  if (scanResult.workspaces.length === 0) {
    return aggregateFleetBudget([]);
  }

  const { results, errors } = await runParallel(
    scanResult.workspaces,
    async (workspace): Promise<WorkspaceBudgetEntry> => {
      const result = await budget(workspace.path);
      return {
        workspacePath: workspace.path,
        workspaceName: basename(workspace.path),
        report: result.report,
      };
    },
    4, // concurrency limit
  );

  // M-02: Propagate errors — include failed workspaces with error status
  const errorEntries: WorkspaceBudgetEntry[] = errors.map((e) => ({
    workspacePath: e.path,
    workspaceName: basename(e.path),
    report: { tokenCount: 0, limit: 0, percentage: 0, period: 'monthly' as const },
    error: e.error,
  }));

  return aggregateFleetBudget([...results, ...errorEntries]);
}
