/**
 * L0: Rotation schedule — deadline computation for each key type,
 * alert threshold at 7-day boundary.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { KeyEntry } from '../../src/keys/types.js';
import { registerKey } from '../../src/keys/registry.js';
import {
  computeDeadline,
  daysUntil,
  getScheduleStatus,
  getAllScheduleStatuses,
  getAlertKeys,
  defaultSchedule,
  DEFAULT_ROTATION_INTERVALS,
  formatScheduleTable,
} from '../../src/keys/schedule.js';

/**
 * Create a KeyEntry fixture for schedule tests.
 */
function makeEntry(overrides: Partial<KeyEntry> = {}): KeyEntry {
  return {
    id: 'test-sched-1',
    algorithm: 'ed25519',
    storageTier: 'file',
    createdAt: '2026-01-01T00:00:00.000Z',
    rotatedAt: null,
    revoked: false,
    rotationSchedule: null,
    version: 1,
    purpose: 'signing',
    revokedAt: null,
    ...overrides,
  };
}

describe('DEFAULT_ROTATION_INTERVALS', () => {
  it('defines correct defaults for each key type', () => {
    expect(DEFAULT_ROTATION_INTERVALS.signing).toBe(90);
    expect(DEFAULT_ROTATION_INTERVALS.session).toBe(30);
    expect(DEFAULT_ROTATION_INTERVALS.root).toBe(180);
  });
});

describe('defaultSchedule', () => {
  it('creates correct schedule for signing keys', () => {
    const sched = defaultSchedule('signing');
    expect(sched).toEqual({ enabled: true, intervalDays: 90 });
  });

  it('creates correct schedule for session keys', () => {
    const sched = defaultSchedule('session');
    expect(sched).toEqual({ enabled: true, intervalDays: 30 });
  });

  it('creates correct schedule for root keys', () => {
    const sched = defaultSchedule('root');
    expect(sched).toEqual({ enabled: true, intervalDays: 180 });
  });
});

describe('computeDeadline', () => {
  it('computes deadline for a signing key (90 days)', () => {
    const entry = makeEntry({
      rotationSchedule: { enabled: true, intervalDays: 90 },
    });
    const deadline = computeDeadline(entry);
    // 2026-01-01 + 90 days = 2026-04-01
    expect(deadline).toMatch(/^2026-04-01T/);
  });

  it('computes deadline for a session key (30 days)', () => {
    const entry = makeEntry({
      purpose: 'session',
      rotationSchedule: { enabled: true, intervalDays: 30 },
    });
    const deadline = computeDeadline(entry);
    // 2026-01-01 + 30 days = 2026-01-31
    expect(deadline).toMatch(/^2026-01-31T/);
  });

  it('computes deadline for a root key (180 days)', () => {
    const entry = makeEntry({
      purpose: 'root',
      rotationSchedule: { enabled: true, intervalDays: 180 },
    });
    const deadline = computeDeadline(entry);
    // 2026-01-01 + 180 days = 2026-06-30
    expect(deadline).toMatch(/^2026-06-30T/);
  });

  it('uses rotatedAt as base when available', () => {
    const entry = makeEntry({
      rotatedAt: '2026-03-01T00:00:00.000Z',
      rotationSchedule: { enabled: true, intervalDays: 90 },
    });
    const deadline = computeDeadline(entry);
    // 2026-03-01 + 90 days = 2026-05-30
    expect(deadline).toMatch(/^2026-05-30T/);
  });

  it('returns null when no schedule configured', () => {
    const entry = makeEntry();
    expect(computeDeadline(entry)).toBeNull();
  });

  it('returns null when schedule is disabled', () => {
    const entry = makeEntry({
      rotationSchedule: { enabled: false, intervalDays: 90 },
    });
    expect(computeDeadline(entry)).toBeNull();
  });
});

describe('daysUntil', () => {
  it('computes positive days for future deadline', () => {
    const now = new Date('2026-03-01T00:00:00.000Z');
    expect(daysUntil('2026-04-01T00:00:00.000Z', now)).toBe(31);
  });

  it('computes negative days for past deadline', () => {
    const now = new Date('2026-04-10T00:00:00.000Z');
    expect(daysUntil('2026-04-01T00:00:00.000Z', now)).toBe(-9);
  });

  it('returns 0 when deadline is today', () => {
    const now = new Date('2026-04-01T00:00:00.000Z');
    expect(daysUntil('2026-04-01T00:00:00.000Z', now)).toBe(0);
  });
});

describe('getScheduleStatus', () => {
  it('triggers alert at 7-day boundary', () => {
    const entry = makeEntry({
      rotationSchedule: { enabled: true, intervalDays: 90 },
    });

    // 7 days before deadline (2026-04-01) => March 25
    const now = new Date('2026-03-25T00:00:00.000Z');
    const status = getScheduleStatus(entry, now);

    expect(status).toBeDefined();
    expect(status!.alert).toBe(true);
    expect(status!.daysRemaining).toBe(7);
    expect(status!.overdue).toBe(false);
  });

  it('does not alert at 8 days before deadline', () => {
    const entry = makeEntry({
      rotationSchedule: { enabled: true, intervalDays: 90 },
    });

    const now = new Date('2026-03-24T00:00:00.000Z');
    const status = getScheduleStatus(entry, now);

    expect(status).toBeDefined();
    expect(status!.alert).toBe(false);
    expect(status!.daysRemaining).toBe(8);
  });

  it('marks overdue keys', () => {
    const entry = makeEntry({
      rotationSchedule: { enabled: true, intervalDays: 90 },
    });

    const now = new Date('2026-04-10T00:00:00.000Z');
    const status = getScheduleStatus(entry, now);

    expect(status).toBeDefined();
    expect(status!.alert).toBe(true);
    expect(status!.overdue).toBe(true);
    expect(status!.daysRemaining).toBeLessThan(0);
  });

  it('returns null for revoked keys', () => {
    const entry = makeEntry({
      revoked: true,
      revokedAt: '2026-03-01T00:00:00.000Z',
      rotationSchedule: { enabled: true, intervalDays: 90 },
    });
    expect(getScheduleStatus(entry)).toBeNull();
  });

  it('returns null for keys without schedule', () => {
    const entry = makeEntry();
    expect(getScheduleStatus(entry)).toBeNull();
  });
});

describe('formatScheduleTable', () => {
  it('formats a table with schedule statuses', () => {
    const table = formatScheduleTable([{
      keyId: 'test-key-1',
      purpose: 'signing',
      intervalDays: 90,
      deadline: '2026-04-01',
      daysRemaining: 7,
      alert: true,
      overdue: false,
    }]);

    expect(table).toContain('KEY ID');
    expect(table).toContain('test-key-1');
    expect(table).toContain('ALERT');
  });

  it('shows OVERDUE status for overdue keys', () => {
    const table = formatScheduleTable([{
      keyId: 'overdue-key',
      purpose: 'session',
      intervalDays: 30,
      deadline: '2026-03-01',
      daysRemaining: -10,
      alert: true,
      overdue: true,
    }]);

    expect(table).toContain('OVERDUE');
    expect(table).toContain('overdue-key');
  });

  it('shows OK status for keys not in alert window', () => {
    const table = formatScheduleTable([{
      keyId: 'ok-key',
      purpose: 'root',
      intervalDays: 180,
      deadline: '2026-10-01',
      daysRemaining: 60,
      alert: false,
      overdue: false,
    }]);

    expect(table).toContain('OK');
  });

  it('returns message for empty list', () => {
    expect(formatScheduleTable([])).toBe('No keys with rotation schedules.');
  });
});

describe('getAllScheduleStatuses', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('returns statuses for all keys with schedules', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-sched-'));

    await registerKey(tempDir, {
      id: 'sched-key-1',
      algorithm: 'ed25519',
      storageTier: 'file',
      rotationSchedule: { enabled: true, intervalDays: 90 },
      purpose: 'signing',
    });
    await registerKey(tempDir, {
      id: 'sched-key-2',
      algorithm: 'hmac-sha256',
      storageTier: 'file',
      rotationSchedule: { enabled: true, intervalDays: 30 },
      purpose: 'session',
    });
    // Key without schedule — should be excluded
    await registerKey(tempDir, {
      id: 'no-sched-key',
      algorithm: 'ed25519',
      storageTier: 'file',
    });

    const now = new Date('2026-01-15T00:00:00.000Z');
    const statuses = await getAllScheduleStatuses(tempDir, now);

    expect(statuses).toHaveLength(2);
    expect(statuses.map((s) => s.keyId)).toContain('sched-key-1');
    expect(statuses.map((s) => s.keyId)).toContain('sched-key-2');
  });

  it('returns empty array when no keys exist', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-sched-'));
    const statuses = await getAllScheduleStatuses(tempDir);
    expect(statuses).toEqual([]);
  });
});

describe('getAlertKeys', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('returns only keys within alert threshold', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-alert-'));

    // This key will be within 7-day alert window
    await registerKey(tempDir, {
      id: 'alert-key',
      algorithm: 'ed25519',
      storageTier: 'file',
      rotationSchedule: { enabled: true, intervalDays: 30 },
      purpose: 'session',
    });

    // This key will NOT be within alert window (90 days away)
    await registerKey(tempDir, {
      id: 'safe-key',
      algorithm: 'ed25519',
      storageTier: 'file',
      rotationSchedule: { enabled: true, intervalDays: 90 },
      purpose: 'signing',
    });

    // 25 days after creation: alert-key has 5 days left (alert!), safe-key has 65 days left
    const now = new Date(Date.now() + 25 * 86_400_000);
    const alerts = await getAlertKeys(tempDir, now);

    expect(alerts.some((a) => a.keyId === 'alert-key')).toBe(true);
    expect(alerts.some((a) => a.keyId === 'safe-key')).toBe(false);
  });

  it('returns empty array when no keys are alerting', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-alert-'));

    await registerKey(tempDir, {
      id: 'healthy-key',
      algorithm: 'ed25519',
      storageTier: 'file',
      rotationSchedule: { enabled: true, intervalDays: 180 },
      purpose: 'root',
    });

    // 1 day after creation — 179 days remaining
    const now = new Date(Date.now() + 1 * 86_400_000);
    const alerts = await getAlertKeys(tempDir, now);
    expect(alerts).toHaveLength(0);
  });
});
