import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  VersionManager,
  parseETag,
  formatETag,
} from '../../src/workspace-edit/index.js';

let workspace: string;

beforeEach(async () => {
  workspace = await mkdtemp(join(tmpdir(), 'ws-version-'));
});

afterEach(async () => {
  await rm(workspace, { recursive: true, force: true });
});

describe('VersionManager (unit)', () => {
  it('getVersion returns the current counter without side effects', () => {
    const mgr = new VersionManager({ workspaceRoot: workspace });
    expect(mgr.getVersion()).toBe(0);
    expect(mgr.getVersion()).toBe(0);
  });

  it('incrementVersion advances the counter monotonically', async () => {
    const mgr = new VersionManager({ workspaceRoot: workspace });
    const first = await mgr.incrementVersion();
    const second = await mgr.incrementVersion();
    const third = await mgr.incrementVersion();
    expect(first).toBe(1);
    expect(second).toBe(2);
    expect(third).toBe(3);
    expect(mgr.getVersion()).toBe(3);
  });

  it('checkVersion matches when the expected value equals the current', async () => {
    const mgr = new VersionManager({ workspaceRoot: workspace });
    await mgr.incrementVersion();
    await mgr.incrementVersion();
    const result = mgr.checkVersion(2);
    expect(result.match).toBe(true);
    if (result.match) {
      expect(result.current).toBe(2);
    }
  });

  it('checkVersion detects a stale expected value and returns a VERSION_CONFLICT', async () => {
    const mgr = new VersionManager({ workspaceRoot: workspace });
    await mgr.incrementVersion();
    await mgr.incrementVersion();
    const result = mgr.checkVersion(1);
    expect(result.match).toBe(false);
    if (!result.match) {
      expect(result.error.code).toBe('VERSION_CONFLICT');
      expect(result.error.current).toBe(2);
      expect(result.error.expected).toBe(1);
    }
  });

  it('persistVersion writes .claws/cache/version.json with the current value', async () => {
    const mgr = new VersionManager({ workspaceRoot: workspace });
    await mgr.incrementVersion();
    await mgr.incrementVersion();
    await mgr.incrementVersion();
    const raw = await readFile(
      join(workspace, '.claws/cache/version.json'),
      'utf-8',
    );
    const parsed = JSON.parse(raw) as { version: number; updatedAt: string };
    expect(parsed.version).toBe(3);
    expect(typeof parsed.updatedAt).toBe('string');
  });

  it('loadVersion reads the persisted counter and survives a new manager instance', async () => {
    const first = new VersionManager({ workspaceRoot: workspace });
    await first.incrementVersion();
    await first.incrementVersion();
    await first.incrementVersion();

    const second = new VersionManager({ workspaceRoot: workspace });
    expect(second.getVersion()).toBe(0);
    const loaded = await second.loadVersion();
    expect(loaded).toBe(3);
    expect(second.getVersion()).toBe(3);
  });

  it('loadVersion falls back to initial when the file is missing or malformed', async () => {
    const mgr = new VersionManager({ workspaceRoot: workspace, initial: 7 });
    const missing = await mgr.loadVersion();
    expect(missing).toBe(7);

    await mkdir(join(workspace, '.claws/cache'), { recursive: true });
    await writeFile(
      join(workspace, '.claws/cache/version.json'),
      '{not json',
      'utf-8',
    );
    const malformed = await mgr.loadVersion();
    expect(malformed).toBe(7);
  });

  it('loadVersion ignores negative, NaN, or non-numeric version fields', async () => {
    const mgr = new VersionManager({ workspaceRoot: workspace, initial: 5 });

    await mkdir(join(workspace, '.claws/cache'), { recursive: true });
    const path = join(workspace, '.claws/cache/version.json');

    await writeFile(path, JSON.stringify({ version: -3 }), 'utf-8');
    expect(await mgr.loadVersion()).toBe(5);

    await writeFile(path, JSON.stringify({ version: 'abc' }), 'utf-8');
    expect(await mgr.loadVersion()).toBe(5);

    await writeFile(path, JSON.stringify({ version: Number.POSITIVE_INFINITY }), 'utf-8');
    expect(await mgr.loadVersion()).toBe(5);
  });

  it('loadVersion does not regress when disk value is lower than in-memory', async () => {
    const mgr = new VersionManager({ workspaceRoot: workspace });
    await mgr.incrementVersion();
    await mgr.incrementVersion();
    await mgr.incrementVersion(); // in-memory = 3

    await writeFile(
      join(workspace, '.claws/cache/version.json'),
      JSON.stringify({ version: 1, updatedAt: new Date().toISOString() }),
      'utf-8',
    );
    const reloaded = await mgr.loadVersion();
    expect(reloaded).toBe(3);
    expect(mgr.getVersion()).toBe(3);
  });

  it('parseETag and formatETag round-trip quoted and unquoted values', () => {
    expect(parseETag('"42"')).toBe(42);
    expect(parseETag('42')).toBe(42);
    expect(parseETag('  " 3 " ')).toBe(null); // inner whitespace invalid
    expect(parseETag('not-a-number')).toBe(null);
    expect(parseETag(undefined)).toBe(null);
    expect(parseETag('')).toBe(null);
    expect(formatETag(0)).toBe('"0"');
    expect(formatETag(99)).toBe('"99"');
  });

  // B1 — VersionManager.incrementVersion atomicity under concurrency.
  // The pre-fix implementation did `current += 1; await persistVersion()`
  // without serialisation; two concurrent callers could read the same
  // pre-increment value, bump in memory, and race their persist writes.
  // The fix chains increments through a promise mutex — the assertions
  // below verify strict monotonicity, uniqueness, and disk persistence
  // under 100 parallel callers.
  it('incrementVersion serialises 100 concurrent callers: unique, monotonic, gap-free', async () => {
    const mgr = new VersionManager({ workspaceRoot: workspace });
    const callers = 100;
    const results = await Promise.all(
      Array.from({ length: callers }, () => mgr.incrementVersion()),
    );
    // Every caller saw a unique version.
    const unique = new Set(results);
    expect(unique.size).toBe(callers);
    // The assigned versions form the contiguous range [1, 100] — no
    // duplicates, no gaps.
    const sorted = [...results].sort((a, b) => a - b);
    for (let i = 0; i < callers; i += 1) {
      expect(sorted[i]).toBe(i + 1);
    }
    // In-memory counter advanced exactly `callers` times.
    expect(mgr.getVersion()).toBe(callers);
    // Final persisted value on disk equals the in-memory counter.
    const raw = await readFile(
      join(workspace, '.claws/cache/version.json'),
      'utf-8',
    );
    const parsed = JSON.parse(raw) as { version: number };
    expect(parsed.version).toBe(callers);
  });

  it('incrementVersion: disk value never exceeds in-memory (persist completes before next bump)', async () => {
    // The B1 fix guarantees each persistVersion() completes before the
    // next caller's bump runs. This test kicks off 50 concurrent bumps,
    // then loads the persisted value via a fresh manager — the reload
    // must see the final count.
    const mgr = new VersionManager({ workspaceRoot: workspace });
    await Promise.all(Array.from({ length: 50 }, () => mgr.incrementVersion()));
    expect(mgr.getVersion()).toBe(50);

    const reloader = new VersionManager({ workspaceRoot: workspace });
    const reloaded = await reloader.loadVersion();
    expect(reloaded).toBe(50);
  });

  it('incrementVersion: error in one task does not poison the chain for the next caller', async () => {
    // The B1 mutex uses `.catch(() => undefined)` on the tail so a
    // rejected persist() does not block subsequent callers from
    // running. Stub persistVersion to reject once, then resolve — the
    // first bump rejects but the chain recovers and the second bump
    // still advances the counter and returns.
    const mgr = new VersionManager({ workspaceRoot: workspace });
    let calls = 0;
    const realPersist = mgr.persistVersion.bind(mgr);
    (mgr as unknown as { persistVersion: () => Promise<void> }).persistVersion =
      async (): Promise<void> => {
        calls += 1;
        if (calls === 1) throw new Error('simulated persist failure');
        return realPersist();
      };

    await expect(mgr.incrementVersion()).rejects.toThrow('simulated persist failure');
    // The tail was rejected; the chain's `.catch(() => undefined)` neutralises
    // it so the next caller's `prev.then(task)` still runs.
    const assigned = await mgr.incrementVersion();
    expect(assigned).toBe(2);
    // In-memory advanced twice (once per incrementVersion call, even
    // though the first persist threw — the bump happens before persist).
    expect(mgr.getVersion()).toBe(2);
  });
});
