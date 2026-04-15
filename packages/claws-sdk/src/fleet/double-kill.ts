/**
 * Double-kill prevention — avoid redundant kill activations.
 *
 * Before activating a kill, check whether a sentinel already exists.
 * If the sentinel is recent (within TTL), skip with "already killed" status.
 * If the sentinel is stale (beyond TTL), re-activate with a fresh timestamp.
 *
 * @module claws-sdk/fleet/double-kill
 */

import { readSentinel, activateKill } from './kill.js';
import { recordKillAuditEvent } from './kill-audit.js';
import type { KillResult, KillSentinel } from './kill.js';

/**
 * Default TTL for kill sentinels in milliseconds (24 hours).
 */
const DEFAULT_KILL_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Options for guarded kill activation.
 */
export interface GuardedKillOptions {
  /** Workspace path. */
  readonly workspacePath: string;
  /** Reason for the kill. */
  readonly reason: string;
  /** Actor performing the kill (defaults to OS user). */
  readonly actor?: string;
  /** TTL in milliseconds. Sentinels older than this are considered stale. */
  readonly ttlMs?: number;
}

/**
 * Extended kill result with double-kill information.
 */
export interface GuardedKillResult extends KillResult {
  /** Whether the kill was skipped because an existing sentinel is recent. */
  readonly alreadyKilled: boolean;
  /** Whether a stale sentinel was re-activated. */
  readonly reactivated: boolean;
}

/**
 * Check if a sentinel is stale (older than TTL).
 */
export function isSentinelStale(sentinel: KillSentinel, ttlMs: number): boolean {
  const sentinelTime = new Date(sentinel.timestamp).getTime();
  const now = Date.now();
  return (now - sentinelTime) > ttlMs;
}

/**
 * Activate kill with double-kill prevention.
 *
 * 1. Check for existing sentinel
 * 2. If sentinel exists and is recent (within TTL): skip, return "already killed"
 * 3. If sentinel exists and is stale (beyond TTL): re-activate
 * 4. If no sentinel: activate normally
 *
 * All activations (fresh or re-activation) record an audit event.
 */
export async function guardedKill(options: GuardedKillOptions): Promise<GuardedKillResult> {
  const { workspacePath, reason, actor } = options;
  const ttlMs = options.ttlMs ?? DEFAULT_KILL_TTL_MS;

  const existing = await readSentinel(workspacePath);

  if (existing !== null) {
    if (!isSentinelStale(existing, ttlMs)) {
      return {
        activated: false,
        workspacePath,
        killPath: 'sentinel',
        message: `Already killed (sentinel active since ${existing.timestamp})`,
        sentinel: existing,
        alreadyKilled: true,
        reactivated: false,
      };
    }

    // Stale sentinel — re-activate
    const result = await activateKill(workspacePath, reason, actor);
    if (result.activated) {
      await recordKillAuditEvent(workspacePath, 'sentinel', reason, result.sentinel!.actor);
    }
    return {
      ...result,
      alreadyKilled: false,
      reactivated: true,
    };
  }

  // No existing sentinel — fresh activation
  const result = await activateKill(workspacePath, reason, actor);
  if (result.activated) {
    await recordKillAuditEvent(workspacePath, 'sentinel', reason, result.sentinel!.actor);
  }
  return {
    ...result,
    alreadyKilled: false,
    reactivated: false,
  };
}
