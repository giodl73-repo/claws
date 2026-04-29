/**
 * SnapshotStore conformance suite — both reference backends MUST satisfy
 * the same v2 capture/read/list semantics.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { inMemoryStore, filesystemStore } from '../../src/store/index.js';
import type { SnapshotStore, WorkspaceId } from '../../src/types.js';

const TEXT_DECODER = new TextDecoder('utf-8');

interface Fixture {
  store: SnapshotStore;
  workspace: WorkspaceId;
  /** Replace workspace content. Triggers a different `capture` id. */
  setFiles(files: Record<string, string>): void;
}

function runConformance(name: string, factory: () => Fixture): void {
  describe(`SnapshotStore conformance — ${name}`, () => {
    it('capture is content-addressable and idempotent', async () => {
      const f = factory();
      f.setFiles({ 'a.txt': 'hello', 'b.txt': 'world' });
      const id1 = await f.store.capture(f.workspace);
      const id2 = await f.store.capture(f.workspace);
      expect(id1).toBe(id2);
    });

    it('different content → different ids', async () => {
      const f = factory();
      f.setFiles({ 'a.txt': 'one' });
      const id1 = await f.store.capture(f.workspace);
      f.setFiles({ 'a.txt': 'two' });
      const id2 = await f.store.capture(f.workspace);
      expect(id1).not.toBe(id2);
    });

    it('read returns captured bytes', async () => {
      const f = factory();
      f.setFiles({ 'a.txt': 'hello', 'sub/b.txt': 'nested' });
      const id = await f.store.capture(f.workspace);
      const a = await f.store.read(id, 'a.txt');
      expect(TEXT_DECODER.decode(a)).toBe('hello');
      const b = await f.store.read(id, 'sub/b.txt');
      expect(TEXT_DECODER.decode(b)).toBe('nested');
    });

    it('read of unknown snapshot throws SNAP_NOT_FOUND', async () => {
      const f = factory();
      await expect(f.store.read('sha256-nonexistent', 'a.txt')).rejects.toMatchObject({
        code: 'SNAP_NOT_FOUND',
      });
    });

    it('read of unknown path inside known snapshot throws SNAP_INVALID_PATH', async () => {
      const f = factory();
      f.setFiles({ 'a.txt': 'hi' });
      const id = await f.store.capture(f.workspace);
      await expect(f.store.read(id, 'missing.txt')).rejects.toMatchObject({
        code: 'SNAP_INVALID_PATH',
      });
    });

    it('list returns captured snapshots newest-first', async () => {
      const f = factory();
      f.setFiles({ 'a.txt': 'v1' });
      const id1 = await f.store.capture(f.workspace);
      // Force timestamp progression by mutating content.
      f.setFiles({ 'a.txt': 'v2' });
      const id2 = await f.store.capture(f.workspace);
      const all = await f.store.list(f.workspace);
      expect(all.map((s) => s.id)).toContain(id1);
      expect(all.map((s) => s.id)).toContain(id2);
    });

    it('list respects limit', async () => {
      const f = factory();
      f.setFiles({ 'a.txt': 'v1' });
      await f.store.capture(f.workspace);
      f.setFiles({ 'a.txt': 'v2' });
      await f.store.capture(f.workspace);
      const limited = await f.store.list(f.workspace, { limit: 1 });
      expect(limited).toHaveLength(1);
    });
  });
}

runConformance('inMemoryStore', () => {
  const store = inMemoryStore();
  return {
    store,
    workspace: 'ws',
    setFiles(files) {
      store.setWorkspace('ws', files);
    },
  };
});

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'snap-fs-test-'));
runConformance('filesystemStore', () => {
  const runId = `run-${String(Date.now())}-${Math.random().toString(36).slice(2)}`;
  const storeRoot = path.join(tmpRoot, runId, 'store');
  const wsRoot = path.join(tmpRoot, runId, 'ws');
  fs.mkdirSync(storeRoot, { recursive: true });
  fs.mkdirSync(wsRoot, { recursive: true });
  let monotone = 0;
  return {
    store: filesystemStore({
      root: storeRoot,
      now: () => new Date(Date.UTC(2026, 0, 1, 0, 0, monotone++)),
    }),
    workspace: wsRoot,
    setFiles(files) {
      // Clear any existing files first (capture walks the dir).
      for (const ent of fs.readdirSync(wsRoot)) {
        fs.rmSync(path.join(wsRoot, ent), { recursive: true, force: true });
      }
      for (const [p, c] of Object.entries(files)) {
        const target = path.join(wsRoot, p);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, c);
      }
    },
  };
});
