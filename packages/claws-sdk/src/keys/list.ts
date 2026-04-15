/**
 * Key listing — display keys with metadata columns.
 *
 * @module claws-sdk/keys/list
 */

import type { KeyEntry } from './types.js';
import { readRegistry } from './registry.js';

/**
 * Result of the list operation.
 */
export interface ListKeysResult {
  /** All key entries from the registry. */
  readonly keys: readonly KeyEntry[];
  /** Pre-formatted text table for terminal display. */
  readonly table: string;
}

/**
 * Format a key's rotation status for display.
 */
function rotationStatus(entry: KeyEntry): string {
  if (entry.revoked) return 'revoked';
  if (entry.rotationSchedule?.enabled) {
    if (entry.rotatedAt) return 'rotated';
    return 'pending';
  }
  return 'none';
}

/**
 * Compute the next rotation date, or '-' if not applicable.
 */
function nextRotation(entry: KeyEntry): string {
  if (entry.revoked) return '-';
  if (!entry.rotationSchedule?.enabled) return '-';

  const baseDate = entry.rotatedAt ?? entry.createdAt;
  const base = new Date(baseDate);
  const next = new Date(base.getTime() + entry.rotationSchedule.intervalDays * 86_400_000);
  return next.toISOString().slice(0, 10);
}

/**
 * Pad a string to a fixed width.
 */
function pad(s: string, width: number): string {
  return s.length >= width ? s : s + ' '.repeat(width - s.length);
}

/**
 * Format a list of key entries as an aligned text table.
 */
export function formatKeysTable(keys: readonly KeyEntry[]): string {
  if (keys.length === 0) {
    return 'No keys found.';
  }

  const header = [
    pad('ID', 22),
    pad('ALGORITHM', 12),
    pad('CREATED', 12),
    pad('TIER', 6),
    pad('VER', 5),
    pad('ROTATION', 10),
    'NEXT',
  ].join('  ');

  const rows = keys.map((k) => [
    pad(k.id, 22),
    pad(k.algorithm, 12),
    pad(k.createdAt.slice(0, 10), 12),
    pad(k.storageTier, 6),
    pad(String(k.version), 5),
    pad(rotationStatus(k), 10),
    nextRotation(k),
  ].join('  '));

  return [header, ...rows].join('\n');
}

/**
 * List all keys from the workspace registry.
 *
 * @param workspaceRoot - Absolute path to workspace root
 * @returns Keys and pre-formatted table
 */
export async function listKeys(workspaceRoot: string): Promise<ListKeysResult> {
  const keys = await readRegistry(workspaceRoot);
  const table = formatKeysTable(keys);
  return { keys, table };
}
