/**
 * `claws kill` command — activate kill switch on workspace(s).
 *
 * Thin CLI adapter: calls fleet SDK functions and renders results.
 * No business logic lives here.
 *
 * @module claws-cli/commands/kill
 */

import { resolve } from 'node:path';
import { guardedKill, killFleet } from '@bic/claws-sdk/fleet';
import type { GuardedKillResult, FleetKillResult } from '@bic/claws-sdk/fleet';

/**
 * Run the kill command.
 *
 * @param workspace - Workspace path (ignored when --fleet is set)
 * @param opts - Command options
 * @returns Exit code (0=success, 1=partial failure, 3=error)
 */
export async function runKill(
  workspace: string | undefined,
  opts: {
    fleet?: string;
    reason: string;
    json: boolean;
  },
): Promise<number> {
  if (opts.fleet) {
    return runFleetKill(opts.fleet, opts.reason, opts.json);
  }

  return runSingleKill(workspace ?? '.', opts.reason, opts.json);
}

async function runSingleKill(
  workspace: string,
  reason: string,
  json: boolean,
): Promise<number> {
  const workspacePath = resolve(workspace);

  let result: GuardedKillResult;
  try {
    result = await guardedKill({ workspacePath, reason });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (json) {
      console.log(JSON.stringify({ status: 'error', message: msg }));
    } else {
      console.error(`Error: ${msg}`);
    }
    return 3;
  }

  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return result.activated || result.alreadyKilled ? 0 : 1;
  }

  if (result.alreadyKilled) {
    console.log(`Already killed: ${workspacePath}`);
    console.log(`  sentinel active since ${result.sentinel!.timestamp}`);
    return 0;
  }

  if (result.activated) {
    const tag = result.reactivated ? 'Re-activated' : 'Activated';
    console.log(`${tag} kill switch: ${workspacePath}`);
    console.log(`  reason: ${reason}`);
    console.log(`  actor: ${result.sentinel!.actor}`);
    console.log(`  timestamp: ${result.sentinel!.timestamp}`);
    return 0;
  }

  console.error(`Failed to activate kill switch: ${result.message}`);
  return 1;
}

async function runFleetKill(
  fleetDir: string,
  reason: string,
  json: boolean,
): Promise<number> {
  const resolvedDir = resolve(fleetDir);

  let result: FleetKillResult;
  try {
    result = await killFleet({ fleetDir: resolvedDir, reason });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (json) {
      console.log(JSON.stringify({ status: 'error', message: msg }));
    } else {
      console.error(`Error: ${msg}`);
    }
    return 3;
  }

  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return result.failed > 0 ? 1 : 0;
  }

  console.log(`Fleet kill complete:`);
  console.log(`  discovered: ${result.totalDiscovered}`);
  console.log(`  activated: ${result.activated}`);
  console.log(`  already killed: ${result.alreadyKilled}`);
  console.log(`  re-activated: ${result.reactivated}`);
  console.log(`  failed: ${result.failed}\n`);

  for (const r of result.results) {
    const tag = r.activated
      ? (r.reactivated ? 'REACT' : 'KILL ')
      : (r.alreadyKilled ? 'SKIP ' : 'FAIL ');
    console.log(`  ${tag}  ${r.workspacePath}`);
    console.log(`          ${r.message}`);
    console.log();
  }

  return result.failed > 0 ? 1 : 0;
}
