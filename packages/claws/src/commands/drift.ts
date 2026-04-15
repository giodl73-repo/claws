/**
 * `claws drift` command — fleet-level governance drift detection.
 *
 * Thin CLI adapter: calls drift SDK functions and renders results.
 * No business logic lives here.
 *
 * @module claws-cli/commands/drift
 */

import { scanFleet } from '@bic/claws-sdk/fleet';
import { detectDrift } from '@bic/claws-sdk/fleet';
import { loadBaseline } from '@bic/claws-sdk/fleet';
import { loadExceptions } from '@bic/claws-sdk/fleet';
import type { DriftResult } from '@bic/claws-sdk/fleet';

/**
 * Run the fleet drift detection command.
 *
 * @param dir - Fleet root directory to scan (defaults to cwd)
 * @param opts - Command options
 * @returns Exit code (0=clean, 1=drift detected, 3=error)
 */
export async function runDrift(
  dir: string,
  opts: { json: boolean; baseline: string },
): Promise<number> {
  let baseline: Awaited<ReturnType<typeof loadBaseline>>;
  let exceptions: Awaited<ReturnType<typeof loadExceptions>>;
  let workspacePaths: string[];

  try {
    // Load baseline from fleet manifest
    baseline = await loadBaseline(opts.baseline, dir);

    // Load exception registry
    exceptions = await loadExceptions(dir);

    // Scan for governed workspaces
    const scanResult = await scanFleet(dir, { maxDepth: 5 });
    workspacePaths = scanResult.workspaces
      .filter((ws) => ws.classification === 'GOVERNED')
      .map((ws) => ws.path);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (opts.json) {
      console.log(JSON.stringify({ status: 'error', message: msg }));
    } else {
      console.error(`Error: ${msg}`);
    }
    return 3;
  }

  if (workspacePaths.length === 0) {
    if (opts.json) {
      console.log(JSON.stringify({ status: 'ok', results: [], message: 'No governed workspaces found' }));
    } else {
      console.log('No governed workspaces found.');
    }
    return 0;
  }

  // Detect drift
  let results: readonly DriftResult[];
  try {
    results = await detectDrift(workspacePaths, baseline, exceptions);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (opts.json) {
      console.log(JSON.stringify({ status: 'error', message: msg }));
    } else {
      console.error(`Error: ${msg}`);
    }
    return 3;
  }

  if (opts.json) {
    console.log(JSON.stringify(results, null, 2));
    return hasDrift(results) ? 1 : 0;
  }

  // Terminal output
  renderTerminal(results);

  return hasDrift(results) ? 1 : 0;
}

/**
 * Check if any unsuppressed drift was detected.
 */
function hasDrift(results: readonly DriftResult[]): boolean {
  return results.some((r) => r.driftDetected && !r.suppressed);
}

/**
 * Render drift results for the terminal.
 */
function renderTerminal(results: readonly DriftResult[]): void {
  for (const r of results) {
    const statusTag = r.status.toUpperCase().padEnd(12);
    console.log(`  ${statusTag} ${r.workspacePath}`);

    if (r.severity) {
      console.log(`              severity: ${r.severity}`);
    }
    if (r.suppressed && r.suppressionReason) {
      console.log(`              suppressed: ${r.suppressionReason}`);
    }
    if (r.status === 'no-baseline') {
      console.log('              no baseline configured — rerun with `claws drift --baseline <path>`');
    }
    console.log();
  }

  const drifted = results.filter((r) => r.status === 'drifted').length;
  const clean = results.filter((r) => r.status === 'clean').length;
  const suppressed = results.filter((r) => r.status === 'suppressed').length;
  const noBaseline = results.filter((r) => r.status === 'no-baseline').length;

  console.log(`Drift check: ${results.length} workspace(s)`);
  console.log(`  clean: ${clean}  drifted: ${drifted}  suppressed: ${suppressed}  no-baseline: ${noBaseline}`);
}
