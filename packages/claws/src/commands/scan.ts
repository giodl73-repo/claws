/**
 * `claws scan` command — discover and classify OC workspaces.
 *
 * Thin CLI adapter: calls fleet SDK functions and renders results.
 * No business logic lives here.
 *
 * @module claws-cli/commands/scan
 */

import { scanFleet } from '@bic/claws-sdk/fleet';
import type { ScanResult, ProgressEvent } from '@bic/claws-sdk/fleet';

/**
 * Run the fleet scan command.
 *
 * @param dir - Directory to scan (defaults to cwd)
 * @param opts - Command options
 * @returns Exit code (0=success, 3=error)
 */
export async function runScan(
  dir: string,
  opts: { json: boolean; recursive: boolean },
): Promise<number> {
  const maxDepth = opts.recursive ? 10 : 1;

  const progressHandler = opts.json
    ? undefined
    : (event: ProgressEvent) => {
        if (event.type === 'started') {
          process.stderr.write(`  scanning ${event.path}\n`);
        }
      };

  let result: ScanResult;
  try {
    result = await scanFleet(dir, { maxDepth }, progressHandler);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (opts.json) {
      console.error(JSON.stringify({ status: 'error', message: msg }));
    } else {
      console.error(`Error: ${msg}`);
    }
    return 3;
  }

  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
    return 0;
  }

  // Terminal output
  if (result.workspaces.length === 0) {
    console.log('No OC workspaces found.');
  } else {
    for (const ws of result.workspaces) {
      const tag = ws.classification.padEnd(13);
      console.log(`  ${tag} ${ws.path}`);
      if (ws.markers.length > 0) {
        console.log(`              markers: ${ws.markers.join(', ')}`);
      }
      console.log(`              ${ws.rationale}`);
      console.log();
    }
  }

  // Stats
  const s = result.stats;
  console.log(`Scan complete: ${s.total} workspace(s) found in ${s.directoriesScanned} directories (${s.durationMs}ms)`);
  console.log(`  governed: ${s.governed}  ungoverned: ${s.ungoverned}  misconfigured: ${s.misconfigured}`);

  if (result.errors.length > 0) {
    console.log(`\nErrors (${result.errors.length}):`);
    for (const e of result.errors) {
      console.log(`  ${e.path}: ${e.message}`);
    }
  }

  return 0;
}
