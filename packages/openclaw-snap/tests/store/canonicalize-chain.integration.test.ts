/**
 * L1 integration — v2 SnapshotStore paired with @bic/openclaw-workspace/canonicalize.
 *
 * Asserts that two captures of byte-identical content produce identical
 * `SnapshotId`s (RFC 8785 JCS over the file map) and that the filesystem
 * backend's bundles survive a restart of the store instance.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { inMemoryStore, filesystemStore } from '../../src/store/index.js';
import { computeSnapshotId } from '../../src/canonical.js';

const TEXT_DECODER = new TextDecoder('utf-8');

describe('store ↔ workspace/canonicalize', () => {
  it('snapshotId is stable under key-order permutations (canonicalize sort)', async () => {
    const fileMapA = { 'SOUL.md': '# soul', 'TOOLS.md': '# tools' };
    const fileMapB = { 'TOOLS.md': '# tools', 'SOUL.md': '# soul' };
    const idA = computeSnapshotId(fileMapA);
    const idB = computeSnapshotId(fileMapB);
    expect(idA).toBe(idB);

    const store = inMemoryStore({ workspaces: { ws: fileMapA } });
    const captured = await store.capture('ws');
    expect(captured).toBe(idA);
  });

  it('filesystem backend survives restart (two store instances, same root)', async () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'snap-fs-reboot-'));
    const wsRoot = path.join(tmpRoot, 'ws');
    const storeRoot = path.join(tmpRoot, 'store');
    fs.mkdirSync(wsRoot, { recursive: true });
    fs.mkdirSync(storeRoot, { recursive: true });
    fs.writeFileSync(path.join(wsRoot, 'SOUL.md'), '# soul');

    const first = filesystemStore({ root: storeRoot });
    const id = await first.capture(wsRoot);

    const second = filesystemStore({ root: storeRoot });
    const bytes = await second.read(id, 'SOUL.md');
    expect(TEXT_DECODER.decode(bytes)).toBe('# soul');
    const listed = await second.list(wsRoot);
    expect(listed.map((s) => s.id)).toContain(id);
  });
});
