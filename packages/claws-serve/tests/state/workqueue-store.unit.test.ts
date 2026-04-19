/**
 * L0 unit tests for the workqueue runtime-state store (Pulse 38).
 *
 * Covers the four deliverable gates:
 *  1. Persistence to `.claws/workqueue.json`
 *  2. Stale entries cleaned on heartbeat change
 *  3. Atomic write uses temp + rename (no partial file on crash)
 *  4. Status transitions validated
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  WORKQUEUE_STATE_FILE,
  WorkQueueStoreError,
  createWorkQueueStore,
} from '../../src/state/workqueue-store.js';
import type { WorkQueueRuntimeState } from '@bic/claws-sdk/workspace';

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'wq-store-'));
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(root, { recursive: true, force: true });
});

describe('WorkQueueStore', () => {
  it('persists upserts to .claws/workqueue.json on disk', async () => {
    const store = createWorkQueueStore({ workspaceRoot: root });
    const task: WorkQueueRuntimeState = {
      id: 'user-1',
      source: 'user',
      status: 'pending',
      title: 'review PR',
      priority: 5,
      assignedBy: 'alice',
    };
    await store.upsert(task);

    // File exists at the documented relative path
    const raw = await readFile(join(root, WORKQUEUE_STATE_FILE), 'utf-8');
    const parsed = JSON.parse(raw) as { version: number; tasks: unknown[] };
    expect(parsed.version).toBe(1);
    expect(parsed.tasks).toHaveLength(1);

    // Reload produces the same task
    const reloaded = await store.load();
    expect(reloaded.get('user-1')).toMatchObject({
      id: 'user-1',
      status: 'pending',
      assignedBy: 'alice',
    });

    // Corrupt JSON is tolerated — loads return empty map, server keeps responding
    await writeFile(join(root, WORKQUEUE_STATE_FILE), '{not json}', 'utf-8');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const afterCorrupt = await store.load();
    expect(afterCorrupt.size).toBe(0);
    errorSpy.mockRestore();
  });

  it('cleans stale heartbeat entries when HEARTBEAT.md changes', async () => {
    const store = createWorkQueueStore({ workspaceRoot: root });
    await store.upsert({ id: 'hb-old', source: 'heartbeat', status: 'completed' });
    await store.upsert({
      id: 'hb-kept',
      source: 'heartbeat',
      status: 'in_progress',
    });
    await store.upsert({
      id: 'user-safe',
      source: 'user',
      status: 'pending',
      title: 'still here',
    });

    const valid = new Set(['hb-kept']);
    const removed = await store.cleanupStale(valid);
    expect(removed).toBe(1);

    const after = await store.load();
    expect(after.has('hb-old')).toBe(false);
    expect(after.has('hb-kept')).toBe(true);
    // Runtime-sourced tasks never swept even when absent from valid set
    expect(after.has('user-safe')).toBe(true);

    // Second call with no stale entries is a cheap no-op (zero removed)
    expect(await store.cleanupStale(valid)).toBe(0);
  });

  it('atomic write uses a temp file and rename (no partial file on failure)', async () => {
    // Force rename to fail by staging a *directory* at the committed
    // target path. `fs.rename` on Windows throws EPERM/EEXIST when the
    // destination is a non-empty directory, which exercises the same
    // error branch as a real crash mid-rename without relying on vitest
    // ESM module spying (which is not supported — see vitest docs).
    const targetDir = join(root, '.claws', 'workqueue.json');
    await mkdir(targetDir, { recursive: true });
    await writeFile(join(targetDir, 'keep.me'), 'dir-is-occupied', 'utf-8');

    const store = createWorkQueueStore({ workspaceRoot: root });
    await expect(
      store.upsert({ id: 'u-1', source: 'user', status: 'pending', title: 't' }),
    ).rejects.toBeInstanceOf(Error);

    // Temp files never linger on failure — the store sweeps its own
    // `.tmp-<pid>-<nonce>` artifacts before propagating the error.
    const clawsDir = await readdir(join(root, '.claws'));
    const orphans = clawsDir.filter((n) => n.includes('.tmp-'));
    expect(orphans).toEqual([]);

    // Recovery: remove the blocking directory, next upsert succeeds and
    // writes via temp → rename to the now-available target path.
    await rm(targetDir, { recursive: true, force: true });
    await store.upsert({ id: 'u-1', source: 'user', status: 'pending', title: 't' });

    // The committed file exists at the exact documented relative path.
    const raw = await readFile(join(root, WORKQUEUE_STATE_FILE), 'utf-8');
    const parsed = JSON.parse(raw) as { tasks: WorkQueueRuntimeState[] };
    expect(parsed.tasks).toHaveLength(1);
    expect(parsed.tasks[0]?.id).toBe('u-1');

    // No lingering temp files after the successful write either.
    const postWrite = await readdir(join(root, '.claws'));
    expect(postWrite.filter((n) => n.includes('.tmp-'))).toEqual([]);

    // Silence the unused-vi-import warning by exercising it once — no
    // module mocking; we rely on the filesystem to drive the failure.
    expect(vi.isFakeTimers()).toBe(false);
  });

  it('validates status transitions and rejects terminal→active moves', async () => {
    const store = createWorkQueueStore({ workspaceRoot: root });
    await store.upsert({ id: 'hb-1', source: 'heartbeat', status: 'pending' });
    await store.upsert({ id: 'hb-1', source: 'heartbeat', status: 'in_progress' });
    await store.upsert({ id: 'hb-1', source: 'heartbeat', status: 'completed' });

    // Cannot transition out of terminal completed state
    await expect(
      store.upsert({ id: 'hb-1', source: 'heartbeat', status: 'in_progress' }),
    ).rejects.toBeInstanceOf(WorkQueueStoreError);

    // Invalid source surfaces as WorkQueueStoreError
    await expect(
      store.upsert({
        id: 'x',
        source: 'bogus' as WorkQueueRuntimeState['source'],
        status: 'pending',
      }),
    ).rejects.toBeInstanceOf(WorkQueueStoreError);

    // Remove resets: a fresh id at completed status is fine (no prior row).
    await store.remove('hb-1');
    await store.upsert({ id: 'hb-1', source: 'heartbeat', status: 'completed' });
    // Remove of an unknown id is a no-op (doesn't throw, doesn't rewrite).
    await store.remove('does-not-exist');

    const final = await store.load();
    expect(final.get('hb-1')?.status).toBe('completed');

    // Empty id + bogus status both surface as WorkQueueStoreError
    await expect(
      store.upsert({ id: '', source: 'user', status: 'pending' }),
    ).rejects.toBeInstanceOf(WorkQueueStoreError);
    await expect(
      store.upsert({
        id: 'x',
        source: 'user',
        status: 'no-such-status' as WorkQueueRuntimeState['status'],
      }),
    ).rejects.toBeInstanceOf(WorkQueueStoreError);

    // Mutex: two concurrent upserts on the same store race on the
    // read-modify-write cycle; without the per-file lock one write's state
    // is silently dropped (lost-update). The serialised implementation
    // must land BOTH tasks in the final envelope.
    const raceStore = createWorkQueueStore({ workspaceRoot: root });
    // Start from a clean file so the race is deterministic.
    await rm(join(root, '.claws', 'workqueue.json'), { force: true });
    await Promise.all([
      raceStore.upsert({ id: 'race-a', source: 'user', status: 'pending', title: 'A' }),
      raceStore.upsert({ id: 'race-b', source: 'user', status: 'pending', title: 'B' }),
    ]);
    const raced = await raceStore.load();
    expect(raced.size).toBe(2);
    expect(raced.has('race-a')).toBe(true);
    expect(raced.has('race-b')).toBe(true);

    // Same lock covers cleanupStale racing against upsert — both should
    // land without losing the runtime-sourced upsert.
    await Promise.all([
      raceStore.upsert({ id: 'race-c', source: 'user', status: 'pending', title: 'C' }),
      raceStore.cleanupStale(new Set()),
    ]);
    const after = await raceStore.load();
    expect(after.has('race-c')).toBe(true);
    // cleanupStale with no heartbeat tasks is a no-op; user tasks survive.
    expect(after.has('race-a')).toBe(true);
    expect(after.has('race-b')).toBe(true);

    // remove() under contention: parallel remove + upsert both land, no
    // interleaved read-modify-write stomps either.
    await Promise.all([
      raceStore.remove('race-a'),
      raceStore.upsert({ id: 'race-d', source: 'user', status: 'pending', title: 'D' }),
    ]);
    const final2 = await raceStore.load();
    expect(final2.has('race-a')).toBe(false);
    expect(final2.has('race-d')).toBe(true);
    expect(final2.has('race-b')).toBe(true);

    // Corrupt-but-partially-valid file: string requiredTools flow through,
    // non-string entries get filtered out, scalar envelope fields default
    // when malformed. Exercises the normalizeTask / normalizeEnvelope
    // branches.
    const raw = JSON.stringify({
      version: 1,
      heartbeatAnchor: 42, // wrong type, coerced to empty string
      tasks: [
        null, // dropped
        { id: 123, status: 'pending', source: 'user' }, // non-string id, dropped
        { id: 'keep', status: 'bogus', source: 'user' }, // bad status, dropped
        { id: 'keep2', status: 'pending', source: 'bogus' }, // bad source, dropped
        {
          id: 'live',
          status: 'in_progress',
          source: 'user',
          title: 'ok',
          priority: 3,
          dueAt: '2026-05-01T00:00:00Z',
          assignedBy: 'alice',
          assignedAt: '2026-04-01T00:00:00Z',
          completedAt: '2026-04-02T00:00:00Z',
          requiredTools: ['web', 42, 'exec'], // 42 stripped
        },
      ],
    });
    await writeFile(join(root, '.claws', 'workqueue.json'), raw, 'utf-8');
    const loaded = await store.load();
    expect(loaded.size).toBe(1);
    const live = loaded.get('live');
    expect(live?.requiredTools).toEqual(['web', 'exec']);
    expect(live?.title).toBe('ok');
    expect(live?.completedAt).toBe('2026-04-02T00:00:00Z');
  });
});
