/**
 * L0: Cursor marker detection — .cursorrules file and .cursor/ directory.
 *
 * Cursor uses advisory enforcement (cannot block, only surface warnings)
 * and defaults to trust tier T1. Forward-compat: .cursor/ directory is
 * detected even when .cursorrules is absent.
 */

import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { detectCursor } from '../../../src/detect/markers/cursor.js';

const FIXTURES = resolve(__dirname, '../../fixtures');

describe('detectCursor', () => {
  it('detects .cursorrules with advisory enforcement and T1 default', async () => {
    const root = resolve(FIXTURES, 'platform-cursor');
    const result = await detectCursor(root);

    expect(result).not.toBeNull();
    expect(result!.platform).toBe('cursor');
    expect(result!.enforcement).toBe('advisory');
    expect(result!.defaultTrustTier).toBe(1);
    expect(result!.confidence).toBe(1.0);
    expect(result!.markerFiles).toHaveLength(1);
    expect(result!.markerFiles[0]).toContain('.cursorrules');
  });

  it('detects .cursor/ directory as forward-compat path (no .cursorrules)', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'claws-cursor-dir-'));
    try {
      await mkdir(join(tmp, '.cursor'), { recursive: true });
      await writeFile(join(tmp, '.cursor', 'rules'), 'Use strict TypeScript.');

      const result = await detectCursor(tmp);
      expect(result).not.toBeNull();
      expect(result!.platform).toBe('cursor');
      expect(result!.enforcement).toBe('advisory');
      expect(result!.defaultTrustTier).toBe(1);
      expect(result!.markerFiles[0]).toContain('.cursor');
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });
});
