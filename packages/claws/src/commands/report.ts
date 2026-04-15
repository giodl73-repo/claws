/**
 * `claws report` command — fleet-level compliance reporting.
 *
 * Thin CLI adapter: calls fleet SDK functions and renders results.
 * No business logic lives here.
 *
 * @module claws-cli/commands/report
 */

import { resolve } from 'node:path';
import { scanFleet, generateFleetReport, formatReport } from '@bic/claws-sdk/fleet';
import type { ReportFormat } from '@bic/claws-sdk/fleet';

/**
 * Run the fleet report command.
 *
 * @param opts - Command options
 * @returns Exit code (0=success, 1=no workspaces/validation failure, 3=runtime error)
 */
export async function runReport(opts: {
  fleet: string;
  format: ReportFormat | 'auto';
  baseline?: string;
  json: boolean;
}): Promise<number> {
  const fleetDir = resolve(opts.fleet);

  // Determine output format
  let format: ReportFormat;
  if (opts.json) {
    format = 'json';
  } else if (opts.format === 'auto') {
    // Default: table when stdout is TTY, JSON when piped
    format = process.stdout.isTTY ? 'table' : 'json';
  } else {
    format = opts.format;
  }

  try {
    // Scan fleet
    const scanResult = await scanFleet(fleetDir, { maxDepth: 5 });

    if (scanResult.workspaces.length === 0) {
      if (format === 'json') {
        console.error(JSON.stringify({ status: 'error', message: 'No workspaces found in fleet directory' }));
      } else {
        console.error('No workspaces found in fleet directory.');
      }
      return 1;
    }

    // Generate report
    const report = await generateFleetReport(scanResult, fleetDir, {
      baseline: opts.baseline,
    });

    // Format and output
    const output = formatReport(report, format);
    process.stdout.write(output);

    return 0;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (format === 'json') {
      console.error(JSON.stringify({ status: 'error', message: msg }));
    } else {
      console.error(`Error: ${msg}`);
    }
    return 3;
  }
}
