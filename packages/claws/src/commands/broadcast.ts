/**
 * `claws broadcast` command — push policy YAML to all governed workspaces.
 *
 * Thin CLI adapter: calls fleet SDK functions and renders results.
 * No business logic lives here.
 *
 * @module claws-cli/commands/broadcast
 */

import { resolve } from 'node:path';
import { scanFleet, broadcastPolicy } from '@bic/claws-sdk/fleet';
import type { BroadcastResult } from '@bic/claws-sdk/fleet';

/**
 * Run the fleet broadcast command.
 *
 * @param policyFile - Path to the policy YAML file
 * @param opts - Command options
 * @returns Exit code (0=success, 1=validation error, 3=runtime error)
 */
export async function runBroadcast(
  policyFile: string,
  opts: {
    fleet: string;
    confirm: boolean;
    reason: string;
    json: boolean;
  },
): Promise<number> {
  const policyPath = resolve(policyFile);
  const fleetDir = resolve(opts.fleet);

  // Scan fleet for workspaces
  let result: BroadcastResult;
  try {
    const scanResult = await scanFleet(fleetDir, { maxDepth: 5 });

    if (scanResult.workspaces.length === 0) {
      if (opts.json) {
        console.log(JSON.stringify({ status: 'error', message: 'No workspaces found in fleet directory' }));
      } else {
        console.error('No workspaces found in fleet directory.');
      }
      return 1;
    }

    result = await broadcastPolicy(policyPath, scanResult.workspaces, {
      confirm: opts.confirm,
      reason: opts.reason,
    });
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
    console.log(JSON.stringify(result, null, 2));
    return 0;
  }

  // Terminal output
  if (!result.executed) {
    console.log('Dry run — use --confirm to execute broadcast:\n');
    for (const p of result.preview ?? []) {
      const tag = p.action === 'would_broadcast' ? 'BROADCAST' : 'SKIP     ';
      console.log(`  ${tag}  ${p.path}`);
      console.log(`            ${p.reason}`);
      console.log();
    }
    return 0;
  }

  // Executed
  const m = result.manifest!;
  console.log(`Broadcast complete: ${m.policyFile}`);
  console.log(`  reason: ${m.reason}`);
  console.log(`  succeeded: ${m.succeeded}  skipped: ${m.skippedCount}  failed: ${m.failed}\n`);

  for (const r of m.results) {
    const tag = r.success ? 'OK   ' : r.skipped ? 'SKIP ' : 'FAIL ';
    console.log(`  ${tag}  ${r.path}`);
    console.log(`          ${r.message}`);
    console.log();
  }

  return m.failed > 0 ? 1 : 0;
}
