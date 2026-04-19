/**
 * L1 integration — SnapshotStore paired with @bic/openclaw-workspace/canonicalize.
 *
 * Asserts that the snapshotId computed by canonicalize is stable across
 * key-order permutations (round-trip through inMemoryStore) and that the
 * filesystem backend reproduces the same bytes across restart cycles.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { inMemoryStore, filesystemStore } from '../../src/store/index.js';
import { computeSnapshotId } from '../../src/canonical.js';

describe('store ↔ workspace/canonicalize', () => {
  it('snapshotId is stable under key-order permutations (canonicalize sort)', async () => {
    const a = { 'SOUL.md': '# soul', 'TOOLS.md': '# tools' };
    const b = { 'TOOLS.md': '# tools', 'SOUL.md': '# soul' };
    const idA = computeSnapshotId(a);
    const idB = computeSnapshotId(b);
    expect(idA).toBe(idB);
    const store = inMemoryStore();
    await store.put({ id: idA, files: a, createdAt: '2026-04-18T00:00:00.000Z', author: 'alice', status: 'draft' });
    expect((await store.get(idB))?.id).toBe(idA);
  });

  it('filesystem backend survives restart (two store instances, same root)', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'snap-fs-reboot-'));
    const files = { 'SOUL.md': '# soul' };
    const id = computeSnapshotId(files);
    const first = filesystemStore({ root });
    await first.put({ id, files, createdAt: '2026-04-18T00:00:00.000Z', author: 'alice', status: 'draft' });
    await first.promote(id, { principal: 'alice', idempotencyKey: 'k1' });
    const second = filesystemStore({ root });
    const current = await second.current();
    expect(current?.id).toBe(id);
    expect(current?.status).toBe('current');
  });
});
