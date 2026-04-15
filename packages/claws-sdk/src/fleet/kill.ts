/**
 * Fleet kill switch — sentinel file kill path.
 *
 * Writes `.claws/KILL` with timestamp + reason + actor to a workspace.
 * The next `claws check/build/watch` reads the sentinel and refuses
 * to proceed.
 *
 * Future paths (not implemented — require gateway daemon):
 * - Sidecar HTTP POST to `/kill` endpoint
 * - SIGTERM via `gateway.pid`
 *
 * @module claws-sdk/fleet/kill
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { resolveActor } from '../compliance/audit-chain.js';

/**
 * Kill path identifier — only 'sentinel' is implemented.
 * 'sidecar' and 'sigterm' are documented for future gateway daemon work.
 */
export type KillPath = 'sentinel' | 'sidecar' | 'sigterm';

/**
 * Structured content of the `.claws/KILL` sentinel file.
 */
export interface KillSentinel {
  /** ISO 8601 timestamp of kill activation. */
  readonly timestamp: string;
  /** Human-readable reason for the kill. */
  readonly reason: string;
  /** Who activated the kill (user or system). */
  readonly actor: string;
  /** Kill path used. */
  readonly killPath: KillPath;
}

/**
 * Result of a kill activation attempt.
 */
export interface KillResult {
  /** Whether the kill was activated. */
  readonly activated: boolean;
  /** Workspace path. */
  readonly workspacePath: string;
  /** Kill path used. */
  readonly killPath: KillPath;
  /** Status message. */
  readonly message: string;
  /** The sentinel content, if written. */
  readonly sentinel?: KillSentinel;
}

/**
 * The sentinel file path within the .claws sidecar.
 */
const KILL_SENTINEL_FILE = 'KILL';

/**
 * Read the sentinel file from a workspace if it exists.
 * Returns null if the file does not exist or is not valid JSON.
 */
export async function readSentinel(workspacePath: string): Promise<KillSentinel | null> {
  const sentinelPath = join(workspacePath, '.claws', KILL_SENTINEL_FILE);
  try {
    const content = await readFile(sentinelPath, 'utf-8');
    return JSON.parse(content) as KillSentinel;
  } catch {
    return null;
  }
}

/**
 * Write the sentinel file to a workspace.
 */
async function writeSentinel(workspacePath: string, sentinel: KillSentinel): Promise<void> {
  const clawsDir = join(workspacePath, '.claws');
  await mkdir(clawsDir, { recursive: true });
  const sentinelPath = join(clawsDir, KILL_SENTINEL_FILE);
  await writeFile(sentinelPath, JSON.stringify(sentinel, null, 2) + '\n', 'utf-8');
}

/**
 * Check whether a sentinel blocks the current invocation.
 *
 * Returns the sentinel content if blocked, null if not blocked.
 */
export async function checkSentinelBlock(workspacePath: string): Promise<KillSentinel | null> {
  return readSentinel(workspacePath);
}

/**
 * Activate the kill switch on a single workspace via sentinel file.
 *
 * Writes `.claws/KILL` with structured JSON content.
 *
 * @param workspacePath - Absolute path to the workspace root
 * @param reason - Human-readable reason for the kill
 * @param actor - Who activated the kill (defaults to OS user)
 */
export async function activateKill(
  workspacePath: string,
  reason: string,
  actor?: string,
): Promise<KillResult> {
  const resolvedActor = actor ?? resolveActor();

  const sentinel: KillSentinel = {
    timestamp: new Date().toISOString(),
    reason,
    actor: resolvedActor,
    killPath: 'sentinel',
  };

  try {
    await writeSentinel(workspacePath, sentinel);
    return {
      activated: true,
      workspacePath,
      killPath: 'sentinel',
      message: `Kill sentinel activated: ${reason}`,
      sentinel,
    };
  } catch (err: unknown) {
    return {
      activated: false,
      workspacePath,
      killPath: 'sentinel',
      message: `Failed to activate kill sentinel: ${(err as Error).message}`,
    };
  }
}
