/**
 * L1 integration tests for AutoSnapshotManager on-disk persistence
 * (CP-7 R1 C3, pulse 72 M1).
 *
 * Exercises the tmp+rename write path, the rehydrate-on-construction
 * path, LRU eviction that prunes both the in-memory index AND the
 * on-disk directory, and fault injection: a corrupted / partial entry
 * does not take down load().
 *
 * The in-memory behaviours (eviction semantics, trigger attribution,
 * timestamp resolution) are covered by the L0 unit test suite; this
 * file's job is to assert the disk contract.
 */

import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  AUTO_SNAPSHOT_DIR,
  AutoSnapshotManager,
  type AutoSnapshot,
} from '../../src/workspace/index.js';

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'auto-snap-fs-'));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('AutoSnapshotManager — disk persistence (L1)', () => {
  it('save() writes `<version>.json` under .claws/snapshots/auto', async () => {
    const mgr = new AutoSnapshotManager({ workspaceRoot: root });
    const snap = await mgr.save({
      version: 12,
      governanceIrHash: 'ir-hash-12',
      fileHashes: { 'SOUL.md': 'h1', 'AGENTS.md': 'h2' },
      trigger: 'external_edit',
      timestamp: '2026-04-17T10:00:00.000Z',
    });
    expect(snap.version).toBe(12);

    const dir = join(root, AUTO_SNAPSHOT_DIR);
    const entries = await readdir(dir);
    expect(entries).toContain('12.json');

    const raw = await readFile(join(dir, '12.json'), 'utf-8');
    const parsed = JSON.parse(raw) as AutoSnapshot;
    expect(parsed.version).toBe(12);
    expect(parsed.governanceIrHash).toBe('ir-hash-12');
    expect(parsed.trigger).toBe('external_edit');
    expect(parsed.timestamp).toBe('2026-04-17T10:00:00.000Z');
    expect(parsed.fileHashes).toEqual({ 'SOUL.md': 'h1', 'AGENTS.md': 'h2' });
  });

  it('save() uses tmp+rename — no .tmp- orphan survives a successful write', async () => {
    const mgr = new AutoSnapshotManager({ workspaceRoot: root });
    await mgr.save({
      version: 1,
      governanceIrHash: 'h',
      fileHashes: { 'SOUL.md': 'x' },
      trigger: 'oc_runtime',
      timestamp: '2026-04-17T10:00:00.000Z',
    });
    const dir = join(root, AUTO_SNAPSHOT_DIR);
    const entries = await readdir(dir);
    const orphans = entries.filter((e) => e.includes('.tmp-'));
    expect(orphans).toEqual([]);
  });

  it('load() rehydrates the in-memory index from an existing directory', async () => {
    // Pre-populate with three persisted entries simulating a prior
    // session.
    const mgr1 = new AutoSnapshotManager({ workspaceRoot: root });
    await mgr1.save({
      version: 1,
      governanceIrHash: 'h1',
      fileHashes: { 'SOUL.md': 'a' },
      trigger: 'external_edit',
      timestamp: '2026-04-17T10:00:00.000Z',
    });
    await mgr1.save({
      version: 2,
      governanceIrHash: 'h2',
      fileHashes: { 'SOUL.md': 'b' },
      trigger: 'oc_runtime',
      timestamp: '2026-04-17T10:05:00.000Z',
    });
    await mgr1.save({
      version: 3,
      governanceIrHash: 'h3',
      fileHashes: { 'SOUL.md': 'c' },
      trigger: 'onedrive_sync',
      timestamp: '2026-04-17T10:10:00.000Z',
    });

    // Fresh manager — nothing in-memory yet.
    const mgr2 = new AutoSnapshotManager({ workspaceRoot: root });
    expect(mgr2.size()).toBe(0);
    await mgr2.load();
    expect(mgr2.size()).toBe(3);
    const versions = mgr2.list().map((e) => e.version).sort((a, b) => a - b);
    expect(versions).toEqual([1, 2, 3]);
    // Triggers came through intact.
    const triggers = mgr2
      .list()
      .sort((a, b) => a.version - b.version)
      .map((e) => e.trigger);
    expect(triggers).toEqual(['external_edit', 'oc_runtime', 'onedrive_sync']);
  });

  it('load() treats a missing .claws/snapshots/auto directory as empty', async () => {
    // Fresh workspace root — no directory at all.
    const mgr = new AutoSnapshotManager({ workspaceRoot: root });
    await mgr.load();
    expect(mgr.size()).toBe(0);
  });

  it('load() is a no-op when no workspaceRoot was supplied', async () => {
    const mgr = new AutoSnapshotManager();
    await mgr.load();
    expect(mgr.size()).toBe(0);
  });

  it('LRU eviction removes the oldest on-disk entry when cap is exceeded', async () => {
    const mgr = new AutoSnapshotManager({ workspaceRoot: root, maxEntries: 3 });
    // Insert 4 entries; the oldest (version 1) must disappear from disk.
    for (let i = 1; i <= 4; i += 1) {
      const ts = `2026-04-17T10:0${String(i)}:00.000Z`;
      await mgr.save({
        version: i,
        governanceIrHash: `h${String(i)}`,
        fileHashes: { 'SOUL.md': `x${String(i)}` },
        trigger: 'external_edit',
        timestamp: ts,
      });
    }
    expect(mgr.size()).toBe(3);

    const dir = join(root, AUTO_SNAPSHOT_DIR);
    const files = await readdir(dir);
    const jsonFiles = files.filter((f) => f.endsWith('.json')).sort();
    expect(jsonFiles).toEqual(['2.json', '3.json', '4.json']);
  });

  it('load() evicts beyond cap when rehydrated count exceeds maxEntries', async () => {
    // Write 5 entries with a big manager, then rehydrate a small one —
    // the small manager must cap at 3 and evict both in-memory and on disk.
    const big = new AutoSnapshotManager({ workspaceRoot: root });
    for (let i = 1; i <= 5; i += 1) {
      const ts = `2026-04-17T10:0${String(i)}:00.000Z`;
      await big.save({
        version: i,
        governanceIrHash: `h${String(i)}`,
        fileHashes: {},
        trigger: 'external_edit',
        timestamp: ts,
      });
    }
    const dirBefore = await readdir(join(root, AUTO_SNAPSHOT_DIR));
    expect(dirBefore.filter((e) => e.endsWith('.json'))).toHaveLength(5);

    const small = new AutoSnapshotManager({ workspaceRoot: root, maxEntries: 3 });
    await small.load();
    expect(small.size()).toBe(3);

    const dirAfter = await readdir(join(root, AUTO_SNAPSHOT_DIR));
    const jsonAfter = dirAfter.filter((e) => e.endsWith('.json')).sort();
    // Oldest two (1 + 2) evicted from disk.
    expect(jsonAfter).toEqual(['3.json', '4.json', '5.json']);
  });

  it('load() skips malformed JSON entries and retains the parseable ones', async () => {
    const dir = join(root, AUTO_SNAPSHOT_DIR);
    // Good entry.
    const good = new AutoSnapshotManager({ workspaceRoot: root });
    await good.save({
      version: 7,
      governanceIrHash: 'h7',
      fileHashes: { 'SOUL.md': 'g' },
      trigger: 'external_edit',
      timestamp: '2026-04-17T10:00:00.000Z',
    });
    // Inject a corrupted entry (partial write). The same directory now
    // holds 7.json (valid) + 8.json (garbage).
    await writeFile(join(dir, '8.json'), '{ "version": 8, "trig', 'utf-8');

    const fresh = new AutoSnapshotManager({ workspaceRoot: root });
    await fresh.load();
    expect(fresh.size()).toBe(1);
    expect(fresh.list()[0]?.version).toBe(7);
  });

  it('load() skips entries that fail the AutoSnapshot shape check', async () => {
    const dir = join(root, AUTO_SNAPSHOT_DIR);
    const good = new AutoSnapshotManager({ workspaceRoot: root });
    await good.save({
      version: 10,
      governanceIrHash: 'h10',
      fileHashes: { 'SOUL.md': 'x' },
      trigger: 'oc_runtime',
      timestamp: '2026-04-17T10:00:00.000Z',
    });
    // Parseable JSON but missing required fields.
    await writeFile(
      join(dir, '11.json'),
      JSON.stringify({ version: 11, trigger: 'external_edit' }),
      'utf-8',
    );
    // Parseable JSON with an unknown trigger string.
    await writeFile(
      join(dir, '12.json'),
      JSON.stringify({
        version: 12,
        timestamp: '2026-04-17T10:05:00.000Z',
        governanceIrHash: 'h12',
        fileHashes: { 'SOUL.md': 'y' },
        trigger: 'bogus',
      }),
      'utf-8',
    );
    // Parseable JSON with non-string hash map value.
    await writeFile(
      join(dir, '13.json'),
      JSON.stringify({
        version: 13,
        timestamp: '2026-04-17T10:06:00.000Z',
        governanceIrHash: 'h13',
        fileHashes: { 'SOUL.md': 42 },
        trigger: 'external_edit',
      }),
      'utf-8',
    );

    const fresh = new AutoSnapshotManager({ workspaceRoot: root });
    await fresh.load();
    expect(fresh.size()).toBe(1);
    expect(fresh.list()[0]?.version).toBe(10);
  });

  it('load() rejects every per-field shape violation in toAutoSnapshot', async () => {
    // Drive every reject branch in the shape-check narrowing. Each
    // malformed entry is written as a peer; only the one good entry
    // must survive load().
    const dir = join(root, AUTO_SNAPSHOT_DIR);
    const good = new AutoSnapshotManager({ workspaceRoot: root });
    await good.save({
      version: 1,
      governanceIrHash: 'h1',
      fileHashes: { 'SOUL.md': 'x' },
      trigger: 'external_edit',
      timestamp: '2026-04-17T10:00:00.000Z',
    });
    // raw === null
    await writeFile(join(dir, '2.json'), 'null', 'utf-8');
    // raw is an array (typeof 'object' but not a plain obj — passes the
    // typeof check; version missing still rejects).
    await writeFile(join(dir, '3.json'), JSON.stringify([1, 2, 3]), 'utf-8');
    // version is a string, not number
    await writeFile(
      join(dir, '4.json'),
      JSON.stringify({ version: '4', timestamp: 't', governanceIrHash: 'h', trigger: 'external_edit', fileHashes: {} }),
      'utf-8',
    );
    // version is fractional
    await writeFile(
      join(dir, '5.json'),
      JSON.stringify({ version: 5.5, timestamp: 't', governanceIrHash: 'h', trigger: 'external_edit', fileHashes: {} }),
      'utf-8',
    );
    // version is negative
    await writeFile(
      join(dir, '6.json'),
      JSON.stringify({ version: -1, timestamp: 't', governanceIrHash: 'h', trigger: 'external_edit', fileHashes: {} }),
      'utf-8',
    );
    // timestamp not string
    await writeFile(
      join(dir, '7.json'),
      JSON.stringify({ version: 7, timestamp: 7, governanceIrHash: 'h', trigger: 'external_edit', fileHashes: {} }),
      'utf-8',
    );
    // governanceIrHash not string
    await writeFile(
      join(dir, '8.json'),
      JSON.stringify({ version: 8, timestamp: 't', governanceIrHash: 8, trigger: 'external_edit', fileHashes: {} }),
      'utf-8',
    );
    // trigger not string
    await writeFile(
      join(dir, '9.json'),
      JSON.stringify({ version: 9, timestamp: 't', governanceIrHash: 'h', trigger: 42, fileHashes: {} }),
      'utf-8',
    );
    // fileHashes null
    await writeFile(
      join(dir, '14.json'),
      JSON.stringify({ version: 14, timestamp: 't', governanceIrHash: 'h', trigger: 'external_edit', fileHashes: null }),
      'utf-8',
    );
    // fileHashes is a string, not object
    await writeFile(
      join(dir, '15.json'),
      JSON.stringify({ version: 15, timestamp: 't', governanceIrHash: 'h', trigger: 'external_edit', fileHashes: 'nope' }),
      'utf-8',
    );

    const fresh = new AutoSnapshotManager({ workspaceRoot: root });
    await fresh.load();
    // Only the good entry (version 1) survives.
    expect(fresh.size()).toBe(1);
    expect(fresh.list()[0]?.version).toBe(1);
  });

  it('save persists across a simulated restart cycle (end-to-end)', async () => {
    // Session A: save three snapshots, then drop the manager.
    const mgrA = new AutoSnapshotManager({ workspaceRoot: root, maxEntries: 20 });
    for (let i = 0; i < 3; i += 1) {
      await mgrA.save({
        version: 100 + i,
        governanceIrHash: `h${String(100 + i)}`,
        fileHashes: { 'SOUL.md': `x${String(i)}` },
        trigger: 'oc_runtime',
        timestamp: `2026-04-17T10:0${String(i)}:00.000Z`,
      });
    }

    // Session B: fresh process — rehydrate and confirm everything returned.
    const mgrB = new AutoSnapshotManager({ workspaceRoot: root, maxEntries: 20 });
    await mgrB.load();
    expect(mgrB.size()).toBe(3);
    const found = mgrB.findNearestByTimestamp('2026-04-17T11:00:00.000Z');
    expect(found?.version).toBe(102);
    expect(found?.governanceIrHash).toBe('h102');
  });

  it('save fault injection — rename target already exists as a non-writable directory', async () => {
    // Fault injection: pre-create the target `42.json` as a DIRECTORY
    // so the helper's rename() fails. The helper's catch-block then
    // sweeps the tmp file and rethrows the rename error — a
    // not-successfully-saved snapshot must leave the workspace with NO
    // partial write and NO tmp-file orphan.
    const dir = join(root, AUTO_SNAPSHOT_DIR);
    const { mkdir } = await import('node:fs/promises');
    await mkdir(join(dir, '42.json'), { recursive: true });

    const mgr = new AutoSnapshotManager({ workspaceRoot: root });
    await expect(
      mgr.save({
        version: 42,
        governanceIrHash: 'h42',
        fileHashes: { 'SOUL.md': 'x' },
        trigger: 'external_edit',
        timestamp: '2026-04-17T10:00:00.000Z',
      }),
    ).rejects.toThrow();

    // No .tmp- orphans (the helper swept them).
    const entries = await readdir(dir);
    expect(entries.filter((e) => e.includes('.tmp-'))).toEqual([]);
  });

  it('load() returns gracefully when the directory is empty', async () => {
    // Pre-create an empty directory; load() must not throw and must
    // leave the manager at size 0.
    const dir = join(root, AUTO_SNAPSHOT_DIR);
    const { mkdir } = await import('node:fs/promises');
    await mkdir(dir, { recursive: true });

    const mgr = new AutoSnapshotManager({ workspaceRoot: root });
    await mgr.load();
    expect(mgr.size()).toBe(0);
  });

  it('load() ignores non-json filenames in the snapshot directory', async () => {
    const dir = join(root, AUTO_SNAPSHOT_DIR);
    const good = new AutoSnapshotManager({ workspaceRoot: root });
    await good.save({
      version: 1,
      governanceIrHash: 'h',
      fileHashes: { 'SOUL.md': 'x' },
      trigger: 'external_edit',
      timestamp: '2026-04-17T10:00:00.000Z',
    });
    // Stray files a user might plant (README, backup) must be skipped.
    await writeFile(join(dir, 'README.txt'), 'notes', 'utf-8');
    await writeFile(join(dir, 'backup.bak'), 'bak', 'utf-8');

    const fresh = new AutoSnapshotManager({ workspaceRoot: root });
    await fresh.load();
    expect(fresh.size()).toBe(1);
  });

  it('load() rethrows non-ENOENT errors from readdir (defensive branch)', async () => {
    // Fault injection: put a file where the snapshot directory is
    // expected. readdir() against that path produces an ENOTDIR (not
    // ENOENT) — load() must rethrow so the caller can fail the startup
    // path loudly instead of silently pretending there are no
    // snapshots.
    const { mkdir } = await import('node:fs/promises');
    await mkdir(join(root, '.claws', 'snapshots'), { recursive: true });
    await writeFile(join(root, '.claws', 'snapshots', 'auto'), 'not-a-dir', 'utf-8');

    const mgr = new AutoSnapshotManager({ workspaceRoot: root });
    await expect(mgr.load()).rejects.toThrow();
    expect(mgr.size()).toBe(0);
  });

  it('load() falls back to version tiebreak when timestamps are identical', async () => {
    // Two snapshots persisted with the same timestamp but different
    // versions. The load-order sort must resolve the tie with the
    // version field so the rehydrated index is deterministic.
    const mgr = new AutoSnapshotManager({ workspaceRoot: root });
    const ts = '2026-04-17T10:00:00.000Z';
    await mgr.save({
      version: 2,
      governanceIrHash: 'h2',
      fileHashes: { 'SOUL.md': 'x' },
      trigger: 'external_edit',
      timestamp: ts,
    });
    await mgr.save({
      version: 1,
      governanceIrHash: 'h1',
      fileHashes: { 'SOUL.md': 'x' },
      trigger: 'external_edit',
      timestamp: ts,
    });

    const fresh = new AutoSnapshotManager({ workspaceRoot: root });
    await fresh.load();
    const versions = fresh.list().map((e) => e.version);
    // Version-ascending order on timestamp tie.
    expect(versions).toEqual([1, 2]);
  });
});
