/**
 * L0: O_EXCL atomic lock — concurrent acquisition, release, stale detection.
 *
 * Validates D-03 fix: TOCTOU race eliminated by O_EXCL atomic create.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { acquireLock, releaseLock } from '../../src/keys/rotate.js';

describe('O_EXCL atomic lock (rotate)', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('second lock acquisition fails with EEXIST when lock is held', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-excl-'));

    // First acquisition succeeds
    const lockPath = await acquireLock(tempDir);
    expect(lockPath).toContain('rotate.lock');

    // Lock file contains our PID
    const content = await readFile(lockPath, 'utf-8');
    expect(content).toContain(String(process.pid));

    // Second acquisition fails — the lock is held by a live process (us)
    await expect(acquireLock(tempDir)).rejects.toThrow(
      'Key rotation already in progress',
    );

    await releaseLock(lockPath);
  });

  it('lock release via unlink allows re-acquisition', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-excl-'));

    // Acquire and release
    const lockPath = await acquireLock(tempDir);
    await releaseLock(lockPath);

    // Re-acquisition should succeed after release
    const lockPath2 = await acquireLock(tempDir);
    expect(lockPath2).toContain('rotate.lock');

    // Verify PID in new lock file
    const content = await readFile(lockPath2, 'utf-8');
    expect(content).toContain(String(process.pid));

    await releaseLock(lockPath2);
  });

  it('stale lock detected and reclaimed when PID is dead', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-excl-'));
    const keysDir = join(tempDir, '.claws', 'keys');
    await mkdir(keysDir, { recursive: true });

    // Write a lock file with a PID that almost certainly doesn't exist
    await writeFile(
      join(keysDir, 'rotate.lock'),
      `99999999\n${Date.now()}\n`,
      'utf-8',
    );

    // acquireLock should detect the stale lock (dead PID) and reclaim it
    const lockPath = await acquireLock(tempDir);
    expect(lockPath).toContain('rotate.lock');

    // New lock file should contain our PID
    const content = await readFile(lockPath, 'utf-8');
    expect(content).toContain(String(process.pid));

    await releaseLock(lockPath);
  });
});
