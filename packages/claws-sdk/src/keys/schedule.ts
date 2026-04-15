/**
 * Rotation schedule management — policy-driven deadlines and alerts.
 *
 * Default rotation intervals by key purpose:
 * - signing: 90 days
 * - session: 30 days
 * - root: 180 days
 *
 * Alert threshold: 7 days before rotation deadline.
 *
 * @module claws-sdk/keys/schedule
 */

import type { KeyEntry, KeyPurpose, RotationSchedule } from './types.js';
import { readRegistry } from './registry.js';

/**
 * Days per millisecond (86,400,000 ms in a day).
 */
const MS_PER_DAY = 86_400_000;

/**
 * Default alert threshold in days — fires when rotation is due within this window.
 */
const ALERT_THRESHOLD_DAYS = 7;

/**
 * Default rotation intervals by key purpose (in days).
 */
export const DEFAULT_ROTATION_INTERVALS: Record<KeyPurpose, number> = {
  signing: 90,
  session: 30,
  root: 180,
};

/**
 * Create a default rotation schedule for a given key purpose.
 */
export function defaultSchedule(purpose: KeyPurpose): RotationSchedule {
  return {
    enabled: true,
    intervalDays: DEFAULT_ROTATION_INTERVALS[purpose],
  };
}

/**
 * Schedule status for a single key.
 */
export interface ScheduleStatus {
  /** The key ID. */
  readonly keyId: string;
  /** The key purpose. */
  readonly purpose: KeyPurpose;
  /** The rotation interval in days. */
  readonly intervalDays: number;
  /** ISO 8601 date of the next rotation deadline. */
  readonly deadline: string;
  /** Days remaining until the deadline (negative = overdue). */
  readonly daysRemaining: number;
  /** Whether the key is within the alert threshold. */
  readonly alert: boolean;
  /** Whether the key is overdue for rotation. */
  readonly overdue: boolean;
}

/**
 * Compute the rotation deadline for a key.
 *
 * Base date is `rotatedAt` if available, otherwise `createdAt`.
 * The deadline is base + intervalDays.
 *
 * @param entry - The key entry
 * @returns ISO 8601 deadline date, or null if no schedule is configured
 */
export function computeDeadline(entry: KeyEntry): string | null {
  if (!entry.rotationSchedule?.enabled) {
    return null;
  }
  const baseDate = entry.rotatedAt ?? entry.createdAt;
  const base = new Date(baseDate);
  const deadline = new Date(base.getTime() + entry.rotationSchedule.intervalDays * MS_PER_DAY);
  return deadline.toISOString();
}

/**
 * Compute the number of days remaining until a deadline.
 *
 * @param deadline - ISO 8601 deadline
 * @param now - Current time (default: new Date())
 * @returns Days remaining (negative = overdue)
 */
export function daysUntil(deadline: string, now: Date = new Date()): number {
  const deadlineMs = new Date(deadline).getTime();
  const diffMs = deadlineMs - now.getTime();
  return Math.floor(diffMs / MS_PER_DAY);
}

/**
 * Get the schedule status for a single key.
 *
 * Returns null if the key has no rotation schedule or is revoked.
 */
export function getScheduleStatus(entry: KeyEntry, now: Date = new Date()): ScheduleStatus | null {
  if (entry.revoked) return null;
  if (!entry.rotationSchedule?.enabled) return null;

  const deadline = computeDeadline(entry);
  if (!deadline) return null;

  const remaining = daysUntil(deadline, now);

  return {
    keyId: entry.id,
    purpose: entry.purpose,
    intervalDays: entry.rotationSchedule.intervalDays,
    deadline: deadline.slice(0, 10),
    daysRemaining: remaining,
    alert: remaining <= ALERT_THRESHOLD_DAYS,
    overdue: remaining < 0,
  };
}

/**
 * Get schedule status for all keys in the workspace.
 *
 * @param workspaceRoot - Absolute path to workspace root
 * @param now - Current time (default: new Date())
 * @returns Array of schedule statuses (only keys with enabled schedules)
 */
export async function getAllScheduleStatuses(
  workspaceRoot: string,
  now: Date = new Date(),
): Promise<ScheduleStatus[]> {
  const keys = await readRegistry(workspaceRoot);
  const statuses: ScheduleStatus[] = [];
  for (const key of keys) {
    const status = getScheduleStatus(key, now);
    if (status) {
      statuses.push(status);
    }
  }
  return statuses;
}

/**
 * Get keys that are within the alert threshold (7 days or less before deadline).
 *
 * @param workspaceRoot - Absolute path to workspace root
 * @param now - Current time (default: new Date())
 * @returns Array of schedule statuses for keys needing attention
 */
export async function getAlertKeys(
  workspaceRoot: string,
  now: Date = new Date(),
): Promise<ScheduleStatus[]> {
  const statuses = await getAllScheduleStatuses(workspaceRoot, now);
  return statuses.filter((s) => s.alert);
}

/**
 * Format schedule status as a text table for terminal display.
 */
export function formatScheduleTable(statuses: readonly ScheduleStatus[]): string {
  if (statuses.length === 0) {
    return 'No keys with rotation schedules.';
  }

  const pad = (s: string, w: number): string => s.length >= w ? s : s + ' '.repeat(w - s.length);

  const header = [
    pad('KEY ID', 22),
    pad('PURPOSE', 10),
    pad('INTERVAL', 10),
    pad('DEADLINE', 12),
    pad('REMAINING', 11),
    'STATUS',
  ].join('  ');

  const rows = statuses.map((s) => {
    const status = s.overdue ? 'OVERDUE' : s.alert ? 'ALERT' : 'OK';
    return [
      pad(s.keyId, 22),
      pad(s.purpose, 10),
      pad(`${s.intervalDays}d`, 10),
      pad(s.deadline, 12),
      pad(`${s.daysRemaining}d`, 11),
      status,
    ].join('  ');
  });

  return [header, ...rows].join('\n');
}
