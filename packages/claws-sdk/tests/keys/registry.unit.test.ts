/**
 * L0: Key metadata registry — persistence and lifecycle tracking.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { writeFile } from 'node:fs/promises';
import {
  readRegistry,
  registerKey,
  getKey,
  generateKeyId,
  updateKey,
} from '../../src/keys/registry.js';

describe('registry', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('returns empty array when registry does not exist', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-reg-'));
    const keys = await readRegistry(tempDir);
    expect(keys).toEqual([]);
  });

  it('persists key metadata correctly', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-reg-'));
    const entry = await registerKey(tempDir, {
      algorithm: 'ed25519',
      storageTier: 'file',
    });

    expect(entry.algorithm).toBe('ed25519');
    expect(entry.storageTier).toBe('file');
    expect(entry.revoked).toBe(false);
    expect(entry.rotatedAt).toBeNull();
    expect(entry.rotationSchedule).toBeNull();
    expect(entry.id).toMatch(/^ed25519-[0-9a-f]{8}$/);
    expect(entry.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    // Verify it persisted to disk
    const keys = await readRegistry(tempDir);
    expect(keys).toHaveLength(1);
    expect(keys[0]!.id).toBe(entry.id);
  });

  it('accumulates multiple keys', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-reg-'));

    await registerKey(tempDir, { algorithm: 'ed25519', storageTier: 'file' });
    await registerKey(tempDir, { algorithm: 'hmac-sha256', storageTier: 'env' });

    const keys = await readRegistry(tempDir);
    expect(keys).toHaveLength(2);
    expect(keys[0]!.algorithm).toBe('ed25519');
    expect(keys[1]!.algorithm).toBe('hmac-sha256');
  });

  it('allows custom key ID', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-reg-'));
    const entry = await registerKey(tempDir, {
      id: 'custom-id-123',
      algorithm: 'hmac-sha256',
      storageTier: 'env',
    });
    expect(entry.id).toBe('custom-id-123');
  });

  it('stores rotation schedule', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-reg-'));
    const entry = await registerKey(tempDir, {
      algorithm: 'ed25519',
      storageTier: 'file',
      rotationSchedule: { enabled: true, intervalDays: 90 },
    });
    expect(entry.rotationSchedule).toEqual({ enabled: true, intervalDays: 90 });
  });
});

describe('getKey', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('returns the key by ID', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-reg-'));
    const entry = await registerKey(tempDir, {
      id: 'lookup-test',
      algorithm: 'ed25519',
      storageTier: 'file',
    });
    const found = await getKey(tempDir, 'lookup-test');
    expect(found).toEqual(entry);
  });

  it('returns null for missing key', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-reg-'));
    const found = await getKey(tempDir, 'nonexistent');
    expect(found).toBeNull();
  });
});

describe('generateKeyId', () => {
  it('generates ed25519 prefixed IDs', () => {
    const id = generateKeyId('ed25519');
    expect(id).toMatch(/^ed25519-[0-9a-f]{8}$/);
  });

  it('generates hmac prefixed IDs', () => {
    const id = generateKeyId('hmac-sha256');
    expect(id).toMatch(/^hmac-[0-9a-f]{8}$/);
  });

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 20 }, () => generateKeyId('ed25519')));
    expect(ids.size).toBe(20);
  });
});

describe('updateKey', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('updates an existing key entry', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-reg-'));
    const entry = await registerKey(tempDir, {
      id: 'update-test-1',
      algorithm: 'ed25519',
      storageTier: 'file',
    });

    const updated = { ...entry, revoked: true, revokedAt: '2026-04-13T00:00:00.000Z' };
    await updateKey(tempDir, updated);

    const found = await getKey(tempDir, 'update-test-1');
    expect(found).not.toBeNull();
    expect(found!.revoked).toBe(true);
    expect(found!.revokedAt).toBe('2026-04-13T00:00:00.000Z');
  });

  it('throws when key is not found', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-reg-'));
    // Register one key so registry exists
    await registerKey(tempDir, {
      id: 'existing-key',
      algorithm: 'ed25519',
      storageTier: 'file',
    });

    const fakeEntry = {
      id: 'nonexistent-key',
      algorithm: 'ed25519' as const,
      storageTier: 'file' as const,
      createdAt: '2026-01-01T00:00:00.000Z',
      rotatedAt: null,
      revoked: false,
      rotationSchedule: null,
      version: 1,
      purpose: 'signing' as const,
      revokedAt: null,
    };

    await expect(updateKey(tempDir, fakeEntry)).rejects.toThrow('Key not found: nonexistent-key');
  });

  it('preserves other keys when updating one', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-reg-'));
    await registerKey(tempDir, { id: 'key-a', algorithm: 'ed25519', storageTier: 'file' });
    const entryB = await registerKey(tempDir, { id: 'key-b', algorithm: 'hmac-sha256', storageTier: 'env' });

    const updatedB = { ...entryB, version: 2, rotatedAt: '2026-04-13T12:00:00.000Z' };
    await updateKey(tempDir, updatedB);

    const keys = await readRegistry(tempDir);
    expect(keys).toHaveLength(2);
    expect(keys[0]!.id).toBe('key-a');
    expect(keys[0]!.version).toBe(1); // unchanged
    expect(keys[1]!.id).toBe('key-b');
    expect(keys[1]!.version).toBe(2); // updated
  });
});

describe('stale lock recovery', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('recovers from a stale lock with dead PID', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-reg-'));
    const keysDir = join(tempDir, '.claws', 'keys');
    const { mkdir } = await import('node:fs/promises');
    await mkdir(keysDir, { recursive: true });

    // Write a lock file with a PID that doesn't exist (99999999) and recent timestamp
    const lockPath = join(keysDir, 'registry.lock');
    await writeFile(lockPath, `99999999\n${Date.now()}\n`, { flag: 'wx' });

    // registerKey should recover from the stale lock and succeed
    const entry = await registerKey(tempDir, {
      id: 'after-stale-lock',
      algorithm: 'ed25519',
      storageTier: 'file',
    });

    expect(entry.id).toBe('after-stale-lock');
    const keys = await readRegistry(tempDir);
    expect(keys).toHaveLength(1);
  });

  it('recovers from a stale lock older than 10 minutes', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-reg-'));
    const keysDir = join(tempDir, '.claws', 'keys');
    const { mkdir } = await import('node:fs/promises');
    await mkdir(keysDir, { recursive: true });

    // Write a lock file with our own PID but timestamp > 10 minutes ago
    const lockPath = join(keysDir, 'registry.lock');
    const oldTimestamp = Date.now() - 11 * 60 * 1000;
    await writeFile(lockPath, `${process.pid}\n${oldTimestamp}\n`, { flag: 'wx' });

    // registerKey should recover from the expired lock
    const entry = await registerKey(tempDir, {
      id: 'after-expired-lock',
      algorithm: 'hmac-sha256',
      storageTier: 'env',
    });

    expect(entry.id).toBe('after-expired-lock');
  });

  it('throws when lock is held by a live process', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-reg-'));
    const keysDir = join(tempDir, '.claws', 'keys');
    const { mkdir } = await import('node:fs/promises');
    await mkdir(keysDir, { recursive: true });

    // Write a lock file with our own (live) PID and recent timestamp
    const lockPath = join(keysDir, 'registry.lock');
    await writeFile(lockPath, `${process.pid}\n${Date.now()}\n`, { flag: 'wx' });

    // Should fail because the lock holder is alive and recent
    await expect(
      registerKey(tempDir, {
        id: 'should-fail',
        algorithm: 'ed25519',
        storageTier: 'file',
      }),
    ).rejects.toThrow('Registry write already in progress');
  });
});
