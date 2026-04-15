/**
 * Fleet-wide kill — iterate all discovered workspaces and activate kill.
 *
 * Uses fleet scanner to discover workspaces, then activates the guarded
 * kill on each. Collects success/failure per workspace and reports summary.
 *
 * @module claws-sdk/fleet/kill-fleet
 */

import { scanFleet } from './scan.js';
import { guardedKill } from './double-kill.js';
import type { GuardedKillResult } from './double-kill.js';
import type { FleetConfig } from './types.js';
import { runParallel } from './runner.js';

/**
 * Result of a fleet-wide kill operation.
 */
export interface FleetKillResult {
  /** Total workspaces discovered. */
  readonly totalDiscovered: number;
  /** Number of workspaces where kill was activated. */
  readonly activated: number;
  /** Number of workspaces already killed (skipped). */
  readonly alreadyKilled: number;
  /** Number of workspaces where kill was re-activated (stale sentinel). */
  readonly reactivated: number;
  /** Number of workspaces where kill failed. */
  readonly failed: number;
  /** Per-workspace results. */
  readonly results: readonly GuardedKillResult[];
}

/**
 * Options for fleet-wide kill.
 */
export interface FleetKillOptions {
  /** Root directory to scan for workspaces. */
  readonly fleetDir: string;
  /** Reason for the kill. */
  readonly reason: string;
  /** Actor performing the kill (defaults to OS user). */
  readonly actor?: string;
  /** TTL in milliseconds for double-kill prevention. */
  readonly ttlMs?: number;
  /** Partial fleet config overrides. */
  readonly scanConfig?: Partial<FleetConfig>;
}

/**
 * Kill all workspaces in a fleet.
 *
 * 1. Scan the fleet directory for workspaces
 * 2. Activate guarded kill on each workspace
 * 3. Collect and return summary results
 */
export async function killFleet(options: FleetKillOptions): Promise<FleetKillResult> {
  const { fleetDir, reason, actor, ttlMs, scanConfig } = options;

  const scanResult = await scanFleet(fleetDir, scanConfig);

  const parallelResult = await runParallel(
    scanResult.workspaces,
    async (workspace) => {
      const killOpts: { workspacePath: string; reason: string; actor?: string; ttlMs?: number } = {
        workspacePath: workspace.path,
        reason,
      };
      if (actor !== undefined) killOpts.actor = actor;
      if (ttlMs !== undefined) killOpts.ttlMs = ttlMs;

      return guardedKill(killOpts);
    },
    4, // concurrency limit
  );

  const results = parallelResult.results as GuardedKillResult[];

  return {
    totalDiscovered: scanResult.workspaces.length,
    activated: results.filter((r) => r.activated && !r.reactivated).length,
    alreadyKilled: results.filter((r) => r.alreadyKilled).length,
    reactivated: results.filter((r) => r.reactivated).length,
    failed: results.filter((r) => !r.activated && !r.alreadyKilled).length + parallelResult.errors.length,
    results,
  };
}
