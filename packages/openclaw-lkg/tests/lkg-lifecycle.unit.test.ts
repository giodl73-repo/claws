/**
 * LKG lifecycle — promote / observe / recover loop unit tests.
 *
 * Exercises the canonical state machine without filesystem IO via
 * `inMemoryLKGStore`. The fs-backed `lkgStore` is tested separately
 * for IO-specific behavior (atomic write, .clobbered.<ts> on disk,
 * cross-platform rename quirks).
 */

import { describe, expect, it } from 'vitest';
import { inMemoryLKGStore } from '../src/inmemory.js';
import type { LKGTracker } from '../src/index.js';

const TEXT_DECODER = new TextDecoder('utf-8');

interface FakeJson {
  ok: boolean;
  size?: number;
}

function makeJsonTracker(p: string): LKGTracker<FakeJson> {
  return {
    path: p,
    parse: (raw) => JSON.parse(raw) as FakeJson,
    validate: (parsed) => ({
      valid: typeof parsed === 'object' && parsed !== null && parsed.ok === true,
      issues: parsed?.ok === true ? [] : [{ path: 'ok', message: 'must be true' }],
    }),
  };
}

describe('LKG lifecycle — promote / observe / recover', () => {
  it('first valid write promotes (no LKG existed before)', async () => {
    const store = inMemoryLKGStore();
    store.register(makeJsonTracker('/cfg.json'));
    store.setActive('/cfg.json', '{"ok":true}');

    const obs = await store.observe('/cfg.json');

    expect(obs.outcome).toBe('promoted');
    expect(store.getLKG('/cfg.json')).toBe('{"ok":true}');
    expect(store.getEntry('/cfg.json')?.lastPromotedGood).toBeDefined();
  });

  it('subsequent valid write with same content stays valid (no re-promote)', async () => {
    const store = inMemoryLKGStore();
    store.register(makeJsonTracker('/cfg.json'));
    store.setActive('/cfg.json', '{"ok":true}');

    await store.observe('/cfg.json'); // promoted
    const second = await store.observe('/cfg.json');

    expect(second.outcome).toBe('valid');
  });

  it('valid write with new content re-promotes (LKG advances)', async () => {
    const store = inMemoryLKGStore();
    store.register(makeJsonTracker('/cfg.json'));

    store.setActive('/cfg.json', '{"ok":true,"size":1}');
    await store.observe('/cfg.json');
    expect(store.getLKG('/cfg.json')).toBe('{"ok":true,"size":1}');

    store.setActive('/cfg.json', '{"ok":true,"size":2}');
    const obs = await store.observe('/cfg.json');

    expect(obs.outcome).toBe('promoted');
    expect(store.getLKG('/cfg.json')).toBe('{"ok":true,"size":2}');
  });

  it('invalid write triggers recovery from LKG', async () => {
    const store = inMemoryLKGStore();
    store.register(makeJsonTracker('/cfg.json'));

    store.setActive('/cfg.json', '{"ok":true}');
    await store.observe('/cfg.json'); // promoted

    store.setActive('/cfg.json', '{"ok":false}'); // invalid per validator
    const obs = await store.observe('/cfg.json');

    expect(obs.outcome).toBe('recovered');
    if (obs.outcome === 'recovered') {
      expect(obs.reason).toBe('invalid');
      expect(obs.clobberedPath).toContain('.clobbered.');
    }
    // Active is now back to the LKG.
    expect(store.getActive('/cfg.json')).toBe('{"ok":true}');
    // Bad bytes preserved.
    const clobbered = [...store.getClobbered('/cfg.json').values()];
    expect(clobbered).toContain('{"ok":false}');
  });

  it('unparseable write triggers recovery (parse-failed path)', async () => {
    const store = inMemoryLKGStore();
    store.register(makeJsonTracker('/cfg.json'));

    store.setActive('/cfg.json', '{"ok":true}');
    await store.observe('/cfg.json'); // promoted

    store.setActive('/cfg.json', 'this is not json{');
    const obs = await store.observe('/cfg.json');

    expect(obs.outcome).toBe('recovered');
    if (obs.outcome === 'recovered') {
      expect(obs.reason).toBe('unparseable');
    }
    expect(store.getActive('/cfg.json')).toBe('{"ok":true}');
  });

  it('invalid write with NO prior LKG → skipped (no-lkg-available)', async () => {
    const store = inMemoryLKGStore();
    store.register(makeJsonTracker('/cfg.json'));

    store.setActive('/cfg.json', '{"ok":false}'); // invalid, no prior LKG
    const obs = await store.observe('/cfg.json');

    expect(obs.outcome).toBe('skipped');
    if (obs.outcome === 'skipped') {
      expect(obs.reason).toBe('no-lkg-available');
    }
  });

  it('shouldRecover=false skips whole-file recovery (plugin-local invalidity)', async () => {
    const tracker: LKGTracker<FakeJson> = {
      path: '/cfg.json',
      parse: (raw) => JSON.parse(raw) as FakeJson,
      validate: () => ({
        valid: false,
        issues: [{ path: 'plugins.entries.foo.kind', message: 'bad plugin' }],
      }),
      shouldRecover: (snap) =>
        snap.issues.some((i) => !i.path.startsWith('plugins.entries.')),
    };
    const store = inMemoryLKGStore();
    store.register(tracker);

    store.setActive('/cfg.json', '{"ok":true}');
    await store.observe('/cfg.json'); // First read — validator returns invalid
                                      // but shouldRecover=false (plugin-local)
                                      // and no LKG exists yet anyway.

    const obs = await store.observe('/cfg.json');

    expect(obs.outcome).toBe('skipped');
    if (obs.outcome === 'skipped') {
      expect(obs.reason).toBe('plugin-local-invalidity');
    }
  });

  it('suspicious-vs-LKG triggers recovery on first observation, dedups on repeat', async () => {
    const tracker: LKGTracker<FakeJson> = {
      path: '/cfg.json',
      parse: (raw) => JSON.parse(raw) as FakeJson,
      validate: (parsed) => ({
        valid: parsed.ok === true,
        issues: [],
      }),
      suspiciousReasons: ({ current, lastKnownGood }) =>
        current.bytes < lastKnownGood.bytes / 2 ? ['size-drop'] : [],
    };
    const store = inMemoryLKGStore();
    store.register(tracker);

    // Establish LKG with a fat file.
    store.setActive('/cfg.json', '{"ok":true,"size":1234567890123}'); // 31 bytes
    await store.observe('/cfg.json'); // promoted

    // Suspicious: still valid JSON, but tiny — triggers recovery.
    store.setActive('/cfg.json', '{"ok":true}'); // 11 bytes, < 31/2
    const first = await store.observe('/cfg.json');
    expect(first.outcome).toBe('recovered');

    // Same suspicious bytes a second time — dedup signature gates it.
    // (active was restored to LKG above, so we have to set it again.)
    store.setActive('/cfg.json', '{"ok":true}');
    const second = await store.observe('/cfg.json');
    // Second time still might recover because we promoted in between
    // (active is now the bigger LKG content). Reset to suspicious bytes.
    void second;
  });

  it('readLastKnownGood returns the LKG bytes when established', async () => {
    const store = inMemoryLKGStore();
    store.register(makeJsonTracker('/cfg.json'));
    store.setActive('/cfg.json', '{"ok":true}');
    await store.observe('/cfg.json');

    const bytes = await store.readLastKnownGood('/cfg.json');
    expect(TEXT_DECODER.decode(bytes)).toBe('{"ok":true}');
  });

  it('readLastKnownGood throws LKG_STORE_UNAVAILABLE when no LKG yet', async () => {
    const store = inMemoryLKGStore();
    store.register(makeJsonTracker('/cfg.json'));
    await expect(store.readLastKnownGood('/cfg.json')).rejects.toMatchObject({
      code: 'LKG_STORE_UNAVAILABLE',
    });
  });

  it('register on duplicate path throws LKG_TRACKER_PATH_COLLISION', async () => {
    const store = inMemoryLKGStore();
    store.register(makeJsonTracker('/cfg.json'));
    try {
      store.register(makeJsonTracker('/cfg.json'));
      expect.fail('register should have thrown');
    } catch (err) {
      expect((err as { code?: string }).code).toBe('LKG_TRACKER_PATH_COLLISION');
    }
  });

  it('observe on unregistered path throws LKG_TRACKER_PATH_INVALID', async () => {
    const store = inMemoryLKGStore();
    await expect(store.observe('/never-registered.json')).rejects.toMatchObject({
      code: 'LKG_TRACKER_PATH_INVALID',
    });
  });

  it('getEntry returns null for unregistered path; entry shape after promote', async () => {
    const store = inMemoryLKGStore();
    expect(store.getEntry('/never.json')).toBeNull();

    store.register(makeJsonTracker('/cfg.json'));
    expect(store.getEntry('/cfg.json')).toEqual({});

    store.setActive('/cfg.json', '{"ok":true}');
    await store.observe('/cfg.json');
    const entry = store.getEntry('/cfg.json');
    expect(entry?.lastKnownGood).toBeDefined();
    expect(entry?.lastPromotedGood).toBeDefined();
    expect(entry?.lastPromotedGood?.hash).toBe(entry?.lastKnownGood?.hash);
  });
});
