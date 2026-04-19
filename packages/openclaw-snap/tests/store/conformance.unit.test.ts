/**
 * SnapshotStore conformance suite — both reference backends MUST satisfy
 * the same put/get/list/promote/rollback/current semantics (snap.md §Testing L0).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { inMemoryStore, filesystemStore } from '../../src/store/index.js';
import type { Snapshot, SnapshotStore, PromoteContext } from '../../src/types.js';

const makeSnapshot = (id: string, overrides: Partial<Snapshot> = {}): Snapshot => ({
  id,
  files: { 'SOUL.md': '# soul' },
  createdAt: '2026-04-18T00:00:00.000Z',
  author: 'alice',
  status: 'draft',
  ...overrides,
});

const ctx: PromoteContext = { principal: 'alice', idempotencyKey: 'key-1' };

function runConformance(name: string, factory: () => SnapshotStore): void {
  describe(`SnapshotStore conformance — ${name}`, () => {
    let store: SnapshotStore;
    beforeEach(() => {
      store = factory();
    });

    it('put/get/list round-trip', async () => {
      await store.put(makeSnapshot('sha256-a'));
      await store.put(makeSnapshot('sha256-b', { createdAt: '2026-04-19T00:00:00.000Z' }));
      expect(await store.get('sha256-a')).not.toBeNull();
      expect(await store.get('sha256-missing')).toBeNull();
      const list = await store.list();
      expect(list.map((m) => m.id).sort()).toEqual(['sha256-a', 'sha256-b']);
    });

    it('promote transitions status and returns timestamp', async () => {
      await store.put(makeSnapshot('sha256-a'));
      const { promotedAt } = await store.promote('sha256-a', ctx);
      expect(promotedAt).toMatch(/\dT/);
      const cur = await store.current();
      expect(cur?.id).toBe('sha256-a');
      expect(cur?.status).toBe('current');
    });

    it('rollback supersedes the prior current atomically', async () => {
      await store.put(makeSnapshot('sha256-a'));
      await store.put(makeSnapshot('sha256-b'));
      await store.promote('sha256-a', ctx);
      await store.rollback('sha256-b', { ...ctx, idempotencyKey: 'k2' });
      const cur = await store.current();
      expect(cur?.id).toBe('sha256-b');
      const prior = await store.get('sha256-a');
      expect(prior?.status).toBe('superseded');
    });
  });
}

runConformance('inMemoryStore', () => inMemoryStore());

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'snap-fs-test-'));
runConformance('filesystemStore', () => {
  const unique = path.join(tmpRoot, `run-${String(Date.now())}-${Math.random().toString(36).slice(2)}`);
  fs.mkdirSync(unique, { recursive: true });
  return filesystemStore({ root: unique });
});
